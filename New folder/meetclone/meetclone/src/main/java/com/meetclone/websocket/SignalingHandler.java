package com.meetclone.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class SignalingHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Map of meetingCode -> Set of sessions in that meeting
    private final Map<String, Set<WebSocketSession>> meetingRooms = new ConcurrentHashMap<>();

    // Map of session ID -> participant info
    private final Map<String, ParticipantInfo> participants = new ConcurrentHashMap<>();

    // Map of meetingCode -> host session ID
    private final Map<String, String> meetingHosts = new ConcurrentHashMap<>();

    // Map of meetingCode -> meeting settings
    private final Map<String, MeetingSettings> meetingSettings = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        System.out.println("WebSocket connection established: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode json = objectMapper.readTree(message.getPayload());
        String type = json.get("type").asText();

        switch (type) {
            case "join":
                handleJoin(session, json);
                break;
            case "offer":
                handleOffer(session, json);
                break;
            case "answer":
                handleAnswer(session, json);
                break;
            case "ice-candidate":
                handleIceCandidate(session, json);
                break;
            case "chat":
                handleChat(session, json);
                break;
            case "toggle-media":
                handleMediaToggle(session, json);
                break;
            case "raise-hand":
                handleRaiseHand(session, json);
                break;
            case "screen-share":
                handleScreenShare(session, json);
                break;
            case "mute-participant":
                handleMuteParticipant(session, json);
                break;
            case "remove-participant":
                handleRemoveParticipant(session, json);
                break;
            case "admit-participant":
                handleAdmitParticipant(session, json);
                break;
            case "deny-participant":
                handleDenyParticipant(session, json);
                break;
            case "waiting-room-request":
                handleWaitingRoomRequest(session, json);
                break;
            case "lock-meeting":
                handleLockMeeting(session, json);
                break;
            case "leave":
                handleLeave(session);
                break;
            default:
                System.out.println("Unknown message type: " + type);
        }
    }

    private void handleJoin(WebSocketSession session, JsonNode json) throws IOException {
        String meetingCode = json.get("meetingCode").asText();
        String username = json.get("username").asText();
        String odisHost = json.has("isHost") && json.get("isHost").asBoolean() ? "true" : "false";
        boolean isHost = Boolean.parseBoolean(odisHost);
        String odisAudioEnabled = json.has("audioEnabled") && json.get("audioEnabled").asBoolean() ? "true" : "false";
        boolean audioEnabled = Boolean.parseBoolean(odisAudioEnabled);
        String odisVideoEnabled = json.has("videoEnabled") && json.get("videoEnabled").asBoolean() ? "true" : "false";
        boolean videoEnabled = Boolean.parseBoolean(odisVideoEnabled);

        // Create participant info
        ParticipantInfo info = new ParticipantInfo(session.getId(), username, meetingCode, isHost, audioEnabled,
                videoEnabled);
        participants.put(session.getId(), info);

        // Initialize meeting room if not exists
        meetingRooms.computeIfAbsent(meetingCode, k -> new CopyOnWriteArraySet<>());
        meetingSettings.computeIfAbsent(meetingCode, k -> new MeetingSettings());

        // Set host if first or if explicitly a host
        if (isHost || !meetingHosts.containsKey(meetingCode)) {
            meetingHosts.put(meetingCode, session.getId());
            info.setHost(true);
        }

        MeetingSettings settings = meetingSettings.get(meetingCode);

        // Check if meeting is locked
        if (settings.isLocked() && !isHost) {
            ObjectNode response = objectMapper.createObjectNode();
            response.put("type", "meeting-locked");
            response.put("message", "This meeting is locked. Please contact the host.");
            session.sendMessage(new TextMessage(response.toString()));
            return;
        }

        // Check if waiting room is enabled
        if (settings.isWaitingRoomEnabled() && !isHost) {
            // Add to waiting room instead
            settings.addToWaitingRoom(session.getId());

            // Notify participant they're in waiting room
            ObjectNode waitingResponse = objectMapper.createObjectNode();
            waitingResponse.put("type", "waiting-room");
            waitingResponse.put("message", "Please wait for the host to admit you.");
            session.sendMessage(new TextMessage(waitingResponse.toString()));

            // Notify host about new waiting participant
            String hostSessionId = meetingHosts.get(meetingCode);
            if (hostSessionId != null) {
                Set<WebSocketSession> roomSessions = meetingRooms.get(meetingCode);
                if (roomSessions != null) {
                    for (WebSocketSession s : roomSessions) {
                        if (s.getId().equals(hostSessionId) && s.isOpen()) {
                            ObjectNode hostNotify = objectMapper.createObjectNode();
                            hostNotify.put("type", "waiting-participant");
                            hostNotify.put("participantId", session.getId());
                            hostNotify.put("username", username);
                            s.sendMessage(new TextMessage(hostNotify.toString()));
                            break;
                        }
                    }
                }
            }
            return;
        }

        // Add to meeting room
        meetingRooms.get(meetingCode).add(session);

        // Send existing participants to new user
        ObjectNode participantsList = objectMapper.createObjectNode();
        participantsList.put("type", "participants-list");
        participantsList.putArray("participants");

        for (WebSocketSession existingSession : meetingRooms.get(meetingCode)) {
            if (!existingSession.getId().equals(session.getId())) {
                ParticipantInfo existingInfo = participants.get(existingSession.getId());
                if (existingInfo != null) {
                    ObjectNode p = objectMapper.createObjectNode();
                    p.put("id", existingSession.getId());
                    p.put("username", existingInfo.getUsername());
                    p.put("isHost", existingInfo.isHost());
                    p.put("audioEnabled", existingInfo.isAudioEnabled());
                    p.put("videoEnabled", existingInfo.isVideoEnabled());
                    p.put("handRaised", existingInfo.isHandRaised());
                    ((com.fasterxml.jackson.databind.node.ArrayNode) participantsList.get("participants")).add(p);
                }
            }
        }
        session.sendMessage(new TextMessage(participantsList.toString()));

        // Send join success with own info
        ObjectNode joinSuccess = objectMapper.createObjectNode();
        joinSuccess.put("type", "join-success");
        joinSuccess.put("participantId", session.getId());
        joinSuccess.put("isHost", info.isHost());
        session.sendMessage(new TextMessage(joinSuccess.toString()));

        // Notify others about new participant
        ObjectNode joinNotification = objectMapper.createObjectNode();
        joinNotification.put("type", "participant-joined");
        joinNotification.put("id", session.getId());
        joinNotification.put("username", username);
        joinNotification.put("isHost", info.isHost());
        joinNotification.put("audioEnabled", info.isAudioEnabled());
        joinNotification.put("videoEnabled", info.isVideoEnabled());

        broadcastToRoom(meetingCode, joinNotification.toString(), session.getId());
    }

    private void handleOffer(WebSocketSession session, JsonNode json) throws IOException {
        String targetId = json.get("targetId").asText();
        String meetingCode = participants.get(session.getId()).getMeetingCode();

        ObjectNode offer = objectMapper.createObjectNode();
        offer.put("type", "offer");
        offer.put("senderId", session.getId());
        offer.set("sdp", json.get("sdp"));

        sendToParticipant(meetingCode, targetId, offer.toString());
    }

    private void handleAnswer(WebSocketSession session, JsonNode json) throws IOException {
        String targetId = json.get("targetId").asText();
        String meetingCode = participants.get(session.getId()).getMeetingCode();

        ObjectNode answer = objectMapper.createObjectNode();
        answer.put("type", "answer");
        answer.put("senderId", session.getId());
        answer.set("sdp", json.get("sdp"));

        sendToParticipant(meetingCode, targetId, answer.toString());
    }

    private void handleIceCandidate(WebSocketSession session, JsonNode json) throws IOException {
        String targetId = json.get("targetId").asText();
        String meetingCode = participants.get(session.getId()).getMeetingCode();

        ObjectNode candidate = objectMapper.createObjectNode();
        candidate.put("type", "ice-candidate");
        candidate.put("senderId", session.getId());
        candidate.set("candidate", json.get("candidate"));

        sendToParticipant(meetingCode, targetId, candidate.toString());
    }

    private void handleChat(WebSocketSession session, JsonNode json) throws IOException {
        ParticipantInfo info = participants.get(session.getId());
        if (info == null)
            return;

        ObjectNode chatMessage = objectMapper.createObjectNode();
        chatMessage.put("type", "chat");
        chatMessage.put("senderId", session.getId());
        chatMessage.put("senderName", info.getUsername());
        chatMessage.put("message", json.get("message").asText());
        chatMessage.put("timestamp", System.currentTimeMillis());

        broadcastToRoom(info.getMeetingCode(), chatMessage.toString(), null);
    }

    private void handleMediaToggle(WebSocketSession session, JsonNode json) throws IOException {
        ParticipantInfo info = participants.get(session.getId());
        if (info == null)
            return;

        String mediaType = json.get("mediaType").asText();
        boolean enabled = json.get("enabled").asBoolean();

        if ("audio".equals(mediaType)) {
            info.setAudioEnabled(enabled);
        } else if ("video".equals(mediaType)) {
            info.setVideoEnabled(enabled);
        }

        ObjectNode notification = objectMapper.createObjectNode();
        notification.put("type", "media-toggle");
        notification.put("participantId", session.getId());
        notification.put("mediaType", mediaType);
        notification.put("enabled", enabled);

        broadcastToRoom(info.getMeetingCode(), notification.toString(), null);
    }

    private void handleRaiseHand(WebSocketSession session, JsonNode json) throws IOException {
        ParticipantInfo info = participants.get(session.getId());
        if (info == null)
            return;

        boolean raised = json.get("raised").asBoolean();
        info.setHandRaised(raised);

        ObjectNode notification = objectMapper.createObjectNode();
        notification.put("type", "hand-raised");
        notification.put("participantId", session.getId());
        notification.put("username", info.getUsername());
        notification.put("raised", raised);

        broadcastToRoom(info.getMeetingCode(), notification.toString(), null);
    }

    private void handleScreenShare(WebSocketSession session, JsonNode json) throws IOException {
        ParticipantInfo info = participants.get(session.getId());
        if (info == null)
            return;

        boolean sharing = json.get("sharing").asBoolean();
        info.setScreenSharing(sharing);

        ObjectNode notification = objectMapper.createObjectNode();
        notification.put("type", "screen-share");
        notification.put("participantId", session.getId());
        notification.put("username", info.getUsername());
        notification.put("sharing", sharing);

        broadcastToRoom(info.getMeetingCode(), notification.toString(), null);
    }

    private void handleMuteParticipant(WebSocketSession session, JsonNode json) throws IOException {
        ParticipantInfo senderInfo = participants.get(session.getId());
        if (senderInfo == null || !senderInfo.isHost())
            return;

        String targetId = json.get("targetId").asText();
        String mediaType = json.get("mediaType").asText();

        ObjectNode notification = objectMapper.createObjectNode();
        notification.put("type", "force-mute");
        notification.put("mediaType", mediaType);
        notification.put("byHost", true);

        sendToParticipant(senderInfo.getMeetingCode(), targetId, notification.toString());

        // Update participant state
        ParticipantInfo targetInfo = participants.get(targetId);
        if (targetInfo != null) {
            if ("audio".equals(mediaType)) {
                targetInfo.setAudioEnabled(false);
            } else if ("video".equals(mediaType)) {
                targetInfo.setVideoEnabled(false);
            }
        }
    }

    private void handleRemoveParticipant(WebSocketSession session, JsonNode json) throws IOException {
        ParticipantInfo senderInfo = participants.get(session.getId());
        if (senderInfo == null || !senderInfo.isHost())
            return;

        String targetId = json.get("targetId").asText();

        // Notify the participant they're being removed
        ObjectNode notification = objectMapper.createObjectNode();
        notification.put("type", "removed-from-meeting");
        notification.put("reason", "Removed by host");

        sendToParticipant(senderInfo.getMeetingCode(), targetId, notification.toString());

        // Remove participant from room
        Set<WebSocketSession> room = meetingRooms.get(senderInfo.getMeetingCode());
        if (room != null) {
            for (WebSocketSession s : room) {
                if (s.getId().equals(targetId)) {
                    room.remove(s);
                    break;
                }
            }
        }

        // Notify others
        ObjectNode leftNotification = objectMapper.createObjectNode();
        leftNotification.put("type", "participant-left");
        leftNotification.put("participantId", targetId);
        leftNotification.put("removedByHost", true);

        broadcastToRoom(senderInfo.getMeetingCode(), leftNotification.toString(), targetId);

        participants.remove(targetId);
    }

    private void handleAdmitParticipant(WebSocketSession session, JsonNode json) throws IOException {
        ParticipantInfo senderInfo = participants.get(session.getId());
        if (senderInfo == null || !senderInfo.isHost())
            return;

        String targetId = json.get("targetId").asText();
        String meetingCode = senderInfo.getMeetingCode();

        MeetingSettings settings = meetingSettings.get(meetingCode);
        if (settings != null) {
            settings.removeFromWaitingRoom(targetId);
        }

        // Find the waiting session and admit them
        // Note: They need to resend join request
        ObjectNode notification = objectMapper.createObjectNode();
        notification.put("type", "admitted");

        sendToWaitingParticipant(targetId, notification.toString());
    }

    private void handleDenyParticipant(WebSocketSession session, JsonNode json) throws IOException {
        ParticipantInfo senderInfo = participants.get(session.getId());
        if (senderInfo == null || !senderInfo.isHost())
            return;

        String targetId = json.get("targetId").asText();
        String meetingCode = senderInfo.getMeetingCode();

        MeetingSettings settings = meetingSettings.get(meetingCode);
        if (settings != null) {
            settings.removeFromWaitingRoom(targetId);
        }

        ObjectNode notification = objectMapper.createObjectNode();
        notification.put("type", "denied");
        notification.put("message", "Your request to join was denied by the host.");

        sendToWaitingParticipant(targetId, notification.toString());
    }

    private void handleWaitingRoomRequest(WebSocketSession session, JsonNode json) throws IOException {
        String meetingCode = json.get("meetingCode").asText();

        MeetingSettings settings = meetingSettings.get(meetingCode);
        if (settings != null) {
            settings.addToWaitingRoom(session.getId());
        }
    }

    private void handleLockMeeting(WebSocketSession session, JsonNode json) throws IOException {
        ParticipantInfo info = participants.get(session.getId());
        if (info == null || !info.isHost())
            return;

        boolean locked = json.get("locked").asBoolean();

        MeetingSettings settings = meetingSettings.get(info.getMeetingCode());
        if (settings != null) {
            settings.setLocked(locked);
        }

        ObjectNode notification = objectMapper.createObjectNode();
        notification.put("type", "meeting-lock-changed");
        notification.put("locked", locked);

        broadcastToRoom(info.getMeetingCode(), notification.toString(), null);
    }

    private void handleLeave(WebSocketSession session) throws IOException {
        ParticipantInfo info = participants.get(session.getId());
        if (info == null)
            return;

        String meetingCode = info.getMeetingCode();

        // Remove from room
        Set<WebSocketSession> room = meetingRooms.get(meetingCode);
        if (room != null) {
            room.remove(session);
        }

        // Notify others
        ObjectNode notification = objectMapper.createObjectNode();
        notification.put("type", "participant-left");
        notification.put("participantId", session.getId());
        notification.put("username", info.getUsername());

        broadcastToRoom(meetingCode, notification.toString(), session.getId());

        participants.remove(session.getId());

        // Handle host leaving - assign new host
        if (info.isHost() && room != null && !room.isEmpty()) {
            WebSocketSession newHostSession = room.iterator().next();
            ParticipantInfo newHostInfo = participants.get(newHostSession.getId());
            if (newHostInfo != null) {
                newHostInfo.setHost(true);
                meetingHosts.put(meetingCode, newHostSession.getId());

                ObjectNode hostNotification = objectMapper.createObjectNode();
                hostNotification.put("type", "host-changed");
                hostNotification.put("newHostId", newHostSession.getId());
                hostNotification.put("newHostName", newHostInfo.getUsername());

                broadcastToRoom(meetingCode, hostNotification.toString(), null);
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        handleLeave(session);
        System.out.println("WebSocket connection closed: " + session.getId());
    }

    private void broadcastToRoom(String meetingCode, String message, String excludeSessionId) {
        Set<WebSocketSession> room = meetingRooms.get(meetingCode);
        if (room == null)
            return;

        for (WebSocketSession session : room) {
            if (session.isOpen() && (excludeSessionId == null || !session.getId().equals(excludeSessionId))) {
                try {
                    session.sendMessage(new TextMessage(message));
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }

    private void sendToParticipant(String meetingCode, String targetId, String message) {
        Set<WebSocketSession> room = meetingRooms.get(meetingCode);
        if (room == null)
            return;

        for (WebSocketSession session : room) {
            if (session.getId().equals(targetId) && session.isOpen()) {
                try {
                    session.sendMessage(new TextMessage(message));
                } catch (IOException e) {
                    e.printStackTrace();
                }
                break;
            }
        }
    }

    private void sendToWaitingParticipant(String targetId, String message) {
        // This would need to track waiting room sessions separately
        // For now, we use the participants map
        // In production, maintain a separate waiting sessions map
    }

    // Inner classes for data structures
    private static class ParticipantInfo {
        private String sessionId;
        private String username;
        private String meetingCode;
        private boolean isHost;
        private boolean audioEnabled;
        private boolean videoEnabled;
        private boolean handRaised;
        private boolean screenSharing;

        public ParticipantInfo(String sessionId, String username, String meetingCode,
                boolean isHost, boolean audioEnabled, boolean videoEnabled) {
            this.sessionId = sessionId;
            this.username = username;
            this.meetingCode = meetingCode;
            this.isHost = isHost;
            this.audioEnabled = audioEnabled;
            this.videoEnabled = videoEnabled;
            this.handRaised = false;
            this.screenSharing = false;
        }

        public String getSessionId() {
            return sessionId;
        }

        public String getUsername() {
            return username;
        }

        public String getMeetingCode() {
            return meetingCode;
        }

        public boolean isHost() {
            return isHost;
        }

        public void setHost(boolean host) {
            isHost = host;
        }

        public boolean isAudioEnabled() {
            return audioEnabled;
        }

        public void setAudioEnabled(boolean audioEnabled) {
            this.audioEnabled = audioEnabled;
        }

        public boolean isVideoEnabled() {
            return videoEnabled;
        }

        public void setVideoEnabled(boolean videoEnabled) {
            this.videoEnabled = videoEnabled;
        }

        public boolean isHandRaised() {
            return handRaised;
        }

        public void setHandRaised(boolean handRaised) {
            this.handRaised = handRaised;
        }

        public boolean isScreenSharing() {
            return screenSharing;
        }

        public void setScreenSharing(boolean screenSharing) {
            this.screenSharing = screenSharing;
        }
    }

    private static class MeetingSettings {
        private boolean waitingRoomEnabled = false;
        private boolean locked = false;
        private Set<String> waitingRoom = new CopyOnWriteArraySet<>();

        public boolean isWaitingRoomEnabled() {
            return waitingRoomEnabled;
        }

        public void setWaitingRoomEnabled(boolean enabled) {
            this.waitingRoomEnabled = enabled;
        }

        public boolean isLocked() {
            return locked;
        }

        public void setLocked(boolean locked) {
            this.locked = locked;
        }

        public void addToWaitingRoom(String sessionId) {
            waitingRoom.add(sessionId);
        }

        public void removeFromWaitingRoom(String sessionId) {
            waitingRoom.remove(sessionId);
        }

        public boolean isInWaitingRoom(String sessionId) {
            return waitingRoom.contains(sessionId);
        }
    }
}
