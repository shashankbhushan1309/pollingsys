"use client"

import { useEffect, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"

interface SocketMessage {
  type: string
  data: any
}

// Default to localhost:3001 if env var not set
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"

export function useSocket(onMessage: (message: SocketMessage) => void) {
  const socketRef = useRef<Socket | null>(null)

  // Use a ref for onMessage to avoid reconnecting when the callback function changes
  const onMessageRef = useRef(onMessage)

  // Update ref when handler changes
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    // Connect to the separate Express server
    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on("connect", () => {
      console.log("Connected to socket server:", socket.id)
      // Protocol: Sync state immediately on connection
      socket.emit("poll:sync")

      // Also sync chat if user info is known (will be handled by components, but can be generic here)
    })

    const handleEvent = (type: string, data: any) => {
      if (onMessageRef.current) {
        onMessageRef.current({ type, data })
      }
    }

    // --- Poll Events ---
    // --- Poll Events ---
    socket.on("poll:state", (data: any) => handleEvent("poll:state", data))
    socket.on("poll:created", (data: any) => handleEvent("poll:created", data))
    socket.on("poll:started", (data: any) => handleEvent("poll:started", data))
    socket.on("poll:activated", (data: any) => handleEvent("poll:activated", data))
    socket.on("poll:ended", (data: any) => handleEvent("poll:ended", data))

    // [STRICT] Renamed from 'poll:results:update' to 'poll:liveUpdate'
    socket.on("poll:liveUpdate", (data: any) => handleEvent("poll:liveUpdate", data))
    // Note: Mapped "poll:results:update" -> "poll:updated" for consistency if App expects "poll:updated"
    // Or we keep it distinct. Let's send transparently.
    socket.on("poll:history", (data: any) => handleEvent("poll:history", data.history))

    // --- Voting Events ---
    socket.on("vote:accepted", (data: any) => handleEvent("vote:accepted", data))
    socket.on("vote:rejected", (data: any) => handleEvent("vote:rejected", data))

    // --- Chat Events ---
    socket.on("chat:message", (data: any) => handleEvent("chat:message", data))
    socket.on("chat:history", (data: any) => handleEvent("chat:history", data))
    socket.on("participants:update", (data: any) => handleEvent("participants:update", data))
    socket.on("student:removed", (data: any) => handleEvent("student:removed", data))

    // --- System ---
    socket.on("error", (data: any) => {
      console.error("Socket Error:", data)
      handleEvent("error", data)
    })

    return () => {
      socket.disconnect()
    }
  }, []) // Empty dependency array ensures connection only happens ONCE

  const send = useCallback((message: SocketMessage) => {
    if (socketRef.current) {
      const { type, data } = message
      socketRef.current.emit(type, data)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
    }
  }, [])

  return { send, disconnect, socketId: socketRef.current?.id }
}
