// Dashboard layout placeholder
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between">
          <Link href="/" className="font-semibold">DTT Framework</Link>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
