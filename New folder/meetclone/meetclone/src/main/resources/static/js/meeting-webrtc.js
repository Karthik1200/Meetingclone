/**
 * ConferMeet - Google Meet Clone
 * WebRTC Video Conferencing Implementation
 */

// Global state
const state = {
    localStream: null,
    screenStream: null,
    socket: null,
    peerConnections: {},
    participants: new Map(),
    waitingParticipants: new Map(),

    // User info
    username: '',
    isHost: false,
    participantId: null,
    meetingCode: '',

    // Media states
    isAudioEnabled: false,
    isVideoEnabled: false,
    isScreenSharing: false,
    isHandRaised: false,
    isRecording: false,

    // Meeting state
    meetingStartTime: null,
    currentPanel: null,

    // Settings
    waitingRoomEnabled: false,
    meetingLocked: false
};

// WebRTC Configuration
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeMeeting();
    setupEventListeners();
    startMeetingTimer();
});

/**
 * Initialize the meeting
 */
async function initializeMeeting() {
    // Get user data from hidden elements
    state.username = document.getElementById('usernameData')?.value || 'User';
    state.isHost = document.getElementById('isHostData')?.value === 'true';
    state.meetingCode = document.getElementById('meetingCodeBadge')?.textContent?.trim() || '';

    // Update UI for host
    if (!state.isHost) {
        const hostControls = document.getElementById('hostControls');
        if (hostControls) hostControls.style.display = 'none';
    }

    // Initialize WebSocket connection
    await connectWebSocket();

    // Show self in participants
    addParticipantToList({
        id: 'local',
        username: state.username + ' (You)',
        isHost: state.isHost,
        audioEnabled: state.isAudioEnabled,
        videoEnabled: state.isVideoEnabled
    });

    showNotification('Ready to join! Enable your camera and microphone to get started.', 'info');
}

/**
 * Connect to WebSocket signaling server
 */
