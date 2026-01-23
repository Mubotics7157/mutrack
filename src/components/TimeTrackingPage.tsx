import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { MemberWithProfile } from '../lib/members';
import {
  ScannerControls,
  ScannerStatus,
  ActiveAttendeesList,
  AssignBeaconModal,
  parseIbeaconFromAdvertisement,
  ScanState,
  canScan,
} from './time-tracking';

interface TimeTrackingPageProps {
  member: MemberWithProfile;
}

export function TimeTrackingPage({ member }: TimeTrackingPageProps) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<Id<'meetings'> | ''>('');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  const lastAdvRef = useRef<number>(0);
  const scanKeepAliveRef = useRef<number | undefined>(undefined);
  const prewarmedRef = useRef<boolean>(false);
  const wakeLockRef = useRef<any>(null);
  const ephemeralLastSeenRef = useRef<Record<string, number>>({});
  const currentScanRef = useRef<any>(null);

  const meetings = useQuery(api.meetings.getMeetings) || [];
  const activeSessions = useQuery(
    api.attendance.getActiveSessionsForMeeting,
    selectedMeetingId ? { meetingId: selectedMeetingId } : 'skip'
  );
  const durations =
    useQuery(
      api.attendance.getMeetingDurationsSimple,
      selectedMeetingId ? { meetingId: selectedMeetingId } : 'skip'
    ) || [];
  const beaconsAdmin = useQuery(api.beacons.listAllForAdmin) || [];
  const handleSighting = useMutation(api.attendance.handleIbeaconSighting);
  const adminPair = useMutation(api.beacons.adminPairIbeaconToMember);
  const allMembers =
    (useQuery(api.members.getAllMembers) as MemberWithProfile[] | undefined) || [];

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const isRunning = useMemo(() => {
    if (scanState !== 'scanning') return false;
    const handleActive = !!(
      currentScanRef.current &&
      (currentScanRef.current.active === undefined ? true : currentScanRef.current.active === true)
    );
    const hasRecentAdv = lastAdvRef.current ? nowMs - lastAdvRef.current < 120000 : false;
    return handleActive && hasRecentAdv;
  }, [scanState, nowMs]);

  const acquireWakeLock = async () => {
    try {
      if ((navigator as any).wakeLock && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current?.addEventListener?.('release', () => {
          wakeLockRef.current = null;
          setWakeLockActive(false);
        });
      }
    } catch {}
  };

  const releaseWakeLock = async () => {
    try {
      await wakeLockRef.current?.release?.();
    } catch {}
    wakeLockRef.current = null;
    setWakeLockActive(false);
  };

  const doStart = async (allowPrewarm: boolean): Promise<() => void> => {
    if (allowPrewarm && !prewarmedRef.current) {
      try {
        await (navigator as any).permissions?.query?.({ name: 'bluetooth-le' as any });
      } catch {}
      try {
        await (navigator as any).bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [] });
        prewarmedRef.current = true;
      } catch {}
    }

    const scan = await (navigator as any).bluetooth.requestLEScan({
      acceptAllAdvertisements: true,
      keepRepeatedDevices: true,
    });
    currentScanRef.current = scan;
    lastAdvRef.current = Date.now();

    const onAdv = async (event: any) => {
      try {
        lastAdvRef.current = Date.now();
        const ibeacon = parseIbeaconFromAdvertisement(event);
        if (!ibeacon) return;

        const key = `${ibeacon.uuid}:${ibeacon.major}:${ibeacon.minor}`;
        (window as any).__tt_lastPush = (window as any).__tt_lastPush || {};
        const last: Record<string, number> = (window as any).__tt_lastPush;
        const now = Date.now();

        const owner = beaconsAdmin.find((b: any) =>
          b.key.endsWith(`${ibeacon.uuid.toLowerCase()}:${ibeacon.major}:${ibeacon.minor}`)
        );
        if (owner) ephemeralLastSeenRef.current[owner.ownerMemberId] = now;

        if (!last[key] || now - last[key] >= 60000) {
          last[key] = now;
          await handleSighting({
            meetingId: selectedMeetingId as Id<'meetings'>,
            uuid: ibeacon.uuid,
            major: ibeacon.major,
            minor: ibeacon.minor,
          });
        }
      } catch (e) {
        console.error('Error processing iBeacon:', e);
      }
    };

    (navigator as any).bluetooth.addEventListener('advertisementreceived', onAdv);

    return () => {
      try {
        (navigator as any).bluetooth.removeEventListener('advertisementreceived', onAdv);
        (scan as any).stop?.();
      } catch {}
      currentScanRef.current = null;
    };
  };

  const startScan = async () => {
    if (!selectedMeetingId) {
      toast.error('select a meeting to start scanning');
      return;
    }
    if (!canScan) {
      setScanState('error');
      setErrorText('web bluetooth scanning not supported in this browser');
      return;
    }

    try {
      setScanState('scanning');
      setErrorText(null);

      await acquireWakeLock();
      const stop = await doStart(true);

      (window as any).__tt_stopScan = () => {
        try {
          if (scanKeepAliveRef.current !== undefined) {
            clearInterval(scanKeepAliveRef.current);
            scanKeepAliveRef.current = undefined;
          }
          stop();
          void releaseWakeLock();
        } catch {}
      };

      if (scanKeepAliveRef.current !== undefined) clearInterval(scanKeepAliveRef.current);
      scanKeepAliveRef.current = window.setInterval(async () => {
        const staleMs = Date.now() - lastAdvRef.current;
        if (staleMs > 120000 && scanState === 'scanning') {
          try {
            stop();
          } catch {}
          try {
            const newStop = await doStart(false);
            (window as any).__tt_stopScan = () => {
              try {
                if (scanKeepAliveRef.current !== undefined) {
                  clearInterval(scanKeepAliveRef.current);
                  scanKeepAliveRef.current = undefined;
                }
                newStop();
              } catch {}
            };
          } catch {}
        }
      }, 45000);

      const onVis = async () => {
        if (document.visibilityState === 'visible' && scanState === 'scanning') {
          lastAdvRef.current = Date.now();
          if (!wakeLockRef.current) await acquireWakeLock();
        }
      };
      document.addEventListener('visibilitychange', onVis);

      const prevStop = (window as any).__tt_stopScan;
      (window as any).__tt_stopScan = () => {
        try {
          document.removeEventListener('visibilitychange', onVis);
        } catch {}
        prevStop?.();
      };

      toast.success('scanning started');
    } catch (e) {
      setScanState('error');
      let errorMessage = e instanceof Error ? e.message : 'failed to start scan';
      if (/experimental|not supported|not implemented/i.test(errorMessage)) {
        errorMessage += ' — enable Web Bluetooth scanning (HTTPS/localhost, Bluetooth on, and Experimental Web Platform features if required).';
      }
      setErrorText(errorMessage);
    }
  };

  const stopScan = () => {
    try {
      (window as any).__tt_stopScan?.();
    } catch {}
    setScanState('idle');
  };

  useEffect(() => {
    return () => {
      try {
        (window as any).__tt_stopScan?.();
      } catch {}
    };
  }, []);

  const canOperate = member.role === 'admin' || member.role === 'lead';

  const handleAssign = (beacon: { uuid: string; major: number; minor: number }, memberId: string) => {
    void adminPair({
      uuid: beacon.uuid,
      major: beacon.major,
      minor: beacon.minor,
      memberId: memberId as Id<'members'>,
    });
    const memberName = allMembers.find((m) => m._id === memberId)?.name || memberId;
    toast.success(`Beacon ${beacon.uuid} assigned to ${memberName}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="space-y-4 pt-2">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Time Tracking</h1>
          <p className="text-sm text-text-muted mt-1">
            Scan iBeacon tags during meetings to track attendance automatically
          </p>
        </div>
      </section>

      {!canOperate && (
        <div className="bg-accent-error/10 border border-accent-error/30 rounded-xl p-4">
          <p className="text-accent-error text-sm font-medium">Only admins or leads can run the scanner.</p>
        </div>
      )}

      {/* Scanner Controls */}
      <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle">
          <h2 className="text-lg font-semibold text-text-primary">Scanner</h2>
        </div>
        <div className="p-6 space-y-4">
          <ScannerControls
            selectedMeetingId={selectedMeetingId}
            onMeetingChange={setSelectedMeetingId}
            meetings={meetings as any}
            scanState={scanState}
            canOperate={canOperate}
            onStartScan={startScan}
            onStopScan={stopScan}
          />
          <ScannerStatus
            scanState={scanState}
            isRunning={isRunning}
            lastAdvRef={lastAdvRef.current}
            nowMs={nowMs}
            activeCount={activeSessions?.length ?? 0}
            wakeLockActive={wakeLockActive}
            errorText={errorText}
          />
        </div>
      </section>

      {/* Active Attendees */}
      <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Active Attendees</h2>
          {canOperate && (
            <button
              className="text-sm text-accent hover:text-accent/80 transition-colors font-medium"
              onClick={() => setAssignOpen(true)}
            >
              Assign Beacon
            </button>
          )}
        </div>
        <div className="p-6">
          <ActiveAttendeesList
            meetingId={selectedMeetingId}
            durations={durations as any}
            ephemeralLastSeen={ephemeralLastSeenRef.current}
          />
        </div>
      </section>

      <AssignBeaconModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        members={allMembers}
        onAssign={handleAssign}
      />
    </div>
  );
}
