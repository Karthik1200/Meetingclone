 
let isMicMuted = false;
let isCameraOff = false;
let isScreenSharing = false;
let isHandRaised = false;
let chatMessages = [];

document.addEventListener('DOMContentLoaded', function() {
    initMeeting();
    setupEventListeners();
    loadChatHistory();
});


function initMeeting() {
    const meetingCode = getMeetingCodeFromPage();
    const userName = getUserNameFromPage();
    
    console.log(`User ${userName} joined meeting: ${meetingCode}`);
    
    updateMeetingInfo(meetingCode, userName);
    
    initializeControls();
}


function setupEventListeners() {
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');

    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    if (messageInput) {
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    document.querySelectorAll('.video-thumbnail').forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            switchMainVideo(this);
        });
    });

    setupKeyboardShortcuts();
}


function initializeControls() {
    const micBtn = document.getElementById('micBtn');
    const cameraBtn = document.getElementById('cameraBtn');

    if (micBtn) micBtn.classList.remove('muted');
    if (cameraBtn) cameraBtn.classList.remove('muted');
}


function toggleMic() {
    const micBtn = document.getElementById('micBtn');
    isMicMuted = !isMicMuted;
    
    if (isMicMuted) {
        micBtn.classList.add('muted');
        micBtn.innerHTML = '<i class="bi bi-mic-mute"></i>';
        micBtn.style.backgroundColor = '#ea4335';
        showNotification('Microphone muted', 'warning');
    } else {
        micBtn.classList.remove('muted');
        micBtn.innerHTML = '<i class="bi bi-mic-fill"></i>';
        micBtn.style.backgroundColor = 'white';
        micBtn.style.color = '#333';
        showNotification('Microphone unmuted', 'success');
    }
}


function toggleCamera() {
    const cameraBtn = document.getElementById('cameraBtn');
    isCameraOff = !isCameraOff;
    
    if (isCameraOff) {
        cameraBtn.classList.add('muted');
        cameraBtn.innerHTML = '<i class="bi bi-camera-video-off"></i>';
        cameraBtn.style.backgroundColor = '#ea4335';
        showNotification('Camera off', 'warning');
    } else {
        cameraBtn.classList.remove('muted');
        cameraBtn.innerHTML = '<i class="bi bi-camera-video-fill"></i>';
        cameraBtn.style.backgroundColor = 'white';
        cameraBtn.style.color = '#333';
        showNotification('Camera on', 'success');
    }
}



function shareScreen() {
    const shareBtn = document.getElementById('shareBtn');
    isScreenSharing = !isScreenSharing;
    
    if (isScreenSharing) {
        shareBtn.style.backgroundColor = '#4285f4';
        shareBtn.style.color = 'white';
        showNotification('Started sharing your screen', 'info');
    } else {
        shareBtn.style.backgroundColor = 'white';
        shareBtn.style.color = '#333';
        showNotification('Stopped sharing your screen', 'info');
    }
}


function raiseHand() {
    const handBtn = document.getElementById('handBtn');
    isHandRaised = !isHandRaised;
    
    if (isHandRaised) {
        handBtn.style.backgroundColor = '#fbbc04';
        handBtn.style.color = '#333';
        showNotification('Hand raised', 'warning');
    } else {
        handBtn.style.backgroundColor = 'white';
        handBtn.style.color = '#333';
        showNotification('Hand lowered', 'info');
    }
}


