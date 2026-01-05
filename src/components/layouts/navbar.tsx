// Navbar component placeholder
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

export function Navbar() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between">
        <Link href="/" className="font-semibold">DTT Framework</Link>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  )
}
