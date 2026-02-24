/**
 * Smart Farmer Marketplace - Authentication Module
 * Handles Register, Login, and role-based redirection
 */

(function () {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    /**
     * Register new user
     */
    if (registerForm) {
        registerForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!Validation.validateRegister()) {
                return;
            }

            const name = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim().toLowerCase();
            const phone = document.getElementById('regPhone').value.trim();
            const password = document.getElementById('regPassword').value;
            const role = document.getElementById('regRole').value;

            const users = getUsers();

            // Check if email already exists
            if (users.some(u => u.email.toLowerCase() === email)) {
                Validation.showError('regEmail', 'regEmailError', 'Email already registered');
                return;
            }

            const newUser = {
                id: 'user_' + Date.now(),
                name,
                email,
                phone,
                password,
                role,
                // profile defaults
                address: '',
                city: '',
                pincode: '',
                bio: '',
                farmName: '',
                note: '',
                // farmer defaults
                planId: role === 'farmer' ? 'basic' : undefined,
            };

            users.push(newUser);
            saveUsers(users);

            // Auto-login and redirect
            setCurrentUser(newUser);
            const redirect = newUser.role === 'farmer' ? 'farmer-dashboard.html' : 'buyer-dashboard.html';
            window.location.href = redirect;
        });
    }

    /**
     * Login user
     */
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!Validation.validateLogin()) {
                return;
            }

            const email = document.getElementById('loginEmail').value.trim().toLowerCase();
            const password = document.getElementById('loginPassword').value;

            const users = getUsers();
            const user = users.find(u => u.email.toLowerCase() === email && u.password === password);

            if (!user) {
                Validation.showError('loginPassword', 'loginPasswordError', 'Invalid email or password');
                return;
            }

            setCurrentUser(user);

            // Role-based redirection
            const redirect = user.role === 'farmer' ? 'farmer-dashboard.html' : 'buyer-dashboard.html';
            window.location.href = redirect;
        });
    }
})();
