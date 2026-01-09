"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const poll_repository_1 = require("./poll.repository");
const ApiError_1 = require("../../utils/ApiError");
class PollService {
    constructor() {
        this.io = null;
        this.currentTimeout = null;
    }
    // Initialize Socket.io instance
    initSocket(io) {
        this.io = io;
    }
    // Create a new poll (Queue Support)
    async createPoll(question, options, duration, teacherId, correctOptionIndex = -1) {
        if (mongoose_1.default.connection.readyState !== 1)
            throw new Error("Database not connected");
        if (!this.io)
            throw new Error("Socket.io not initialized in PollService");
        // 1. Check if an active poll exists
        const activePoll = await poll_repository_1.pollRepository.getActivePoll();
        // 2. Determine initial status
        let status = 'ACTIVE';
        if (activePoll) {
            status = 'QUEUED';
        }
        // 3. Create poll in DB
        const poll = await poll_repository_1.pollRepository.createPoll({
            questionId: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            question,
            options,
            correctOptionIndex,
            duration,
            startedAt: status === 'ACTIVE' ? new Date() : undefined, // Only set start time if active
            isActive: status === 'ACTIVE',
            status: status,
            queuedAt: status === 'QUEUED' ? new Date() : undefined,
            createdBy: teacherId || "teacher-default",
        });
        // 4. If ACTIVE, Start Timer & Broadcast
        if (status === 'ACTIVE') {
            this.startServerTimer(poll._id, duration);
            this.broadcastPollStarted(poll);
        }
        else {
            // [NEW] Notify teacher of queue
            this.io.emit("poll:queued", {
                pollId: poll._id,
                question: poll.question
            });
        }
        return poll;
    }
    // Handle Vote
    async submitVote(pollId, studentId, studentName, optionId) {
        if (mongoose_1.default.connection.readyState !== 1)
            throw new Error("Database not connected");
        if (!this.io)
            throw new Error("Socket.io not initialized");
        // 1. Validate Poll Existence & Status
        const poll = await poll_repository_1.pollRepository.getPollById(pollId);
        if (!poll)
            throw new ApiError_1.ApiError(404, "Poll not found");
        if (!poll.isActive)
            throw new ApiError_1.ApiError(400, "Poll is closed");
        // 2. Validate Timer (Server Authority)
        const now = Date.now();
        const startTime = new Date(poll.startedAt).getTime();
        const elapsedTime = (now - startTime) / 1000;
        if (elapsedTime > poll.duration + 2) {
            throw new ApiError_1.ApiError(400, "Voting time has expired");
        }
        // 3. Check Double Voting (Service Level Memory/Quick Check)
        const hasVoted = await poll_repository_1.pollRepository.hasVoted(pollId, studentId);
        if (hasVoted)
            throw new ApiError_1.ApiError(400, "You have already voted");
        // 4. Persist Vote (DB Unique Constraint protects race conditions)
        try {
            await poll_repository_1.pollRepository.createVote(pollId, studentId, studentName, optionId);
        }
        catch (error) {
            if (error.code === 11000) {
                throw new ApiError_1.ApiError(400, "You have already voted (Race Condition Caught)");
            }
            throw error;
        }
        // 5. Calculate & Broadcast Live Results
        await this.broadcastResults(pollId);
        return { success: true };
    }
    // Get Current State (Refresh Recovery)
    async getPollState(studentId, role = "student") {
        if (mongoose_1.default.connection.readyState !== 1)
            throw new Error("Database not connected");
        const poll = await poll_repository_1.pollRepository.getActivePoll();
        if (!poll) {
            return { isActive: false };
        }
        const now = Date.now();
        const startTime = new Date(poll.startedAt).getTime();
        const elapsedTime = (now - startTime) / 1000;
        const remainingTime = Math.max(0, Math.ceil(poll.duration - elapsedTime));
        if (remainingTime <= 0) {
            if (poll.isActive) {
                await this.endPoll(poll._id);
                return { isActive: false };
            }
        }
        const pollIdStr = poll._id;
        const hasVoted = await poll_repository_1.pollRepository.hasVoted(pollIdStr, studentId);
        // [FIX] Get Student Vote for Persistence
        let votedOption = null;
        if (hasVoted) {
            const vote = await poll_repository_1.pollRepository.getStudentVote(pollIdStr, studentId);
            if (vote)
                votedOption = vote.optionId;
        }
        // [FIX] Calculate Results for State Sync
        const counts = await poll_repository_1.pollRepository.getVoteCounts(pollIdStr);
        const detailedVotes = await poll_repository_1.pollRepository.getDetailedVotes(pollIdStr);
        const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);
        const results = poll.options.reduce((acc, option) => {
            const count = counts[option] || 0;
            acc[option] = {
                count,
                percentage: totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100)
            };
            return acc;
        }, {});
        // Base Payload
        const payload = {
            isActive: true,
            pollId: poll._id,
            question: poll.question,
            options: poll.options,
            startedAt: startTime,
            duration: poll.duration,
            remainingTime,
            hasVoted,
            votedOption, // [NEW] Send persisted option
            canVote: !hasVoted // Explicit flag for frontend
        };
        // Role-Based Filtering
        if (role === "teacher") {
            payload.results = results;
            payload.totalVotes = totalVotes;
            payload.detailedVotes = detailedVotes;
            payload.correctOptionIndex = poll.correctOptionIndex;
        }
        else {
            // Student: Only receive results if they voted (optional, based on design)
            // STRICT REQUIREMENT: "Student does NOT see correct answer during live poll"
            // And "Enable voting only if canVote === true"
            if (hasVoted) {
                payload.results = results; // Percentages okay? "Student sees correct answer AFTER poll ends"
                // If we hide results until end, don't send results.
                // However, "Live polls work" implies *some* feedback.
                // But "Cannot vote anymore" was due to results presence triggering view switch.
                // I will include results ONLY for metadata, but ensure frontend doesn't lock voting based on it.
                // But critical: NO correctOptionIndex.
            }
            // For students who haven't voted, we DO NOT send results to avoid tempting them or revealing update
            // actually, better to keep it clean.
        }
        return payload;
    }
    // End Poll & Process Queue
    async endPoll(pollId) {
        if (!this.io)
            return;
        // 1. End current poll
        await poll_repository_1.pollRepository.deactivatePoll(pollId);
        if (this.currentTimeout)
            clearTimeout(this.currentTimeout);
        this.currentTimeout = null;
        // 2. Broadcast Final Results
        await this.broadcastResults(pollId, true); // true = final
        // 3. Check Queue for Next Poll
        const nextPoll = await poll_repository_1.pollRepository.getNextQueuedPoll();
        if (nextPoll) {
            // Activate Next Poll
            const activated = await poll_repository_1.pollRepository.activatePoll(nextPoll._id);
            if (activated) {
                // Determine remaining duration? It's a fresh start.
                this.startServerTimer(activated._id, activated.duration);
                this.broadcastPollStarted(activated);
            }
        }
    }
    // Helper: Start Timer
    startServerTimer(pollId, duration) {
        // Add 1s buffer to ensure client finishes first
        this.currentTimeout = setTimeout(() => {
            this.endPoll(pollId);
        }, (duration + 1) * 1000);
    }
    // Helper: Broadcast Poll Started (Role-Based)
    broadcastPollStarted(poll) {
        if (!this.io)
            return;
        const basePayload = {
            pollId: poll._id,
            questionId: poll.questionId,
            question: poll.question,
            options: poll.options,
            startedAt: poll.startedAt.getTime(),
            duration: poll.duration
        };
        // Teacher Payload (Full)
        const teacherPayload = {
            ...basePayload,
            correctOptionIndex: poll.correctOptionIndex
        };
        // Student Payload (Restricted)
        const studentPayload = {
            ...basePayload,
            canVote: true
            // NO correctOptionIndex
        };
        this.io.to("teacher").emit("poll:started", teacherPayload);
        this.io.to("student").emit("poll:started", studentPayload);
    }
    // Helper: Broadcast Results
    async broadcastResults(pollId, isFinal = false) {
        if (!this.io)
            return;
        const counts = await poll_repository_1.pollRepository.getVoteCounts(pollId);
        const detailedVotes = await poll_repository_1.pollRepository.getDetailedVotes(pollId);
        const poll = await poll_repository_1.pollRepository.getPollById(pollId);
        if (poll) {
            const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);
            const results = poll.options.reduce((acc, option) => {
                const count = counts[option] || 0;
                acc[option] = {
                    count,
                    percentage: totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100)
                };
                return acc;
            }, {});
            const basePayload = {
                results,
                totalVotes
            };
            const teacherPayload = {
                ...basePayload,
                detailedVotes,
                correctOptionIndex: poll.correctOptionIndex
            };
            const studentPayload = {
                ...basePayload
                // NO detailedVotes
                // NO correctOptionIndex (unless final)
            };
            if (isFinal) {
                // Final results: Students can see correct answer now
                const finalStudentPayload = {
                    ...studentPayload,
                    correctOptionIndex: poll.correctOptionIndex
                };
                this.io.to("teacher").emit("poll:ended", teacherPayload);
                this.io.to("student").emit("poll:ended", finalStudentPayload);
                // Also Refresh History for everyone
                const history = await poll_repository_1.pollRepository.getPollHistory();
                this.io.emit("poll:history", { history });
            }
            else {
                // Live update: NO correct answer for students
                this.io.to("teacher").emit("poll:updated", teacherPayload);
                this.io.to("student").emit("poll:updated", studentPayload);
            }
        }
    }
    async getHistory() {
        return await poll_repository_1.pollRepository.getPollHistory();
    }
}
exports.pollService = new PollService();