async function connectWebSocket() {
    return new Promise((resolve, reject) => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/meeting`;

        state.socket = new WebSocket(wsUrl);

        state.socket.onopen = () => {
            console.log('WebSocket connected');
            // Join the meeting room
            sendSignal({
                type: 'join',
                meetingCode: state.meetingCode,
                username: state.username,
                isHost: state.isHost,
                audioEnabled: state.isAudioEnabled,
                videoEnabled: state.isVideoEnabled
            });
            resolve();
        };

        state.socket.onmessage = (event) => {
            handleSignalingMessage(JSON.parse(event.data));
        };

        state.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            showNotification('Connection error. Please refresh the page.', 'error');
            reject(error);
        };

        state.socket.onclose = () => {
            console.log('WebSocket closed');
            showNotification('Connection lost. Attempting to reconnect...', 'warning');
            // Attempt reconnection after 3 seconds
            setTimeout(connectWebSocket, 3000);
        };
    });
}

/**
 * Send signaling message
 */
function sendSignal(message) {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
        state.socket.send(JSON.stringify(message));
    }
}

/**
 * Handle incoming signaling messages
 */
async function handleSignalingMessage(message) {
    switch (message.type) {
        case 'join-success':
            state.participantId = message.participantId;
            state.isHost = message.isHost;
            state.meetingStartTime = Date.now();
            showNotification('Joined meeting successfully!', 'success');
            break;

        case 'participants-list':
            // Add existing participants
            for (const participant of message.participants) {
                await handleNewParticipant(participant);
            }
            break;

        case 'participant-joined':
            await handleNewParticipant(message);
            showNotification(`${message.username} joined the meeting`, 'info');
            break;

        case 'participant-left':
            handleParticipantLeft(message);
            showNotification(`${message.username || 'A participant'} left the meeting`, 'info');
            break;

        case 'offer':
            await handleOffer(message);
            break;

        case 'answer':
            await handleAnswer(message);
            break;

        case 'ice-candidate':
            await handleIceCandidate(message);
            break;

        case 'chat':
            displayChatMessage(message);
            break;

        case 'media-toggle':
            updateParticipantMedia(message);
            break;

        case 'hand-raised':
            handleHandRaised(message);
            break;

        case 'screen-share':
            handleScreenShareNotification(message);
            break;

        case 'force-mute':
            handleForceMute(message);
            break;

        case 'removed-from-meeting':
            handleRemoved(message);
            break;

        case 'waiting-room':
            showNotification(message.message, 'info');
            break;

        case 'waiting-participant':
            handleWaitingParticipant(message);
            break;

        case 'admitted':
            // Re-join after being admitted
            sendSignal({
                type: 'join',
                meetingCode: state.meetingCode,
                username: state.username,
                isHost: state.isHost,
                audioEnabled: state.isAudioEnabled,
                videoEnabled: state.isVideoEnabled
            });
            break;

        case 'denied':
            showNotification(message.message, 'error');
            setTimeout(() => window.location.href = '/index', 3000);
            break;

        case 'meeting-locked':
            showNotification(message.message, 'error');
            setTimeout(() => window.location.href = '/index', 3000);
            break;

        case 'host-changed':
            if (message.newHostId === state.participantId) {
                state.isHost = true;
                showNotification('You are now the host', 'success');
                document.getElementById('hostControls').style.display = 'block';
            } else {
                showNotification(`${message.newHostName} is now the host`, 'info');
            }
            break;

        case 'meeting-lock-changed':
            state.meetingLocked = message.locked;
            showNotification(message.locked ? 'Meeting is now locked' : 'Meeting is unlocked', 'info');
            break;
    }
}

/**
 * Handle new participant joining
 */
async function handleNewParticipant(participant) {
    const id = participant.id || participant.participantId;
    if (!id || id === 'local' || id === state.participantId) return;

    // Check if we already have this participant
    if (state.participants.has(id)) {
        console.log(`Participant ${id} already exists, updating info.`);
        const existingParticipant = state.participants.get(id);
        Object.assign(existingParticipant, participant);
        return;
    }

    participant.id = id;
    state.participants.set(id, participant);

    // Add to UI if not already present
    addParticipantToList(participant);
    addVideoTile(participant);
    updateParticipantCount();
    updateGridLayout();

    // Create peer connection and send offer
    await createPeerConnection(id);
}

/**
 * Handle participant leaving
 */
function handleParticipantLeft(message) {
    const participantId = message.participantId;
    state.participants.delete(participantId);

    // Close peer connection
    if (state.peerConnections[participantId]) {
        state.peerConnections[participantId].close();
        delete state.peerConnections[participantId];
    }

    // Remove from UI
    removeVideoTile(participantId);
    removeParticipantFromList(participantId);
    updateParticipantCount();
    updateGridLayout();
}

/**
 * Create WebRTC peer connection
 */
async function createPeerConnection(participantId) {
    const pc = new RTCPeerConnection(rtcConfig);
    state.peerConnections[participantId] = pc;

    // Add local stream tracks
    if (state.localStream) {
        state.localStream.getTracks().forEach(track => {
            pc.addTrack(track, state.localStream);
        });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
        const remoteVideo = document.getElementById(`video-${participantId}`);
        if (remoteVideo) {
            remoteVideo.srcObject = event.streams[0];
            // Hide placeholder
            const placeholder = document.querySelector(`#tile-${participantId} .video-placeholder`);
            if (placeholder) placeholder.style.display = 'none';
        }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal({
                type: 'ice-candidate',
                targetId: participantId,
                candidate: event.candidate
            });
        }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${participantId}: ${pc.connectionState}`);
    };

    // Create and send offer
    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({
            type: 'offer',
            targetId: participantId,
            sdp: offer
        });
    } catch (error) {
        console.error('Error creating offer:', error);
    }
}

/**
 * Handle incoming offer
 */
async function handleOffer(message) {
    const participantId = message.senderId;
    let pc = state.peerConnections[participantId];

    if (!pc) {
        pc = new RTCPeerConnection(rtcConfig);
        state.peerConnections[participantId] = pc;

        // Add local stream tracks
        if (state.localStream) {
            state.localStream.getTracks().forEach(track => {
                pc.addTrack(track, state.localStream);
            });
        }

        pc.ontrack = (event) => {
            const remoteVideo = document.getElementById(`video-${participantId}`);
            if (remoteVideo) {
                remoteVideo.srcObject = event.streams[0];
                const placeholder = document.querySelector(`#tile-${participantId} .video-placeholder`);
                if (placeholder) placeholder.style.display = 'none';
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal({
                    type: 'ice-candidate',
                    targetId: participantId,
                    candidate: event.candidate
                });
            }
        };
    }

    try {
        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({
            type: 'answer',
            targetId: participantId,
            sdp: answer
        });
    } catch (error) {
        console.error('Error handling offer:', error);
    }
}

