import { Server, Socket } from "socket.io";
import { pollService } from "./poll.service";
import { ApiError } from "../../utils/ApiError";

export class PollSocket {
    static register(io: Server) {
        // Initialize service with IO instance
        pollService.initSocket(io);

        io.on("connection", async (socket: Socket) => {
            console.log(`🔌 Client connected: ${socket.id}`);

            // 1. RECOVERY: Sync State on Connection
            socket.on("poll:sync", async (data) => {
                try {
                    const role = data?.role || "student"; // Default to student if not provided
                    const studentId = data?.studentId || socket.id; // [FIX] Use persistent ID if available

                    // Join Role Room
                    if (role === "teacher") {
                        socket.join("teacher");
                    } else {
                        socket.join("student");
                    }

                    const state = await pollService.getPollState(studentId, role);
                    socket.emit("poll:state", state);

                    // Send history to EVERYONE on join
                    const history = await pollService.getHistory();
                    socket.emit("poll:history", { history });
                } catch (err) {
                    console.error("Sync error:", err);
                    socket.emit("error", { message: "Failed to sync state" });
                }
            });

            // 2. TEACHER: Create Poll
            socket.on("teacher:create_poll", async (data) => {
                try {
                    const { question, options, duration, correctOptionIndex } = data; // [UPDATED]
                    await pollService.createPoll(question, options, duration, "teacher-1", correctOptionIndex);
                    // poll:started is emitted by service via broadcastPollStarted
                } catch (err: any) {
                    socket.emit("error", { message: err.message || "Failed to create poll" });
                }
            });

            // 3. TEACHER: Get History
            socket.on("teacher:get_history", async () => {
                try {
                    const history = await pollService.getHistory();
                    socket.emit("poll:history", { history });
                } catch (err) {
                    console.error(err);
                }
            });

            // 4. TEACHER: Stop Poll
            socket.on("teacher:stop_poll", async (data) => {
                try {
                    if (data?.pollId) {
                        await pollService.endPoll(data.pollId);
                    } else {
                        // Fallback: try to end active
                        const state = await pollService.getPollState("teacher", "teacher");
                        if (state.isActive && state.pollId) {
                            await pollService.endPoll((state.pollId as unknown) as string);
                        }
                    }
                } catch (err: any) {
                    socket.emit("error", { message: err.message });
                }
            });

            // 5. STUDENT: Vote
            socket.on("student:vote", async (data) => {
                try {
                    const { pollId, optionId, studentName, studentId } = data; // [UPDATED] Extract name & ID

                    // Identity = persistent ID (preferred) or socket.id
                    // If studentName is missing from payload, fallback to "Anonymous" or fetch from ChatService if possible
                    const name = studentName || "Anonymous";
                    const finalStudentId = studentId || socket.id;

                    await pollService.submitVote(pollId, finalStudentId, name, optionId);

                    socket.emit("vote:accepted", { pollId, optionId });
                } catch (err: any) {
                    console.error("Vote error:", err.message);
                    socket.emit("vote:rejected", { message: err.message || "Vote failed" });
                }
            });

            // 6. STUDENT: Join (Legacy support if frontend sends it, mostly used for naming)
            socket.on("student:join", (data) => {
                // We can store the name mapping in memory or DB if we want to show names
                // For now, strict requirements focus on ID.
                console.log(`Student joined: ${data.studentName} (${socket.id})`);
            });

            socket.on("disconnect", () => {
                console.log(`❌ Client disconnected: ${socket.id}`);
            });
        });
    }
}
