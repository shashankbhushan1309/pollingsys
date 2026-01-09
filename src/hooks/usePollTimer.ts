"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export function usePollTimer(totalTime: number, onTimeUp?: () => void, startedAt?: string | Date) {
  const [remainingTime, setRemainingTime] = useState(totalTime)
  const [isActive, setIsActive] = useState(true)

  // Use a ref to track if we've already triggered onTimeUp
  const onTimeUpTriggered = useRef(false)

  useEffect(() => {
    // If startedAt is provided, calculate initial remaining time
    let initialRemaining = totalTime
    if (startedAt) {
      const startTime = new Date(startedAt).getTime()
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - startTime) / 1000)
      initialRemaining = Math.max(0, totalTime - elapsedSeconds)
    }

    setRemainingTime(initialRemaining)
    setIsActive(initialRemaining > 0)
    onTimeUpTriggered.current = false
  }, [totalTime, startedAt])

  useEffect(() => {
    if (!isActive || remainingTime <= 0) {
      if (remainingTime <= 0 && !onTimeUpTriggered.current) {
        setIsActive(false)
        onTimeUpTriggered.current = true
        onTimeUp?.()
      }
      return
    }

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        const newTime = prev - 1
        if (newTime <= 0) {
          // We'll let the next render cycle handle the stop
          return 0
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, remainingTime, onTimeUp])

  const pause = useCallback(() => setIsActive(false), [])
  const resume = useCallback(() => setIsActive(true), [])
  const reset = useCallback((newTime: number) => {
    setRemainingTime(newTime)
    setIsActive(true)
    onTimeUpTriggered.current = false
  }, [])

  return { remainingTime, isActive, pause, resume, reset }
}
