document.addEventListener('DOMContentLoaded', function () {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };

            showAlert('Thank you for your message! We will get back to you soon.', 'success');
            contactForm.reset();
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
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

function showAlert(message, type = 'info') {
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show position-fixed" 
             role="alert" style="top: 80px; right: 20px; z-index: 9999; min-width: 300px;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', alertHTML);

    setTimeout(() => {
        const alert = document.querySelector('.alert-dismissible');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

function observeElements() {
    const observer = new IntersectionObserver(function (entries) {
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

function joinMeeting(meetingCode, userName) {
    if (!meetingCode || !userName) {
        showAlert('Please enter meeting code and name', 'warning');
        return false;
    }

    sessionStorage.setItem('meetingCode', meetingCode);
    sessionStorage.setItem('userName', userName);

    window.location.href = 'meeting.html';
    return false;
}