/**
 * Handle incoming answer
 */
async function handleAnswer(message) {
    const pc = state.peerConnections[message.senderId];
    if (pc) {
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }
}

/**
 * Handle incoming ICE candidate
 */
async function handleIceCandidate(message) {
    const pc = state.peerConnections[message.senderId];
    if (pc && message.candidate) {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }
}

/**
 * Toggle microphone
 */
async function toggleMic() {
    const micBtn = document.getElementById('micBtn');
    const localMicIndicator = document.getElementById('localMicIndicator');

    if (!state.localStream) {
        try {
            state.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            state.isAudioEnabled = true;

            // Add tracks to existing peer connections
            for (const [peerId, pc] of Object.entries(state.peerConnections)) {
                state.localStream.getAudioTracks().forEach(track => {
                    pc.addTrack(track, state.localStream);
                });
            }
        } catch (error) {
            console.error('Error accessing microphone:', error);
            showNotification('Could not access microphone. Please check permissions.', 'error');
            return;
        }
    } else {
        state.isAudioEnabled = !state.isAudioEnabled;
        state.localStream.getAudioTracks().forEach(track => {
            track.enabled = state.isAudioEnabled;
        });
    }

    // Update UI
    if (state.isAudioEnabled) {
        micBtn.classList.remove('off');
        micBtn.innerHTML = '<i class="bi bi-mic-fill"></i>';
        localMicIndicator.classList.remove('off');
        localMicIndicator.innerHTML = '<i class="bi bi-mic-fill"></i>';
        showNotification('Microphone on', 'success');
    } else {
        micBtn.classList.add('off');
        micBtn.innerHTML = '<i class="bi bi-mic-mute-fill"></i>';
        localMicIndicator.classList.add('off');
        localMicIndicator.innerHTML = '<i class="bi bi-mic-mute-fill"></i>';
        showNotification('Microphone off', 'warning');
    }

    // Notify other participants
    sendSignal({
        type: 'toggle-media',
        mediaType: 'audio',
        enabled: state.isAudioEnabled
    });
}

/**
 * Toggle camera
 */
async function toggleCamera() {
    const camBtn = document.getElementById('camBtn');
    const localCamIndicator = document.getElementById('localCamIndicator');
    const localVideo = document.getElementById('localVideo');
    const localPlaceholder = document.getElementById('localPlaceholder');

    if (!state.localStream || !state.localStream.getVideoTracks().length) {
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });

            if (state.localStream) {
                videoStream.getVideoTracks().forEach(track => {
                    state.localStream.addTrack(track);
                });
            } else {
                state.localStream = videoStream;
            }

            state.isVideoEnabled = true;
            localVideo.srcObject = state.localStream;

            // Add video tracks to existing peer connections
            for (const [peerId, pc] of Object.entries(state.peerConnections)) {
                state.localStream.getVideoTracks().forEach(track => {
                    pc.addTrack(track, state.localStream);
                });
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            showNotification('Could not access camera. Please check permissions.', 'error');
            return;
        }
    } else {
        state.isVideoEnabled = !state.isVideoEnabled;
        state.localStream.getVideoTracks().forEach(track => {
            track.enabled = state.isVideoEnabled;
        });
    }

    // Update UI
    if (state.isVideoEnabled) {
        camBtn.classList.remove('off');
        camBtn.innerHTML = '<i class="bi bi-camera-video-fill"></i>';
        localCamIndicator.classList.remove('off');
        localCamIndicator.innerHTML = '<i class="bi bi-camera-video-fill"></i>';
        localPlaceholder.style.display = 'none';
        showNotification('Camera on', 'success');
    } else {
        camBtn.classList.add('off');
        camBtn.innerHTML = '<i class="bi bi-camera-video-off-fill"></i>';
        localCamIndicator.classList.add('off');
        localCamIndicator.innerHTML = '<i class="bi bi-camera-video-off-fill"></i>';
        localPlaceholder.style.display = 'flex';
        showNotification('Camera off', 'warning');
    }

    // Notify other participants
    sendSignal({
        type: 'toggle-media',
        mediaType: 'video',
        enabled: state.isVideoEnabled
    });
}

/**
 * Toggle screen sharing
 */
