/**
 * Smart Farmer Marketplace - Farmer Dashboard Module
 * Handles add/edit/delete crops, real-time updates
 */

(function () {
    let user = getCurrentUser();
    if (!user || user.role !== 'farmer') {
        window.location.href = 'login.html';
        return;
    }

    // Elements
    const farmerName = document.getElementById('farmerName');
    const farmerLogout = document.getElementById('farmerLogout');
    const addCropForm = document.getElementById('addCropForm');
    const farmerCropList = document.getElementById('farmerCropList');
    const noCropsMsg = document.getElementById('noCropsMsg');
    const editModal = document.getElementById('editCropModal');
    const editCropForm = document.getElementById('editCropForm');
    const closeEditModal = document.getElementById('closeEditModal');
    const farmerApp = document.getElementById('farmerApp');

    // Overview stats
    const statActiveListings = document.getElementById('statActiveListings');
    const statTotalSales = document.getElementById('statTotalSales');
    const statCommissionRate = document.getElementById('statCommissionRate');
    const statNetEarnings = document.getElementById('statNetEarnings');

    // Quick actions
    const goToAddCrop = document.getElementById('goToAddCrop');
    const goToSales = document.getElementById('goToSales');
    const goToProfile = document.getElementById('goToProfile');

    // Orders
    const farmerOrdersTable = document.getElementById('farmerOrdersTable');
    const noFarmerOrdersMsg = document.getElementById('noFarmerOrdersMsg');

    // Profile
    const farmerProfileName = document.getElementById('farmerProfileName');
    const farmerProfileMeta = document.getElementById('farmerProfileMeta');
    const farmerPlanPill = document.getElementById('farmerPlanPill');
    const saveFarmerProfileBtn = document.getElementById('saveFarmerProfileBtn');
    const farmerAvatar = document.getElementById('farmerAvatar');
    const farmerAvatarInput = document.getElementById('farmerAvatarInput');
    const farmerProfilePhone = document.getElementById('farmerProfilePhone');
    const farmerProfilePhoneError = document.getElementById('farmerProfilePhoneError');
    const farmerProfileEmail = document.getElementById('farmerProfileEmail');
    const farmerProfileFarmName = document.getElementById('farmerProfileFarmName');
    const farmerProfileAddress = document.getElementById('farmerProfileAddress');
    const farmerProfileCity = document.getElementById('farmerProfileCity');
    const farmerProfilePincode = document.getElementById('farmerProfilePincode');
    const farmerProfileBio = document.getElementById('farmerProfileBio');
    const farmerPlans = document.getElementById('farmerPlans');

    // Initialize
    if (farmerName) farmerName.textContent = user.name;
    setupTabs(farmerApp, 'overview');
    loadFarmerCrops();
    renderOverview();
    renderOrders();
    hydrateProfile();
    renderPlans();

    // Logout
    farmerLogout?.addEventListener('click', () => {
        setCurrentUser(null);
        window.location.href = 'index.html';
    });

    goToAddCrop?.addEventListener('click', () => activatePanel('crops'));
    goToSales?.addEventListener('click', () => activatePanel('sales'));
    goToProfile?.addEventListener('click', () => activatePanel('profile'));

    function activatePanel(panelId) {
        // uses the shared tabs system
        const tab = farmerApp?.querySelector(`[data-tab=\"${panelId}\"]`);
        tab?.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Get crops belonging to current farmer
     */
    function getFarmerCrops() {
        return getCrops().filter(c => c.farmerId === user.id);
    }

    function getFarmerPlan() {
        const plans = getPlans();
        const planId = user.planId || 'basic';
        return plans.find(p => p.id === planId) || plans[0];
    }

    function getFarmerOrderLines() {
        // all order items that belong to this farmer
        const orders = getOrders();
        const lines = [];
        orders.forEach(order => {
            const relevant = (order.items || []).filter(i => i.farmerId === user.id);
            if (relevant.length === 0) return;
            const total = relevant.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);
            lines.push({ order, items: relevant, total });
        });
        return lines.sort((a, b) => (b.order.createdAt || 0) - (a.order.createdAt || 0));
    }

    function renderOverview() {
        const crops = getFarmerCrops();
        const activeListings = crops.filter(c => c.quantity > 0).length;
        const lines = getFarmerOrderLines();
        const totalSales = lines.reduce((s, l) => s + l.total, 0);
        const plan = getFarmerPlan();
        const net = totalSales * (1 - plan.commissionRate);

        if (statActiveListings) statActiveListings.textContent = String(activeListings);
        if (statTotalSales) statTotalSales.textContent = '₹' + totalSales.toFixed(2);
        if (statCommissionRate) statCommissionRate.textContent = Math.round(plan.commissionRate * 100) + '%';
        if (statNetEarnings) statNetEarnings.textContent = '₹' + net.toFixed(2);
        if (farmerPlanPill) farmerPlanPill.textContent = `Plan: ${plan.name}`;
    }

    /**
     * Load and render farmer's crop list
     */
    function loadFarmerCrops() {
        const crops = getFarmerCrops();

        if (!farmerCropList) return;

        farmerCropList.innerHTML = '';

        if (crops.length === 0) {
            if (noCropsMsg) noCropsMsg.style.display = 'block';
            return;
        }

        if (noCropsMsg) noCropsMsg.style.display = 'none';

        crops.forEach(crop => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <img src="${crop.imageUrl || 'https://via.placeholder.com/50?text=Crop'}" alt="${crop.name}" onerror="this.src='https://via.placeholder.com/50?text=Crop'">
                </td>
                <td>${escapeHtml(crop.name)}</td>
                <td>${crop.quantity}</td>
                <td>₹${parseFloat(crop.price).toFixed(2)}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-outline edit-crop-btn" data-id="${crop.id}">Edit</button>
                        <button class="btn btn-outline delete-crop-btn" data-id="${crop.id}" style="color:#dc3545;border-color:#dc3545">Delete</button>
                    </div>
                </td>
            `;
            farmerCropList.appendChild(tr);
        });

        // Attach event listeners
        farmerCropList.querySelectorAll('.edit-crop-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id));
        });
        farmerCropList.querySelectorAll('.delete-crop-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteCrop(btn.dataset.id));
        });

        renderOverview();
    }

    /**
     * Add new crop
     */
    addCropForm?.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!Validation.validateAddCrop()) return;

        const cropName = document.getElementById('cropName').value.trim();
        const quantity = parseFloat(document.getElementById('cropQuantity').value);
        const price = parseFloat(document.getElementById('cropPrice').value);
        const imageUrl = document.getElementById('cropImage').value.trim();

        const crops = getCrops();
        const newCrop = {
            id: 'crop_' + Date.now(),
            farmerId: user.id,
            farmerName: user.name,
            name: cropName,
            quantity,
            price,
            imageUrl: imageUrl || 'https://via.placeholder.com/200?text=Crop',
        };

        crops.push(newCrop);
        saveCrops(crops);

        // Real-time: notify buyer dashboard
        if (typeof RealTimeChannel !== 'undefined') {
            RealTimeChannel.emit('crop_added', newCrop);
        }

        // Reset form
        addCropForm.reset();
        document.querySelectorAll('#addCropForm .error-msg').forEach(el => el.textContent = '');
        loadFarmerCrops();
    });

    /**
     * Open edit modal
     */
    function openEditModal(cropId) {
        const crops = getCrops();
        const crop = crops.find(c => c.id === cropId);
        if (!crop || crop.farmerId !== user.id) return;

        document.getElementById('editCropId').value = crop.id;
        document.getElementById('editCropName').value = crop.name;
        document.getElementById('editCropQuantity').value = crop.quantity;
        document.getElementById('editCropPrice').value = crop.price;
        document.getElementById('editCropImage').value = crop.imageUrl || '';
        editModal.classList.add('active');
    }

    /**
     * Save edit
     */
    editCropForm?.addEventListener('submit', function (e) {
        e.preventDefault();
        const id = document.getElementById('editCropId').value;
        const crops = getCrops();
        const idx = crops.findIndex(c => c.id === id);
        if (idx === -1 || crops[idx].farmerId !== user.id) return;

        crops[idx].name = document.getElementById('editCropName').value.trim();
        crops[idx].quantity = parseFloat(document.getElementById('editCropQuantity').value);
        crops[idx].price = parseFloat(document.getElementById('editCropPrice').value);
        crops[idx].imageUrl = document.getElementById('editCropImage').value.trim() || crops[idx].imageUrl;

        saveCrops(crops);
        RealTimeChannel?.emit('crop_updated', crops[idx]);
        editModal.classList.remove('active');
        loadFarmerCrops();
    });

    /**
     * Delete crop
     */
    function deleteCrop(cropId) {
        if (!confirm('Are you sure you want to delete this crop?')) return;

        let crops = getCrops();
        crops = crops.filter(c => !(c.id === cropId && c.farmerId === user.id));
        saveCrops(crops);
        RealTimeChannel?.emit('crop_deleted', { id: cropId });
        loadFarmerCrops();
    }

    closeEditModal?.addEventListener('click', () => editModal.classList.remove('active'));
    editModal?.addEventListener('click', (e) => {
        if (e.target === editModal) editModal.classList.remove('active');
    });

    // ----- Orders (Sales) -----
    function renderOrders() {
        if (!farmerOrdersTable) return;
        const lines = getFarmerOrderLines();
        farmerOrdersTable.innerHTML = '';

        if (lines.length === 0) {
            if (noFarmerOrdersMsg) noFarmerOrdersMsg.style.display = 'block';
            return;
        }
        if (noFarmerOrdersMsg) noFarmerOrdersMsg.style.display = 'none';

        lines.forEach(({ order, items, total }) => {
            const tr = document.createElement('tr');
            const itemText = items.map(i => `${escapeHtml(i.name)} × ${i.qty}`).join(', ');
            const status = order.status || 'pending';
            const next = status === 'pending' ? 'Confirm' : status === 'confirmed' ? 'Deliver' : 'Done';
            const disabled = status === 'delivered' ? 'disabled' : '';

            tr.innerHTML = `
                <td>${escapeHtml(order.id)}</td>
                <td>${escapeHtml(order.buyerName || 'Buyer')}</td>
                <td>${itemText}</td>
                <td>₹${total.toFixed(2)}</td>
                <td><span class="order-status ${status}">${escapeHtml(status)}</span></td>
                <td>
                    <button class="btn btn-outline advance-order-btn" data-id="${escapeHtml(order.id)}" ${disabled}>${next}</button>
                </td>
            `;
            farmerOrdersTable.appendChild(tr);
        });

        farmerOrdersTable.querySelectorAll('.advance-order-btn').forEach(btn => {
            btn.addEventListener('click', () => advanceOrderStatus(btn.dataset.id));
        });
    }

    function advanceOrderStatus(orderId) {
        const orders = getOrders();
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx < 0) return;

        const current = orders[idx].status || 'pending';
        const next = current === 'pending' ? 'confirmed' : current === 'confirmed' ? 'delivered' : 'delivered';
        orders[idx].status = next;
        saveOrders(orders);

        // Real-time notify buyer tabs
        RealTimeChannel?.emit('order_status', { orderId, status: next, order: orders[idx] });

        renderOrders();
        renderOverview();
    }

    // Keep orders updated cross-tab
    window.addEventListener('storage', (e) => {
        if (e.key === 'smart_farmer_orders') {
            renderOrders();
            renderOverview();
        }
    });
    RealTimeChannel?.on('order_placed', () => {
        renderOrders();
        renderOverview();
    });

    // ----- Profile & Plans -----
    function hydrateProfile() {
        user = getCurrentUser() || user;
        if (farmerProfileName) farmerProfileName.textContent = user.name;
        if (farmerProfileMeta) farmerProfileMeta.textContent = `${user.email} • Farmer`;
        if (farmerProfileEmail) farmerProfileEmail.value = user.email || '';
        if (farmerAvatar) {
            if (user.avatar) {
                farmerAvatar.innerHTML = '';
                const img = document.createElement('img');
                img.src = user.avatar;
                img.alt = user.name;
                farmerAvatar.appendChild(img);
            } else {
                farmerAvatar.textContent = '👨‍🌾';
            }
        }

        farmerProfilePhone.value = user.phone || '';
        farmerProfileFarmName.value = user.farmName || '';
        farmerProfileAddress.value = user.address || '';
        farmerProfileCity.value = user.city || '';
        farmerProfilePincode.value = user.pincode || '';
        farmerProfileBio.value = user.bio || '';
        renderOverview();
    }

    function validateProfile() {
        farmerProfilePhoneError.textContent = '';
        farmerProfilePhone.classList.remove('invalid');

        const phone = (farmerProfilePhone.value || '').trim();
        if (phone && !/^\\d{10}$/.test(phone)) {
            farmerProfilePhoneError.textContent = 'Phone must be exactly 10 digits';
            farmerProfilePhone.classList.add('invalid');
            return false;
        }
        const pin = (farmerProfilePincode.value || '').trim();
        if (pin && !/^\\d{6}$/.test(pin)) {
            farmerProfilePincode.classList.add('invalid');
            return false;
        }
        farmerProfilePincode.classList.remove('invalid');
        return true;
    }

    saveFarmerProfileBtn?.addEventListener('click', () => {
        if (!validateProfile()) return;
        const updated = {
            id: user.id,
            phone: (farmerProfilePhone.value || '').trim(),
            farmName: (farmerProfileFarmName.value || '').trim(),
            address: (farmerProfileAddress.value || '').trim(),
            city: (farmerProfileCity.value || '').trim(),
            pincode: (farmerProfilePincode.value || '').trim(),
            bio: (farmerProfileBio.value || '').trim(),
        };
        updateUser(updated);
        user = getCurrentUser() || user;
        hydrateProfile();
        alert('Profile saved.');
    });

    farmerAvatarInput?.addEventListener('change', function () {
        const file = this.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            updateUser({ id: user.id, avatar: dataUrl });
            user = getCurrentUser() || user;
            hydrateProfile();
            alert('Profile photo updated.');
        };
        reader.readAsDataURL(file);
        this.value = '';
    });

    function renderPlans() {
        if (!farmerPlans) return;
        const plans = getPlans();
        const currentPlanId = user.planId || 'basic';
        farmerPlans.innerHTML = '';

        plans.forEach(p => {
            const div = document.createElement('div');
            div.className = 'plan-card' + (p.id === currentPlanId ? ' active' : '');
            const priceText = p.pricePerMonth === 0 ? 'Free' : `₹${p.pricePerMonth}/month`;
            div.innerHTML = `
                <div class="plan-name">${escapeHtml(p.name)}</div>
                <div class="plan-price">${escapeHtml(priceText)}</div>
                <div class="plan-commission">Commission: ${Math.round(p.commissionRate * 100)}%</div>
                <ul class="plan-features">
                    ${p.features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
                </ul>
                <button class="btn btn-primary" data-plan="${escapeHtml(p.id)}" ${p.id === currentPlanId ? 'disabled' : ''}>
                    ${p.id === currentPlanId ? 'Current Plan' : 'Choose Plan'}
                </button>
            `;
            div.querySelector('button')?.addEventListener('click', () => choosePlan(p.id));
            farmerPlans.appendChild(div);
        });
    }

    function choosePlan(planId) {
        updateUser({ id: user.id, planId });
        user = getCurrentUser() || user;
        renderPlans();
        renderOverview();
        alert('Plan updated.');
    }
})();
