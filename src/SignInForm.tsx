"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Input, Button } from "./components/ui";
import { ResetPassword } from "./ResetPassword";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [step, setStep] = useState<"auth" | "reset">("auth");
  const [submitting, setSubmitting] = useState(false);

  if (step === "reset") {
    return <ResetPassword handleCancel={() => setStep("auth")} />;
  }

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          void signIn("password", formData).catch((error) => {
            let toastTitle = "";
            if (error.message.includes("Invalid password")) {
              toastTitle = "Invalid password. Please try again.";
            } else {
              toastTitle =
                flow === "signIn"
                  ? "Could not sign in, did you mean to sign up?"
                  : "Could not sign up, did you mean to sign in?";
            }
            toast.error(toastTitle);
            setSubmitting(false);
          });
        }}
      >
        <div>
          <label className="block mb-2 text-sm font-medium text-text-primary">Email</label>
          <Input
            type="email"
            name="email"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-text-primary">Password</label>
            {flow === "signIn" && (
              <button
                type="button"
                className="text-xs text-accent hover:text-accent/80 transition-colors"
                onClick={() => setStep("reset")}
              >
                Forgot password?
              </button>
            )}
          </div>
          <Input
            type="password"
            name="password"
            placeholder="••••••••"
            required
          />
        </div>
        <Button variant="primary" type="submit" disabled={submitting} className="w-full">
          {flow === "signIn" ? "Sign In" : "Sign Up"}
        </Button>
        <div className="text-center text-sm text-text-muted">
          <span>
            {flow === "signIn"
              ? "Don't have an account? "
              : "Already have an account? "}
          </span>
          <button
            type="button"
            className="text-accent hover:text-accent/80 font-medium transition-colors"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
