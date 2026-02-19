/**
 * Smart Farmer Marketplace - Chat Module
 * Real-time chat using BroadcastChannel simulation (+ Socket.io when server available)
 */

(function () {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Elements
    const chatUserName = document.getElementById('chatUserName');
    const chatLogout = document.getElementById('chatLogout');
    const dashboardLink = document.getElementById('dashboardLink');
    const userList = document.getElementById('userList');
    const chatWithUser = document.getElementById('chatWithUser');
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const chatInputArea = document.getElementById('chatInputArea');

    // State
    let selectedUserId = null;
    const CHAT_STORAGE_KEY = 'smart_farmer_chat_messages';

    // Initialize
    if (chatUserName) chatUserName.textContent = user.name;

    // Role-based dashboard link
    if (dashboardLink) {
        dashboardLink.href = user.role === 'farmer' ? 'farmer-dashboard.html' : 'buyer-dashboard.html';
    }

    chatLogout?.addEventListener('click', () => {
        setCurrentUser(null);
        window.location.href = 'index.html';
    });

    /**
     * Get all users except current
     */
    function getOtherUsers() {
        return getUsers().filter(u => u.id !== user.id);
    }

    /**
     * Get chat messages between current user and another user
     */
    function getChatMessages(otherUserId) {
        const data = localStorage.getItem(CHAT_STORAGE_KEY);
        const all = data ? JSON.parse(data) : [];
        return all.filter(
            m =>
                (m.fromId === user.id && m.toId === otherUserId) ||
                (m.fromId === otherUserId && m.toId === user.id)
        ).sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Save a new message
     */
    function saveMessage(fromId, toId, text) {
        const data = localStorage.getItem(CHAT_STORAGE_KEY);
        const all = data ? JSON.parse(data) : [];
        all.push({
            id: 'msg_' + Date.now(),
            fromId,
            toId,
            text,
            timestamp: Date.now(),
        });
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(all));
    }

    /**
     * Render user list
     */
    function renderUserList() {
        const users = getOtherUsers();

        if (!userList) return;

        userList.innerHTML = '';

        users.forEach(u => {
            const li = document.createElement('li');
            li.textContent = u.name + (u.role === 'farmer' ? ' (Farmer)' : ' (Buyer)');
            li.dataset.userId = u.id;
            li.dataset.userName = u.name;
            if (selectedUserId === u.id) li.classList.add('active');
            li.addEventListener('click', () => selectUser(u.id, u.name));
            userList.appendChild(li);
        });

        if (users.length === 0) {
            userList.innerHTML = '<li>No other users yet</li>';
        }
    }

    /**
     * Select user to chat with
     */
    function selectUser(otherId, otherName) {
        selectedUserId = otherId;
        if (chatWithUser) chatWithUser.textContent = 'Chat with ' + otherName;

        renderUserList();
        renderMessages();

        if (messageInput) messageInput.disabled = false;
        if (sendMessageBtn) sendMessageBtn.disabled = false;
        messageInput?.focus();
    }

    /**
     * Render chat messages
     */
    function renderMessages() {
        if (!chatMessages) return;

        chatMessages.innerHTML = '';

        if (!selectedUserId) {
            chatMessages.innerHTML = '<p class="chat-placeholder">Select a user from the list to start chatting.</p>';
            return;
        }

        const messages = getChatMessages(selectedUserId);

        messages.forEach(msg => {
            const isSent = msg.fromId === user.id;
            const div = document.createElement('div');
            div.className = 'chat-message ' + (isSent ? 'sent' : 'received');
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            div.innerHTML = `
                <span>${escapeHtml(msg.text)}</span>
                <div class="chat-message-meta">${time}</div>
            `;
            chatMessages.appendChild(div);
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Send message
     */
    function sendMessage() {
        const text = (messageInput?.value || '').trim();
        if (!text || !selectedUserId) return;

        saveMessage(user.id, selectedUserId, text);

        // Real-time: broadcast to other tabs
        if (typeof RealTimeChannel !== 'undefined') {
            RealTimeChannel.emit('chat_message', {
                fromId: user.id,
                toId: selectedUserId,
                text,
                timestamp: Date.now(),
            });
        }

        messageInput.value = '';
        renderMessages();
    }

    sendMessageBtn?.addEventListener('click', sendMessage);
    messageInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Listen for real-time chat updates (from other tabs)
    if (typeof RealTimeChannel !== 'undefined') {
        RealTimeChannel.on('chat_message', (data) => {
            // Only save when we're the recipient (message from another user/tab)
            if (data.toId === user.id) {
                saveMessage(data.fromId, data.toId, data.text);
            }
            if (selectedUserId && (data.fromId === selectedUserId || data.toId === selectedUserId)) {
                renderMessages();
            }
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initial render
    renderUserList();
})();
