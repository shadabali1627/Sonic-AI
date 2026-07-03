"use client"

import { useEffect, useRef, useState, useCallback } from 'react'

export function useScrollToBottom(dependency: any) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [isAtBottom, setIsAtBottom] = useState(true)
    const [showScrollButton, setShowScrollButton] = useState(false)

    // Check if user is at bottom on scroll
    const handleScroll = useCallback(() => {
        if (!scrollRef.current) return

        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
        // Allow a larger buffer (250px) for mobile layout shifts
        const diff = scrollHeight - scrollTop - clientHeight
        const isBottom = diff < 250

        setIsAtBottom(isBottom)
        setShowScrollButton(!isBottom)
    }, [])

    // Handle window resize events (e.g., mobile keyboard opening)
    useEffect(() => {
        const handleResize = () => {
            if (isAtBottom && scrollRef.current) {
                requestAnimationFrame(() => {
                    scrollRef.current?.scrollTo({
                        top: scrollRef.current.scrollHeight,
                        behavior: 'auto' // Use auto for instant snap on resize
                    })
                })
            }
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [isAtBottom])

    // Auto-scroll when content changes IF we were already close to bottom
    useEffect(() => {
        if (isAtBottom && scrollRef.current) {
            requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: 'smooth'
                })
            })
        }
    }, [dependency, isAtBottom])

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            })
            setIsAtBottom(true)
            setShowScrollButton(false)
        }
    }

    return { scrollRef, showScrollButton, scrollToBottom, handleScroll }
}