async function toggleScreenShare() {
    const screenShareBtn = document.getElementById('screenShareBtn');

    if (!state.isScreenSharing) {
        try {
            state.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: true
            });

            state.isScreenSharing = true;
            screenShareBtn.classList.add('active');

            // Replace video track in peer connections
            const videoTrack = state.screenStream.getVideoTracks()[0];
            for (const [peerId, pc] of Object.entries(state.peerConnections)) {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                } else {
                    pc.addTrack(videoTrack, state.screenStream);
                }
            }

            // Show screen share in local view
            document.getElementById('localVideo').srcObject = state.screenStream;
            document.getElementById('localPlaceholder').style.display = 'none';

            // Handle when user stops sharing via browser UI
            videoTrack.onended = () => {
                stopScreenShare();
            };

            showNotification('Started screen sharing', 'success');

            // Notify others
            sendSignal({
                type: 'screen-share',
                sharing: true
            });

        } catch (error) {
            console.error('Error starting screen share:', error);
            if (error.name !== 'NotAllowedError') {
                showNotification('Could not start screen sharing', 'error');
            }
        }
    } else {
        stopScreenShare();
    }
}

/**
 * Stop screen sharing
 */
function stopScreenShare() {
    if (state.screenStream) {
        state.screenStream.getTracks().forEach(track => track.stop());
        state.screenStream = null;
    }

    state.isScreenSharing = false;
    document.getElementById('screenShareBtn').classList.remove('active');

    // Restore camera if it was on
    if (state.isVideoEnabled && state.localStream) {
        const videoTrack = state.localStream.getVideoTracks()[0];
        if (videoTrack) {
            for (const [peerId, pc] of Object.entries(state.peerConnections)) {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            }
            document.getElementById('localVideo').srcObject = state.localStream;
        }
    } else {
        document.getElementById('localPlaceholder').style.display = 'flex';
    }

    showNotification('Stopped screen sharing', 'info');

    sendSignal({
        type: 'screen-share',
        sharing: false
    });
}

/**
 * Toggle hand raise
 */
function toggleHand() {
    state.isHandRaised = !state.isHandRaised;
    const handBtn = document.getElementById('handBtn');

    if (state.isHandRaised) {
        handBtn.classList.add('active');
        handBtn.style.background = 'var(--meet-yellow)';
        handBtn.style.color = '#000';
        showNotification('Hand raised', 'warning');
    } else {
        handBtn.classList.remove('active');
        handBtn.style.background = '';
        handBtn.style.color = '';
        showNotification('Hand lowered', 'info');
    }

    sendSignal({
        type: 'raise-hand',
        raised: state.isHandRaised
    });
}

/**
 * Send chat message
 */
function sendChatMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text) return;

    sendSignal({
        type: 'chat',
        message: text
    });

    // Display own message
    displayChatMessage({
        senderId: 'local',
        senderName: state.username,
        message: text,
        timestamp: Date.now(),
        own: true
    });

    input.value = '';
}

/**
 * Display chat message
 */
function displayChatMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const isOwn = message.senderId === 'local' || message.own;

    const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const messageHtml = `
        <div class="chat-message ${isOwn ? 'own' : ''}">
            <div class="chat-message-header">
                <span class="chat-sender">${escapeHtml(message.senderName)}</span>
                <span class="chat-time">${time}</span>
            </div>
            <div class="chat-text">${escapeHtml(message.message)}</div>
        </div>
    `;

    chatMessages.insertAdjacentHTML('beforeend', messageHtml);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Show notification if chat panel is closed
    if (state.currentPanel !== 'chat' && !isOwn) {
        showNotification(`${message.senderName}: ${message.message.substring(0, 50)}...`, 'info');
    }
}

/**
 * Toggle side panel (chat/participants)
 */
