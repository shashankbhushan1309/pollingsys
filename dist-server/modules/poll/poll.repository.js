"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollRepository = exports.PollRepository = void 0;
const poll_model_1 = require("./poll.model");
const vote_model_1 = require("./vote.model");
class PollRepository {
    // Create a new poll
    async createPoll(data) {
        return await poll_model_1.Poll.create(data);
    }
    // Get current active poll
    async getActivePoll() {
        return await poll_model_1.Poll.findOne({ isActive: true }).sort({ createdAt: -1 });
    }
    // Get poll by ID
    async getPollById(pollId) {
        return await poll_model_1.Poll.findById(pollId);
    }
    // Deactivate poll
    async deactivatePoll(pollId) {
        await poll_model_1.Poll.findByIdAndUpdate(pollId, { isActive: false, status: 'ENDED', endedAt: new Date() });
    }
    // [NEW] Get Next Queued Poll
    async getNextQueuedPoll() {
        return await poll_model_1.Poll.findOne({ status: 'QUEUED' }).sort({ createdAt: 1 }); // FIFO Queue
    }
    // [NEW] Activate a queued poll
    async activatePoll(pollId) {
        return await poll_model_1.Poll.findByIdAndUpdate(pollId, {
            isActive: true,
            status: 'ACTIVE',
            startedAt: new Date() // Reset start time to now
        }, { new: true });
    }
    // Create vote (Enforced unique constraint by DB)
    async createVote(pollId, studentId, studentName, optionId) {
        return await vote_model_1.Vote.create({ pollId, studentId, studentName, optionId });
    }
    // Check if student voted
    async hasVoted(pollId, studentId) {
        const vote = await vote_model_1.Vote.exists({ pollId, studentId });
        return !!vote;
    }
    // Get vote counts for a poll
    async getVoteCounts(pollId) {
        const votes = await vote_model_1.Vote.find({ pollId });
        const counts = {};
        votes.forEach((v) => {
            counts[v.optionId] = (counts[v.optionId] || 0) + 1;
        });
        return counts;
    }
    // [NEW] Get detailed votes for teacher
    async getDetailedVotes(pollId) {
        const votes = await vote_model_1.Vote.find({ pollId });
        return votes.map(v => ({
            name: v.studentName,
            option: v.optionId
        }));
    }
    // Get poll history
    async getPollHistory() {
        const polls = await poll_model_1.Poll.find({ isActive: false }).sort({ createdAt: -1 }).limit(20);
        // Populate total votes and results breakdown for each poll
        const historyWithCounts = await Promise.all(polls.map(async (poll) => {
            // Force filter type to avoid TS issues
            const votes = await vote_model_1.Vote.find({ pollId: poll._id });
            const totalVotes = votes.length;
            // Calculate breakdown
            const results = {};
            poll.options.forEach((opt) => {
                const count = votes.filter(v => v.optionId === opt).length;
                results[opt] = {
                    count,
                    percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
                };
            });
            return {
                ...poll.toObject(),
                totalVotes,
                results // [NEW] Attach detailed results to history
            };
        }));
        return historyWithCounts;
    }
}
exports.PollRepository = PollRepository;
exports.pollRepository = new PollRepository();
