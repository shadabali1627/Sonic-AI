import { render, screen, fireEvent } from '@testing-library/react'
import { ChatBubble } from '../src/components/chat/chat-bubble'
import { vi, describe, it, expect, beforeEach } from 'vitest'

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
    },
    writable: true
})

// Mock SpeechSynthesisUtterance constructor
class MockSpeechSynthesisUtterance {
    text: string
    lang: string
    onend: (() => void) | null

    constructor(text: string) {
        this.text = text
        this.lang = ''
        this.onend = null
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

        // Find the speak button (hover over bubble to see it typically, but in tests valid HTML is enough if rendered)
        // The button has title="Read aloud"
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
