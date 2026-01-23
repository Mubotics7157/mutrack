import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { Modal } from "../Modal";
import { Button, Input } from "../ui";

interface RegisterScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterScannerModal({
  isOpen,
  onClose,
}: RegisterScannerModalProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const registerScanner = useMutation(api.scanners.registerScanner);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Scanner name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerScanner({
        name: name.trim(),
        location: location.trim() || undefined,
      });
      setApiKey(result.apiKey);
      toast.success("Scanner registered");
    } catch (err) {
      toast.error("Failed to register scanner");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setName("");
    setLocation("");
    setApiKey(null);
    setCopied(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Register Scanner" size="md">
      {apiKey ? (
        <div className="space-y-4">
          <div className="p-4 bg-accent-success/10 border border-accent-success/30 rounded-lg">
            <p className="text-sm text-accent-success font-medium mb-2">
              Scanner registered successfully!
            </p>
            <p className="text-sm text-text-muted">
              Copy your API key now. It will not be shown again.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              API Key
            </label>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-bg-tertiary border border-border rounded-lg text-sm font-mono text-text-primary break-all">
                {apiKey}
              </code>
              <Button
                variant="secondary"
                onClick={handleCopy}
                icon={copied ? <Check size={16} /> : <Copy size={16} />}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="p-4 bg-accent-warning/10 border border-accent-warning/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-accent-warning shrink-0 mt-0.5" />
              <p className="text-sm text-text-muted">
                Store this key securely in your scanner's config file. You cannot retrieve it later.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Scanner Name <span className="text-accent-error">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Lab Room Scanner"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Location <span className="text-text-muted">(optional)</span>
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Building A, Room 101"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Registering..." : "Register Scanner"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
