// Meeting Room Script

let isMicMuted = false;
let isCameraOff = false;
let isScreenSharing = false;
let isHandRaised = false;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize meeting
    initMeeting();
    
    // Handle participant actions
    setupEventListeners();
});

function initMeeting() {
    // Get user info from localStorage
    const userData = getUserData();
    const meetingCode = sessionStorage.getItem('meetingCode') || 'abc-defg-hij';
    
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }
    
    // Update meeting code display
    const codeElement = document.querySelector('.meeting-code');
    if (codeElement) {
        codeElement.innerHTML = `<small>Meeting Code: <span class="badge bg-success">${meetingCode}</span></small>`;
    }
    
    console.log(`User ${userData.name} joined meeting: ${meetingCode}`);
}

function setupEventListeners() {
    // Make video thumbnails clickable
    document.querySelectorAll('.video-thumbnail').forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            switchMainVideo(this);
        });
    });
}

// Toggle Microphone
function toggleMic() {
    const micBtn = document.getElementById('micBtn');
    isMicMuted = !isMicMuted;
    
    if (isMicMuted) {
        micBtn.classList.add('muted');
        micBtn.innerHTML = '<i class="bi bi-mic-mute"></i>';
        micBtn.style.backgroundColor = '#ea4335';
        showNotification('Microphone muted');
    } else {
        micBtn.classList.remove('muted');
        micBtn.innerHTML = '<i class="bi bi-mic-fill"></i>';
        micBtn.style.backgroundColor = 'white';
        showNotification('Microphone unmuted');
    }
}

// Toggle Camera
function toggleCamera() {
    const cameraBtn = document.getElementById('cameraBtn');
    isCameraOff = !isCameraOff;
    
    if (isCameraOff) {
        cameraBtn.classList.add('muted');
        cameraBtn.innerHTML = '<i class="bi bi-camera-video-off"></i>';
        cameraBtn.style.backgroundColor = '#ea4335';
        showNotification('Camera off');
    } else {
        cameraBtn.classList.remove('muted');
        cameraBtn.innerHTML = '<i class="bi bi-camera-video-fill"></i>';
        cameraBtn.style.backgroundColor = 'white';
        showNotification('Camera on');
    }
}

// Share Screen
function shareScreen() {
    const shareBtn = document.getElementById('shareBtn');
    isScreenSharing = !isScreenSharing;
    
    if (isScreenSharing) {
        shareBtn.style.backgroundColor = '#4285f4';
        shareBtn.style.color = 'white';
        showNotification('Started sharing your screen');
    } else {
        shareBtn.style.backgroundColor = 'white';
        shareBtn.style.color = '#333';
        showNotification('Stopped sharing your screen');
    }
}

// Raise Hand
function raiseHand() {
    const handBtn = document.getElementById('handBtn');
    isHandRaised = !isHandRaised;
    
    if (isHandRaised) {
        handBtn.style.backgroundColor = '#fbbc04';
        handBtn.style.color = '#333';
        showNotification('Hand raised');
    } else {
        handBtn.style.backgroundColor = 'white';
        handBtn.style.color = '#333';
        showNotification('Hand lowered');
    }
}

// End Meeting
function endMeeting() {
    if (confirm('Are you sure you want to end the meeting?')) {
        showAlert('Meeting ended. Redirecting...', 'info');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }
}

// Switch Main Video
function switchMainVideo(element) {
    // Get the participant name
    const participantName = element.querySelector('p') ? 
        element.querySelector('p').textContent : 
        'Participant';
    
    // Remove active class from all thumbnails
    document.querySelectorAll('.video-thumbnail').forEach(vid => {
        vid.style.border = '2px solid #3c4043';
    });
    
    // Add active class to clicked thumbnail
    element.style.border = '2px solid #4285f4';
    element.style.boxShadow = '0 0 10px rgba(66, 133, 244, 0.5)';
    
    showNotification(`Now viewing ${participantName}`);
}

// Show Notification (bottom right)
function showNotification(message) {
    const notificationHTML = `
        <div class="notification-toast" style="
            position: fixed;
            bottom: 100px;
            right: 20px;
            background-color: #323235;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        ">
            ${message}
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', notificationHTML);
    
    // Remove notification after 2 seconds
    setTimeout(() => {
        const notification = document.querySelector('.notification-toast');
        if (notification) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 2000);
}

// Show Alert
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
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + M for mute toggle
    if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
        event.preventDefault();
        toggleMic();
    }
    
    // Ctrl/Cmd + E for camera toggle
    if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        toggleCamera();
    }
    
    // Ctrl/Cmd + S for screen share
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        shareScreen();
    }
});

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
