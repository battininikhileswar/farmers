/**
 * Smart Farmer Marketplace - Buyer Dashboard Module
 * Handles marketplace, cart, orders, real-time updates
 */

(function () {
    let user = getCurrentUser();
    if (!user || user.role !== 'buyer') {
        window.location.href = 'login.html';
        return;
    }

    // Elements
    const buyerName = document.getElementById('buyerName');
    const buyerLogout = document.getElementById('buyerLogout');
    const buyerApp = document.getElementById('buyerApp');
    const cartShortcut = document.getElementById('cartShortcut');
    const cropSearch = document.getElementById('cropSearch');
    const priceFilter = document.getElementById('priceFilter');
    const cropMarketplace = document.getElementById('cropMarketplace');
    const noCropsMarketplace = document.getElementById('noCropsMarketplace');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartCount');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const orderList = document.getElementById('orderList');
    const noOrdersMsg = document.getElementById('noOrdersMsg');
    const buyerPurchaseHistory = document.getElementById('buyerPurchaseHistory');
    const buyerNoHistory = document.getElementById('buyerNoHistory');

    // Profile elements
    const buyerProfileName = document.getElementById('buyerProfileName');
    const buyerProfileMeta = document.getElementById('buyerProfileMeta');
    const saveBuyerProfileBtn = document.getElementById('saveBuyerProfileBtn');
    const buyerProfilePhone = document.getElementById('buyerProfilePhone');
    const buyerProfilePhoneError = document.getElementById('buyerProfilePhoneError');
    const buyerProfileEmail = document.getElementById('buyerProfileEmail');
    const buyerProfileAddress = document.getElementById('buyerProfileAddress');
    const buyerProfileCity = document.getElementById('buyerProfileCity');
    const buyerProfilePincode = document.getElementById('buyerProfilePincode');
    const buyerProfileNote = document.getElementById('buyerProfileNote');

    // Initialize
    if (buyerName) buyerName.textContent = user.name;
    setupTabs(buyerApp, 'market');
    renderMarketplace();
    renderCart();
    renderOrders();
    hydrateProfile();
    renderPurchaseHistory();
    updateCartCount();

    // Listen for real-time crop updates
    // Cross-tab sync via storage event (when another tab updates localStorage)
    window.addEventListener('storage', (e) => {
        if (e.key === 'smart_farmer_crops') renderMarketplace();
        if (e.key === 'smart_farmer_orders') {
            renderOrders();
            renderPurchaseHistory();
        }
        if (e.key === 'smart_farmer_cart') { renderCart(); updateCartCount(); }
    });

    if (typeof RealTimeChannel !== 'undefined') {
        RealTimeChannel.on('crop_added', () => renderMarketplace());
        RealTimeChannel.on('crop_updated', () => renderMarketplace());
        RealTimeChannel.on('crop_deleted', () => renderMarketplace());
        RealTimeChannel.on('order_status', (data) => {
            // Apply order update from other tab
            if (data && data.order) {
                const orders = getOrders();
                const idx = orders.findIndex(o => o.id === data.order.id);
                if (idx >= 0) orders[idx] = data.order;
                saveOrders(orders);
            }
            renderOrders();
            renderCart();
            renderPurchaseHistory();
        });
    }

    buyerLogout?.addEventListener('click', () => {
        setCurrentUser(null);
        window.location.href = 'index.html';
    });

    cartShortcut?.addEventListener('click', (e) => {
        e.preventDefault();
        buyerApp?.querySelector('[data-tab="cart"]')?.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    cropSearch?.addEventListener('input', renderMarketplace);
    priceFilter?.addEventListener('change', renderMarketplace);

    /**
     * Get all crops (from all farmers)
     */
    function getAllCrops() {
        return getCrops().filter(c => c.quantity > 0);
    }

    /**
     * Render marketplace grid with search and filter
     */
    function renderMarketplace() {
        let crops = getAllCrops();

        const search = (cropSearch?.value || '').toLowerCase();
        if (search) {
            crops = crops.filter(c => c.name.toLowerCase().includes(search));
        }

        const filter = priceFilter?.value || 'all';
        if (filter === 'low') {
            crops = [...crops].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        } else if (filter === 'high') {
            crops = [...crops].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        }

        if (!cropMarketplace) return;

        cropMarketplace.innerHTML = '';

        if (crops.length === 0) {
            if (noCropsMarketplace) noCropsMarketplace.style.display = 'block';
            return;
        }

        if (noCropsMarketplace) noCropsMarketplace.style.display = 'none';

        crops.forEach(crop => {
            const card = document.createElement('div');
            card.className = 'crop-card';
            card.innerHTML = `
                <img class="crop-card-image" src="${crop.imageUrl || 'https://via.placeholder.com/200?text=Crop'}" alt="${escapeHtml(crop.name)}" onerror="this.src='https://via.placeholder.com/200?text=Crop'">
                <div class="crop-card-body">
                    <h3 class="crop-card-title">${escapeHtml(crop.name)}</h3>
                    <p class="crop-card-price">₹${parseFloat(crop.price).toFixed(2)} / KG</p>
                    <p class="crop-card-qty">Available: ${crop.quantity} KG</p>
                    <button class="btn btn-primary add-to-cart-btn" data-id="${crop.id}">Add to Cart</button>
                </div>
            `;
            card.querySelector('.add-to-cart-btn').addEventListener('click', () => addToCart(crop.id));
            cropMarketplace.appendChild(card);
        });
    }

    /**
     * Add crop to cart
     */
    function addToCart(cropId) {
        const crops = getCrops();
        const crop = crops.find(c => c.id === cropId);
        if (!crop || crop.quantity <= 0) return;

        let cart = getCart(user.id);

        const existing = cart.find(item => item.cropId === cropId);
        if (existing) {
            if (existing.qty >= crop.quantity) {
                alert('Cannot add more than available quantity');
                return;
            }
            existing.qty += 1;
        } else {
            cart.push({
                cropId: crop.id,
                name: crop.name,
                price: crop.price,
                farmerId: crop.farmerId,
                farmerName: crop.farmerName,
                qty: 1,
            });
        }

        saveCart(user.id, cart);
        renderCart();
        updateCartCount();
    }

    /**
     * Remove from cart
     */
    function removeFromCart(cropId) {
        let cart = getCart(user.id);
        cart = cart.filter(item => item.cropId !== cropId);
        saveCart(user.id, cart);
        renderCart();
        updateCartCount();
    }

    /**
     * Update cart quantity
     */
    function updateCartQty(cropId, delta) {
        const crops = getCrops();
        const crop = crops.find(c => c.id === cropId);
        let cart = getCart(user.id);
        const item = cart.find(i => i.cropId === cropId);
        if (!item) return;

        const newQty = item.qty + delta;
        if (newQty <= 0) {
            removeFromCart(cropId);
            return;
        }
        if (crop && newQty > crop.quantity) {
            alert('Cannot exceed available quantity');
            return;
        }
        item.qty = newQty;
        saveCart(user.id, cart);
        renderCart();
        updateCartCount();
    }

    /**
     * Render cart section
     */
    function renderCart() {
        const cart = getCart(user.id);

        if (!cartItems) return;

        cartItems.innerHTML = '';

        if (cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
            if (cartTotal) cartTotal.textContent = '₹0';
            if (placeOrderBtn) placeOrderBtn.disabled = true;
            return;
        }

        let total = 0;
        cart.forEach(item => {
            const subtotal = parseFloat(item.price) * item.qty;
            total += subtotal;
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div>
                    <strong>${escapeHtml(item.name)}</strong>
                    <span>× ${item.qty} = ₹${subtotal.toFixed(2)}</span>
                </div>
                <div>
                    <button class="btn btn-outline qty-btn" data-id="${item.cropId}" data-delta="-1">−</button>
                    <span>${item.qty}</span>
                    <button class="btn btn-outline qty-btn" data-id="${item.cropId}" data-delta="1">+</button>
                    <button class="btn btn-outline remove-btn" data-id="${item.cropId}" style="margin-left:0.5rem;color:#dc3545;border-color:#dc3545">Remove</button>
                </div>
            `;
            div.querySelectorAll('.qty-btn').forEach(btn => {
                btn.addEventListener('click', () => updateCartQty(btn.dataset.id, parseInt(btn.dataset.delta)));
            });
            div.querySelector('.remove-btn').addEventListener('click', () => removeFromCart(item.cropId));
            cartItems.appendChild(div);
        });

        if (cartTotal) cartTotal.textContent = '₹' + total.toFixed(2);
        if (placeOrderBtn) placeOrderBtn.disabled = false;
    }

    /**
     * Render order list with dynamic status
     */
    function renderOrders() {
        const orders = getOrders().filter(o => o.buyerId === user.id).reverse();

        if (!orderList) return;

        orderList.innerHTML = '';

        if (orders.length === 0) {
            if (noOrdersMsg) noOrdersMsg.style.display = 'block';
            return;
        }

        if (noOrdersMsg) noOrdersMsg.style.display = 'none';

        orders.forEach(order => {
            const total = order.items.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);
            const date = new Date(order.createdAt || Date.now()).toLocaleString();
            const div = document.createElement('div');
            div.className = 'order-item';
            div.dataset.orderId = order.id;
            div.innerHTML = `
                <div class="order-item-header">
                    <span class="order-item-id">${order.id}</span>
                    <span class="order-status ${order.status}">${order.status}</span>
                </div>
                <div class="order-item-details">
                    ${order.items.map(i => `${escapeHtml(i.name)} × ${i.qty}`).join(', ')} — ₹${total.toFixed(2)} • ${escapeHtml(date)}
                </div>
            `;
            orderList.appendChild(div);
        });
    }

    /**
     * Simulate order status updates (real-time demo)
     */
    function simulateOrderStatus(orderId) {
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);
        if (!order || order.status === 'delivered') return;

        if (order.status === 'pending') {
            order.status = 'confirmed';
        } else if (order.status === 'confirmed') {
            order.status = 'delivered';
        }
        saveOrders(orders);
        RealTimeChannel?.emit('order_status', { orderId: order.id, status: order.status, order });
        renderOrders();
    }

    /**
     * Update cart count badge
     */
    function updateCartCount() {
        const cart = getCart(user.id);
        const count = cart.reduce((acc, item) => acc + item.qty, 0);
        if (cartCount) cartCount.textContent = count;
    }

    /**
     * Place order
     */
    placeOrderBtn?.addEventListener('click', function () {
        const cart = getCart(user.id);
        if (cart.length === 0) return;

        const crops = getCrops();
        const orderItems = [];
        let valid = true;

        for (const item of cart) {
            const crop = crops.find(c => c.id === item.cropId);
            if (!crop || crop.quantity < item.qty) {
                alert(`Insufficient quantity for ${item.name}`);
                valid = false;
                break;
            }
            orderItems.push({
                cropId: item.cropId,
                name: item.name,
                price: item.price,
                qty: item.qty,
                farmerId: item.farmerId,
            });
        }

        if (!valid) return;

        const order = {
            id: 'order_' + Date.now(),
            buyerId: user.id,
            buyerName: user.name,
            items: orderItems,
            status: 'pending',
            createdAt: Date.now(),
        };

        const orders = getOrders();
        orders.push(order);
        saveOrders(orders);

        // Deduct from crop quantities
        const allCrops = getCrops();
        orderItems.forEach(item => {
            const c = allCrops.find(x => x.id === item.cropId);
            if (c) c.quantity -= item.qty;
        });
        saveCrops(allCrops);

        // Clear cart
        saveCart(user.id, []);
        renderCart();
        updateCartCount();
        renderMarketplace();
        renderOrders();
        renderPurchaseHistory();

        // Notify for real-time order status
        RealTimeChannel?.emit('order_placed', order);
        RealTimeChannel?.emit('order_status', { orderId: order.id, status: 'pending', order });

        // Simulate dynamic status updates (real-time demo)
        setTimeout(() => simulateOrderStatus(order.id), 2000);
        setTimeout(() => simulateOrderStatus(order.id), 5000);

        alert('Order placed successfully!');
    });

    // ----- Profile -----
    function hydrateProfile() {
        user = getCurrentUser() || user;
        if (buyerProfileName) buyerProfileName.textContent = user.name;
        if (buyerProfileMeta) buyerProfileMeta.textContent = `${user.email} • Buyer`;
        if (buyerProfileEmail) buyerProfileEmail.value = user.email || '';

        buyerProfilePhone.value = user.phone || '';
        buyerProfileAddress.value = user.address || '';
        buyerProfileCity.value = user.city || '';
        buyerProfilePincode.value = user.pincode || '';
        buyerProfileNote.value = user.note || '';
    }

    function validateBuyerProfile() {
        buyerProfilePhoneError.textContent = '';
        buyerProfilePhone.classList.remove('invalid');
        buyerProfilePincode.classList.remove('invalid');

        const phone = (buyerProfilePhone.value || '').trim();
        if (phone && !/^\\d{10}$/.test(phone)) {
            buyerProfilePhoneError.textContent = 'Phone must be exactly 10 digits';
            buyerProfilePhone.classList.add('invalid');
            return false;
        }
        const pin = (buyerProfilePincode.value || '').trim();
        if (pin && !/^\\d{6}$/.test(pin)) {
            buyerProfilePincode.classList.add('invalid');
            return false;
        }
        return true;
    }

    saveBuyerProfileBtn?.addEventListener('click', () => {
        if (!validateBuyerProfile()) return;
        const updated = {
            id: user.id,
            phone: (buyerProfilePhone.value || '').trim(),
            address: (buyerProfileAddress.value || '').trim(),
            city: (buyerProfileCity.value || '').trim(),
            pincode: (buyerProfilePincode.value || '').trim(),
            note: (buyerProfileNote.value || '').trim(),
        };
        updateUser(updated);
        user = getCurrentUser() || user;
        hydrateProfile();
        alert('Profile saved.');
    });

    // ----- Purchase History (deep view) -----
    function renderPurchaseHistory() {
        if (!buyerPurchaseHistory) return;
        const orders = getOrders().filter(o => o.buyerId === user.id).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        buyerPurchaseHistory.innerHTML = '';

        if (orders.length === 0) {
            if (buyerNoHistory) buyerNoHistory.style.display = 'block';
            return;
        }
        if (buyerNoHistory) buyerNoHistory.style.display = 'none';

        orders.forEach(order => {
            const total = (order.items || []).reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);
            const date = new Date(order.createdAt || Date.now()).toLocaleString();
            const div = document.createElement('div');
            div.className = 'order-item';
            div.innerHTML = `
                <div class="order-item-header">
                    <span class="order-item-id">${escapeHtml(order.id)}</span>
                    <span class="order-status ${escapeHtml(order.status || 'pending')}">${escapeHtml(order.status || 'pending')}</span>
                </div>
                <div class="order-item-details">
                    <strong>Total:</strong> ₹${total.toFixed(2)} • <strong>Placed:</strong> ${escapeHtml(date)}
                </div>
                <div class="order-item-details" style="margin-top:0.5rem">
                    ${(order.items || []).map(i => `• ${escapeHtml(i.name)} — ${i.qty} KG × ₹${parseFloat(i.price).toFixed(2)} = ₹${(parseFloat(i.price) * i.qty).toFixed(2)}`).join('<br>')}
                </div>
            `;
            buyerPurchaseHistory.appendChild(div);
        });
    }
})();
