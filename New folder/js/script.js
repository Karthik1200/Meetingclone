// Main Script for ConferMeet

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Check authentication and update UI
    const userData = getUserData();
    if (userData) {
        updateUIForAuthenticatedUser();
    }

    // Handle contact form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };

            // Show success message
            showAlert('Thank you for your message! We will get back to you soon.', 'success');
            contactForm.reset();
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && document.querySelector(href)) {
                e.preventDefault();
                document.querySelector(href).scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Update UI for authenticated users
function updateUIForAuthenticatedUser() {
    const startMeetingBtn = document.querySelector('a[href="login.html"]');
    if (startMeetingBtn) {
        startMeetingBtn.href = 'meeting.html';
        startMeetingBtn.innerHTML = '<i class="bi bi-play-circle me-2"></i>Start a Meeting';
    }
}

// Function to show alerts
function showAlert(message, type = 'info') {
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show position-fixed" 
             role="alert" style="top: 80px; right: 20px; z-index: 9999; min-width: 300px;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', alertHTML);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = document.querySelector('.alert-dismissible');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

// Animation for elements on scroll
function observeElements() {
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card').forEach(el => observer.observe(el));
}

observeElements();

// Handle meeting join
function joinMeeting(meetingCode, userName) {
    if (!meetingCode || !userName) {
        showAlert('Please enter meeting code and name', 'warning');
        return false;
    }
    
    // Store meeting info in sessionStorage
    sessionStorage.setItem('meetingCode', meetingCode);
    sessionStorage.setItem('userName', userName);
    
    // Redirect to meeting
    window.location.href = 'meeting.html';
    return false;
}
