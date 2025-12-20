// Authentication Script (Login & Signup)

document.addEventListener('DOMContentLoaded', function() {
    // Determine current page
    const isLoginPage = document.getElementById('loginForm');
    const isSignupPage = document.getElementById('signupForm');

    if (isLoginPage) {
        initLoginPage();
    } else if (isSignupPage) {
        initSignupPage();
    }

    // Check if user is already logged in
    checkAuthStatus();
});

// ========== AUTHENTICATION STATE MANAGEMENT ==========

function checkAuthStatus() {
    const authToken = localStorage.getItem('authToken');
    const currentPage = window.location.pathname;

    // If logged in and on login/signup page, redirect to dashboard
    if (authToken && (currentPage.includes('login.html') || currentPage.includes('signup.html'))) {
        window.location.href = 'index.html';
    }
}

function setAuthToken(token, userData) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));
}

function getAuthToken() {
    return localStorage.getItem('authToken');
}

function getUserData() {
    const data = localStorage.getItem('userData');
    return data ? JSON.parse(data) : null;
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = 'login.html';
}

// ========== LOGIN PAGE INITIALIZATION ==========

function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Password visibility toggle
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function() {
            togglePasswordVisibility(passwordInput, togglePasswordBtn);
        });
    }

    // Form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });

    // Load saved email if "Remember me" was checked
    loadSavedEmail();
}

function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const alertContainer = document.getElementById('alertContainer');

    // Clear previous alerts
    alertContainer.innerHTML = '';

    // Validation
    if (!email || !password) {
        showAlert(alertContainer, 'Please enter email and password', 'danger');
        return;
    }

    if (!validateEmail(email)) {
        showAlert(alertContainer, 'Please enter a valid email address', 'danger');
        return;
    }

    if (password.length < 6) {
        showAlert(alertContainer, 'Password must be at least 6 characters', 'danger');
        return;
    }

    // Simulate login (Replace with actual API call)
    simulateLogin(email, password, rememberMe, alertContainer);
}

function simulateLogin(email, password, rememberMe, alertContainer) {
    // Show loading state
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Signing in...';

    // Simulate API call (500ms delay)
    setTimeout(() => {
        // Mock authentication - In real app, this would be an API call
        if (email && password) {
            // Success
            const userData = {
                email: email,
                name: email.split('@')[0],
                id: 'user_' + Math.random().toString(36).substr(2, 9),
                joinedDate: new Date().toISOString()
            };

            const token = 'token_' + Math.random().toString(36).substr(2, 20);

            // Save credentials if remember me is checked
            if (rememberMe) {
                localStorage.setItem('savedEmail', email);
            } else {
                localStorage.removeItem('savedEmail');
            }

            // Set authentication
            setAuthToken(token, userData);

            showAlert(alertContainer, 'Login successful! Redirecting...', 'success');

            // Redirect after 1 second
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            // Failure
            showAlert(alertContainer, 'Invalid email or password', 'danger');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }, 500);
}

function loadSavedEmail() {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
        document.getElementById('rememberMe').checked = true;
    }
}

// ========== SIGNUP PAGE INITIALIZATION ==========

function initSignupPage() {
    const signupForm = document.getElementById('signupForm');
    const passwordInput = document.getElementById('signupPassword');
    const togglePasswordBtn = document.getElementById('toggleSignupPassword');
    const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // Password visibility toggles
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function() {
            togglePasswordVisibility(passwordInput, togglePasswordBtn);
        });
    }

    if (toggleConfirmPasswordBtn) {
        toggleConfirmPasswordBtn.addEventListener('click', function() {
            togglePasswordVisibility(confirmPasswordInput, toggleConfirmPasswordBtn);
        });
    }

    // Password strength checker
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }

    // Form submission
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleSignup();
    });
}

function checkPasswordStrength() {
    const password = document.getElementById('signupPassword').value;
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');

    let strength = 0;
    const feedback = [];

    // Length check
    if (password.length >= 8) strength += 1;
    else feedback.push('At least 8 characters');

    // Uppercase check
    if (/[A-Z]/.test(password)) strength += 1;
    else feedback.push('Uppercase letter');

    // Lowercase check
    if (/[a-z]/.test(password)) strength += 1;
    else feedback.push('Lowercase letter');

    // Number check
    if (/[0-9]/.test(password)) strength += 1;
    else feedback.push('Number');

    // Special character check
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;
    else feedback.push('Special character');

    // Update strength indicator
    const strengthPercentage = (strength / 5) * 100;
    strengthBar.style.width = strengthPercentage + '%';

    // Remove all strength classes
    strengthBar.classList.remove('weak', 'fair', 'good', 'strong');
    strengthText.classList.remove('weak', 'fair', 'good', 'strong');

    // Add appropriate class and text
    if (password.length === 0) {
        strengthBar.style.width = '0%';
        strengthText.textContent = 'Not set';
        strengthText.className = 'text-muted';
    } else if (strength <= 2) {
        strengthBar.classList.add('weak');
        strengthText.classList.add('weak');
        strengthText.textContent = 'Weak - Add: ' + feedback.join(', ');
    } else if (strength === 3) {
        strengthBar.classList.add('fair');
        strengthText.classList.add('fair');
        strengthText.textContent = 'Fair - Add: ' + feedback.join(', ');
    } else if (strength === 4) {
        strengthBar.classList.add('good');
        strengthText.classList.add('good');
        strengthText.textContent = 'Good';
    } else {
        strengthBar.classList.add('strong');
        strengthText.classList.add('strong');
        strengthText.textContent = 'Strong';
    }
}

