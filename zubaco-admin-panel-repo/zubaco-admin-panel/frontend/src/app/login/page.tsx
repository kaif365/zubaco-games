import { LoginForm } from "@/features/auth/components/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | ZUBACO Admin",
};

export const dynamic = "force-static";

export default function LoginPage() {
  return <LoginForm />;
}
