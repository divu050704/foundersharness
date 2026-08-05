"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const userJson = localStorage.getItem("founder_user");
    if (!userJson) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(userJson);
      const userOnboardedKey = `founder_onboarded_${user.email}`;
      const onboarded = localStorage.getItem(userOnboardedKey) || localStorage.getItem("founder_onboarded");
      
      if (onboarded === "true") {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
    } catch (e) {
      console.error(e);
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121210]">
      <div className="size-8 rounded-full border-4 border-[#3b5640]/20 border-t-[#4a6b4e] animate-spin" />
    </div>
  );
}