function shareLink() {
    const meetingCode = getMeetingCodeFromPage();
    const meetingLink = `${window.location.origin}/index?join=${encodeURIComponent(meetingCode)}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Join my meeting',
            text: `Join my meeting on ConferMeet`,
            url: meetingLink
        })
        .then(() => {
            showNotification('Meeting link shared successfully!', 'success');
        })
        .catch((error) => {
            if (error.name !== 'AbortError') {
                copyToClipboard(meetingLink);
            }
        });
    } else {
        copyToClipboard(meetingLink);
    }
}


function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => {
                showSuccessAnimation();
                showNotification('Meeting link copied to clipboard!', 'success');
            })
            .catch(() => {
                fallbackCopyToClipboard(text);
            });
    } else {
        fallbackCopyToClipboard(text);
    }
}


function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showSuccessAnimation();
        showNotification('Meeting link copied!', 'success');
    } catch (err) {
        showNotification('Failed to copy link. Please copy manually.', 'error');
        prompt('Copy meeting link:', text);
    }
    
    document.body.removeChild(textArea);
}


function showSuccessAnimation() {
    const shareLinkBtn = document.getElementById('shareLinkBtn');
    if (shareLinkBtn) {
        shareLinkBtn.style.backgroundColor = '#34a853';
        shareLinkBtn.style.color = 'white';
        shareLinkBtn.style.transform = 'scale(1.2)';
        
        setTimeout(() => {
            shareLinkBtn.style.backgroundColor = 'white';
            shareLinkBtn.style.color = '#333';
            shareLinkBtn.style.transform = 'scale(1)';
        }, 2000);
    }
}


function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messagesContainer = document.getElementById('messagesContainer');
    
    if (!messageInput || !messagesContainer) return;
    
    const text = messageInput.value.trim();
    if (!text) return;
    
    const message = {
        id: Date.now(),
        text: text,
        sender: 'You',
        timestamp: new Date().toISOString(),
        type: 'sent'
    };
    
    chatMessages.push(message);
    
    saveChatHistory();
    
    displayMessage(message);
    
    messageInput.value = '';
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    announceToScreenReader(`You sent: ${text}`);
}


function displayMessage(message) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    const isSent = message.type === 'sent';
    const alignment = isSent ? 'text-end' : '';
    const bgColor = isSent ? 'bg-primary' : 'bg-secondary';
    const senderColor = isSent ? 'text-info' : 'text-muted';
    
    const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const messageHTML = `
        <div class="mb-3 ${alignment}" data-message-id="${message.id}">
            <small class="${senderColor}">${escapeHtml(message.sender)}</small>
            <div class="${bgColor} d-inline-block p-2 rounded-2 mt-1 position-relative">
                <small class="text-white">${escapeHtml(message.text)}</small>
                <small class="text-white-50 d-block mt-1" style="font-size: 0.7rem;">${time}</small>
            </div>
        </div>
    `;
    
    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
}


function loadChatHistory() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    const meetingCode = getMeetingCodeFromPage();
    const storageKey = `chat_${meetingCode}`;
    const storedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    chatMessages = storedMessages;
    
    messagesContainer.innerHTML = '';
    chatMessages.forEach(message => displayMessage(message));
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}



function saveChatHistory() {
    const meetingCode = getMeetingCodeFromPage();
    const storageKey = `chat_${meetingCode}`;
    localStorage.setItem(storageKey, JSON.stringify(chatMessages));
}


function clearChat() {
    if (confirm('Are you sure you want to clear all chat messages?')) {
        chatMessages = [];
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        const meetingCode = getMeetingCodeFromPage();
        const storageKey = `chat_${meetingCode}`;
        localStorage.removeItem(storageKey);
        
        showNotification('Chat cleared', 'info');
    }
}


function switchMainVideo(element) {
    const participantName = element.querySelector('p') ? 
        element.querySelector('p').textContent : 
        'Participant';
    
    document.querySelectorAll('.video-thumbnail').forEach(vid => {
        vid.style.border = '2px solid #3c4043';
        vid.style.boxShadow = 'none';
    });
    
    element.style.border = '2px solid #4285f4';
    element.style.boxShadow = '0 0 10px rgba(66, 133, 244, 0.5)';
    
    showNotification(`Now viewing ${participantName}`, 'info');
}


function endMeeting() {
    if (confirm('Are you sure you want to end the meeting?')) {
        const meetingCode = getMeetingCodeFromPage();
        const storageKey = `chat_${meetingCode}`;
        localStorage.removeItem(storageKey);
        
        showNotification('Meeting ended. Redirecting...', 'info');
        
        setTimeout(() => {
            window.location.href = '/index';
        }, 1500);
    }
}


function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
            event.preventDefault();
            toggleMic();
        }
        
        if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
            event.preventDefault();
            toggleCamera();
        }
        
        if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
            event.preventDefault();
            shareScreen();
        }
        
        if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
            event.preventDefault();
            raiseHand();
        }
        
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
            event.preventDefault();
            shareLink();
        }
    });
}


function getMeetingCodeFromPage() {
    const badge = document.getElementById('meetingCodeBadge');
    if (badge) {
        return badge.textContent.trim();
    }
    return 'unknown';
}


function getUserNameFromPage() {
    const userElement = document.querySelector('[th\\:text="${username}"]');
    if (userElement) {
        return userElement.textContent.trim();
    }
    return 'User';
}


function updateMeetingInfo(meetingCode, userName) {
    const codeElement = document.querySelector('.meeting-code');
    if (codeElement && meetingCode !== 'unknown') {
        codeElement.innerHTML = `<small>Meeting Code: <span class="badge bg-success">${escapeHtml(meetingCode)}</span></small>`;
    }
}


function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(() => announcement.remove(), 1000);
}


function showNotification(message, type = 'info') {
    const colors = {
        info: '#323235',
        success: '#34a853',
        warning: '#fbbc04',
        error: '#ea4335'
    };
    
    const bgColor = colors[type] || colors.info;
    
    const notificationHTML = `
        <div class="notification-toast" style="
            position: fixed;
            bottom: 100px;
            right: 20px;
            background-color: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${escapeHtml(message)}</span>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', notificationHTML);
    
    setTimeout(() => {
        const notification = document.querySelector('.notification-toast');
        if (notification) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}


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
    
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }
`;
document.head.appendChild(style);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        toggleMic,
        toggleCamera,
        shareScreen,
        raiseHand,
        shareLink,
        sendMessage,
        escapeHtml
    };
}