function togglePanel(panelType) {
    const sidePanel = document.getElementById('sidePanel');
    const participantsPanel = document.getElementById('participantsPanel');
    const chatPanel = document.getElementById('chatPanel');
    const chatInputArea = document.getElementById('chatInputArea');
    const panelTitle = document.getElementById('panelTitle');
    const chatBtn = document.getElementById('chatBtn');
    const participantsBtn = document.getElementById('participantsBtn');

    if (state.currentPanel === panelType) {
        // Close panel
        sidePanel.classList.remove('open');
        state.currentPanel = null;
        chatBtn.classList.remove('active');
        participantsBtn.classList.remove('active');
    } else {
        // Open panel
        sidePanel.classList.add('open');
        state.currentPanel = panelType;

        if (panelType === 'chat') {
            panelTitle.textContent = 'In-call messages';
            participantsPanel.style.display = 'none';
            chatPanel.style.display = 'flex';
            chatInputArea.style.display = 'block';
            chatBtn.classList.add('active');
            participantsBtn.classList.remove('active');
        } else {
            panelTitle.textContent = 'Participants';
            participantsPanel.style.display = 'block';
            chatPanel.style.display = 'none';
            chatInputArea.style.display = 'none';
            participantsBtn.classList.add('active');
            chatBtn.classList.remove('active');
        }
    }
}

/**
 * Close side panel
 */
function closeSidePanel() {
    document.getElementById('sidePanel').classList.remove('open');
    document.getElementById('chatBtn').classList.remove('active');
    document.getElementById('participantsBtn').classList.remove('active');
    state.currentPanel = null;
}

/**
 * Add video tile for participant
 */
function addVideoTile(participant) {
    if (document.getElementById(`tile-${participant.id}`)) return;

    const videoGrid = document.getElementById('videoGrid');
    const initial = participant.username.charAt(0).toUpperCase();

    const tileHtml = `
        <div class="video-tile" id="tile-${participant.id}" data-participant-id="${participant.id}">
            <video id="video-${participant.id}" autoplay playsinline></video>
            <div class="video-placeholder">
                <div class="avatar-circle">${initial}</div>
                <span class="participant-name">${escapeHtml(participant.username)}</span>
            </div>
            <div class="tile-overlay-top">
                <div class="tile-badges">
                    ${participant.isHost ? '<span class="tile-badge host"><i class="bi bi-star-fill"></i> Host</span>' : ''}
                    <span class="tile-badge hand-raised" id="hand-badge-${participant.id}" style="display: none;">
                        <i class="bi bi-hand-index-thumb-fill"></i>
                    </span>
                </div>
            </div>
            <div class="tile-overlay-bottom">
                <span class="tile-name">${escapeHtml(participant.username)}</span>
                <div class="tile-media-status">
                    <span class="media-indicator ${participant.audioEnabled ? '' : 'off'}" id="mic-${participant.id}">
                        <i class="bi bi-mic-${participant.audioEnabled ? 'fill' : 'mute-fill'}"></i>
                    </span>
                    <span class="media-indicator ${participant.videoEnabled ? '' : 'off'}" id="cam-${participant.id}">
                        <i class="bi bi-camera-video-${participant.videoEnabled ? 'fill' : 'off-fill'}"></i>
                    </span>
                </div>
            </div>
            ${state.isHost ? `
            <div class="tile-actions">
                <button class="tile-action-btn" onclick="muteParticipant('${participant.id}', 'audio')" title="Mute">
                    <i class="bi bi-mic-mute"></i>
                </button>
                <button class="tile-action-btn" onclick="muteParticipant('${participant.id}', 'video')" title="Turn off camera">
                    <i class="bi bi-camera-video-off"></i>
                </button>
                <button class="tile-action-btn danger" onclick="removeParticipant('${participant.id}')" title="Remove">
                    <i class="bi bi-person-x"></i>
                </button>
            </div>
            ` : ''}
        </div>
    `;

    videoGrid.insertAdjacentHTML('beforeend', tileHtml);
}

/**
 * Remove video tile
 */
function removeVideoTile(participantId) {
    const tile = document.getElementById(`tile-${participantId}`);
    if (tile) tile.remove();
}

/**
 * Add participant to list panel
 */
