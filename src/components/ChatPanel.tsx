"use client"

import { useState, useRef, useEffect } from "react"
import { Send, MessageSquare } from "lucide-react"

interface ChatPanelProps {
    isOpen: boolean
    onClose: () => void
    role: 'teacher' | 'student'
    students?: any[]
    onRemoveStudent?: (sessionId: string) => void
    messages?: any[]
    onSendMessage?: (text: string) => void
    currentUserId?: string
}

export function ChatPanel({
    isOpen,
    onClose,
    role,
    students = [],
    onRemoveStudent,
    messages = [],
    onSendMessage,
    currentUserId
}: ChatPanelProps) {
    const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat')
    const [inputText, setInputText] = useState("")
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom on new message
    useEffect(() => {
        if (isOpen && activeTab === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages, isOpen, activeTab])

    const handleSend = () => {
        if (!inputText.trim()) return
        onSendMessage?.(inputText)
        setInputText("")
    }

    if (!isOpen) return null

    return (
        <div className="fixed bottom-24 right-6 w-96 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 overflow-hidden flex flex-col z-50 animate-in slide-in-from-bottom-2 duration-300 font-sans" style={{ height: '500px' }}>

            {/* Header Tabs */}
            <div className="flex border-b border-gray-100 bg-white">
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-4 text-sm font-semibold transition-all relative ${activeTab === 'chat' ? 'text-[#373737]' : 'text-[#6E6E6E] hover:text-[#373737]'}`}
                >
                    Chat
                    {activeTab === 'chat' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#7765DA]"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('participants')}
                    className={`flex-1 py-4 text-sm font-semibold transition-all relative ${activeTab === 'participants' ? 'text-[#373737]' : 'text-[#6E6E6E] hover:text-[#373737]'}`}
                >
                    Participants
                    {activeTab === 'participants' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#7765DA]"></div>}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-white">
                {activeTab === 'chat' ? (
                    <div className="p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center mt-12">
                                <MessageSquare className="w-10 h-10 text-gray-200 mb-2" />
                                <p className="text-[#6E6E6E] text-sm">No messages yet.</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => {
                            const isMe = currentUserId && msg.senderId === currentUserId

                            return (
                                <div key={msg._id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <span className={`text-[10px] font-bold mb-1 px-1 ${isMe ? 'text-[#5767D0]' : 'text-[#6E6E6E]'}`}>
                                        {msg.senderName}
                                    </span>
                                    <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] shadow-sm ${isMe
                                        ? 'bg-[#5767D0] text-white rounded-br-none'
                                        : 'bg-[#F2F2F2] text-[#373737] rounded-bl-none'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                ) : (
                    <div className="p-2">
                        {/* Header Row */}
                        <div className="flex justify-between px-4 py-3 text-xs font-medium text-[#6E6E6E] border-b border-gray-50 mb-2">
                            <span>Name</span>
                            <span>Action</span>
                        </div>

                        {students.length === 0 ? (
                            <p className="text-center text-[#6E6E6E] text-sm mt-8 italic">No participants yet</p>
                        ) : (
                            <div className="space-y-1">
                                {students.map((student) => (
                                    <div key={student.sessionId} className="flex items-center justify-between px-4 py-3 hover:bg-[#F2F2F2] rounded-lg transition-colors group">
                                        <div className="flex items-center gap-3">
                                            {/* Avatar Placeholder */}
                                            <div className="w-8 h-8 rounded-full bg-[#F2F2F2] flex items-center justify-center text-xs font-bold text-[#5767D0] border border-gray-100">
                                                {student.studentName.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-semibold text-[#373737]">{student.studentName}</span>
                                        </div>
                                        {role === 'teacher' && student.role !== 'teacher' && (
                                            <button
                                                onClick={() => onRemoveStudent?.(student.sessionId)}
                                                className="text-xs font-medium text-[#5767D0] hover:text-[#4F0DCE] border-b border-transparent hover:border-[#4F0DCE] transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                Kick out
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer (Chat Input) */}
            {activeTab === 'chat' && (
                <div className="p-4 bg-white border-t border-gray-100">
                    <div className="relative">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type a message..."
                            className="w-full pl-5 pr-12 py-3 bg-[#F2F2F2] border-none rounded-full text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#5767D0]/20 focus:bg-white transition-all outline-none text-[#373737]"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputText.trim()}
                            className="absolute right-2 top-2 p-1.5 bg-[#5767D0] rounded-full text-white hover:bg-[#4F0DCE] disabled:opacity-50 disabled:hover:bg-[#5767D0] transition-colors shadow-sm"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
