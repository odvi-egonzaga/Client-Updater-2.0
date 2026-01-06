import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

export function Navbar() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold">DTT Framework</Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard/fcash" className="text-sm font-medium hover:text-primary transition-colors">
              FCASH Dashboard
            </Link>
            <Link href="/dashboard/pcni" className="text-sm font-medium hover:text-primary transition-colors">
              PCNI Dashboard
            </Link>
            <div className="h-6 w-px bg-border mx-2" />
            <Link href="/dashboard/reports" className="text-sm font-medium hover:text-primary transition-colors">
              Reports
            </Link>
            <Link href="/dashboard/reports/exports" className="text-sm font-medium hover:text-primary transition-colors">
              Exports
            </Link>
            <div className="h-6 w-px bg-border mx-2" />
            <Link href="/dashboard/admin/branches" className="text-sm font-medium hover:text-primary transition-colors">
              Branches
            </Link>
            <Link href="/dashboard/admin/areas" className="text-sm font-medium hover:text-primary transition-colors">
              Areas
            </Link>
            <Link href="/dashboard/admin/config" className="text-sm font-medium hover:text-primary transition-colors">
              Config
            </Link>
          </nav>
        </div>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  )
}
