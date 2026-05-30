"use client"

import { useState, useEffect, useRef } from 'react'

export function useSmoothStream(text: string, isStreaming: boolean, speed = 10) {
    const [displayedText, setDisplayedText] = useState(isStreaming ? "" : text)
    const indexRef = useRef(0)
    const targetTextRef = useRef(text)

    // Update target text without triggering effect re-run
    useEffect(() => {
        targetTextRef.current = text
    }, [text])

    // Handle initial state or non-streaming updates
    useEffect(() => {
        if (!isStreaming && displayedText !== text) {
            setDisplayedText(text)
            indexRef.current = text.length
        }
        // eslint-disable-next-line
    }, [isStreaming, text, displayedText])

    useEffect(() => {
        if (!isStreaming) return

        const interval = setInterval(() => {
            const currentTarget = targetTextRef.current

            if (indexRef.current < currentTarget.length) {
                const delta = currentTarget.length - indexRef.current

                // Aggressive Acceleration logic to prevent "dumping":
                // If we fall behind, catch up FASTER so we don't have a massive chunk left at the end.
                const jump = delta > 100 ? 20 :  // Super behind? Jump 20 chars
                    delta > 50 ? 5 :    // Behind? Jump 5
                        delta > 10 ? 2 :    // Slightly behind? Jump 2
                            (indexRef.current < 5 ? 2 : 1) // Kickstart or normal 1

                setDisplayedText(currentTarget.slice(0, indexRef.current + jump))
                indexRef.current += jump
            }
        }, speed)

        return () => clearInterval(interval)
    }, [isStreaming, speed]) // NOT dependent on 'text' to prevent interval churn

    return displayedText
}
