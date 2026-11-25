import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to BT Comms.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}

function AuthFallback() {
  return (
    <div className="grid min-h-dvh place-items-center bg-void">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-blurple" />
    </div>
  );
}