function addParticipantToList(participant) {
    if (document.getElementById(`participant-${participant.id}`)) return;

    const list = document.getElementById('participantsList');
    const initial = participant.username.charAt(0).toUpperCase();
    const isYou = participant.id === 'local';

    const itemHtml = `
        <div class="participant-item" id="participant-${participant.id}">
            <div class="participant-info">
                <div class="participant-avatar">${initial}</div>
                <div class="participant-details">
                    <span class="participant-name-list">${escapeHtml(participant.username)}</span>
                    <span class="participant-role">${participant.isHost ? 'Host' : 'Participant'}</span>
                </div>
            </div>
            <div class="participant-controls">
                <button class="participant-control-btn ${participant.audioEnabled ? '' : 'off'}" 
                        id="list-mic-${participant.id}" title="Microphone">
                    <i class="bi bi-mic-${participant.audioEnabled ? 'fill' : 'mute-fill'}"></i>
                </button>
                <button class="participant-control-btn ${participant.videoEnabled ? '' : 'off'}" 
                        id="list-cam-${participant.id}" title="Camera">
                    <i class="bi bi-camera-video-${participant.videoEnabled ? 'fill' : 'off-fill'}"></i>
                </button>
                ${state.isHost && !isYou ? `
                <button class="participant-control-btn" onclick="removeParticipant('${participant.id}')" title="Remove">
                    <i class="bi bi-person-x"></i>
                </button>
                ` : ''}
            </div>
        </div>
    `;

    list.insertAdjacentHTML('beforeend', itemHtml);
}

/**
 * Remove participant from list
 */
function removeParticipantFromList(participantId) {
    const item = document.getElementById(`participant-${participantId}`);
    if (item) item.remove();
}

/**
 * Update participant count badge
 */
function updateParticipantCount() {
    const count = state.participants.size + 1; // +1 for local user
    const badge = document.getElementById('participantCount');
    if (badge) badge.textContent = count;
}

/**
 * Update video grid layout based on participant count
 */
function updateGridLayout() {
    const videoGrid = document.getElementById('videoGrid');
    const count = state.participants.size + 1;

    videoGrid.className = 'video-grid';

    if (count === 1) videoGrid.classList.add('grid-1');
    else if (count === 2) videoGrid.classList.add('grid-2');
    else if (count <= 4) videoGrid.classList.add('grid-4');
    else if (count <= 6) videoGrid.classList.add('grid-6');
    else if (count <= 9) videoGrid.classList.add('grid-9');
    else videoGrid.classList.add('grid-many');
}

/**
 * Update participant media status in UI
 */
function updateParticipantMedia(message) {
    const { participantId, mediaType, enabled } = message;

    // Update tile indicator
    const indicator = document.getElementById(`${mediaType === 'audio' ? 'mic' : 'cam'}-${participantId}`);
    if (indicator) {
        if (enabled) {
            indicator.classList.remove('off');
            indicator.innerHTML = `<i class="bi bi-${mediaType === 'audio' ? 'mic' : 'camera-video'}-fill"></i>`;
        } else {
            indicator.classList.add('off');
            indicator.innerHTML = `<i class="bi bi-${mediaType === 'audio' ? 'mic-mute' : 'camera-video-off'}-fill"></i>`;
        }
    }

    // Update list indicator
    const listIndicator = document.getElementById(`list-${mediaType === 'audio' ? 'mic' : 'cam'}-${participantId}`);
    if (listIndicator) {
        if (enabled) {
            listIndicator.classList.remove('off');
            listIndicator.innerHTML = `<i class="bi bi-${mediaType === 'audio' ? 'mic' : 'camera-video'}-fill"></i>`;
        } else {
            listIndicator.classList.add('off');
            listIndicator.innerHTML = `<i class="bi bi-${mediaType === 'audio' ? 'mic-mute' : 'camera-video-off'}-fill"></i>`;
        }
    }

    // Update participant state
    const participant = state.participants.get(participantId);
    if (participant) {
        if (mediaType === 'audio') participant.audioEnabled = enabled;
        else participant.videoEnabled = enabled;
    }
}

/**
 * Handle hand raised notification
 */
function handleHandRaised(message) {
    const badge = document.getElementById(`hand-badge-${message.participantId}`);
    if (badge) {
        badge.style.display = message.raised ? 'flex' : 'none';
    }

    if (message.raised) {
        showNotification(`${message.username} raised their hand`, 'warning');
    }
}

/**
 * Handle screen share notification
 */
function handleScreenShareNotification(message) {
    const tile = document.getElementById(`tile-${message.participantId}`);
    if (tile) {
        if (message.sharing) {
            tile.classList.add('screen-share', 'pinned');
            showNotification(`${message.username} is sharing their screen`, 'info');
        } else {
            tile.classList.remove('screen-share', 'pinned');
        }
    }
    updateGridLayout();
}

/**
 * Handle force mute from host
 */
