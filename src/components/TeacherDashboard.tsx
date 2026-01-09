import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChatPanel } from "./ChatPanel"
import { MessageSquare } from "lucide-react"

interface TeacherDashboardProps {
  teacherId: string
  teacherName: string
  onLogout: () => void
  currentPoll: any
  results: any
  history?: any[]
  onCreatePoll: (question: string, options: string[], timeLimit: number, correctOptionIndex: number) => void
  isCreating: boolean
  chatMessages?: any[]
  participants?: any[]
  onSendMessage?: (text: string) => void
  onKickStudent?: (sid: string) => void
  onStopPoll?: () => void
  currentUserId?: string
}

export function TeacherDashboard({
  onLogout,
  currentPoll,
  results,
  history,
  onCreatePoll,
  onStopPoll,
  chatMessages,
  participants,
  onSendMessage,
  onKickStudent,
  currentUserId
}: TeacherDashboardProps) {
  type TeacherViewMode = "LIVE" | "HISTORY"

  const [viewMode, setViewMode] = useState<TeacherViewMode>("LIVE")
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [timeLimit, setTimeLimit] = useState(60)
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Auto-switch to LIVE when a poll is active/starts
  useEffect(() => {
    if (currentPoll) {
      setViewMode("LIVE")
    }
  }, [currentPoll])

  const handleAddOption = () => {
    setOptions([...options, ""])
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null)

  const handleSubmit = () => {
    const nonEmptyOptions = options.filter((opt) => opt.trim())
    if (!question.trim()) {
      alert("Please enter a question")
      return
    }
    if (nonEmptyOptions.length < 2) {
      alert("Please add at least 2 options")
      return
    }

    onCreatePoll(question, nonEmptyOptions, timeLimit, correctOptionIndex ?? -1)

    // Reset form but stay in LIVE mode
    setQuestion("")
    setOptions(["", ""])
    setCorrectOptionIndex(null)
    setTimeLimit(60)
  }

  // --- SUB-COMPONENTS / RENDER HELPERS ---

  const renderActivePoll = () => {
    if (!currentPoll) return null;
    return (
      <div className="animate-in fade-in duration-500 mb-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-[#111111] mb-6">Question</h1>

        <div className="rounded-xl overflow-hidden mb-8 shadow-sm bg-white border border-[#E0E0E0]">
          {/* Header */}
          <div className="bg-[#666666] p-4 md:p-6 flex justify-between items-center">
            <h3 className="text-white text-xl font-semibold leading-relaxed">
              {currentPoll.question}
            </h3>
            <span className="bg-green-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-wider">Live</span>
          </div>

          <div className="p-6 space-y-3">
            {currentPoll.options?.map((option: string, index: number) => {
              const result = results?.results?.[option] || { count: 0, percentage: 0 }
              const isHighest = result.percentage > 0 && result.percentage === Math.max(...Object.values(results?.results || {}).map((r: any) => r.percentage))

              return (
                <div key={option} className="group relative w-full bg-[#FAFAFA] rounded-md overflow-hidden border border-gray-200">
                  {/* Progress Bar Background */}
                  <div
                    className="absolute top-0 left-0 h-full bg-[#4F0DCE] transition-all duration-1000 ease-out opacity-80"
                    style={{ width: `${result.percentage}%` }}
                  ></div>

                  {/* Content Layer */}
                  <div className="relative z-10 flex items-center justify-between w-full p-4 h-14">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-bold text-[#4F0DCE] shadow-sm">
                        {index + 1}
                      </div>
                      <span className="font-semibold text-[#111111] max-w-[80%] truncate">
                        {option}
                      </span>
                    </div>
                    <span className="font-bold text-[#111111]">{result.percentage}%</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <Button
              onClick={() => {
                if (confirm("Are you sure you want to stop this poll?")) onStopPoll?.()
              }}
              className="bg-[#373737] hover:bg-black text-white rounded-full px-6"
            >
              Stop Poll
            </Button>
            <Button
              onClick={() => {
                // This essentially just clears creation form if we wanted to queue, 
                // but for now let's just use it to focus creation.
                const form = document.getElementById('create-poll-section');
                form?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-[#5767D0] hover:bg-[#4F0DCE] text-white rounded-full px-6"
            >
              + Ask a new question
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderCreatePollForm = () => {
    // Styling based on "Let's Get Started" image
    const isMainView = !currentPoll

    return (
      <div id="create-poll-section" className={`animate-in fade-in duration-500 ${isMainView ? 'mt-8 text-center' : 'mt-16 text-left border-t pt-12'}`}>

        {isMainView && (
          <div className="mb-10 inline-flex items-center gap-2 px-5 py-2 bg-[#7765DA] rounded-full shadow-lg shadow-[#7765DA]/20">
            <span className="text-white text-sm font-bold tracking-wide uppercase">✨ Intervue Poll</span>
          </div>
        )}

        <div className={`max-w-3xl mx-auto ${isMainView ? 'text-center' : ''}`}>
          <h1 className="text-4xl font-bold text-[#111111] mb-4">
            {currentPoll ? "Queue Next Question" : "Let’s Get Started"}
          </h1>
          {isMainView && (
            <p className="text-[#6E6E6E] text-lg mb-12 max-w-2xl mx-auto">
              you’ll have the ability to create and manage polls, ask questions, and monitor your students' responses in real-time.
            </p>
          )}
        </div>

        <div className="max-w-3xl mx-auto text-left">
          {/* Creates the form look */}
          <div className="space-y-8 bg-transparent">
            {/* Question Input */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-lg font-bold text-[#111111]">Enter your question</label>
                {/* Time Select */}
                <div className="relative">
                  <select
                    className="appearance-none bg-[#F2F2F2] hover:bg-gray-200 text-[#373737] font-semibold py-2 px-4 pr-8 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5767D0]/50 transition-colors"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                  >
                    <option value="30">30 seconds</option>
                    <option value="60">60 seconds</option>
                    <option value="120">2 minutes</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#5767D0]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                  </div>
                </div>
              </div>

              <div className="relative">
                <textarea
                  placeholder="Type your question here..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  // Match the screenshot: light gray background, minimal border
                  className="w-full min-h-[120px] p-6 text-lg bg-[#F2F2F2] border-none rounded-xl focus:ring-2 focus:ring-[#5767D0]/20 focus:bg-white transition-all resize-none placeholder:text-gray-400 text-[#373737]"
                />
                <div className="absolute bottom-4 right-4 text-xs text-gray-400 font-medium">
                  {question.length}/100
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-6">
              <div className="grid grid-cols-12 gap-6 mb-2">
                <span className="col-span-8 text-base font-bold text-[#111111]">Edit Options</span>
                <span className="col-span-4 text-base font-bold text-[#111111] pl-2">Is it Correct?</span>
              </div>

              {options.map((option, index) => (
                <div key={index} className="grid grid-cols-12 gap-6 items-center group">
                  {/* Input Side */}
                  <div className="col-span-8 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#7765DA] flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        className="w-full h-12 px-4 bg-[#F2F2F2] border-none rounded-lg focus:ring-2 focus:ring-[#5767D0]/20 focus:bg-white transition-all text-[#373737]"
                      />
                      {options.length > 2 && (
                        <button
                          onClick={() => handleRemoveOption(index)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Radio Side */}
                  <div className="col-span-4 flex items-center gap-6 pl-2">
                    {/* YES */}
                    <label className="flex items-center gap-2 cursor-pointer group/radio">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${correctOptionIndex === index ? 'border-[#7765DA]' : 'border-gray-300 group-hover/radio:border-[#7765DA]/50'}`}>
                        {correctOptionIndex === index && <div className="w-2.5 h-2.5 bg-[#7765DA] rounded-full"></div>}
                      </div>
                      <input
                        type="radio"
                        name={`correct-${index}`}
                        checked={correctOptionIndex === index}
                        onChange={() => setCorrectOptionIndex(index)}
                        className="hidden"
                      />
                      <span className={`text-sm font-bold ${correctOptionIndex === index ? 'text-[#111111]' : 'text-[#6E6E6E]'}`}>Yes</span>
                    </label>

                    {/* NO */}
                    <label className="flex items-center gap-2 cursor-pointer group/radio">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${correctOptionIndex !== index ? 'border-[#5767D0]' : 'border-gray-300 group-hover/radio:border-gray-400'}`}>
                        {correctOptionIndex !== index && <div className="w-2.5 h-2.5 bg-[#5767D0] rounded-full"></div>}
                        {/* Logic fix: Just show unchecked circle logic or checked outline. Image shows purple outline filled for yes, grey filled for no? No, image shows purple radio vs grey radio.
                                            Let's just replicate standard radio logic visually.
                                        */}
                        {correctOptionIndex !== index && <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>}
                      </div>
                      {/* Wait, the image shows:
                                        YES: Purple Outer, Purple Dot.
                                        NO: Grey Outer, Grey Dot.
                                        Only one can be Yes. Default others are No.
                                    */}
                      <input
                        type="radio"
                        name={`correct-${index}`}
                        checked={correctOptionIndex !== index}
                        onChange={() => correctOptionIndex === index && setCorrectOptionIndex(null)}
                        className="hidden"
                      />
                      <span className={`text-sm font-bold ${correctOptionIndex !== index ? 'text-[#111111]' : 'text-[#6E6E6E]'}`}>No</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button
                onClick={handleAddOption}
                variant="outline"
                className="text-[#5767D0] border-[#5767D0]/30 hover:bg-[#5767D0]/5 rounded-lg font-semibold"
              >
                + Add More option
              </Button>
            </div>

            <div className="pt-8 flex justify-end border-t border-gray-100">
              <Button
                onClick={handleSubmit}
                disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
                className="bg-[#5767D0] hover:bg-[#4F0DCE] text-white font-bold rounded-full px-10 py-6 text-lg shadow-xl shadow-[#5767D0]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none disabled:scale-100"
              >
                {currentPoll ? "Queue Question" : "Ask Question"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderHistory = () => {
    // HISTORY Mode Panel
    if (!history || history.length === 0) {
      return (
        <div className="mt-12 text-center text-slate-500">
          <p>No past polls found.</p>
          <Button onClick={() => setViewMode("LIVE")} variant="link" className="mt-2 text-[#5767D0]">Back to Live Dashboard</Button>
        </div>
      )
    }

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-[#111111]">Poll History</h1>

        </div>

        <div className="space-y-12">
          {history.map((poll, pIdx) => (
            <div key={poll._id || poll.createdAt} className="bg-white">
              <h2 className="text-xl font-bold text-[#111111] mb-4">Question {pIdx + 1}</h2>

              <div className="rounded-xl overflow-hidden shadow-sm bg-white border border-[#E0E0E0]">
                <div className="bg-[#666666] p-4 md:p-6">
                  <h3 className="text-white text-xl font-semibold leading-relaxed">
                    {poll.question}
                  </h3>
                </div>

                <div className="p-6 space-y-3">
                  {poll.options.map((opt: string, i: number) => {
                    const res = poll.results?.[opt] || { count: 0, percentage: 0 };
                    const isCorrect = poll.correctOptionIndex === i;

                    return (
                      <div key={i} className="group relative w-full bg-[#FAFAFA] rounded-md overflow-hidden border border-gray-200">
                        {/* Progress Bar Background */}
                        <div
                          className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out opacity-80 ${isCorrect ? 'bg-[#5767D0]' : 'bg-[#5767D0]/40'}`} // Correct answer gets primary color? Or maybe distinct? Image shows all purple bars.
                          style={{ width: `${res.percentage}%` }}
                        ></div>

                        <div className="relative z-10 flex items-center justify-between w-full p-4 h-12">
                          <div className="flex items-center gap-4">
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-[#5767D0] shadow-sm">
                              {i + 1}
                            </div>
                            <span className="font-semibold text-[#111111] max-w-[80%] truncate">
                              {opt}
                            </span>
                          </div>
                          <span className="font-bold text-[#111111]">{res.percentage}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="px-6 pb-6 pt-0 text-right text-xs text-gray-400 font-medium">
                  {new Date(poll.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button onClick={() => setViewMode("LIVE")} variant="outline" className="border-[#5767D0] text-[#5767D0] hover:bg-[#5767D0]/5">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-sans relative">
      {/* Header - Minimalist */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Empty Left or Logo? Image shows just content mostly */}
          <div className="flex items-center gap-2"></div>

          <div className="flex items-center gap-4">
            {viewMode === "LIVE" && history && history.length > 0 && (
              <Button
                onClick={() => setViewMode("HISTORY")}
                className="bg-[#7765DA] hover:bg-[#5767D0] text-white rounded-lg font-bold shadow-md shadow-[#7765DA]/20"
              >
                View Poll history
              </Button>
            )}
            <Button
              onClick={onLogout}
              variant="ghost"
              className="text-[#6E6E6E] hover:text-[#373737] hover:bg-gray-50"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 pb-32">
        {/* VIEW SWITCHER */}
        {viewMode === "LIVE" ? (
          <>
            {renderActivePoll()}
            {renderCreatePollForm()}
          </>
        ) : (
          renderHistory()
        )}

        {/* Active Poll renders above creation form in my logic? 
            Wait, I put renderCreatePollForm() inside the main return, 
            but renderActivePoll is not called in standard return?
            Ah, I see logic previously:
            
            {viewMode === "LIVE" ? (
              <>
                {renderActivePoll()}
                {renderCreatePollForm()}
              </>
            )
            
            Let's keep that structure.
        */}
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors z-50 hover:scale-105 active:scale-95"
      >
        {isChatOpen ? <span className="text-white text-2xl">×</span> : <MessageSquare className="w-6 h-6 text-white" />}
      </button>

      {/* Chat Panel */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        role="teacher"
        students={participants}
        messages={chatMessages}
        onSendMessage={onSendMessage}
        onRemoveStudent={onKickStudent}
        currentUserId={currentUserId}
      />
    </div>
  )
}

