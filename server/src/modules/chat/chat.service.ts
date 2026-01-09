import { Server } from "socket.io";
import { chatRepository } from "./chat.repository";

class ChatService {
    private io: Server | null = null;
    // In-memory participant tracking (since socket connections are ephemeral)
    // Maps socketId -> { name, role, joinedAt }
    private participants: Map<string, { name: string; role: 'student' | 'teacher'; joinedAt: Date }> = new Map();

    initSocket(io: Server) {
        this.io = io;
    }

    async addParticipant(socketId: string, name: string, role: 'student' | 'teacher') {
        this.participants.set(socketId, { name, role, joinedAt: new Date() });
        this.broadcastParticipants();
    }

    removeParticipant(socketId: string) {
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

    async sendMessage(senderId: string, senderName: string, role: 'teacher' | 'student', text: string) {
        if (!this.io) return;

        // 1. Persist to DB
        const message = await chatRepository.saveMessage({
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
        return await chatRepository.getRecentMessages();
    }

    kickStudent(socketId: string) {
        if (!this.io) return;

        // Emit specific event to the kicked socket so it can handle logout
        this.io.to(socketId).emit("student:removed", { sessionId: socketId });

        // Force disconnect logic if needed, but client handling is smoother
        // We removed them from participants list automatically on disconnect, 
        // but let's do it explicitly if they don't disconnect immediately
        this.participants.delete(socketId);
        this.broadcastParticipants();
    }

    private broadcastParticipants() {
        if (this.io) {
            this.io.emit("participants:update", this.getParticipants());
        }
    }
}

export const chatService = new ChatService();
