/**
 * Smart Farmer Marketplace - Form Validation Module
 * Handles client-side validation for Register, Login, and Add Crop forms
 */

const Validation = {
    // Regular expressions for validation
    patterns: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^\d{10}$/,
        url: /^https?:\/\/.+/,
    },

    /**
     * Clear error message for an input
     */
    clearError(inputId, errorId) {
        const input = document.getElementById(inputId);
        const error = document.getElementById(errorId);
        if (input) input.classList.remove('invalid');
        if (error) error.textContent = '';
    },

    /**
     * Show error message for an input
     */
    showError(inputId, errorId, message) {
        const input = document.getElementById(inputId);
        const error = document.getElementById(errorId);
        if (input) {
            input.classList.add('invalid');
        }
        if (error) {
            error.textContent = message;
        }
    },

    /**
     * Validate Register form
     * Returns true if valid, false otherwise
     */
    validateRegister() {
        const name = document.getElementById('regName')?.value?.trim();
        const email = document.getElementById('regEmail')?.value?.trim();
        const phone = document.getElementById('regPhone')?.value?.trim();
        const password = document.getElementById('regPassword')?.value;
        let isValid = true;

        // Clear previous errors
        ['regNameError', 'regEmailError', 'regPhoneError', 'regPasswordError'].forEach(id => {
            const err = document.getElementById(id);
            if (err) err.textContent = '';
        });
        document.querySelectorAll('#registerForm input').forEach(i => i.classList.remove('invalid'));

        // Name - required
        if (!name) {
            this.showError('regName', 'regNameError', 'Name cannot be empty');
            isValid = false;
        }

        // Email - valid format
        if (!email) {
            this.showError('regEmail', 'regEmailError', 'Email is required');
            isValid = false;
        } else if (!this.patterns.email.test(email)) {
            this.showError('regEmail', 'regEmailError', 'Please enter a valid email format');
            isValid = false;
        }

        // Phone - exactly 10 digits
        if (!phone) {
            this.showError('regPhone', 'regPhoneError', 'Phone number is required');
            isValid = false;
        } else if (!this.patterns.phone.test(phone)) {
            this.showError('regPhone', 'regPhoneError', 'Phone must be exactly 10 digits');
            isValid = false;
        }

        // Password - minimum 6 characters
        if (!password) {
            this.showError('regPassword', 'regPasswordError', 'Password is required');
            isValid = false;
        } else if (password.length < 6) {
            this.showError('regPassword', 'regPasswordError', 'Password must be at least 6 characters');
            isValid = false;
        }

        return isValid;
    },

    /**
     * Validate Login form
     */
    validateLogin() {
        const email = document.getElementById('loginEmail')?.value?.trim();
        const password = document.getElementById('loginPassword')?.value;
        let isValid = true;

        document.getElementById('loginEmailError').textContent = '';
        document.getElementById('loginPasswordError').textContent = '';
        document.querySelectorAll('#loginForm input').forEach(i => i.classList.remove('invalid'));

        if (!email) {
            this.showError('loginEmail', 'loginEmailError', 'Email is required');
            isValid = false;
        }

        if (!password) {
            this.showError('loginPassword', 'loginPasswordError', 'Password is required');
            isValid = false;
        }

        return isValid;
    },

    /**
     * Validate Add Crop form
     */
    validateAddCrop() {
        const cropName = document.getElementById('cropName')?.value?.trim();
        const quantity = document.getElementById('cropQuantity')?.value;
        const price = document.getElementById('cropPrice')?.value;
        const imageUrl = document.getElementById('cropImage')?.value?.trim();
        let isValid = true;

        ['cropNameError', 'cropQuantityError', 'cropPriceError', 'cropImageError'].forEach(id => {
            const err = document.getElementById(id);
            if (err) err.textContent = '';
        });
        document.querySelectorAll('#addCropForm input').forEach(i => i.classList.remove('invalid'));

        // Crop name - required
        if (!cropName) {
            this.showError('cropName', 'cropNameError', 'Crop name is required');
            isValid = false;
        }

        // Quantity - positive number
        const qtyNum = parseFloat(quantity);
        if (!quantity || isNaN(qtyNum) || qtyNum <= 0) {
            this.showError('cropQuantity', 'cropQuantityError', 'Quantity must be a positive number');
            isValid = false;
        }

        // Price - positive number
        const priceNum = parseFloat(price);
        if (!price || isNaN(priceNum) || priceNum <= 0) {
            this.showError('cropPrice', 'cropPriceError', 'Price must be a positive number');
            isValid = false;
        }

        // Image URL - valid format (optional but if provided must be valid)
        if (imageUrl && !this.patterns.url.test(imageUrl)) {
            this.showError('cropImage', 'cropImageError', 'Please enter a valid URL (e.g. https://...)');
            isValid = false;
        }

        return isValid;
    },
};
