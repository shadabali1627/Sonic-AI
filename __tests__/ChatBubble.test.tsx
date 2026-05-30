import { render, screen, fireEvent, act } from '@testing-library/react'
import { ChatBubble } from '../src/components/chat/chat-bubble'
import { vi, describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'

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

// Mock Audio
const mockPlay = vi.fn().mockResolvedValue(undefined)
const mockPause = vi.fn()

class MockAudio {
    src = ''
    onended: (() => void) | null = null
    onerror: (() => void) | null = null
    play = mockPlay
    pause = mockPause
}

// Mock fetch
const mockFetch = vi.fn()

describe('ChatBubble Voice-First Verification', () => {
    const originalAudio = global.Audio
    const originalFetch = global.fetch

    beforeAll(() => {
        global.Audio = MockAudio as any
        global.fetch = mockFetch
        
        if (typeof URL.createObjectURL === 'undefined') {
            URL.createObjectURL = vi.fn(() => 'blob:mock-url')
        }
        if (typeof URL.revokeObjectURL === 'undefined') {
            URL.revokeObjectURL = vi.fn()
        }
    })

    afterAll(() => {
        global.Audio = originalAudio
        global.fetch = originalFetch
    })

    beforeEach(() => {
        vi.clearAllMocks()
        mockFetch.mockImplementation(() => {
            return Promise.resolve({
                ok: true,
                blob: () => Promise.resolve(new Blob(['mock-audio'], { type: 'audio/wav' })),
            } as Response)
        })
    })

    it('strips markdown before speaking', async () => {
        const markdownText = "**Hello** *world*! This is a [link](https://example.com) and `code`."
        const expectedSpokenText = "Hello world! This is a link and code."

        render(<ChatBubble role="assistant" content={markdownText} />)

        const speakButton = screen.getByTitle('Read aloud')
        
        await act(async () => {
            fireEvent.click(speakButton)
        })

        expect(mockFetch).toHaveBeenCalledTimes(1)
        const fetchArgs = mockFetch.mock.calls[0]
        expect(fetchArgs[0]).toBe('/api/text-to-speech')
        expect(JSON.parse(fetchArgs[1].body)).toEqual({ text: expectedSpokenText })
    })

    it('correctly handles headers and lists in speech', async () => {
        const complexMarkdown = "# Header\n- Item 1\n- Item 2"
        const expectedSpokenText = "Header\nItem 1\nItem 2"

        render(<ChatBubble role="assistant" content={complexMarkdown} />)

        const speakButton = screen.getByTitle('Read aloud')
        
        await act(async () => {
            fireEvent.click(speakButton)
        })

        expect(mockFetch).toHaveBeenCalledTimes(1)
        const fetchArgs = mockFetch.mock.calls[0]
        expect(fetchArgs[0]).toBe('/api/text-to-speech')
        expect(JSON.parse(fetchArgs[1].body)).toEqual({ text: expectedSpokenText })
    })
})
