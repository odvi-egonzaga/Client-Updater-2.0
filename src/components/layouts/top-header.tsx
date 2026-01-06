"use client"

import { Bell, Check } from "lucide-react"
import { UserButton } from "@clerk/nextjs"

export function TopHeader() {
  return (
    <header className="h-16 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left Section - Logo and App Name */}
        <div className="flex items-center gap-3">
          {/* App Logo - Emerald/teal rounded square with white checkmark icon */}
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-500 rounded-md">
            <Check size={20} className="text-white" />
          </div>
          {/* App Name */}
          <span className="text-lg font-semibold text-gray-900">
            Client Updater v2
          </span>
        </div>

        {/* Right Section - Notifications and User Profile */}
        <div className="flex items-center gap-4">
          {/* Notification Bell with red dot indicator */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
            <Bell size={20} />
            {/* Red dot indicator at top-right corner */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User Profile Avatar - Clerk UserButton */}
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-9 h-9",
              },
            }}
          />
        </div>
      </div>
    </header>
  )
}
