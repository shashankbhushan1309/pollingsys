"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRepository = exports.ChatRepository = void 0;
const chat_model_1 = require("./chat.model");
class ChatRepository {
    async saveMessage(data) {
        return await chat_model_1.ChatMessage.create(data);
    }
    async getRecentMessages(limit = 50) {
        return await chat_model_1.ChatMessage.find().sort({ createdAt: 1 }).limit(limit); // Oldest first for chat flow
    }
}
exports.ChatRepository = ChatRepository;
exports.chatRepository = new ChatRepository();
