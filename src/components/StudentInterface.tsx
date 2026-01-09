"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChatPanel } from "./ChatPanel"
import { MessageSquare } from "lucide-react"
import { usePollTimer } from "@/hooks/usePollTimer"

interface StudentInterfaceProps {
  studentName: string
  onLogout: () => void
  currentPoll: any
  results: any
  hasVoted: boolean
  onSubmitVote: (selectedOption: string) => void
  isSubmitting: boolean
  chatMessages: any[]
  participants: any[]
  onSendMessage: (text: string) => void
  currentUserId?: string
}

export function StudentInterface({
  studentName,
  onLogout,
  currentPoll,
  results,
  hasVoted,
  onSubmitVote,
  isSubmitting,
  chatMessages,
  participants,
  onSendMessage,
  currentUserId,
  history = [] // [NEW] Accept history prop
}: StudentInterfaceProps & { history?: any[] }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false) // [NEW] Toggle history

  // Parse startedAt to handle potential string/Date mismatch
  const startedAt = currentPoll?.startedAt ? new Date(currentPoll.startedAt).toISOString() : undefined

  const { remainingTime } = usePollTimer(
    currentPoll?.duration || 60,
    undefined,
    startedAt
  )

  // Helper for timer display
  // Wait, I need to check usePollTimer return values. 
  // Previous code used `remainingTime`. I will stick to it.
  // Actually, I should just use `remainingTime` from the hook if I didn't change the hook signature.
  // Checking previous file content... it was `const { remainingTime, reset } = usePollTimer(...)`
  // I will assume that is valid.

  // NOTE: Logic remains untouched. Restoring the hook call as it was.

  useEffect(() => {
    if (currentPoll?.duration) {
      setSelectedOption(null)
      setShowHistory(false) // Auto-hide history when new poll starts
    }
  }, [currentPoll?.pollId])

  const handleSubmit = () => {
    if (selectedOption) {
      onSubmitVote(selectedOption)
    }
  }

  // Helper to format time as 00:XX
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] relative font-sans flex flex-col">
      {/* Header with History/Logout (Subtle) */}
      {/* Design cleanup: Move logout to top right corner, fixed or absolute */}
      <div className="absolute top-6 right-6 z-40 flex gap-4">
        <Button onClick={onLogout} variant="ghost" size="sm" className="text-[#6E6E6E] hover:text-[#373737] hover:bg-gray-100">
          Logout
        </Button>
        {history.length > 0 && (
          <Button onClick={() => setShowHistory(!showHistory)} variant="outline" size="sm" className="text-[#5767D0] border-[#5767D0]/20 hover:bg-[#5767D0]/5">
            {showHistory ? "Back to Live Poll" : "📜 Past Polls"}
          </Button>
        )}
      </div>

      {/* Chat FAB (Updated Color) */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#5767D0] rounded-full flex items-center justify-center shadow-lg shadow-[#5767D0]/30 hover:bg-[#4F0DCE] transition-all z-50 hover:scale-105 active:scale-95"
      >
        {isChatOpen ? <span className="text-white text-2xl">×</span> : <MessageSquare className="w-6 h-6 text-white" />}
      </button>

      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        role="student"
        messages={chatMessages}
        students={participants}
        onSendMessage={onSendMessage}
        currentUserId={currentUserId}
      />

      {/* Main Content Area */}
      <div className="flex flex-col items-center justify-center min-h-screen p-4 max-w-4xl mx-auto w-full">

        {showHistory ? (
          /* HISTORY VIEW */
          <div className="w-full max-w-3xl animate-in slide-in-from-bottom-4 duration-500 pb-20">
            <h2 className="text-2xl font-bold text-[#373737] mb-6 text-center">Past Poll Results</h2>
            <div className="space-y-6">
              {history.map((poll) => (
                <div key={poll._id || poll.createdAt} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-[#5767D0] p-4">
                    <h3 className="font-semibold text-white">{poll.question}</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {poll.options.map((opt: string, i: number) => {
                      const res = poll.results?.[opt] || { count: 0, percentage: 0 };
                      const isCorrect = poll.correctOptionIndex === i;
                      return (
                        <div key={i} className="relative w-full rounded-lg bg-[#F2F2F2] overflow-hidden">
                          {/* Bar */}
                          <div className={`absolute top-0 left-0 h-full ${isCorrect ? 'bg-[#5767D0] opacity-30' : 'bg-gray-300 opacity-20'}`} style={{ width: `${res.percentage}%` }}></div>

                          <div className="relative z-10 flex justify-between p-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isCorrect ? 'bg-[#5767D0] text-white' : 'bg-white text-gray-500 border'}`}>
                                {i + 1}
                              </span>
                              <span className="font-medium text-[#373737]">{opt}</span>
                              {isCorrect && <span className="text-xs text-[#5767D0] bg-[#5767D0]/10 px-2 py-0.5 rounded-full font-bold">Correct</span>}
                            </div>
                            <span className="font-bold text-[#373737]">{res.percentage}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !currentPoll ? (
          /* WAITING STATE */
          <div className="flex flex-col items-center animate-in fade-in duration-500 text-center">
            {/* Badge */}
            <div className="mb-10 inline-flex items-center gap-2 px-5 py-2 bg-[#7765DA] rounded-full shadow-lg shadow-[#7765DA]/20">
              <span className="text-white text-sm font-bold tracking-wide uppercase">✨ Intervue Poll</span>
            </div>

            {/* Spinner (Custom) */}
            <div className="mb-12 relative w-20 h-20">
              <div className="w-20 h-20 border-[6px] border-[#7765DA]/20 rounded-full"></div>
              <div className="w-20 h-20 border-[6px] border-[#7765DA] rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>

            {/* Text */}
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111] leading-tight mb-2">
              Wait for the teacher to ask questions..
            </h2>
          </div>
        ) : (
          /* ACTIVE POLL / RESULTS STATE */
          <div className="w-full max-w-3xl animate-in slide-in-from-bottom-4 duration-500">

            {/* Header Row */}
            <div className="flex items-center justify-between mb-6 px-1">
              <h2 className="text-2xl font-bold text-[#111111]">Question 1</h2>
              <div className="flex items-center gap-2 text-xl font-bold text-[#D32F2F]">
                <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatTime(remainingTime || 0)}</span>
              </div>
            </div>

            {/* Question Card */}
            <div className="rounded-xl overflow-hidden mb-8 shadow-sm">
              {/* Question Text Header */}
              <div className="bg-[#666666] p-4 md:p-6">
                <h3 className="text-white text-xl font-semibold leading-relaxed">
                  {currentPoll.question}
                </h3>
              </div>
            </div>

            {/* Options Section */}
            <div className="space-y-3">
              {/* If Results are available (Has voted) */}
              {hasVoted ? (
                /* RESULTS VIEW */
                <>
                  {currentPoll.options.map((option: string, index: number) => {
                    const result = results?.results[option] || { count: 0, percentage: 0 }
                    const percentage = result.percentage
                    // Colors for results: Use Primary Purple for the bar

                    return (
                      <div key={option} className="group relative w-full bg-[#FAFAFA] rounded-md overflow-hidden border border-gray-200">
                        {/* Progress Bar Background */}
                        <div
                          className="absolute top-0 left-0 h-full bg-[#5767D0] transition-all duration-1000 ease-out opacity-80"
                          style={{ width: `${percentage}%` }}
                        ></div>

                        {/* Content Layer */}
                        <div className="relative z-10 flex items-center justify-between w-full p-4 h-14">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-bold text-[#5767D0] shadow-sm">
                              {index + 1}
                            </div>
                            <span className="font-semibold text-[#111111] max-w-[80%] truncate">
                              {option}
                            </span>
                          </div>
                          <span className="font-bold text-[#111111]">{percentage}%</span>
                        </div>
                      </div>
                    )
                  })}

                  <div className="mt-8 text-center text-[#111111] font-bold text-lg animate-pulse">
                    Wait for the teacher to ask a new question..
                  </div>
                </>
              ) : (
                /* VOTING STATE */
                <>
                  {currentPoll.options.map((option: string, index: number) => (
                    <button
                      key={option}
                      onClick={() => setSelectedOption(option)}
                      disabled={(remainingTime || 0) <= 0} // Fix safely accessing remainingTime
                      className={`w-full text-left p-4 rounded-md border-2 transition-all duration-200 group flex items-center bg-[#F9F9F9] hover:bg-white
                          ${selectedOption === option
                          ? 'border-[#7765DA] shadow-[0_0_0_1px_#7765DA] bg-white'
                          : 'border-transparent hover:border-[#7765DA]/50 hover:shadow-sm'
                        }
                        `}
                    >
                      {/* Circle Number */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4 transition-colors
                            ${selectedOption === option
                          ? 'bg-[#7765DA] text-white'
                          : 'bg-[#9E9E9E] text-white group-hover:bg-[#7765DA]/70'
                        }`}>
                        {index + 1}
                      </div>

                      <span className="font-medium text-[#373737] text-lg">
                        {option}
                      </span>
                    </button>
                  ))}

                  <div className="pt-8 flex justify-end">
                    <button
                      onClick={handleSubmit}
                      disabled={!selectedOption || isSubmitting}
                      className="px-10 py-3 bg-[#5767D0] hover:bg-[#4F0DCE] text-white font-bold rounded-full text-lg shadow-lg shadow-[#5767D0]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

