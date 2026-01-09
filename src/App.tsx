
import { useState, useEffect } from 'react'
import { Toaster, toast } from 'sonner'
import { TeacherDashboard } from './components/TeacherDashboard'
import { StudentInterface } from './components/StudentInterface'
import { useSocket } from './hooks/useSocket'
import './index.css'

// Define types locally or import from shared types if available
interface PollResult {
    results: Record<string, { count: number; percentage: number }>;
    totalVotes: number;
    detailedVotes?: { name: string; option: string }[];
}

function App() {
    // View State
    const [view, setView] = useState<'landing' | 'teacher' | 'student' | 'student-login' | 'kicked'>('landing')

    // User Identity State
    const [userName, setUserName] = useState('')
    const [sessionId, setSessionId] = useState('')
    const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | null>(null)

    // Poll Data State (Single Source of Truth from Server)
    const [currentPoll, setCurrentPoll] = useState<any>(null)
    const [pollResults, setPollResults] = useState<PollResult | null>(null)
    const [pollHistory, setPollHistory] = useState<any[]>([])

    // Chat & Participants State
    const [chatMessages, setChatMessages] = useState<any[]>([])
    const [participants, setParticipants] = useState<any[]>([])

    // Student Specific State
    const [hasVoted, setHasVoted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Socket Connection
    const { send, socketId } = useSocket((message) => {
        switch (message.type) {
            case 'poll:state':
                // RECOVERY: Full state sync from server
                console.log("State Sync:", message.data)

                if (message.data.isActive) {
                    setCurrentPoll(message.data)
                    setHasVoted(message.data.hasVoted)
                    // [FIX] Update results immediately from state sync
                    if (message.data.results) {
                        setPollResults({
                            results: message.data.results,
                            totalVotes: message.data.totalVotes,
                            detailedVotes: message.data.detailedVotes
                        })
                    }
                } else {
                    setCurrentPoll(null)
                    setHasVoted(false)
                }
                break

            case 'poll:started':
                console.log("Poll Started:", message.data)
                setCurrentPoll(message.data)
                setHasVoted(false)
                setPollResults(null)
                toast.info("A new poll has started!")
                break

            case 'poll:updated':
                // Real-time results update
                console.log("Poll Results Updated:", message.data)
                if (currentPoll) {
                    // Ensure we have context
                    setPollResults({
                        results: message.data.results,
                        totalVotes: message.data.totalVotes,
                        detailedVotes: message.data.detailedVotes as any // [FIX] Include detailedVotes
                    })
                }
                break

            case 'poll:ended':
                console.log("Poll Ended:", message.data)
                toast.warning("The poll has ended.")
                setPollResults({
                    results: message.data.results,
                    totalVotes: message.data.totalVotes,
                    detailedVotes: message.data.detailedVotes as any // [FIX] Include detailedVotes
                }) // Final results
                setCurrentPoll(null)
                setIsSubmitting(false)
                break

            case 'poll:history':
                setPollHistory(message.data)
                break;

            case 'poll:queued':
                toast.success(`Poll Queued: ${message.data.question}`, {
                    description: "It will start automatically when the current poll ends."
                })
                break;

            // --- Chat & Participants ---
            case 'chat:message':
                setChatMessages(prev => [...prev, message.data])
                break

            case 'chat:history':
                setChatMessages(message.data)
                break

            case 'participants:update':
                setParticipants(message.data)
                break

            case 'vote:accepted':
                setHasVoted(true)
                setIsSubmitting(false)
                toast.success("Vote submitted!")
                break

            case 'vote:rejected':
                setIsSubmitting(false)
                toast.error(message.data.message || "Vote failed")
                break

            case 'student:removed':
                if (view === 'student') {
                    toast.error("You have been removed from the session.")
                    setView('kicked')
                    localStorage.removeItem('poll_session') // Clear session but keep on kicked screen
                    setSessionId('')
                    setUserName('')
                }
                break

            case 'error':
                toast.error(message.data.message || "An error occurred")
                break
        }
    })

    // Restore Session on Mount
    useEffect(() => {
        const stored = localStorage.getItem('poll_session')
        if (stored) {
            try {
                const session = JSON.parse(stored)
                if (session.role === 'student') {
                    setSessionId(session.id)
                    setUserName(session.name)
                    setView('student')
                    setSelectedRole('student')
                    // Sync identity with chat/socket
                    send({ type: 'chat:sync', data: { name: session.name, role: 'student' } })
                    send({ type: 'poll:sync', data: { role: 'student', studentId: session.id } }) // [FIX] Send persistent ID
                } else if (session.role === 'teacher') {
                    setView('teacher')
                    setSelectedRole('teacher')
                    send({ type: 'chat:sync', data: { name: 'Teacher', role: 'teacher' } })
                    send({ type: 'teacher:get_history', data: {} })
                    send({ type: 'poll:sync', data: { role: 'teacher' } }) // Teacher ID is handled by backend logic (or undefined)
                }
            } catch (e) {
                console.error("Session restore failed", e)
                localStorage.removeItem('poll_session')
            }
        }
    }, [send])


    // Handlers
    const handleStudentJoin = (name: string) => {
        if (!name.trim()) return
        const sid = crypto.randomUUID()

        setSessionId(sid) // Local tracking
        setUserName(name)
        localStorage.setItem('poll_session', JSON.stringify({ id: sid, name, role: 'student' }))
        setView('student')

        // Register presence
        send({ type: 'chat:sync', data: { name: name, role: 'student' } })
        send({ type: 'poll:sync', data: { role: 'student', studentId: sid } }) // [FIX] Send persistent ID
    }

    const handleTeacherLogin = () => {
        localStorage.setItem('poll_session', JSON.stringify({ id: 'teacher-1', name: 'Teacher', role: 'teacher' }))
        setView('teacher')
        send({ type: 'chat:sync', data: { name: 'Teacher', role: 'teacher' } })
        send({ type: 'teacher:get_history', data: {} })
        send({ type: 'poll:sync', data: { role: 'teacher' } })
    }

    const handleLogout = () => {
        localStorage.removeItem('poll_session')
        // [FIX] Force reload to ensure Socket ID is reset
        window.location.reload()
    }

    // Teacher Actions
    const handleCreatePoll = (question: string, options: string[], duration: number, correctOptionIndex?: number) => {
        send({
            type: 'teacher:create_poll',
            data: { question, options, duration, correctOptionIndex }
        })
    }

    const handleStopPoll = () => {
        send({ type: 'teacher:stop_poll', data: {} })
    }

    // Student Actions
    const handleVote = (optionId: string) => {
        setIsSubmitting(true)
        send({
            type: 'student:vote',
            data: {
                pollId: currentPoll.pollId,
                optionId: optionId,
                studentName: userName, // [NEW] Send name with vote
                studentId: sessionId // [FIX] Send persistent ID
            }
        })
    }

    // ... (rest of file)

    // Chat Actions
    const handleSendMessage = (text: string) => {
        send({
            type: 'chat:send',
            data: {
                senderName: selectedRole === 'teacher' ? 'Teacher' : userName,
                role: selectedRole,
                text
            }
        })
    }

    const handleKickStudent = (sid: string) => {
        send({ type: 'teacher:kick_student', data: { sessionId: sid } })
    }

    // --- Render Logic ---

    // 1. Landing Interface
    if (view === 'landing') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F2] font-sans p-6">
                <div className="w-full max-w-4xl text-center space-y-6 mb-12 animate-in fade-in duration-700">
                    <div className="inline-block px-5 py-2 bg-[#7765DA] rounded-full text-white text-xs font-bold tracking-wider uppercase shadow-md">
                        ✨ Intervue Poll
                    </div>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold text-[#373737] tracking-tight mb-3">
                            Welcome to the Live Polling System
                        </h1>
                        <p className="text-[#6E6E6E] text-lg max-w-2xl mx-auto font-medium">
                            Please select the role that best describes you to begin using the live polling system
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl px-4 mb-12">
                    {/* Student Card */}
                    <button
                        onClick={() => setSelectedRole('student')}
                        className={`flex-1 p-8 rounded-2xl border-2 text-left transition-all duration-300 group relative bg-white
                            ${selectedRole === 'student'
                                ? 'border-[#5767D0] shadow-[0_0_0_1px_#5767D0] scale-[1.02]'
                                : 'border-gray-200 hover:border-[#5767D0]/50 hover:shadow-lg'
                            }`}
                    >
                        <h3 className="text-2xl font-bold text-[#373737] mb-3">I’m a Student</h3>
                        <p className="text-[#6E6E6E] leading-relaxed">
                            Join sessions and submit your responses
                        </p>
                    </button>

                    {/* Teacher Card */}
                    <button
                        onClick={() => setSelectedRole('teacher')}
                        className={`flex-1 p-8 rounded-2xl border-2 text-left transition-all duration-300 group relative bg-white
                            ${selectedRole === 'teacher'
                                ? 'border-[#5767D0] shadow-[0_0_0_1px_#5767D0] scale-[1.02]'
                                : 'border-gray-200 hover:border-[#5767D0]/50 hover:shadow-lg'
                            }`}
                    >
                        <h3 className="text-2xl font-bold text-[#373737] mb-3">I’m a Teacher</h3>
                        <p className="text-[#6E6E6E] leading-relaxed">
                            Submit answers and view live poll results in real-time.
                        </p>
                    </button>
                </div>

                <button
                    onClick={() => {
                        if (selectedRole === 'teacher') handleTeacherLogin()
                        else if (selectedRole === 'student') setView('student-login')
                    }}
                    disabled={!selectedRole}
                    className="px-16 py-4 bg-[#5767D0] text-white font-bold rounded-full text-lg shadow-xl shadow-[#5767D0]/30 hover:bg-[#4F0DCE] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none transition-all duration-300"
                >
                    Continue
                </button>
            </div>
        )
    }

    // 2. Student Login
    if (view === 'student-login') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F2] p-6 font-sans">
                <div className="bg-transparent w-full max-w-2xl text-center">
                    <div className="inline-block px-5 py-2 bg-[#7765DA] rounded-full text-white text-xs font-bold tracking-wider uppercase shadow-md mb-8">
                        ✨ Intervue Poll
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-[#373737] mb-4">
                        Let’s Get Started
                    </h1>
                    <p className="text-[#6E6E6E] text-lg mb-12 max-w-xl mx-auto">
                        If you’re a student, you’ll be able to <span className="font-bold text-[#373737]">submit your answers</span>, participate in live polls, and see how your responses compare with your classmates
                    </p>

                    <div className="max-w-md mx-auto w-full space-y-2 text-left">
                        <label className="text-[#373737] font-semibold text-sm ml-1">Enter your Name</label>
                        <input
                            type="text"
                            placeholder="Your Name"
                            className="w-full p-4 bg-[#F2F2F2] border-none ring-1 ring-gray-200 rounded-lg focus:ring-2 focus:ring-[#5767D0] focus:bg-white text-[#373737] placeholder:text-gray-400 text-lg transition-all"
                            autoFocus
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleStudentJoin(userName)}
                        />
                    </div>

                    <div className="mt-12">
                        <button
                            onClick={() => handleStudentJoin(userName)}
                            disabled={!userName.trim()}
                            className="px-20 py-3.5 bg-[#5767D0] hover:bg-[#4F0DCE] text-white font-bold rounded-full text-lg shadow-xl shadow-[#5767D0]/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:scale-100"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // 3. Kicked Screen
    if (view === 'kicked') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F2] p-4 font-sans animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-6 max-w-lg">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#7765DA] rounded-full text-white text-sm font-semibold tracking-wide shadow-sm">
                        ✨ Intervue Poll
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#373737] tracking-tight">
                        You’ve been Kicked out !
                    </h1>
                    <p className="text-[#6E6E6E] text-lg leading-relaxed">
                        Looks like the teacher had removed you from the poll system. Please Try again sometime.
                    </p>
                    <button
                        onClick={() => setView('landing')}
                        className="mt-8 px-8 py-3 bg-[#373737] text-white font-medium rounded-full hover:bg-black transition-colors shadow-lg"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        )
    }

    // 3. Main Interface
    return (
        <>
            <Toaster richColors position="top-center" />
            {view === 'teacher' ? (
                <TeacherDashboard
                    teacherId="teacher-1"
                    teacherName="Teacher"
                    onLogout={handleLogout}
                    currentPoll={currentPoll}
                    results={pollResults}
                    history={pollHistory}
                    onCreatePoll={handleCreatePoll}
                    isCreating={isSubmitting} // reused state
                    chatMessages={chatMessages}
                    participants={participants}
                    onSendMessage={handleSendMessage}
                    onKickStudent={handleKickStudent}
                    onStopPoll={handleStopPoll}
                    currentUserId={socketId || undefined}
                />
            ) : (
                <StudentInterface
                    studentName={userName}
                    onLogout={handleLogout}
                    currentPoll={currentPoll}
                    results={pollResults}
                    hasVoted={hasVoted}
                    onSubmitVote={handleVote}
                    isSubmitting={isSubmitting}
                    // Chat Props
                    chatMessages={chatMessages}
                    participants={participants}
                    onSendMessage={handleSendMessage}
                    currentUserId={socketId}
                    history={pollHistory} // [FIX] Pass history to student
                />
            )}
        </>
    )
}

export default App
