import { Server } from "socket.io";
import mongoose from "mongoose";
import { pollRepository } from "./poll.repository";
import { ApiError } from "../../utils/ApiError";

class PollService {
    private io: Server | null = null;
    private currentTimeout: NodeJS.Timeout | null = null;

    // Initialize Socket.io instance
    initSocket(io: Server) {
        this.io = io;
    }

    // Create a new poll (Queue Support)
    async createPoll(question: string, options: string[], duration: number, teacherId: string, correctOptionIndex: number = -1) {
        if (mongoose.connection.readyState !== 1) throw new Error("Database not connected");
        if (!this.io) throw new Error("Socket.io not initialized in PollService");

        // 1. Check if an active poll exists
        const activePoll = await pollRepository.getActivePoll();

        // 2. Determine initial status
        let status: 'ACTIVE' | 'QUEUED' = 'ACTIVE';
        if (activePoll) {
            status = 'QUEUED';
        }

        // 3. Create poll in DB
        const poll = await pollRepository.createPoll({
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

        // [STRICT] Emit poll:created as required
        this.io.emit("poll:created", poll);

        // 4. If ACTIVE, Start Timer & Broadcast
        if (status === 'ACTIVE') {
            this.startServerTimer((poll._id as unknown) as string, duration);
            this.broadcastPollStarted(poll);
        } else {
            // [NEW] Notify teacher of queue
            this.io.emit("poll:queued", {
                pollId: poll._id,
                question: poll.question
            });
        }

        return poll;
    }

    // Handle Vote
    async submitVote(pollId: string, studentId: string, studentName: string, optionId: string) {
        if (mongoose.connection.readyState !== 1) throw new Error("Database not connected");
        if (!this.io) throw new Error("Socket.io not initialized");

        // 1. Validate Poll Existence & Status
        const poll = await pollRepository.getPollById(pollId);
        if (!poll) throw new ApiError(404, "Poll not found");
        if (!poll.isActive) throw new ApiError(400, "Poll is closed");

        // 2. Validate Timer (Server Authority)
        const now = Date.now();
        const startTime = new Date(poll.startedAt).getTime();
        const elapsedTime = (now - startTime) / 1000;

        if (elapsedTime > poll.duration + 2) {
            throw new ApiError(400, "Voting time has expired");
        }

        // 3. Check Double Voting (Service Level Memory/Quick Check)
        const hasVoted = await pollRepository.hasVoted(pollId, studentId);
        if (hasVoted) throw new ApiError(400, "You have already voted");

        // 4. Persist Vote (DB Unique Constraint protects race conditions)
        try {
            await pollRepository.createVote(pollId, studentId, studentName, optionId);
        } catch (error: any) {
            if (error.code === 11000) {
                throw new ApiError(400, "You have already voted (Race Condition Caught)");
            }
            throw error;
        }

        // 5. Calculate & Broadcast Live Results
        await this.broadcastResults(pollId);

        return { success: true };
    }

    // Get Current State (Refresh Recovery)
    async getPollState(studentId: string, role: string = "student") {
        if (mongoose.connection.readyState !== 1) throw new Error("Database not connected");
        const poll = await pollRepository.getActivePoll();

        if (!poll) {
            return { isActive: false };
        }

        const now = Date.now();
        const startTime = new Date(poll.startedAt).getTime();
        const elapsedTime = (now - startTime) / 1000;
        const remainingTime = Math.max(0, Math.ceil(poll.duration - elapsedTime));

        if (remainingTime <= 0) {
            if (poll.isActive) {
                await this.endPoll((poll._id as unknown) as string);
                return { isActive: false };
            }
        }

        const pollIdStr = (poll._id as unknown) as string;
        const hasVoted = await pollRepository.hasVoted(pollIdStr, studentId);

        // [FIX] Get Student Vote for Persistence
        let votedOption = null;
        if (hasVoted) {
            const vote = await pollRepository.getStudentVote(pollIdStr, studentId);
            if (vote) votedOption = vote.optionId;
        }

        // [FIX] Calculate Results for State Sync
        const counts = await pollRepository.getVoteCounts(pollIdStr);
        const detailedVotes = await pollRepository.getDetailedVotes(pollIdStr);
        const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);

        const results = poll.options.reduce((acc, option) => {
            const count = counts[option] || 0;
            acc[option] = {
                count,
                percentage: totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100)
            };
            return acc;
        }, {} as Record<string, { count: number, percentage: number }>);

        // Base Payload
        const payload: any = {
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
        } else {
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
    async endPoll(pollId: string) {
        if (!this.io) return;

        // 1. End current poll (set isActive=false)
        await pollRepository.deactivatePoll(pollId);
        if (this.currentTimeout) clearTimeout(this.currentTimeout);
        this.currentTimeout = null;

        // 2. Broadcast Final Results IMMEDIATELY
        await this.broadcastResults(pollId, true); // true = final

        // 3. [STRICT] Server-Side 3-Second Result Phase
        setTimeout(async () => {
            if (!this.io) return;

            // 4. Check Queue for Next Poll
            const nextPoll = await pollRepository.getNextQueuedPoll();
            if (nextPoll) {
                // Activate Next Poll
                const activated = await pollRepository.activatePoll((nextPoll._id as unknown) as string);
                if (activated) {
                    this.startServerTimer((activated._id as unknown) as string, activated.duration);

                    // Broadcast Start (Handles sanitized poll:activated internal emission)
                    this.broadcastPollStarted(activated);
                }
            }
        }, 3000); // Strict 3s delay
    }

    // Helper: Start Timer
    private startServerTimer(pollId: string, duration: number) {
        // Add 1s buffer to ensure client finishes first
        this.currentTimeout = setTimeout(() => {
            this.endPoll(pollId);
        }, (duration + 1) * 1000);
    }

    // Helper: Broadcast Poll Started (Role-Based)
    private broadcastPollStarted(poll: any) {
        if (!this.io) return;

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

        // [FIX] Also emit sanitized poll:activated for strict compliance
        this.io.to("teacher").emit("poll:activated", teacherPayload);
        this.io.to("student").emit("poll:activated", studentPayload);
    }

    // Helper: Broadcast Results
    public async broadcastResults(pollId: string, isFinal: boolean = false) {
        if (!this.io) return;

        const counts = await pollRepository.getVoteCounts(pollId);
        const detailedVotes = await pollRepository.getDetailedVotes(pollId);
        const poll = await pollRepository.getPollById(pollId);

        if (poll) {
            const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);
            const results = poll.options.reduce((acc, option) => {
                const count = counts[option] || 0;
                acc[option] = {
                    count,
                    percentage: totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100)
                };
                return acc;
            }, {} as Record<string, { count: number, percentage: number }>);

            const basePayload = {
                pollId,
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
                const history = await pollRepository.getPollHistory();
                this.io.emit("poll:history", { history });
            } else {
                // Live update: NO correct answer for students
                // [FIX] Feature 3: Live Updates - Restrict to voted students
                // [STRICT] Rename to poll:liveUpdate
                this.io.to("poll:voted").emit("poll:liveUpdate", studentPayload);

                // [FIX] Emit to teachers so they see live updates too
                this.io.to("teacher").emit("poll:liveUpdate", teacherPayload);
            }

            return studentPayload;
        }
        return null;
    }

    async getHistory() {
        return await pollRepository.getPollHistory();
    }
}

export const pollService = new PollService();
