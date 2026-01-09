import mongoose, { Schema, Document } from "mongoose";


export interface IVote extends Document {
    pollId: string;
    studentId: string;
    studentName: string; // [NEW] Track name for detailed results
    optionId: string;
    votedAt: Date;
}

const VoteSchema = new Schema<IVote>(
    {
        pollId: { type: String, required: true },
        studentId: { type: String, required: true },
        studentName: { type: String, required: true }, // [NEW]
        optionId: { type: String, required: true },
        votedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// MANDATORY: Unique Constraint (pollId + studentId)
VoteSchema.index({ pollId: 1, studentId: 1 }, { unique: true });

export const Vote = mongoose.model<IVote>("Vote", VoteSchema);

