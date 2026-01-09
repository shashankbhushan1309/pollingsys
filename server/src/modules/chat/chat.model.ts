import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
    senderId: string;
    senderName: string;
    text: string;
    role: 'teacher' | 'student';
    createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
    {
        senderId: { type: String, required: true },
        senderName: { type: String, required: true },
        text: { type: String, required: true },
        role: { type: String, enum: ['teacher', 'student'], required: true },
    },
    { timestamps: true }
);

export const ChatMessage = mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
