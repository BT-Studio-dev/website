import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your BT Comms account and join the community.",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AuthForm mode="signup" />
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
