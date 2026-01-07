import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export function Navbar() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold">
            DTT Framework
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard/fcash"
              className="hover:text-primary text-sm font-medium transition-colors"
            >
              FCASH Dashboard
            </Link>
            <Link
              href="/dashboard/pcni"
              className="hover:text-primary text-sm font-medium transition-colors"
            >
              PCNI Dashboard
            </Link>
          </nav>
        </div>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  );
}
