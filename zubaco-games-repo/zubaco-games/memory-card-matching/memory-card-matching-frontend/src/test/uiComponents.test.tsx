import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

describe('ui primitives', () => {
  it('renders badge and progress', () => {
    render(
      <>
        <Badge>Label</Badge>
        <Progress value={50} />
      </>,
    )
    expect(screen.getByText('Label')).toBeInTheDocument()
  })
})
