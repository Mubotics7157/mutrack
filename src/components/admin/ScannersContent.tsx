import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { type Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Radio,
  Plus,
  MoreVertical,
  RefreshCw,
  Power,
  Trash2,
  MapPin,
  Bluetooth,
  UserPlus,
  X,
} from "lucide-react";
import { MemberWithProfile } from "../../lib/members";
import { Button, Badge, Select } from "../ui";
import { RegisterScannerModal } from "./RegisterScannerModal";

interface ScannersContentProps {
  member: MemberWithProfile;
}

function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return "Never";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ScannersContent({ member }: ScannersContentProps) {
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null);
  const [pairingBeaconId, setPairingBeaconId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  const scanners = useQuery(api.scanners.listScanners) ?? [];
  const unpairedBeacons = useQuery(api.scanners.listUnpairedBeacons) ?? [];
  const members = useQuery(api.members.getAllMembers) ?? [];
  const updateScanner = useMutation(api.scanners.updateScanner);
  const deleteScanner = useMutation(api.scanners.deleteScanner);
  const regenerateApiKey = useMutation(api.scanners.regenerateApiKey);
  const pairBeacon = useMutation(api.scanners.pairUnpairedBeaconToMember);
  const dismissBeacon = useMutation(api.scanners.dismissUnpairedBeacon);

  const handleToggleActive = async (
    scannerId: Id<"scanners">,
    currentlyActive: boolean
  ) => {
    try {
      await updateScanner({ scannerId, isActive: !currentlyActive });
      toast.success(currentlyActive ? "Scanner disabled" : "Scanner enabled");
    } catch {
      toast.error("Failed to update scanner");
    }
    setActionMenuOpen(null);
  };

  const handleDelete = async (scannerId: Id<"scanners">, name: string) => {
    if (!confirm(`Delete scanner "${name}"? This cannot be undone.`)) return;
    try {
      await deleteScanner({ scannerId });
      toast.success("Scanner deleted");
    } catch {
      toast.error("Failed to delete scanner");
    }
    setActionMenuOpen(null);
  };

  const handleRegenerateKey = async (scannerId: Id<"scanners">) => {
    if (
      !confirm(
        "Regenerate API key? The old key will stop working immediately."
      )
    )
      return;
    setRegeneratingKey(scannerId);
    try {
      const result = await regenerateApiKey({ scannerId });
      await navigator.clipboard.writeText(result.apiKey);
      toast.success("New API key copied to clipboard");
    } catch {
      toast.error("Failed to regenerate API key");
    } finally {
      setRegeneratingKey(null);
      setActionMenuOpen(null);
    }
  };

  const handlePairBeacon = async (beaconId: Id<"unpairedBeacons">) => {
    if (!selectedMemberId) {
      toast.error("Please select a member");
      return;
    }
    try {
      await pairBeacon({
        unpairedBeaconId: beaconId,
        memberId: selectedMemberId as Id<"members">,
      });
      toast.success("Beacon paired to member");
      setPairingBeaconId(null);
      setSelectedMemberId("");
    } catch {
      toast.error("Failed to pair beacon");
    }
  };

  const handleDismissBeacon = async (beaconId: Id<"unpairedBeacons">) => {
    try {
      await dismissBeacon({ unpairedBeaconId: beaconId });
      toast.success("Beacon dismissed");
    } catch {
      toast.error("Failed to dismiss beacon");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-text-primary">
              Scanner Devices
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Register and manage BLE scanner devices for automatic attendance
              tracking
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => setRegisterModalOpen(true)}
          >
            Register Scanner
          </Button>
        </div>
      </div>

      {/* Scanner List */}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        {scanners.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
              <Radio size={24} className="text-text-muted" />
            </div>
            <p className="text-text-muted mb-1">No scanners registered</p>
            <p className="text-sm text-text-dim">
              Register a scanner device to enable automatic beacon-based
              attendance
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {scanners.map((scanner) => (
              <div
                key={scanner._id}
                className="flex flex-col md:flex-row md:items-center gap-4 p-4"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Status Indicator */}
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      scanner.isOnline && scanner.isActive
                        ? "bg-accent-success/10"
                        : scanner.isActive
                          ? "bg-accent-warning/10"
                          : "bg-bg-tertiary"
                    }`}
                  >
                    <Radio
                      size={20}
                      className={
                        scanner.isOnline && scanner.isActive
                          ? "text-accent-success"
                          : scanner.isActive
                            ? "text-accent-warning"
                            : "text-text-dim"
                      }
                    />
                  </div>

                  {/* Scanner Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-text-primary truncate">
                        {scanner.name}
                      </h4>
                      {scanner.isOnline && scanner.isActive ? (
                        <Badge variant="success" size="sm">
                          Online
                        </Badge>
                      ) : scanner.isActive ? (
                        <Badge variant="warning" size="sm">
                          Offline
                        </Badge>
                      ) : (
                        <Badge variant="default" size="sm">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {scanner.location && (
                        <span className="flex items-center gap-1 text-sm text-text-muted">
                          <MapPin size={12} />
                          {scanner.location}
                        </span>
                      )}
                      <span className="text-xs text-text-dim">
                        Last seen: {formatRelativeTime(scanner.lastSeenAt)}
                      </span>
                    </div>
                    <code className="text-xs text-text-dim font-mono mt-1 block">
                      {scanner.apiKeyPrefix}...
                    </code>
                  </div>
                </div>

                {/* Actions */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<MoreVertical size={16} />}
                    onClick={() =>
                      setActionMenuOpen(
                        actionMenuOpen === scanner._id ? null : scanner._id
                      )
                    }
                  />
                  {actionMenuOpen === scanner._id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setActionMenuOpen(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-bg-secondary border border-border rounded-lg shadow-lg z-20 py-1">
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-hover flex items-center gap-2"
                          onClick={() =>
                            handleRegenerateKey(scanner._id)
                          }
                          disabled={regeneratingKey === scanner._id}
                        >
                          <RefreshCw
                            size={14}
                            className={
                              regeneratingKey === scanner._id
                                ? "animate-spin"
                                : ""
                            }
                          />
                          {regeneratingKey === scanner._id
                            ? "Regenerating..."
                            : "Regenerate API Key"}
                        </button>
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-hover flex items-center gap-2"
                          onClick={() =>
                            handleToggleActive(scanner._id, scanner.isActive)
                          }
                        >
                          <Power size={14} />
                          {scanner.isActive ? "Disable" : "Enable"}
                        </button>
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-accent-error hover:bg-bg-hover flex items-center gap-2"
                          onClick={() =>
                            handleDelete(scanner._id, scanner.name)
                          }
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unpaired Beacons */}
      {unpairedBeacons.length > 0 && (
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Bluetooth size={16} />
              Detected Beacons
              <Badge variant="accent" size="sm">{unpairedBeacons.length}</Badge>
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Beacons seen by scanners that aren't paired to any member yet
            </p>
          </div>
          <div className="divide-y divide-border-subtle">
            {unpairedBeacons.map((beacon) => (
              <div
                key={beacon._id}
                className="p-4"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${beacon.isRecent ? 'bg-accent-success animate-pulse' : 'bg-text-dim'}`} />
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono text-text-primary block truncate">
                        {beacon.uuid}
                      </code>
                      <div className="text-xs text-text-muted mt-0.5">
                        Major: {beacon.major} · Minor: {beacon.minor} · Seen {beacon.sightingCount}x · Last: {formatRelativeTime(beacon.lastSeenAt)}
                      </div>
                    </div>
                  </div>

                  {pairingBeaconId === beacon._id ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedMemberId}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                        options={[
                          { value: "", label: "Select member..." },
                          ...members.map((m) => ({ value: m._id, label: m.name })),
                        ]}
                        className="w-48"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handlePairBeacon(beacon._id)}
                        disabled={!selectedMemberId}
                      >
                        Pair
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<X size={14} />}
                        onClick={() => {
                          setPairingBeaconId(null);
                          setSelectedMemberId("");
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<UserPlus size={14} />}
                        onClick={() => setPairingBeaconId(beacon._id)}
                      >
                        Pair to Member
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<X size={14} />}
                        onClick={() => handleDismissBeacon(beacon._id)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4">
        <h4 className="text-sm font-medium text-text-primary mb-2">
          Setup Instructions
        </h4>
        <ol className="text-sm text-text-muted space-y-1 list-decimal list-inside">
          <li>Register a scanner to get an API key</li>
          <li>Install the scanner app on your Raspberry Pi or Mac</li>
          <li>Configure the app with the API key</li>
          <li>Beacons detected by the scanner will appear above for pairing</li>
          <li>Pair each beacon to a member to enable attendance tracking</li>
        </ol>
      </div>

      <RegisterScannerModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
      />
    </div>
  );
}
