"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Input, Button } from "./components/ui";

interface ResetPasswordProps {
  handleCancel: () => void;
}

export function ResetPassword({ handleCancel }: ResetPasswordProps) {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRequestReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const emailValue = formData.get("email") as string;
    setEmail(emailValue);
    formData.set("flow", "reset");

    try {
      await signIn("password", formData);
      toast.success("Check your email for a reset code");
      setStep("verify");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Could not find account")) {
        toast.error("No account found with this email");
      } else {
        toast.error("Failed to send reset code. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.target as HTMLFormElement);
    formData.set("email", email);
    formData.set("flow", "reset-verification");

    try {
      await signIn("password", formData);
      toast.success("Password reset successfully!");
      handleCancel();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Invalid") || errorMessage.includes("code")) {
        toast.error("Invalid verification code. Please try again.");
      } else {
        toast.error("Failed to reset password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "request") {
    return (
      <div className="w-full">
        <form className="flex flex-col gap-4" onSubmit={handleRequestReset}>
          <div className="text-center mb-2">
            <h3 className="text-lg font-semibold text-text-primary">Reset Password</h3>
            <p className="text-sm text-text-muted mt-1">
              Enter your email and we'll send you a code to reset your password.
            </p>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">
              Email
            </label>
            <Input
              type="email"
              name="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <Button variant="primary" type="submit" disabled={submitting} className="w-full">
            {submitting ? "Sending..." : "Send Reset Code"}
          </Button>
          <button
            type="button"
            className="text-sm text-text-muted hover:text-text-primary transition-colors"
            onClick={handleCancel}
          >
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form className="flex flex-col gap-4" onSubmit={handleVerifyReset}>
        <div className="text-center mb-2">
          <h3 className="text-lg font-semibold text-text-primary">Enter Reset Code</h3>
          <p className="text-sm text-text-muted mt-1">
            We sent a code to <span className="font-medium text-text-primary">{email}</span>
          </p>
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-text-primary">
            Verification Code
          </label>
          <Input
            type="text"
            name="code"
            placeholder="12345678"
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-text-primary">
            New Password
          </label>
          <Input
            type="password"
            name="newPassword"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>
        <Button variant="primary" type="submit" disabled={submitting} className="w-full">
          {submitting ? "Resetting..." : "Reset Password"}
        </Button>
        <div className="flex justify-between text-sm">
          <button
            type="button"
            className="text-text-muted hover:text-text-primary transition-colors"
            onClick={() => setStep("request")}
          >
            Try different email
          </button>
          <button
            type="button"
            className="text-text-muted hover:text-text-primary transition-colors"
            onClick={handleCancel}
          >
            Back to sign in
          </button>
        </div>
      </form>
    </div>
  );
}
