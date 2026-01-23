import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";

export const ResendOTPPasswordReset = Resend({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  async generateVerificationToken() {
    // Generate 8-digit numeric code
    const array = new Uint32Array(8);
    crypto.getRandomValues(array);
    return Array.from(array, (num) => (num % 10).toString()).join("");
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: process.env.AUTH_EMAIL ?? "MUTrack <noreply@pramit.gg>",
      to: [email],
      subject: "Reset your MUTrack password",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 24px;">Reset Your Password</h2>
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
            You requested to reset your password for MUTrack. Use the code below to complete the process:
          </p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1a1a1a;">${token}</span>
          </div>
          <p style="color: #4a4a4a; font-size: 14px; line-height: 1.5;">
            This code will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">
            MUTrack - Michigan Ultimate Frisbee
          </p>
        </div>
      `,
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