function handleForceMute(message) {
    if (message.mediaType === 'audio' && state.isAudioEnabled) {
        toggleMic();
        showNotification('Host muted your microphone', 'warning');
    } else if (message.mediaType === 'video' && state.isVideoEnabled) {
        toggleCamera();
        showNotification('Host turned off your camera', 'warning');
    }
}

/**
 * Handle being removed from meeting
 */
function handleRemoved(message) {
    showNotification(message.reason || 'You have been removed from the meeting', 'error');
    setTimeout(() => {
        window.location.href = '/index';
    }, 3000);
}

/**
 * Handle waiting room participant (host only)
 */
function handleWaitingParticipant(message) {
    state.waitingParticipants.set(message.participantId, message);

    const waitingRoom = document.getElementById('waitingRoom');
    const waitingList = document.getElementById('waitingList');
    const waitingCount = document.getElementById('waitingCount');

    waitingRoom.style.display = 'block';
    waitingCount.textContent = state.waitingParticipants.size;

    const itemHtml = `
        <div class="waiting-user" id="waiting-${message.participantId}">
            <span>${escapeHtml(message.username)}</span>
            <div class="waiting-user-actions">
                <button class="admit-btn" onclick="admitParticipant('${message.participantId}')">Admit</button>
                <button class="deny-btn" onclick="denyParticipant('${message.participantId}')">Deny</button>
            </div>
        </div>
    `;

    waitingList.insertAdjacentHTML('beforeend', itemHtml);
    showNotification(`${message.username} is waiting to join`, 'info');
}

/**
 * Host controls - Mute participant
 */
function muteParticipant(participantId, mediaType) {
    if (!state.isHost) return;

    sendSignal({
        type: 'mute-participant',
        targetId: participantId,
        mediaType: mediaType
    });

    showNotification(`Muted participant's ${mediaType}`, 'success');
}

/**
 * Host controls - Remove participant
 */
function removeParticipant(participantId) {
    if (!state.isHost) return;

    if (confirm('Are you sure you want to remove this participant?')) {
        sendSignal({
            type: 'remove-participant',
            targetId: participantId
        });
    }
}

/**
 * Host controls - Admit participant from waiting room
 */
function admitParticipant(participantId) {
    if (!state.isHost) return;

    sendSignal({
        type: 'admit-participant',
        targetId: participantId
    });

    // Remove from waiting list UI
    const waitingItem = document.getElementById(`waiting-${participantId}`);
    if (waitingItem) waitingItem.remove();

    state.waitingParticipants.delete(participantId);
    updateWaitingCount();
}

/**
 * Host controls - Deny participant
 */
function denyParticipant(participantId) {
    if (!state.isHost) return;

    sendSignal({
        type: 'deny-participant',
        targetId: participantId
    });

    const waitingItem = document.getElementById(`waiting-${participantId}`);
    if (waitingItem) waitingItem.remove();

    state.waitingParticipants.delete(participantId);
    updateWaitingCount();
}

/**
 * Host controls - Admit all from waiting room
 */
function admitAll() {
    if (!state.isHost) return;

    for (const [participantId] of state.waitingParticipants) {
        admitParticipant(participantId);
    }
}

/**
 * Update waiting room count
 */
function updateWaitingCount() {
    const count = state.waitingParticipants.size;
    document.getElementById('waitingCount').textContent = count;

    if (count === 0) {
        document.getElementById('waitingRoom').style.display = 'none';
    }
}

/**
 * Host controls - Toggle waiting room
 */
function toggleWaitingRoom() {
    state.waitingRoomEnabled = document.getElementById('waitingRoomToggle').checked;
    showNotification(state.waitingRoomEnabled ? 'Waiting room enabled' : 'Waiting room disabled', 'info');
}

/**
 * Host controls - Toggle lock meeting
 */
function toggleLockMeeting() {
    state.meetingLocked = document.getElementById('lockMeetingToggle').checked;

    sendSignal({
        type: 'lock-meeting',
        locked: state.meetingLocked
    });
}

/**
 * Host controls - Mute all participants
 */
function muteAllParticipants() {
    if (!state.isHost) return;

    for (const [participantId] of state.participants) {
        muteParticipant(participantId, 'audio');
    }

    showNotification('Muted all participants', 'success');
}

/**
 * Leave the meeting
 */
