"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const onboarded = localStorage.getItem("founder_onboarded");
    if (onboarded === "true") {
      router.replace("/dashboard");
    } else {
      router.replace("/onboarding");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="size-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}
