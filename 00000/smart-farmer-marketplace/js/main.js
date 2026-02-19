/**
 * Smart Farmer Marketplace - Main Application Module
 * Handles localStorage, real-time simulation, and shared utilities
 */

// Initialize storage on first load
(function initStorage() {
    if (!localStorage.getItem('smart_farmer_users')) {
        localStorage.setItem('smart_farmer_users', JSON.stringify([]));
    }
    if (!localStorage.getItem('smart_farmer_crops')) {
        localStorage.setItem('smart_farmer_crops', JSON.stringify([]));
    }
    if (!localStorage.getItem('smart_farmer_orders')) {
        localStorage.setItem('smart_farmer_orders', JSON.stringify([]));
    }
    if (!localStorage.getItem('smart_farmer_cart')) {
        localStorage.setItem('smart_farmer_cart', JSON.stringify({}));
    }
    if (!localStorage.getItem('smart_farmer_chat_messages')) {
        localStorage.setItem('smart_farmer_chat_messages', JSON.stringify([]));
    }
})();

// Storage keys
const STORAGE_KEYS = {
    USERS: 'smart_farmer_users',
    CROPS: 'smart_farmer_crops',
    ORDERS: 'smart_farmer_orders',
    CURRENT_USER: 'smart_farmer_current_user',
    CART: 'smart_farmer_cart',
    CHAT_MESSAGES: 'smart_farmer_chat_messages',
};

/**
 * Available plans (Farmer commissions)
 * commissionRate = platform commission percentage (0.10 = 10%)
 */
const PLANS = [
    {
        id: 'basic',
        name: 'Basic',
        pricePerMonth: 0,
        commissionRate: 0.10,
        features: ['List crops', 'Buyer discovery', 'Orders & chat'],
    },
    {
        id: 'pro',
        name: 'Pro',
        pricePerMonth: 499,
        commissionRate: 0.05,
        features: ['Lower commission', 'Priority listing', 'Sales insights'],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        pricePerMonth: 1499,
        commissionRate: 0.02,
        features: ['Lowest commission', 'Dedicated support', 'Premium analytics'],
    },
];

function getPlans() {
    return PLANS;
}

/**
 * Get current logged-in user from localStorage
 */
function getCurrentUser() {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
}

/**
 * Set current user (on login)
 */
function setCurrentUser(user) {
    if (user) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
}

/**
 * Get user by id
 */
function getUserById(userId) {
    return getUsers().find(u => u.id === userId) || null;
}

/**
 * Get all users
 */
function getUsers() {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
}

/**
 * Save users array
 */
function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

/**
 * Update a user (persist to users list). Also refreshes current_user if needed.
 */
function updateUser(updatedUser) {
    if (!updatedUser?.id) return;
    const users = getUsers();
    const idx = users.findIndex(u => u.id === updatedUser.id);
    if (idx >= 0) {
        users[idx] = { ...users[idx], ...updatedUser };
    } else {
        users.push(updatedUser);
    }
    saveUsers(users);

    const current = getCurrentUser();
    if (current && current.id === updatedUser.id) {
        setCurrentUser({ ...current, ...updatedUser });
    }
}

/**
 * Get all crops
 */
function getCrops() {
    const data = localStorage.getItem(STORAGE_KEYS.CROPS);
    return data ? JSON.parse(data) : [];
}

/**
 * Save crops array
 */
function saveCrops(crops) {
    localStorage.setItem(STORAGE_KEYS.CROPS, JSON.stringify(crops));
}

/**
 * Get all orders
 */
function getOrders() {
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return data ? JSON.parse(data) : [];
}

/**
 * Save orders array
 */
function saveOrders(orders) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

/**
 * Get cart for a user
 */
function getCart(userId) {
    const data = localStorage.getItem(STORAGE_KEYS.CART);
    const carts = data ? JSON.parse(data) : {};
    return carts[userId] || [];
}

/**
 * Save cart for a user
 */
function saveCart(userId, cart) {
    const data = localStorage.getItem(STORAGE_KEYS.CART);
    const carts = data ? JSON.parse(data) : {};
    carts[userId] = cart;
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(carts));
}

/**
 * Escapes HTML for safe rendering
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
}

/**
 * Simple tab system: buttons/links with [data-tab] and panels with [data-panel]
 * - active tab gets .active
 * - active panel gets .active
 */
function setupTabs(rootEl, defaultTab) {
    if (!rootEl) return;
    const tabs = Array.from(rootEl.querySelectorAll('[data-tab]'));
    const panels = Array.from(rootEl.querySelectorAll('[data-panel]'));

    function activate(tabId) {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
        panels.forEach(p => p.classList.toggle('active', p.dataset.panel === tabId));
    }

    tabs.forEach(t => {
        t.addEventListener('click', (e) => {
            e.preventDefault();
            activate(t.dataset.tab);
        });
    });

    const initial = defaultTab || tabs[0]?.dataset?.tab;
    if (initial) activate(initial);
}

/**
 * Real-time simulation using BroadcastChannel (works across tabs)
 * Falls back to custom events when BroadcastChannel unavailable
 */
const RealTimeChannel = (() => {
    const CHANNEL_NAME = 'smart_farmer_realtime';
    let channel = null;

    if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(CHANNEL_NAME);
    }

    return {
        emit(event, data) {
            const payload = { event, data, ts: Date.now() };
            if (channel) {
                channel.postMessage(payload);
            }
            // Also dispatch for same-tab listeners
            window.dispatchEvent(new CustomEvent('smart_farmer_event', { detail: payload }));
        },

        on(event, callback) {
            const handler = (e) => {
                const payload = e.detail || e.data;
                if (payload && payload.event === event) {
                    callback(payload.data);
                }
            };
            if (channel) {
                channel.addEventListener('message', handler);
            }
            window.addEventListener('smart_farmer_event', handler);
            return () => {
                if (channel) channel.removeEventListener('message', handler);
                window.removeEventListener('smart_farmer_event', handler);
            };
        },
    };
})();

/**
 * Initialize Socket.io connection (attempt to connect; use RealTimeChannel as fallback)
 */
function initSocket() {
    if (typeof io === 'undefined') return null;
    try {
        const socket = io('http://localhost:3000', { autoConnect: true });
        socket.on('connect_error', () => {
            console.log('Socket server unavailable - using local real-time simulation');
        });
        return socket;
    } catch (e) {
        return null;
    }
}
