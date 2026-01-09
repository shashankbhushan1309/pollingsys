"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./config/db");
const poll_socket_1 = require("./modules/poll/poll.socket");
const chat_socket_1 = require("./modules/chat/chat.socket");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Check environment variables
const CLIENT_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const PORT = process.env.PORT || 3001;
// CORS Setup
app.use((0, cors_1.default)({ origin: CLIENT_URL, credentials: true }));
// Socket.io Setup
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*", // Using * for dev simplicity, in prod strictly CLIENT_URL
        methods: ["GET", "POST"],
    },
});
// Database Connection and Server Startup
(async () => {
    try {
        await (0, db_1.connectDB)();
        // Register Modules after DB is connected
        poll_socket_1.PollSocket.register(io);
        chat_socket_1.ChatSocket.register(io);
        // Start Server
        httpServer.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    }
    catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
})();
