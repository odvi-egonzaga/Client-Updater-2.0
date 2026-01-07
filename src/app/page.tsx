"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function HomePage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (userId) {
      // User is authenticated, redirect to dashboard
      router.replace("/dashboard");
    } else {
      // User is not authenticated, redirect to sign-in
      router.replace("/sign-in");
    }
  }, [userId, isLoaded, router]);

  // Show loading spinner while checking auth status
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner className="size-8" />
    </div>
  );
}
