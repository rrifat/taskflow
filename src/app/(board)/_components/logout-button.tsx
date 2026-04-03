"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        return;
      }

      router.push("/login");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      className="border-0 bg-transparent px-0 text-slate-500 shadow-none hover:cursor-pointer hover:bg-transparent hover:text-slate-800"
      disabled={isSubmitting}
      onClick={handleLogout}
    >
      {isSubmitting ? "Signing out..." : "Log out"}
    </Button>
  );
}
