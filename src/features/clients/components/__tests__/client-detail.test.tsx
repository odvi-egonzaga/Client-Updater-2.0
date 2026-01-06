import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { ClientDetail } from '../client-detail'
import type { ClientWithDetails } from '../../types'

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('ClientDetail', () => {
  const mockClient: ClientWithDetails = {
    id: '1',
    clientCode: 'C001',
    fullName: 'John Doe',
    pensionNumber: 'P001',
    birthDate: new Date('1980-01-01'),
    contactNumber: '123-456-7890',
    contactNumberAlt: '098-765-4321',
    pensionTypeId: 'pt1',
    pensionerTypeId: 'prt1',
    productId: 'p1',
    branchId: 'b1',
    parStatusId: 'ps1',
    accountTypeId: 'at1',
    pastDueAmount: '1000.00',
    loanStatus: 'Active',
    isActive: true,
    lastSyncedAt: new Date('2024-01-01'),
    syncSource: 'snowflake',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    pensionType: { id: 'pt1', code: 'PT1', name: 'Pension Type 1' },
    pensionerType: { id: 'prt1', code: 'PRT1', name: 'Pensioner Type 1' },
    product: { id: 'p1', code: 'P1', name: 'Product 1' },
    branch: { id: 'b1', code: 'B1', name: 'Branch 1', location: 'Location 1', category: 'Category 1', deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
    parStatus: { id: 'ps1', code: 'PS1', name: 'PAR Status 1' },
    accountType: { id: 'at1', code: 'AT1', name: 'Account Type 1' },
    currentStatus: {
      id: 'cs1',
      statusTypeId: 'st1',
      reasonId: 'r1',
      remarks: 'Test remarks',
      hasPayment: true,
      updatedAt: new Date('2024-01-01'),
    },
  }

  it('renders loading state', () => {
    render(<ClientDetail isLoading={true} />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders error state', () => {
    render(<ClientDetail error="Failed to load client" />)

    expect(screen.getByText(/failed to load client/i)).toBeInTheDocument()
  })

  it('renders empty state when client is not found', () => {
    render(<ClientDetail client={undefined} />)

    expect(screen.getByText(/client not found/i)).toBeInTheDocument()
  })

  it('renders client details', () => {
    render(<ClientDetail client={mockClient} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Client Code: C001')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders basic information card', () => {
    render(<ClientDetail client={mockClient} />)

    expect(screen.getByText(/basic information/i)).toBeInTheDocument()
    expect(screen.getByText('123-456-7890')).toBeInTheDocument()
    expect(screen.getByText('098-765-4321')).toBeInTheDocument()
  })

  it('renders classification card', () => {
    render(<ClientDetail client={mockClient} />)

    expect(screen.getByText(/classification/i)).toBeInTheDocument()
    expect(screen.getByText('Pension Type 1')).toBeInTheDocument()
    expect(screen.getByText('Pensioner Type 1')).toBeInTheDocument()
    expect(screen.getByText('Product 1')).toBeInTheDocument()
    expect(screen.getByText('Account Type 1')).toBeInTheDocument()
  })

  it('renders branch & PAR status card', () => {
    render(<ClientDetail client={mockClient} />)

    expect(screen.getByText(/branch & par status/i)).toBeInTheDocument()
    expect(screen.getByText('Branch 1')).toBeInTheDocument()
    expect(screen.getByText('(Location 1)')).toBeInTheDocument()
    expect(screen.getByText('PAR Status 1')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('1000.00')).toBeInTheDocument()
  })

  it('renders current period status card', () => {
    render(<ClientDetail client={mockClient} />)

    expect(screen.getByText(/current period status/i)).toBeInTheDocument()
    expect(screen.getByText('Test remarks')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })

  it('renders sync information card', () => {
    render(<ClientDetail client={mockClient} />)

    expect(screen.getByText(/sync information/i)).toBeInTheDocument()
    expect(screen.getByText('snowflake')).toBeInTheDocument()
  })

  it('renders back to clients link', () => {
    render(<ClientDetail client={mockClient} />)

    expect(screen.getByRole('link', { name: /back to clients/i })).toBeInTheDocument()
  })
})
