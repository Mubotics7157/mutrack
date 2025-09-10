import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Modal } from "./Modal";

interface TimeTrackingPageProps {
  member: Doc<"members">;
}

type ScanState = "idle" | "scanning" | "error";

export function TimeTrackingPage({ member }: TimeTrackingPageProps) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<
    Id<"meetings"> | ""
  >("");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  const meetings = useQuery(api.meetings.getMeetings) || [];
  const activeSessions = useQuery(
    api.attendance.getActiveSessionsForMeeting,
    selectedMeetingId ? { meetingId: selectedMeetingId } : "skip"
  );
  const durations =
    useQuery(
      api.attendance.getMeetingDurationsSimple,
      selectedMeetingId ? { meetingId: selectedMeetingId } : "skip"
    ) || [];
  const handleSighting = useMutation(api.attendance.handleIbeaconSighting);
  const closeExpired = useMutation(api.attendance.closeExpiredSessions);
  const adminPair = useMutation(api.beacons.adminPairIbeaconToMember);
  const allMembers = useQuery(api.members.getAllMembers) || [];
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignScanning, setAssignScanning] = useState(false);
  const [assignScanError, setAssignScanError] = useState<string | null>(null);
  const [assignFound, setAssignFound] = useState<
    Array<{ uuid: string; major: number; minor: number; key: string }>
  >([]);
  const assignSeen = useRef<Set<string>>(new Set());
  const stopAssignRef = useRef<() => void | undefined>(undefined);
  const lastAdvRef = useRef<number>(0);
  const scanKeepAliveRef = useRef<number | undefined>(undefined);
  const prewarmedRef = useRef<boolean>(false);

  const canScan =
    typeof navigator !== "undefined" &&
    (navigator as any).bluetooth &&
    (navigator as any).bluetooth?.requestLEScan;

  // Periodic cleanup of expired sessions while page is open
  // Disabled: we now keep sessions open and compute duration from earliest start to latest seen.
  // useEffect(() => {
  //   if (!selectedMeetingId) return;
  //   const id = setInterval(() => {
  //     void closeExpired({ meetingId: selectedMeetingId as Id<"meetings"> });
  //   }, 60 * 1000);
  //   return () => clearInterval(id);
  // }, [selectedMeetingId, closeExpired]);

  const startScan = async () => {
    if (!selectedMeetingId) {
      toast.error("select a meeting to start scanning");
      return;
    }
    if (!canScan) {
      setScanState("error");
      setErrorText("web bluetooth scanning not supported in this browser");
      return;
    }
    try {
      setScanState("scanning");
      setErrorText(null);
      console.log("Starting BLE scan...");

      const doStart = async (allowPrewarm: boolean): Promise<() => void> => {
        if (allowPrewarm && !prewarmedRef.current) {
          try {
            await (navigator as any).permissions?.query?.({
              name: "bluetooth-le" as any,
            });
          } catch {}
          try {
            await (navigator as any).bluetooth.requestDevice({
              acceptAllDevices: true,
              optionalServices: [],
            });
            prewarmedRef.current = true;
          } catch {}
        }

        const scan = await (navigator as any).bluetooth.requestLEScan({
          acceptAllAdvertisements: true,
          keepRepeatedDevices: true,
        });

        console.log(
          "Scan started successfully, listening for advertisements..."
        );
        lastAdvRef.current = Date.now();

        const onAdv = async (event: any) => {
          try {
            lastAdvRef.current = Date.now();
            const ibeacon = parseIbeaconFromAdvertisement(event);
            if (!ibeacon) return;
            await handleSighting({
              meetingId: selectedMeetingId as Id<"meetings">,
              uuid: ibeacon.uuid,
              major: ibeacon.major,
              minor: ibeacon.minor,
            });
          } catch (e) {
            console.error("Error processing iBeacon:", e);
          }
        };

        (navigator as any).bluetooth.addEventListener(
          "advertisementreceived",
          onAdv
        );

        const stop = () => {
          try {
            (navigator as any).bluetooth.removeEventListener(
              "advertisementreceived",
              onAdv
            );
            (scan as any).stop?.();
          } catch {}
        };
        return stop;
      };

      const stop = await doStart(true);
      (window as any).__tt_stopScan = () => {
        try {
          if (scanKeepAliveRef.current !== undefined) {
            clearInterval(scanKeepAliveRef.current);
            scanKeepAliveRef.current = undefined;
          }
          stop();
        } catch {}
      };

      if (scanKeepAliveRef.current !== undefined)
        clearInterval(scanKeepAliveRef.current);
      scanKeepAliveRef.current = window.setInterval(async () => {
        const staleMs = Date.now() - lastAdvRef.current;
        if (staleMs > 120000 && scanState === "scanning") {
          console.log("Restarting BLE scan due to inactivity");
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
          } catch (err) {
            console.warn("Failed to restart scan", err);
          }
        }
      }, 45000);

      const onVis = async () => {
        if (
          document.visibilityState === "visible" &&
          scanState === "scanning"
        ) {
          lastAdvRef.current = Date.now();
        }
      };
      document.addEventListener("visibilitychange", onVis);
      const prevStop = (window as any).__tt_stopScan;
      (window as any).__tt_stopScan = () => {
        try {
          document.removeEventListener("visibilitychange", onVis);
        } catch {}
        prevStop?.();
      };

      toast.success("scanning started");
    } catch (e) {
      console.error("Failed to start scan:", e);
      setScanState("error");
      let errorMessage =
        e instanceof Error ? e.message : "failed to start scan";
      if (
        typeof errorMessage === "string" &&
        /experimental|not supported|not implemented/i.test(errorMessage)
      ) {
        errorMessage +=
          " — enable Web Bluetooth scanning (HTTPS/localhost, Bluetooth on, and Experimental Web Platform features if required).";
      }
      setErrorText(errorMessage);
    }
  };

  const stopScan = () => {
    try {
      (window as any).__tt_stopScan?.();
    } catch {}
    setScanState("idle");
  };

  useEffect(() => {
    return () => {
      try {
        (window as any).__tt_stopScan?.();
      } catch {}
    };
  }, []);

  const canOperate = member.role === "admin" || member.role === "lead";

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h2 className="text-2xl font-light mb-4">time tracking</h2>
        <p className="text-text-muted text-sm">
          use this page to scan iBeacon tags during a meeting. attendees with
          paired beacons are tracked automatically.
        </p>
      </div>

      {!canOperate && (
        <div className="glass-panel p-4">
          <p className="text-error-red text-sm">
            only admins or leads can run the scanner.
          </p>
        </div>
      )}

      <div className="glass-panel p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block mb-2 text-sm text-text-muted">
              meeting
            </label>
            <select
              className="input-modern"
              value={selectedMeetingId || ""}
              onChange={(e) =>
                setSelectedMeetingId((e.target.value || "") as any)
              }
            >
              <option value="">select meeting</option>
              {meetings.map((m: any) => (
                <option key={m._id} value={m._id}>
                  {new Date(m.date).toLocaleDateString()} {m.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              disabled={!canOperate || scanState === "scanning"}
              onClick={startScan}
              className="btn-modern btn-primary flex-1"
            >
              start scanning
            </button>
            <button
              disabled={scanState !== "scanning"}
              onClick={stopScan}
              className="btn-modern flex-1"
            >
              stop
            </button>
          </div>

          {!canScan && (
            <div className="text-sm text-error-red">
              web bluetooth scanning not supported in this browser
            </div>
          )}
        </div>

        {scanState === "error" && (
          <div className="text-sm text-error-red">{errorText}</div>
        )}
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-xl font-light mb-4">active attendees</h3>
        <ActiveAttendeesList
          meetingId={selectedMeetingId as any}
          durations={durations as any}
        />
        {(member.role === "admin" || member.role === "lead") && (
          <div className="mt-4">
            <button
              className="btn-modern"
              onClick={() => {
                setAssignOpen(true);
                void startAssignScanWrapper(
                  setAssignScanning,
                  setAssignScanError,
                  setAssignFound,
                  assignSeen,
                  stopAssignRef
                );
              }}
            >
              assign beacon to member
            </button>
          </div>
        )}
      </div>

      <AssignBeaconModal
        open={assignOpen}
        onClose={() => {
          setAssignOpen(false);
          setAssignScanning(false);
          setAssignScanError(null);
          setAssignFound([]);
          stopAssignRef.current?.();
        }}
        onRescan={() => {
          setAssignScanning(true);
          setAssignScanError(null);
          setAssignFound([]);
          assignSeen.current.clear();
          void startAssignScanWrapper(
            setAssignScanning,
            setAssignScanError,
            setAssignFound,
            assignSeen,
            stopAssignRef
          );
        }}
        scanning={assignScanning}
        error={assignScanError}
        beacons={assignFound}
        members={allMembers}
        onAssign={(beacon, memberId) => {
          void adminPair({
            uuid: beacon.uuid,
            major: beacon.major,
            minor: beacon.minor,
            memberId: memberId as Id<"members">,
          });
          toast.success(
            `Beacon ${beacon.uuid} assigned to ${allMembers.find((m) => m._id === memberId)?.name || memberId}`
          );
          setAssignOpen(false);
          setAssignScanning(false);
          setAssignScanError(null);
          setAssignFound([]);
          stopAssignRef.current?.();
        }}
      />
    </div>
  );
}

async function startAssignScanImpl(
  setAssignScanning: (b: boolean) => void,
  setAssignScanError: (s: string | null) => void,
  setAssignFound: (updater: any) => void,
  assignSeen: React.MutableRefObject<Set<string>>,
  stopAssignRef: React.MutableRefObject<(() => void) | undefined>
) {
  const bluetooth: any = (navigator as any).bluetooth;
  setAssignScanning(true);
  setAssignScanError(null);
  setAssignFound([]);
  assignSeen.current.clear();
  try {
    try {
      await (navigator as any).permissions?.query?.({
        name: "bluetooth-le" as any,
      });
    } catch {}
    try {
      await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [],
      });
    } catch {}
    const scan = await bluetooth.requestLEScan({
      acceptAllAdvertisements: true,
      keepRepeatedDevices: true,
    });
    const onAdv = (event: any) => {
      const ib = parseIbeaconFromAdvertisement(event);
      if (!ib) return;
      const key = `${ib.uuid}:${ib.major}:${ib.minor}`;
      if (assignSeen.current.has(key)) return;
      assignSeen.current.add(key);
      setAssignFound((prev: Array<any>) => [...prev, { ...ib, key }]);
    };
    bluetooth.addEventListener("advertisementreceived", onAdv);
    stopAssignRef.current = () => {
      try {
        bluetooth.removeEventListener("advertisementreceived", onAdv);
        scan.stop?.();
      } catch {}
    };
  } catch (e) {
    setAssignScanError("failed to start scan");
    setAssignScanning(false);
  }
}

