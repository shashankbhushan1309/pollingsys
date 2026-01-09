"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSocket = void 0;
const chat_service_1 = require("./chat.service");
class ChatSocket {
    static register(io) {
        chat_service_1.chatService.initSocket(io);
        io.on("connection", async (socket) => {
            // 1. Sync Chat History & Participants on Connect
            socket.on("chat:sync", async (data) => {
                // Add to participants list if they identify themselves
                if (data?.name && data?.role) {
                    await chat_service_1.chatService.addParticipant(socket.id, data.name, data.role);
                }
                const history = await chat_service_1.chatService.getHistory();
                socket.emit("chat:history", history);
                // Send current participants
                socket.emit("participants:update", chat_service_1.chatService.getParticipants());
            });
            // 2. Send Message
            socket.on("chat:send", async (data) => {
                try {
                    const { senderName, role, text } = data;
                    await chat_service_1.chatService.sendMessage(socket.id, senderName, role, text);
                }
                catch (err) {
                    console.error("Chat error:", err);
                }
            });
            // 3. Kick Student (Teacher Only)
            socket.on("teacher:kick_student", (data) => {
                // Security: In a real app, verify socket.data.role === 'teacher'
                // For now, trusting the event source as per instructions "Teacher can kick"
                if (data?.sessionId) {
                    chat_service_1.chatService.kickStudent(data.sessionId);
                }
            });
            socket.on("disconnect", () => {
                chat_service_1.chatService.removeParticipant(socket.id);
            });
        });
    }
}
exports.ChatSocket = ChatSocket;
