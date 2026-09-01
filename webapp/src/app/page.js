"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const { authClient } = await import('@/lib/auth-client');
        const sessionRes = await authClient.getSession();
        
        if (!sessionRes?.data?.user && !sessionRes?.data?.session) {
          router.replace("/login");
          return;
        }

        const { api } = await import('@/lib/api');
        const res = await api.get("/api/user/status");
        
        if (res && res.exists === false) {
          router.replace("/onboarding");
        } else {
          router.replace("/dashboard");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        router.replace("/login");
      }
    }
    
    checkAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121210]">
      <div className="size-8 rounded-full border-4 border-[#3b5640]/20 border-t-[#4a6b4e] animate-spin" />
    </div>
  );
}

