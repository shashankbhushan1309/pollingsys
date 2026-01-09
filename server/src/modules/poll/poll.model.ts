import mongoose, { Schema, Document } from "mongoose";

export interface IPoll extends Document {
    questionId: string; // [FIX]
    question: string;
    options: string[];
    correctOptionIndex: number; // [NEW]
    duration: number; // in seconds
    startedAt: Date;
    isActive: boolean;
    status: 'QUEUED' | 'ACTIVE' | 'ENDED'; // [NEW]
    queuedAt?: Date; // [NEW]
    endedAt?: Date; // [NEW]
    createdBy: string;
}

const PollSchema = new Schema<IPoll>(
    {
        questionId: { type: String, required: true, unique: true }, // Fix E11000 by populating this
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctOptionIndex: { type: Number, default: -1 }, // [NEW] Correct Answer
        duration: { type: Number, required: true },
        startedAt: { type: Date, default: null },
        isActive: { type: Boolean, default: true },
        status: { type: String, enum: ['QUEUED', 'ACTIVE', 'ENDED'], default: 'ACTIVE' }, // [NEW] Queue System
        queuedAt: { type: Date }, // [NEW] Track queue time
        endedAt: { type: Date }, // [NEW] Track end time
        createdBy: { type: String, required: true },
    },
    { timestamps: true }
);

// Index for quick active poll lookup
PollSchema.index({ isActive: 1 });
PollSchema.index({ createdAt: -1 });

export const Poll = mongoose.model<IPoll>("Poll", PollSchema);
