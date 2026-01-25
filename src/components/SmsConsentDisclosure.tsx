import { MessageSquare, Shield, Phone, CheckCircle } from "lucide-react";

/**
 * Static SMS consent disclosure page for TCPA/A2P 10DLC compliance.
 * This page is publicly accessible and demonstrates how users opt-in to SMS messages.
 * Submit this URL to carriers/Twilio as proof of consent collection process.
 */
export function SmsConsentDisclosure() {
  return (
    <div className="min-h-screen bg-bg-primary p-4 safe-top safe-bottom">
      <div className="max-w-2xl mx-auto pt-8 pb-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-accent rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-glow-accent mx-auto mb-4">
            μ
          </div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            mutrack SMS Consent
          </h1>
          <p className="text-sm text-text-muted">FRC Team 7157 Attendance System</p>
        </div>

        {/* Main Content Card */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <MessageSquare size={24} className="text-accent" />
            SMS Text Message Consent
          </h2>

          <div className="space-y-4 text-text-secondary">
            <p>
              By providing your phone number and opting in to SMS notifications in the
              mutrack app, you consent to receive text messages from mutrack (operated
              by FIRST Robotics Competition Team 7157) for the following purposes:
            </p>

            <div className="bg-bg-tertiary rounded-xl p-4">
              <h3 className="font-medium text-text-primary mb-2">Message Types:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Meeting attendance check-in links</li>
                <li>Check-out reminder notifications</li>
                <li>Meeting schedule updates (if enabled)</li>
              </ul>
            </div>

            <div className="bg-bg-tertiary rounded-xl p-4">
              <h3 className="font-medium text-text-primary mb-2">Message Frequency:</h3>
              <p className="text-sm">
                Message frequency varies based on team meeting schedule. Typically 2-3
                messages per meeting when SMS check-in is used. Messages are only sent
                for scheduled team meetings.
              </p>
            </div>
          </div>
        </div>

        {/* How Consent is Collected */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <CheckCircle size={24} className="text-accent-success" />
            How We Collect Consent
          </h2>

          <div className="space-y-4 text-text-secondary text-sm">
            <p>
              Users provide consent through the mutrack mobile/web application during
              account setup or in their profile settings:
            </p>

            <ol className="list-decimal list-inside space-y-3">
              <li>
                <strong className="text-text-primary">Account Registration:</strong>{" "}
                During onboarding, users enter their phone number and can enable SMS
                check-in notifications.
              </li>
              <li>
                <strong className="text-text-primary">Profile Settings:</strong>{" "}
                Users can enable or disable SMS check-in at any time in their profile
                preferences by toggling the "SMS Check-In" option.
              </li>
              <li>
                <strong className="text-text-primary">Explicit Opt-In:</strong>{" "}
                SMS notifications are disabled by default. Users must explicitly
                enable them to receive text messages.
              </li>
            </ol>

            {/* Mock UI Example */}
            <div className="mt-6 p-4 bg-bg-primary rounded-xl border border-border-subtle">
              <p className="text-xs text-text-muted mb-3 uppercase tracking-wide">
                Example Consent UI in App:
              </p>
              <div className="bg-bg-tertiary rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                      <MessageSquare size={20} className="text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">
                        SMS Check-In
                      </p>
                      <p className="text-xs text-text-muted">
                        Receive check-in links via SMS
                      </p>
                    </div>
                  </div>
                  <div className="w-12 h-7 bg-accent rounded-full relative">
                    <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Shield size={24} className="text-accent" />
            Terms and Conditions
          </h2>

          <div className="space-y-4 text-sm text-text-secondary">
            <div className="flex items-start gap-3">
              <Phone size={18} className="text-text-muted shrink-0 mt-0.5" />
              <p>
                <strong className="text-text-primary">Carrier Charges:</strong>{" "}
                Message and data rates may apply. Check with your mobile carrier for
                details about your text messaging plan.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <MessageSquare size={18} className="text-text-muted shrink-0 mt-0.5" />
              <p>
                <strong className="text-text-primary">Opt-Out:</strong>{" "}
                You can opt out at any time by replying STOP to any message, or by
                disabling SMS Check-In in your profile settings within the mutrack app.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Shield size={18} className="text-text-muted shrink-0 mt-0.5" />
              <p>
                <strong className="text-text-primary">Privacy:</strong>{" "}
                Your phone number is only used for attendance-related messages and is
                never shared with third parties for marketing purposes.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle size={18} className="text-text-muted shrink-0 mt-0.5" />
              <p>
                <strong className="text-text-primary">Help:</strong>{" "}
                For assistance, reply HELP to any message or contact your team
                administrator.
              </p>
            </div>
          </div>
        </div>

        {/* Legal Disclosure */}
        <div className="bg-bg-tertiary border border-border-subtle rounded-xl p-4">
          <p className="text-xs text-text-muted leading-relaxed">
            By enabling SMS notifications in the mutrack app, you expressly consent to
            receive automated text messages from mutrack (FRC Team 7157) at the phone
            number you provided. These messages are transactional in nature, related
            solely to meeting attendance tracking, and are not marketing communications.
            Consent is not a condition of participation. Message frequency varies.
            Message and data rates may apply. Reply STOP to opt out or HELP for
            assistance. Carriers are not liable for delayed or undelivered messages.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-text-muted">
          <p>mutrack - Attendance tracking for FRC Team 7157</p>
          <p className="mt-1">
            Questions? Contact your team administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