function handleSignup() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    const alertContainer = document.getElementById('alertContainer');

    // Clear previous alerts
    alertContainer.innerHTML = '';

    // Validation
    if (!firstName || !lastName) {
        showAlert(alertContainer, 'Please enter your first and last name', 'danger');
        return;
    }

    if (!email) {
        showAlert(alertContainer, 'Please enter your email address', 'danger');
        return;
    }

    if (!validateEmail(email)) {
        showAlert(alertContainer, 'Please enter a valid email address', 'danger');
        return;
    }

    if (password.length < 8) {
        showAlert(alertContainer, 'Password must be at least 8 characters', 'danger');
        return;
    }

    if (password !== confirmPassword) {
        showAlert(alertContainer, 'Passwords do not match', 'danger');
        return;
    }

    if (!agreeTerms) {
        showAlert(alertContainer, 'Please agree to the Terms of Service and Privacy Policy', 'danger');
        return;
    }

    // Validate password strength
    if (!validatePasswordStrength(password)) {
        showAlert(alertContainer, 'Password must contain uppercase, lowercase, number, and special character', 'danger');
        return;
    }

    // Simulate signup (Replace with actual API call)
    simulateSignup(firstName, lastName, email, password, alertContainer);
}

function validatePasswordStrength(password) {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return hasUppercase && hasLowercase && hasNumber && hasSpecial;
}

function simulateSignup(firstName, lastName, email, password, alertContainer) {
    // Show loading state
    const submitBtn = document.querySelector('#signupForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Creating account...';

    // Simulate API call (1000ms delay)
    setTimeout(() => {
        // Mock account creation - In real app, this would be an API call
        if (email && password) {
            // Success
            const userData = {
                email: email,
                name: firstName + ' ' + lastName,
                id: 'user_' + Math.random().toString(36).substr(2, 9),
                joinedDate: new Date().toISOString()
            };

            const token = 'token_' + Math.random().toString(36).substr(2, 20);

            // Set authentication
            setAuthToken(token, userData);

            showAlert(alertContainer, 'Account created successfully! Redirecting...', 'success');

            // Redirect after 1.5 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showAlert(alertContainer, 'An error occurred. Please try again.', 'danger');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }, 1000);
}

// ========== UTILITY FUNCTIONS ==========

function togglePasswordVisibility(input, button) {
    if (input.type === 'password') {
        input.type = 'text';
        button.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
        input.type = 'password';
        button.innerHTML = '<i class="bi bi-eye"></i>';
    }
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showAlert(container, message, type = 'info') {
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="bi bi-${getAlertIcon(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    container.innerHTML = alertHTML;

    // Auto-dismiss after 5 seconds if success
    if (type === 'success') {
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

function getAlertIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'danger': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

// ========== UPDATE INDEX PAGE FOR AUTHENTICATED USERS ==========

function updateNavbarForAuthenticatedUser() {
    const userData = getUserData();
    if (!userData) return;

    // Check if navbar exists
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // Find the navbar nav
    const navbarNav = navbar.querySelector('.navbar-nav');
    if (!navbarNav) return;

    // Create user profile dropdown
    const userDropdown = document.createElement('li');
    userDropdown.className = 'nav-item dropdown';
    userDropdown.innerHTML = `
        <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown">
            <i class="bi bi-person-circle me-1"></i>${userData.name}
        </a>
        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
            <li><a class="dropdown-item" href="#"><i class="bi bi-gear me-2"></i>Settings</a></li>
            <li><a class="dropdown-item" href="#"><i class="bi bi-clock-history me-2"></i>Meeting History</a></li>
            <li><a class="dropdown-item" href="#"><i class="bi bi-person me-2"></i>Profile</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" href="#" onclick="logout()"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
        </ul>
    `;

    // Hide login/signup links for unauthenticated users
    const loginBtn = navbarNav.querySelector('a[href="login.html"]');
    if (loginBtn) {
        loginBtn.parentElement.remove();
    }

    // Add user dropdown
    navbarNav.appendChild(userDropdown);
}

// Check authentication on page load
window.addEventListener('load', function() {
    if (getAuthToken()) {
        updateNavbarForAuthenticatedUser();
    }
});

// Require authentication for meeting pages
function requireAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}
