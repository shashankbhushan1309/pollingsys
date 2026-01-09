"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatService = void 0;
const chat_repository_1 = require("./chat.repository");
class ChatService {
    constructor() {
        this.io = null;
        // In-memory participant tracking (since socket connections are ephemeral)
        // Maps socketId -> { name, role, joinedAt }
        this.participants = new Map();
    }
    initSocket(io) {
        this.io = io;
    }
    async addParticipant(socketId, name, role) {
        this.participants.set(socketId, { name, role, joinedAt: new Date() });
        this.broadcastParticipants();
    }
    removeParticipant(socketId) {
        this.participants.delete(socketId);
        this.broadcastParticipants();
    }
    getParticipants() {
        // Return array of participants with socketId attached
        return Array.from(this.participants.entries()).map(([id, data]) => ({
            sessionId: id,
            studentName: data.name,
            role: data.role
        }));
    }
    async sendMessage(senderId, senderName, role, text) {
        if (!this.io)
            return;
        // 1. Persist to DB
        const message = await chat_repository_1.chatRepository.saveMessage({
            senderId,
            senderName,
            role,
            text
        });
        // 2. Broadcast to all
        this.io.emit("chat:message", message);
        return message;
    }
    async getHistory() {
        return await chat_repository_1.chatRepository.getRecentMessages();
    }
    kickStudent(socketId) {
        if (!this.io)
            return;
        // Emit specific event to the kicked socket so it can handle logout
        this.io.to(socketId).emit("student:removed", { sessionId: socketId });
        // Force disconnect logic if needed, but client handling is smoother
        // We removed them from participants list automatically on disconnect, 
        // but let's do it explicitly if they don't disconnect immediately
        this.participants.delete(socketId);
        this.broadcastParticipants();
    }
    broadcastParticipants() {
        if (this.io) {
            this.io.emit("participants:update", this.getParticipants());
        }
    }
}
exports.chatService = new ChatService();
