import { render, screen } from '@testing-library/react'
import { ThinkingIndicator } from '../src/components/chat/thinking-indicator'
import { describe, it, expect } from 'vitest'

describe('ThinkingIndicator', () => {
    it('renders "Thinking..." text', () => {
        render(<ThinkingIndicator />)
        expect(screen.getByText('Thinking...')).toBeDefined()
    })
})
