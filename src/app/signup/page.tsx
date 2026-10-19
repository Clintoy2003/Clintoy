import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a free Clintoy account with email or Google. No credit card required.",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
