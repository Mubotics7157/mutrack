import React, { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

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
  const completeOnboarding = useMutation(api.members.completeOnboarding);
  const savePush = useMutation(api.members.savePushSubscription);
  const setNotificationsEnabled = useMutation(
    api.members.setNotificationsEnabled
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [permissionState, setPermissionState] =
    useState<NotificationPermission>(Notification.permission);

  useEffect(() => {
    setPermissionState(Notification.permission);
  }, []);

  const handleEnableNotifications = async () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!firstName.trim() || !lastName.trim()) {
        toast.error("please enter your real first and last name");
        setSubmitting(false);
        return;
      }
      if (enableNotifications && permissionState !== "granted") {
        await handleEnableNotifications();
      }
      await completeOnboarding({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phone.trim(),
        notificationsEnabled:
          enableNotifications && permissionState === "granted",
      });
      if (enableNotifications && permissionState === "granted") {
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
    <div className="glass-panel p-8 max-w-xl mx-auto">
      <h2 className="text-2xl font-light mb-2 text-gradient">
        complete your onboarding
      </h2>
      <p className="text-sm text-text-muted mb-6">
        please use your{" "}
        <span className="font-medium">real first and last name</span>. phone
        numbers are used strictly for team contact purposes.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-sm text-text-muted">
              first name (real)
            </label>
            <input
              className="input-modern"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm text-text-muted">
              last name (real)
            </label>
            <input
              className="input-modern"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className="block mb-2 text-sm text-text-muted">
            phone number (team contact only)
          </label>
          <input
            className="input-modern"
            type="tel"
            placeholder="for team contact only"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="flex items-center justify-between p-4 bg-glass border border-border-glass rounded-xl">
          <div>
            <h3 className="text-sm font-medium text-text-primary">
              meeting notifications
            </h3>
            <p className="text-xs text-text-muted mt-1">
              enable web push to get reminders
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={enableNotifications}
              onChange={(e) => setEnableNotifications(e.target.checked)}
            />
            <div className="w-11 h-6 bg-glass border border-border-glass peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-orange-purple"></div>
          </label>
        </div>
        {enableNotifications && permissionState !== "granted" && (
          <button
            type="button"
            className="btn-modern"
            onClick={handleEnableNotifications}
          >
            enable notifications
          </button>
        )}

        <button
          type="submit"
          className="btn-modern btn-primary w-full"
          disabled={submitting}
        >
          finish onboarding
        </button>
      </form>
    </div>
  );
}