function leaveMeeting() {
    if (confirm('Are you sure you want to leave the meeting?')) {
        sendSignal({ type: 'leave' });

        // Stop all media
        if (state.localStream) {
            state.localStream.getTracks().forEach(track => track.stop());
        }
        if (state.screenStream) {
            state.screenStream.getTracks().forEach(track => track.stop());
        }

        // Close all peer connections
        for (const pc of Object.values(state.peerConnections)) {
            pc.close();
        }

        // Close WebSocket
        if (state.socket) {
            state.socket.close();
        }

        window.location.href = '/index';
    }
}

/**
 * Copy meeting code to clipboard
 */
function copyMeetingCode() {
    const code = state.meetingCode;
    navigator.clipboard.writeText(code).then(() => {
        showNotification('Meeting code copied!', 'success');
    });
}

/**
 * Open share modal
 */
function openShareModal() {
    const modal = new bootstrap.Modal(document.getElementById('shareModal'));
    const shareLink = `${window.location.origin}/index?join=${encodeURIComponent(state.meetingCode)}`;
    document.getElementById('shareLinkInput').value = shareLink;
    modal.show();
    toggleMoreMenu();
}

/**
 * Copy share link
 */
function copyShareLink() {
    const link = document.getElementById('shareLinkInput').value;
    navigator.clipboard.writeText(link).then(() => {
        showNotification('Meeting link copied!', 'success');
    });
}

/**
 * Share via external apps
 */
function shareVia(platform) {
    const link = document.getElementById('shareLinkInput').value;
    const text = `Join my ConferMeet meeting: ${link}`;

    switch (platform) {
        case 'email':
            window.open(`mailto:?subject=Join my meeting&body=${encodeURIComponent(text)}`);
            break;
        case 'whatsapp':
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            break;
    }
}

/**
 * Toggle more options menu
 */
function toggleMoreMenu() {
    document.getElementById('moreMenu').classList.toggle('show');
}

/**
 * Toggle recording (placeholder)
 */
function toggleRecording() {
    state.isRecording = !state.isRecording;
    const label = document.getElementById('recordingLabel');

    if (state.isRecording) {
        label.textContent = 'Stop recording';
        showNotification('Recording started', 'warning');
    } else {
        label.textContent = 'Start recording';
        showNotification('Recording stopped', 'info');
    }

    toggleMoreMenu();
}

/**
 * Open settings (placeholder)
 */
function openSettings() {
    showNotification('Settings coming soon!', 'info');
    toggleMoreMenu();
}

/**
 * View keyboard shortcuts
 */
function viewShortcuts() {
    const shortcuts = `
Keyboard Shortcuts:
• Ctrl/Cmd + M: Toggle microphone
• Ctrl/Cmd + E: Toggle camera
• Ctrl/Cmd + D: Toggle screen share
• Ctrl/Cmd + H: Raise/lower hand
• F: Toggle fullscreen
    `;
    alert(shortcuts);
    toggleMoreMenu();
}

/**
 * Toggle fullscreen
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

/**
 * Start meeting timer
 */
function startMeetingTimer() {
    const timeDisplay = document.getElementById('meetingTime');
    const durationDisplay = document.getElementById('durationDisplay');
    const startTime = Date.now();

    setInterval(() => {
        const elapsed = Date.now() - startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);

        const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        if (timeDisplay) timeDisplay.textContent = timeStr;
        if (durationDisplay) durationDisplay.textContent = timeStr;
    }, 1000);
}

/**
 * Setup keyboard shortcuts and event listeners
 */
function setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const isMod = e.ctrlKey || e.metaKey;

        if (isMod && e.key === 'm') {
            e.preventDefault();
            toggleMic();
        } else if (isMod && e.key === 'e') {
            e.preventDefault();
            toggleCamera();
        } else if (isMod && e.key === 'd') {
            e.preventDefault();
            toggleScreenShare();
        } else if (isMod && e.key === 'h') {
            e.preventDefault();
            toggleHand();
        } else if (e.key === 'f') {
            e.preventDefault();
            toggleFullscreen();
        }
    });

    // Chat input enter key
    document.getElementById('messageInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.more-dropdown')) {
            document.getElementById('moreMenu')?.classList.remove('show');
        }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
        sendSignal({ type: 'leave' });
    });
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');

    const icons = {
        success: 'check-circle-fill',
        warning: 'exclamation-triangle-fill',
        error: 'x-circle-fill',
        info: 'info-circle-fill'
    };

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="bi bi-${icons[type]}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
