"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

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
        <input
          className="input-modern"
          type="email"
          name="email"
          placeholder="email"
          required
        />
        <input
          className="input-modern"
          type="password"
          name="password"
          placeholder="password"
          required
        />
        <button className="btn-modern btn-primary w-full" type="submit" disabled={submitting}>
          {flow === "signIn" ? "sign in" : "sign up"}
        </button>
        <div className="text-center text-sm text-text-muted">
          <span>
            {flow === "signIn"
              ? "don't have an account? "
              : "already have an account? "}
          </span>
          <button
            type="button"
            className="text-accent-purple hover:text-sunset-orange hover:underline font-medium cursor-pointer transition-colors duration-300"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "sign up instead" : "sign in instead"}
          </button>
        </div>
      </form>
    </div>
  );
}
