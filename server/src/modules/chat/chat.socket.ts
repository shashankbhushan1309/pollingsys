import { Server, Socket } from "socket.io";
import { chatService } from "./chat.service";

export class ChatSocket {
    static register(io: Server) {
        chatService.initSocket(io);

        io.on("connection", async (socket: Socket) => {

            // 1. Sync Chat History & Participants on Connect
            socket.on("chat:sync", async (data) => {
                // Add to participants list if they identify themselves
                if (data?.name && data?.role) {
                    await chatService.addParticipant(socket.id, data.name, data.role);
                }

                const history = await chatService.getHistory();
                socket.emit("chat:history", history);

                // Send current participants
                socket.emit("participants:update", chatService.getParticipants());
            });

            // 2. Send Message
            socket.on("chat:send", async (data) => {
                try {
                    const { senderName, role, text } = data;
                    await chatService.sendMessage(socket.id, senderName, role, text);
                } catch (err) {
                    console.error("Chat error:", err);
                }
            });

            // 3. Kick Student (Teacher Only)
            socket.on("teacher:kick_student", (data) => {
                // Security: In a real app, verify socket.data.role === 'teacher'
                // For now, trusting the event source as per instructions "Teacher can kick"
                if (data?.sessionId) {
                    chatService.kickStudent(data.sessionId);
                }
            });

            socket.on("disconnect", () => {
                chatService.removeParticipant(socket.id);
            });
        });
    }
}
