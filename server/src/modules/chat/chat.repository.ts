import { ChatMessage, IChatMessage } from "./chat.model";

export class ChatRepository {
    async saveMessage(data: Partial<IChatMessage>): Promise<IChatMessage> {
        return await ChatMessage.create(data);
    }

    async getRecentMessages(limit: number = 50): Promise<IChatMessage[]> {
        return await ChatMessage.find().sort({ createdAt: 1 }).limit(limit); // Oldest first for chat flow
    }
}

export const chatRepository = new ChatRepository();
