import { render, screen, fireEvent, act } from '@testing-library/react'
import { ChatBubble } from '../src/components/chat/chat-bubble'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as React from 'react'

// Mock dependencies
vi.mock('react-markdown', () => ({
    default: ({ children }: { children: string }) => <div>{children}</div>
}))

vi.mock('../src/lib/utils', () => ({
    cn: (...inputs: any[]) => inputs.join(' ')
}))

vi.mock('franc-min', () => ({
    franc: () => 'eng'
}))

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, onClick, ...props }: any) => (
            <div className={className} onClick={onClick}>
                {children}
            </div>
        )
    },
    AnimatePresence: ({ children }: any) => <>{children}</>
}))

// Mock SpeechSynthesis
const mockSpeak = vi.fn()
const mockCancel = vi.fn()

Object.defineProperty(window, 'speechSynthesis', {
    value: {
        speak: mockSpeak,
        cancel: mockCancel,
        onvoiceschanged: null,
        paused: false,
        pending: false,
        speaking: false,
        resume: vi.fn(),
        pause: vi.fn(),
    },
    writable: true
})

// Mock SpeechSynthesisUtterance constructor
class MockSpeechSynthesisUtterance {
    text: string
    lang: string
    onend: (() => void) | null
    onerror: (() => void) | null

    constructor(text: string) {
        this.text = text
        this.lang = ''
        this.onend = null
        this.onerror = null
    }
}

global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance as any

describe('ChatBubble Voice-First Verification', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('strips markdown before speaking', () => {
        const markdownText = "**Hello** *world*! This is a [link](https://example.com) and `code`."
        const expectedSpokenText = "Hello world! This is a link and code."

        render(<ChatBubble role="assistant" content={markdownText} />)

        const speakButton = screen.getByTitle('Read aloud')
        fireEvent.click(speakButton)

        expect(mockSpeak).toHaveBeenCalledTimes(1)

        // Check the utterance text
        const utterance = mockSpeak.mock.calls[0][0]
        expect(utterance.text).toBe(expectedSpokenText)
    })

    it('correctly handles headers and lists in speech', () => {
        const complexMarkdown = "# Header\n- Item 1\n- Item 2"
        const expectedSpokenText = "Header\nItem 1\nItem 2"

        render(<ChatBubble role="assistant" content={complexMarkdown} />)

        const speakButton = screen.getByTitle('Read aloud')
        fireEvent.click(speakButton)

        const utterance = mockSpeak.mock.calls[0][0]
        expect(utterance.text).toBe(expectedSpokenText)
    })
})

describe('ChatBubble Image Modal History Integration', () => {
    let mockPushState: any
    let mockBack: any

    beforeEach(() => {
        vi.clearAllMocks()

        // Mock window.history properties
        mockPushState = vi.fn((state, unused, url) => {
            Object.defineProperty(window.history, 'state', {
                value: state,
                configurable: true,
                writable: true
            })
        })
        mockBack = vi.fn(() => {
            Object.defineProperty(window.history, 'state', {
                value: null,
                configurable: true,
                writable: true
            })
            // Dispatch event in act since it changes state
            act(() => {
                window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
            })
        })

        vi.spyOn(window.history, 'pushState').mockImplementation(mockPushState)
        vi.spyOn(window.history, 'back').mockImplementation(mockBack)

        // Reset history state
        Object.defineProperty(window.history, 'state', {
            value: null,
            configurable: true,
            writable: true
        })
    })

    it('opens the image modal and pushes history state when image is clicked', () => {
        render(
            <ChatBubble 
                role="assistant" 
                content="A beautiful sunset" 
                type="image" 
                imageUrl="https://example.com/sunset.png" 
            />
        )

        // Image should be in the document
        const imageEl = screen.getByAltText('A beautiful sunset')
        expect(imageEl).toBeDefined()

        // Modal should not be open initially
        expect(screen.queryByTitle('Close preview')).toBeNull()

        // Click the image to open the modal
        fireEvent.click(imageEl)

        // It should push state
        expect(mockPushState).toHaveBeenCalledWith({ modalOpen: true }, '')
        expect(window.history.state).toEqual({ modalOpen: true })

        // Modal should be open
        expect(screen.getByTitle('Close preview')).toBeDefined()
    })

    it('closes the image modal and calls history.back() when close button is clicked', () => {
        render(
            <ChatBubble 
                role="assistant" 
                content="A beautiful sunset" 
                type="image" 
                imageUrl="https://example.com/sunset.png" 
            />
        )

        const imageEl = screen.getByAltText('A beautiful sunset')
        fireEvent.click(imageEl)

        expect(screen.getByTitle('Close preview')).toBeDefined()

        // Click the close button
        const closeBtn = screen.getByTitle('Close preview')
        fireEvent.click(closeBtn)

        // It should call history.back()
        expect(mockBack).toHaveBeenCalled()

        // Modal should be closed
        expect(screen.queryByTitle('Close preview')).toBeNull()
    })

    it('closes the image modal when popstate event is fired', () => {
        render(
            <ChatBubble 
                role="assistant" 
                content="A beautiful sunset" 
                type="image" 
                imageUrl="https://example.com/sunset.png" 
            />
        )

        const imageEl = screen.getByAltText('A beautiful sunset')
        fireEvent.click(imageEl)

        expect(screen.getByTitle('Close preview')).toBeDefined()

        // Simulate browser back button by firing popstate event directly
        act(() => {
            window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
        })

        // Modal should be closed without calling history.back() manually
        expect(mockBack).not.toHaveBeenCalled()
        expect(screen.queryByTitle('Close preview')).toBeNull()
    })
})
