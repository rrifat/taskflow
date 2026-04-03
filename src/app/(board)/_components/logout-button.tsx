"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isBusy = isSubmitting || isRedirecting;

  async function handleLogout() {
    if (isBusy) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        setIsSubmitting(false);
        return;
      }
      setIsRedirecting(true);
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="border-slate-200 bg-white/90 px-4 text-slate-600 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.75)] hover:border-slate-300 hover:bg-white hover:text-slate-900"
      disabled={isBusy}
      onClick={handleLogout}
    >
      {isBusy ? "Signing out..." : "Log out"}
    </Button>
  );
}
