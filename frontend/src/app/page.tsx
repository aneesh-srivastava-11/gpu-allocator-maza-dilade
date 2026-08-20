"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else if (user.role === "student") {
      router.push("/student/dashboard");
    } else {
      router.push("/incharge/dashboard");
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-light dark:bg-canvas-dark">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-orange" />
    </div>
  );
}
