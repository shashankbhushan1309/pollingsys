import { Poll, IPoll } from "./poll.model";
import { Vote, IVote } from "./vote.model";

export class PollRepository {
    // Create a new poll
    async createPoll(data: Partial<IPoll>): Promise<IPoll> {
        return await Poll.create(data);
    }

    // Get current active poll
    async getActivePoll(): Promise<IPoll | null> {
        return await Poll.findOne({ isActive: true }).sort({ createdAt: -1 });
    }

    // Get poll by ID
    async getPollById(pollId: string): Promise<IPoll | null> {
        return await Poll.findById(pollId);
    }

    // Deactivate poll
    async deactivatePoll(pollId: string): Promise<void> {
        await Poll.findByIdAndUpdate(pollId, { isActive: false, status: 'ENDED', endedAt: new Date() });
    }

    // [NEW] Get Next Queued Poll
    async getNextQueuedPoll(): Promise<IPoll | null> {
        return await Poll.findOne({ status: 'QUEUED' }).sort({ createdAt: 1 }); // FIFO Queue
    }

    // [NEW] Activate a queued poll
    async activatePoll(pollId: string): Promise<IPoll | null> {
        return await Poll.findByIdAndUpdate(pollId, {
            isActive: true,
            status: 'ACTIVE',
            startedAt: new Date() // Reset start time to now
        }, { new: true });
    }

    // Create vote (Enforced unique constraint by DB)
    async createVote(pollId: string, studentId: string, studentName: string, optionId: string): Promise<IVote> {
        return await Vote.create({ pollId, studentId, studentName, optionId });
    }

    // Check if student voted
    async hasVoted(pollId: string, studentId: string): Promise<boolean> {
        const vote = await Vote.exists({ pollId, studentId });
        return !!vote;
    }

    // [NEW] Get student's vote for persistence
    async getStudentVote(pollId: string, studentId: string): Promise<IVote | null> {
        return await Vote.findOne({ pollId, studentId });
    }

    // Get vote counts for a poll
    async getVoteCounts(pollId: string): Promise<Record<string, number>> {
        const votes = await Vote.find({ pollId });

        const counts: Record<string, number> = {};
        votes.forEach((v) => {
            counts[v.optionId] = (counts[v.optionId] || 0) + 1;
        });
        return counts;
    }

    // [NEW] Get detailed votes for teacher
    async getDetailedVotes(pollId: string): Promise<{ name: string, option: string }[]> {
        const votes = await Vote.find({ pollId });
        return votes.map(v => ({
            name: v.studentName,
            option: v.optionId
        }));
    }

    // Get poll history
    async getPollHistory(): Promise<any[]> {
        const polls = await Poll.find({ isActive: false }).sort({ createdAt: -1 }).limit(20);

        // Populate total votes and results breakdown for each poll
        const historyWithCounts = await Promise.all(polls.map(async (poll) => {
            // Force filter type to avoid TS issues
            const votes = await Vote.find({ pollId: (poll._id as unknown) as string } as any);
            const totalVotes = votes.length;

            // Calculate breakdown
            const results: Record<string, { count: number; percentage: number }> = {};
            poll.options.forEach((opt: string) => {
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

export const pollRepository = new PollRepository();
