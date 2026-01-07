"use client";

import Link from "next/link";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

const navLinks = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "View your main dashboard and analytics",
  },
  {
    href: "/admin/users",
    label: "Users",
    description: "Manage user accounts and permissions",
  },
  {
    href: "/clients",
    label: "Clients",
    description: "Access and manage client information",
  },
  {
    href: "/admin/sync",
    label: "Sync Status",
    description: "Monitor data synchronization status",
  },
  {
    href: "/health",
    label: "Health Check",
    description: "View system health and status",
  },
];

export default function HomePage() {
  const { userId } = useAuth();

  return (
    <div className="from-background to-muted/20 min-h-screen bg-gradient-to-b">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {siteConfig.name}
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome back! Here's your navigation hub.
            </p>
          </div>
          {userId && (
            <SignOutButton>
              <Button variant="outline" size="sm">
                Sign Out
              </Button>
            </SignOutButton>
          )}
        </div>

        {/* Navigation Grid */}
        <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="hover:border-primary/50 h-full cursor-pointer transition-all hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{link.label}</CardTitle>
                    <Badge variant="secondary">Go</Badge>
                  </div>
                  <CardDescription className="mt-2">
                    {link.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                  >
                    <span>Access {link.label.toLowerCase()} →</span>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Footer Info */}
        <div className="text-muted-foreground mt-12 text-center text-sm">
          <p>Need help? Check the documentation or contact support.</p>
        </div>
      </div>
    </div>
  );
}
