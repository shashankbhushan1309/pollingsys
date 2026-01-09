interface TimerState {
  questionId: string
  remainingTime: number
  totalTime: number
  startedAt: number
  status: "active" | "ended"
}

export class TimerService {
  private activeTimers: Map<string, TimerState> = new Map()

  startTimer(questionId: string, totalTime: number): TimerState {
    const timerState: TimerState = {
      questionId,
      totalTime,
      remainingTime: totalTime,
      startedAt: Date.now(),
      status: "active",
    }
    this.activeTimers.set(questionId, timerState)
    return timerState
  }

  getTimerState(questionId: string): TimerState | null {
    const timer = this.activeTimers.get(questionId)
    if (!timer) return null

    const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000)
    const remaining = Math.max(0, timer.totalTime - elapsed)

    if (remaining <= 0) {
      timer.status = "ended"
      this.activeTimers.delete(questionId)
    } else {
      timer.remainingTime = remaining
    }

    return timer
  }

  endTimer(questionId: string): void {
    this.activeTimers.delete(questionId)
  }
}

export const timerService = new TimerService()
