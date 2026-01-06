import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { StatusBadge } from '../status-badge'

describe('StatusBadge', () => {
  it('renders PENDING status with correct styling', () => {
    render(<StatusBadge status="PENDING" />)
    
    const badge = screen.getByText('PENDING')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-700', 'border-gray-300')
  })

  it('renders TO_FOLLOW status with correct styling', () => {
    render(<StatusBadge status="TO_FOLLOW" />)
    
    const badge = screen.getByText('TO_FOLLOW')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-700', 'border-blue-300')
  })

  it('renders CALLED status with correct styling', () => {
    render(<StatusBadge status="CALLED" />)
    
    const badge = screen.getByText('CALLED')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-700', 'border-yellow-300')
  })

  it('renders VISITED status with correct styling', () => {
    render(<StatusBadge status="VISITED" />)
    
    const badge = screen.getByText('VISITED')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-green-100', 'text-green-700', 'border-green-300')
  })

  it('renders UPDATED status with correct styling', () => {
    render(<StatusBadge status="UPDATED" />)
    
    const badge = screen.getByText('UPDATED')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-indigo-100', 'text-indigo-700', 'border-indigo-300')
  })

  it('renders DONE status with correct styling', () => {
    render(<StatusBadge status="DONE" />)
    
    const badge = screen.getByText('DONE')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-emerald-100', 'text-emerald-700', 'border-emerald-300')
  })

  it('renders unknown status with default styling', () => {
    render(<StatusBadge status="UNKNOWN" />)
    
    const badge = screen.getByText('UNKNOWN')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-700', 'border-gray-300')
  })

  it('renders sm size correctly', () => {
    render(<StatusBadge status="PENDING" size="sm" />)
    
    const badge = screen.getByText('PENDING')
    expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs')
  })

  it('renders md size correctly', () => {
    render(<StatusBadge status="PENDING" size="md" />)
    
    const badge = screen.getByText('PENDING')
    expect(badge).toHaveClass('px-2.5', 'py-1', 'text-sm')
  })

  it('renders lg size correctly', () => {
    render(<StatusBadge status="PENDING" size="lg" />)
    
    const badge = screen.getByText('PENDING')
    expect(badge).toHaveClass('px-3', 'py-1.5', 'text-base')
  })

  it('renders with default size when not specified', () => {
    render(<StatusBadge status="PENDING" />)
    
    const badge = screen.getByText('PENDING')
    expect(badge).toHaveClass('px-2.5', 'py-1', 'text-sm')
  })

  it('normalizes lowercase status to uppercase', () => {
    render(<StatusBadge status="pending" />)
    
    const badge = screen.getByText('pending')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-700', 'border-gray-300')
  })
})
