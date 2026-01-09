const STORAGE_KEYS = {
  USER_ROLE: "user_role",
  USER_NAME: "user_name",
  SESSION_ID: "session_id",
  LAST_POLL_ID: "last_poll_id",
  POLL_ANSWERS: "poll_answers",
} as const

export const stateRecovery = {
  // Save user state
  saveUserState: (role: string, name: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, role)
      localStorage.setItem(STORAGE_KEYS.USER_NAME, name)
    }
  },

  // Load user state
  loadUserState: () => {
    if (typeof window !== "undefined") {
      return {
        role: localStorage.getItem(STORAGE_KEYS.USER_ROLE),
        name: localStorage.getItem(STORAGE_KEYS.USER_NAME),
      }
    }
    return { role: null, name: null }
  },

  // Clear user state
  clearUserState: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.USER_ROLE)
      localStorage.removeItem(STORAGE_KEYS.USER_NAME)
      localStorage.removeItem(STORAGE_KEYS.LAST_POLL_ID)
      localStorage.removeItem(STORAGE_KEYS.POLL_ANSWERS)
    }
  },

  // Track poll answers
  savePollAnswer: (pollId: string) => {
    if (typeof window !== "undefined") {
      const answers = JSON.parse(localStorage.getItem(STORAGE_KEYS.POLL_ANSWERS) || "[]")
      if (!answers.includes(pollId)) {
        answers.push(pollId)
        localStorage.setItem(STORAGE_KEYS.POLL_ANSWERS, JSON.stringify(answers))
      }
    }
  },

  // Get poll answers
  getPollAnswers: () => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.POLL_ANSWERS) || "[]")
    }
    return []
  },

  // Check if poll was answered
  isPollAnswered: (pollId: string) => {
    const answers = stateRecovery.getPollAnswers()
    return answers.includes(pollId)
  },
}