function AssignBeaconModal({
  open,
  onClose,
  onRescan,
  scanning,
  error,
  beacons,
  members,
  onAssign,
}: {
  open: boolean;
  onClose: () => void;
  onRescan: () => void;
  scanning: boolean;
  error: string | null;
  beacons: Array<{ uuid: string; major: number; minor: number; key: string }>;
  members: Array<any>;
  onAssign: (
    b: { uuid: string; major: number; minor: number },
    memberId: string
  ) => void;
}) {
  const [memberId, setMemberId] = useState<string>("");
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="assign beacon to member"
      maxWidthClassName="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block mb-2 text-sm text-text-muted">member</label>
            <select
              className="input-modern"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            >
              <option value="">select member</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn-modern" onClick={onRescan}>
              {scanning ? "stop" : "rescan"}
            </button>
          </div>
          <div className="text-sm text-text-muted">
            {scanning ? "scanning for beacons..." : error || "stopped"}
          </div>
        </div>
        <div className="space-y-2">
          {beacons.length === 0 && (
            <div className="text-sm text-text-muted">
              no beacons yet — keep the tag close or rescan
            </div>
          )}
          {beacons.map((b) => (
            <div
              key={b.key}
              className="flex items-center justify-between p-3 bg-glass border border-border-glass rounded-lg"
            >
              <div>
                <div className="font-medium">{b.uuid}</div>
                <div className="text-xs text-text-dim">
                  major: {b.major} · minor: {b.minor}
                </div>
              </div>
              <button
                className="btn-modern btn-primary"
                disabled={!memberId}
                onClick={() => onAssign(b, memberId)}
              >
                assign
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function startAssignScanWrapper(
  setAssignScanning: (b: boolean) => void,
  setAssignScanError: (s: string | null) => void,
  setAssignFound: (updater: any) => void,
  assignSeen: React.MutableRefObject<Set<string>>,
  stopAssignRef: React.MutableRefObject<(() => void) | undefined>
) {
  void startAssignScanImpl(
    setAssignScanning,
    setAssignScanError,
    setAssignFound,
    assignSeen,
    stopAssignRef
  );
}

function ActiveAttendeesList({
  meetingId,
  durations,
}: {
  meetingId: Id<"meetings"> | "";
  durations: Array<{
    memberId: string;
    earliestStart: number;
    latestEnd: number;
    durationMs: number;
  }>;
}) {
  const sessions = useQuery(
    api.attendance.getActiveSessionsForMeeting,
    meetingId ? { meetingId: meetingId as Id<"meetings"> } : "skip"
  );
  const [membersById, setMembersById] = useState<
    Record<string, Doc<"members">>
  >({});
  const members = useQuery(api.members.getAllMembers) || [];

  useEffect(() => {
    const map: Record<string, Doc<"members">> = {};
    for (const m of members) map[m._id] = m;
    setMembersById(map);
  }, [members]);

  if (!meetingId)
    return <p className="text-text-muted text-sm">select a meeting</p>;
  if (sessions === undefined)
    return <p className="text-text-muted">loading...</p>;
  if (sessions.length === 0)
    return <p className="text-text-muted">no active attendees yet</p>;

  return (
    <div className="space-y-2">
      {sessions.map((s: any) => {
        const m = membersById[s.memberId];
        const d = durations.find((x) => x.memberId === s.memberId);
        return (
          <div
            key={s._id}
            className="flex items-center justify-between p-3 bg-glass border border-border-glass rounded-xl"
          >
            <div>
              <div className="font-medium">
                {m ? m.name : s.memberId.slice(-6)}
              </div>
              <div className="text-xs text-text-muted">
                since {new Date(s.startTime).toLocaleTimeString()}
              </div>
              {d && (
                <div className="text-xs text-accent-green mt-1">
                  total: {(d.durationMs / (1000 * 60)).toFixed(0)} mins
                </div>
              )}
            </div>
            <div className="text-xs text-text-dim">
              last seen {Math.round((Date.now() - s.lastSeenAt) / 1000)}s ago
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Parse iBeacon from Web Bluetooth advertisement event (Chrome experimental)
function parseIbeaconFromAdvertisement(
  event: any
): { uuid: string; major: number; minor: number } | null {
  try {
    // event.manufacturerData is a Map<number, DataView> where Apple company ID is 0x004C
    const md: Map<number, DataView> | undefined = event.manufacturerData;
    if (!md || typeof md.get !== "function") return null;
    const apple = (md as any).get(0x004c) as DataView | undefined;
    if (!apple) return null;
    // iBeacon layout after 0x004C company ID:
    // Byte 0-1: Beacon Type 0x02 0x15, next 16 UUID, next 2 Major, next 2 Minor, next 1 TxPower
    const bytes = new Uint8Array(
      apple.buffer,
      apple.byteOffset,
      apple.byteLength
    );
    if (bytes.length < 23) return null;
    if (!(bytes[0] === 0x02 && bytes[1] === 0x15)) return null;
    const uuidBytes = bytes.slice(2, 18);
    const major = (bytes[18] << 8) + bytes[19];
    const minor = (bytes[20] << 8) + bytes[21];
    const uuid = bytesToUuid(uuidBytes);
    return { uuid, major, minor };
  } catch {
    return null;
  }
}

function bytesToUuid(b: Uint8Array): string {
  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return (
    hex.substring(0, 8) +
    "-" +
    hex.substring(8, 12) +
    "-" +
    hex.substring(12, 16) +
    "-" +
    hex.substring(16, 20) +
    "-" +
    hex.substring(20)
  );
}
