import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Bell, CheckCircle } from "lucide-react";
import { Input, Button, Toggle } from "./ui";

type SubscriptionKeys = { p256dh: string; auth: string };

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch (e) {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i)
    outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function subscribeToPush(
  reg: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  if (!("PushManager" in window)) return null;
  try {
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return null;
    }
    const vapid = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY as
      | string
      | undefined;
    if (!vapid) {
      return null; // permission may still be granted; we'll handle gracefully
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
    return sub;
  } catch (e) {
    return null;
  }
}

function extractKeys(sub: PushSubscription): {
  endpoint: string;
  keys: SubscriptionKeys;
} {
  const json = sub.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  const endpoint = json.endpoint ?? "";
  const p256dh = json.keys?.p256dh ?? "";
  const auth = json.keys?.auth ?? "";
  return { endpoint, keys: { p256dh, auth } };
}

export function Onboarding() {
  const isIOSDevice =
    typeof window !== "undefined" &&
    /iphone|ipad|ipod/i.test(window.navigator.userAgent ?? "");
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error: iOS Safari exposes navigator.standalone
      window.navigator.standalone === true);
  const supportsNotifications =
    typeof window !== "undefined" && "Notification" in window;
  const needsIOSInstallationHint = isIOSDevice && !isStandalone;
  const completeOnboarding = useMutation(api.members.completeOnboarding);
  const savePush = useMutation(api.members.savePushSubscription);
  const setNotificationsEnabled = useMutation(
    api.members.setNotificationsEnabled
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [enableNotifications, setEnableNotifications] = useState(
    supportsNotifications
  );
  const [submitting, setSubmitting] = useState(false);
  const [permissionState, setPermissionState] =
    useState<NotificationPermission>(
      supportsNotifications ? Notification.permission : "default"
    );

  useEffect(() => {
    if (supportsNotifications) {
      setPermissionState(Notification.permission);
    }
  }, [supportsNotifications]);

  const handleEnableNotifications = async () => {
    if (!supportsNotifications) {
      if (needsIOSInstallationHint) {
        toast.error(
          "add this app to your iOS home screen to enable notifications"
        );
      } else {
        toast.error("notifications are not supported on this device");
      }
      setEnableNotifications(false);
      return;
    }
    const reg = await registerServiceWorker();
    if (!reg) {
      toast.error("service worker not supported in this browser");
      setEnableNotifications(false);
      return;
    }
    // Ask permission first to show the native box
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission !== "granted") {
        toast.error("notifications were not enabled");
        setEnableNotifications(false);
        return;
      }
    }
    // Try to subscribe if VAPID is configured
    const sub = await subscribeToPush(reg);
    if (sub) {
      const { endpoint, keys } = extractKeys(sub);
      await savePush({ endpoint, keys });
    }
    await setNotificationsEnabled({ enabled: true });
    toast.success("notifications enabled");
    setPermissionState("granted");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!firstName.trim() || !lastName.trim()) {
        toast.error("please enter your real first and last name");
        setSubmitting(false);
        return;
      }
      if (enableNotifications && supportsNotifications && permissionState !== "granted") {
        await handleEnableNotifications();
      }
      await completeOnboarding({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phone.trim(),
        notificationsEnabled:
          enableNotifications && supportsNotifications && permissionState === "granted",
      });
      if (
        enableNotifications &&
        supportsNotifications &&
        permissionState === "granted"
      ) {
        await setNotificationsEnabled({ enabled: true });
      }
      toast.success("onboarding complete");
    } catch (err) {
      toast.error("failed to complete onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-bg-secondary border border-border rounded-2xl p-6 md:p-8 max-w-xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">Complete Your Profile</h2>
        <p className="text-sm text-text-muted">
          Please use your <span className="font-medium text-text-primary">real name</span>. Phone numbers are used strictly for team contact.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">
              First Name
            </label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">
              Last Name
            </label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              required
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block mb-2 text-sm font-medium text-text-primary">
            Phone Number
          </label>
          <Input
            type="tel"
            placeholder="(555) 555-5555"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <p className="text-xs text-text-dim mt-1">For team contact only</p>
        </div>

        {/* Notifications */}
        <div className="bg-bg-tertiary border border-border rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Bell size={20} className="text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-primary">
                  Meeting Notifications
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Get push notifications for meeting reminders
                </p>
                {needsIOSInstallationHint && (
                  <p className="text-xs text-accent-orange mt-2">
                    On iOS, add this app to your home screen first.
                  </p>
                )}
              </div>
            </div>
            <Toggle
              enabled={enableNotifications}
              onChange={setEnableNotifications}
              disabled={!supportsNotifications}
            />
          </div>
        </div>

        {enableNotifications && permissionState !== "granted" && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleEnableNotifications}
            className="w-full"
            icon={<Bell size={16} />}
          >
            Enable Notifications
          </Button>
        )}

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          disabled={submitting}
          className="w-full"
          icon={<CheckCircle size={16} />}
        >
          {submitting ? "Finishing..." : "Finish Setup"}
        </Button>
      </form>
    </div>
  );
}
