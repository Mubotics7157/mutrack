import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { useAuthActions } from '@convex-dev/auth/react';
import { MemberWithProfile } from '../lib/members';
import {
  ProfileHeader,
  ProfileEditForm,
  PreferencesSection,
  BeaconScanModal,
  PastMeetingsCalendar,
} from './profile';

interface ProfilePageProps {
  member: MemberWithProfile;
}

export function ProfilePage({ member }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [foundBeacons, setFoundBeacons] = useState<
    Array<{ uuid: string; major: number; minor: number; key: string; lastSeen: number }>
  >([]);
  const [seenKeys] = useState(() => new Set<string>());
  const [stopScanRef] = useState<{ stop?: () => void }>({});

  const { signOut } = useAuthActions();
  const savePush = useMutation(api.members.savePushSubscription);
  const setNotificationsEnabled = useMutation(api.members.setNotificationsEnabled);
  const myBeacons = useQuery(api.beacons.listMyBeacons);
  const pairIbeacon = useMutation(api.beacons.pairIbeacon);
  const unpairBeacon = useMutation(api.beacons.unpairBeacon);
  const setBeaconLabel = useMutation(api.beacons.setBeaconLabel);
  const pastMeetings = useQuery(api.meetings.getRsvpedMeetingsForCurrentMember);

  useEffect(() => {
    setPreviewImageUrl(null);
  }, [member.profileImageUrl]);

  const displayedProfileImageUrl = previewImageUrl ?? member.profileImageUrl ?? null;

  const handleSignOut = async () => {
    await signOut();
    toast.success('signed out successfully');
  };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
  };

  const enableNotifications = async () => {
    if (!('serviceWorker' in navigator)) {
      toast.error('service worker not supported');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error('notifications were not enabled');
          return;
        }
      }
      const vapid = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY;
      if (!vapid) {
        toast.error('push not configured');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      await savePush({ endpoint: json.endpoint ?? '', keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' } });
      await setNotificationsEnabled({ enabled: true });
      toast.success('notifications enabled');
    } catch {
      toast.error('failed to enable notifications');
    }
  };

  const parseIbeaconFromAdvertisement = (event: any): { uuid: string; major: number; minor: number } | null => {
    try {
      const md: Map<number, DataView> | undefined = event.manufacturerData;
      if (!md || typeof (md as any).get !== 'function') return null;
      const apple = (md as any).get(0x004c) as DataView | undefined;
      if (!apple) return null;
      const bytes = new Uint8Array(apple.buffer, apple.byteOffset, apple.byteLength);
      if (bytes.length < 23) return null;
      if (!(bytes[0] === 0x02 && bytes[1] === 0x15)) return null;
      const uuidBytes = bytes.slice(2, 18);
      const major = (bytes[18] << 8) + bytes[19];
      const minor = (bytes[20] << 8) + bytes[21];
      const hex = [...uuidBytes].map((x) => x.toString(16).padStart(2, '0')).join('');
      const uuid = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
      return { uuid, major, minor };
    } catch {
      return null;
    }
  };

  const startScan = async () => {
    const bluetooth: any = (navigator as any).bluetooth;
    setIsScanning(true);
    setScanError(null);
    setFoundBeacons([]);
    seenKeys.clear();
    try {
      try {
        await bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [] });
      } catch {}
      const scan = await bluetooth.requestLEScan({ acceptAllAdvertisements: true, keepRepeatedDevices: true });
      const onAdv = (event: any) => {
        const ib = parseIbeaconFromAdvertisement(event);
        if (!ib) return;
        const key = `${ib.uuid}:${ib.major}:${ib.minor}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        setFoundBeacons((prev) => [...prev, { ...ib, key, lastSeen: Date.now() }]);
      };
      bluetooth.addEventListener('advertisementreceived', onAdv);
      stopScanRef.stop = () => {
        try {
          bluetooth.removeEventListener('advertisementreceived', onAdv);
          scan.stop?.();
        } catch {}
      };
    } catch {
      setScanError('failed to start BLE scan');
      setIsScanning(false);
    }
  };

  const stopScan = () => {
    try {
      stopScanRef.stop?.();
    } catch {}
    setIsScanning(false);
  };

  const scanAndPair = async () => {
    const bluetooth: any = (navigator as any).bluetooth;
    if (!bluetooth || !bluetooth.requestLEScan) {
      toast.error('web bluetooth scanning not supported');
      return;
    }
    setPairModalOpen(true);
    void startScan();
  };

  const handlePairBeacon = async (beacon: { uuid: string; major: number; minor: number }) => {
    try {
      await pairIbeacon({ uuid: beacon.uuid, major: beacon.major, minor: beacon.minor });
      toast.success('beacon paired');
      stopScan();
      setPairModalOpen(false);
    } catch {
      toast.error('failed to pair beacon');
    }
  };

  const handleRenameBeacon = async (beacon: any) => {
    const label = prompt('rename beacon', beacon.label || '');
    if (label === null) return;
    await setBeaconLabel({ beaconId: beacon._id, label });
    toast.success('beacon renamed');
  };

  const handleUnpairBeacon = async (beacon: any) => {
    if (!confirm('unpair this beacon?')) return;
    await unpairBeacon({ beaconId: beacon._id });
    toast.success('beacon unpaired');
  };

  return (
    <div className="space-y-6">
      <ProfileHeader
        member={member}
        displayedProfileImageUrl={displayedProfileImageUrl}
        onEditToggle={() => setIsEditing(!isEditing)}
        onSignOut={handleSignOut}
        isEditing={isEditing}
      />

      {isEditing && (
        <ProfileEditForm
          member={member}
          displayedProfileImageUrl={displayedProfileImageUrl}
          previewImageUrl={previewImageUrl}
          setPreviewImageUrl={setPreviewImageUrl}
          onClose={() => setIsEditing(false)}
        />
      )}

      <PreferencesSection
        onEnableNotifications={enableNotifications}
        onScanAndPair={scanAndPair}
        myBeacons={myBeacons}
        onRenameBeacon={handleRenameBeacon}
        onUnpairBeacon={handleUnpairBeacon}
      />

      <div className="glass-panel p-8">
        <h2 className="text-xl font-light mb-6">your past meetings</h2>
        <PastMeetingsCalendar meetings={pastMeetings || []} />
      </div>

      <BeaconScanModal
        isOpen={pairModalOpen}
        onClose={() => setPairModalOpen(false)}
        isScanning={isScanning}
        scanError={scanError}
        foundBeacons={foundBeacons}
        onStartScan={startScan}
        onStopScan={stopScan}
        onPairBeacon={handlePairBeacon}
      />
    </div>
  );
}
