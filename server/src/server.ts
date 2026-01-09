import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { connectDB } from "./config/db";
import { PollSocket } from "./modules/poll/poll.socket";
import { ChatSocket } from "./modules/chat/chat.socket";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Check environment variables
const CLIENT_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const PORT = process.env.PORT || 3001;

// CORS Setup
app.use(cors({ origin: CLIENT_URL, credentials: true }));

// Socket.io Setup
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Using * for dev simplicity, in prod strictly CLIENT_URL
        methods: ["GET", "POST"],
    },
});

// Database Connection and Server Startup
(async () => {
    try {
        await connectDB();

        // Register Modules after DB is connected
        PollSocket.register(io);
        ChatSocket.register(io);

        // Start Server
        httpServer.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
})();
