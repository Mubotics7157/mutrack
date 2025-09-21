import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal } from "../Modal";
import { VendorAutocomplete } from "./VendorAutocomplete";

type OrderWizardStep = "select" | "details" | "review";

type PurchaseRequest = {
  _id: string;
  title: string;
  status: string;
  estimatedCost: number;
  quantity?: number;
  vendorName?: string;
  requestedAt?: number;
};

interface OrderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  approvedRequests: PurchaseRequest[];
  ensureVendor: (args: { name: string }) => Promise<string>;
  createOrder: (args: {
    requestIds: string[];
    vendor: string;
    cartLink?: string;
    totalCost: number;
    notes?: string;
  }) => Promise<void>;
}

const INITIAL_FORM = {
  vendor: "",
  notes: "",
  cartLink: "",
  totalCost: "",
};

export function PurchaseOrderWizard({
  isOpen,
  onClose,
  approvedRequests,
  ensureVendor,
  createOrder,
}: OrderWizardProps) {
  const [wizardStep, setWizardStep] = useState<OrderWizardStep>("select");
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendorTouched, setVendorTouched] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      resetWizard();
    }
  }, [isOpen]);

  const selectedRequests = useMemo(
    () =>
      approvedRequests.filter((request) =>
        selectedRequestIds.includes(request._id)
      ),
    [approvedRequests, selectedRequestIds]
  );

  const selectedTotal = useMemo(
    () =>
      selectedRequests.reduce((sum, request) => {
        const quantity = request.quantity ?? 1;
        return sum + request.estimatedCost * quantity;
      }, 0),
    [selectedRequests]
  );

  const vendorQuickPicks = useMemo(() => {
    const unique = new Set<string>();
    approvedRequests.forEach((request) => {
      if (request.vendorName) {
        unique.add(request.vendorName);
      }
    });
    return Array.from(unique).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [approvedRequests]);

  const inferredVendor = selectedRequests[0]?.vendorName || "";

  useEffect(() => {
    if (!vendorTouched) {
      setForm((prev) => ({ ...prev, vendor: inferredVendor }));
    }
  }, [inferredVendor, vendorTouched]);

  useEffect(() => {
    if (wizardStep !== "review") return;
    if (!form.totalCost && selectedTotal > 0) {
      setForm((prev) => ({ ...prev, totalCost: selectedTotal.toFixed(2) }));
    }
  }, [wizardStep, selectedTotal, form.totalCost]);

  const steps: Array<{ id: OrderWizardStep; label: string }> = [
    { id: "select", label: "line items" },
    { id: "details", label: "details" },
    { id: "review", label: "review" },
  ];
  const currentWizardIndex = steps.findIndex((step) => step.id === wizardStep);

  const toggleSelection = (requestId: string, checked: boolean) => {
    setSelectedRequestIds((prev) => {
      if (checked) {
        if (prev.includes(requestId)) return prev;
        return [...prev, requestId];
      }
      return prev.filter((id) => id !== requestId);
    });
  };

  const resetWizard = () => {
    setWizardStep("select");
    setSelectedRequestIds([]);
    setForm(INITIAL_FORM);
    setIsSubmitting(false);
    setVendorTouched(false);
  };

  const handleClose = () => {
    onClose();
    resetWizard();
  };

  const canAdvanceFromSelect = selectedRequestIds.length > 0;
  const canAdvanceFromDetails = form.vendor.trim().length > 0;

  const handleNext = () => {
    if (wizardStep === "select") {
      if (!canAdvanceFromSelect) {
        toast.error("select at least one approved request");
        return;
      }
      setWizardStep("details");
      return;
    }

    if (wizardStep === "details") {
      if (!canAdvanceFromDetails) {
        toast.error("enter a vendor to continue");
        return;
      }
      if (!form.totalCost && selectedTotal > 0) {
        setForm((prev) => ({ ...prev, totalCost: selectedTotal.toFixed(2) }));
      }
      setWizardStep("review");
    }
  };

  const handleBack = () => {
    if (wizardStep === "select") {
      handleClose();
      return;
    }

    if (wizardStep === "details") {
      setWizardStep("select");
      return;
    }

    setWizardStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (wizardStep !== "review") {
      handleNext();
      return;
    }

    if (selectedRequestIds.length === 0) {
      toast.error("select at least one approved request");
      setWizardStep("select");
      return;
    }

    const vendorName = form.vendor.trim();
    if (!vendorName) {
      toast.error("vendor is required");
      setWizardStep("details");
      return;
    }

    const parsedTotal = parseFloat(form.totalCost || "");
    const fallbackTotal = selectedTotal;
    const totalCostToSend = Number.isFinite(parsedTotal)
      ? parsedTotal
      : fallbackTotal;

    if (!Number.isFinite(totalCostToSend) || totalCostToSend <= 0) {
      toast.error("enter a valid total before placing the order");
      return;
    }

    setIsSubmitting(true);

    try {
      await ensureVendor({ name: vendorName });
      await createOrder({
        requestIds: selectedRequestIds,
        vendor: vendorName,
        cartLink: form.cartLink.trim() || undefined,
        totalCost: totalCostToSend,
        notes: form.notes.trim() || undefined,
      });
      toast.success("purchase order created");
      handleClose();
    } catch (error) {
      toast.error("failed to create order");
      setIsSubmitting(false);
    }
  };

  const sortedApprovedRequests = useMemo(
    () =>
      [...approvedRequests].sort((a, b) => {
        const vendorA = (a.vendorName || "").toLowerCase();
        const vendorB = (b.vendorName || "").toLowerCase();
        if (vendorA === vendorB) {
          return (b.requestedAt || 0) - (a.requestedAt || 0);
        }
        return vendorA.localeCompare(vendorB);
      }),
    [approvedRequests]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="create purchase order"
      maxWidthClassName="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border-glass bg-glass px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {steps.map((step, index) => {
              const isActive = step.id === wizardStep;
              const isComplete = index < currentWizardIndex;
              return (
                <div
                  key={step.id}
                  className="flex items-center gap-2 text-sm text-text-muted"
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-mono transition-colors ${
                      isActive
                        ? "border-sunset-orange text-sunset-orange"
                        : isComplete
                        ? "border-accent-green/60 text-accent-green"
                        : "border-border-glass text-text-dim"
                    }`}
                  >
                    {isComplete ? "✓" : index + 1}
                  </span>
                  <span
                    className={`text-sm capitalize ${
                      isActive
                        ? "text-text-primary"
                        : isComplete
                        ? "text-text-secondary"
                        : "text-text-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                  {index < steps.length - 1 && (
                    <span className="h-px w-10 bg-border-glass" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {wizardStep === "select" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-muted">
                choose the approved purchase requests that belong in this order.
              </p>
              <span className="text-xs font-mono uppercase text-text-secondary">
                {selectedRequestIds.length} selected
              </span>
            </div>

            <div className="max-h-72 overflow-auto rounded-xl border border-border-glass">
              {sortedApprovedRequests.length === 0 ? (
                <div className="p-6 text-center text-sm text-text-muted">
                  no approved requests available yet.
                </div>
              ) : (
                sortedApprovedRequests.map((request) => {
                  const checked = selectedRequestIds.includes(request._id);
                  const quantity = request.quantity ?? 1;
                  const lineTotal = request.estimatedCost * quantity;
                  return (
                    <label
                      key={request._id}
                      className="flex items-center gap-4 border-b border-border-glass px-4 py-3 text-sm transition-colors hover:bg-white/5 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          toggleSelection(request._id, e.target.checked)
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-secondary">
                          {request.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                          <span className="capitalize">
                            {request.vendorName || "unknown vendor"}
                          </span>
                          <span>qty {quantity}</span>
                          <span>${request.estimatedCost.toFixed(2)} ea</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-text-secondary">
                          ${lineTotal.toFixed(2)}
                        </div>
                        <div className="text-xs capitalize text-text-muted">
                          {request.status}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {selectedRequests.length > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-border-glass px-4 py-3 text-sm">
                <span className="text-text-muted">line items total</span>
                <span className="font-mono text-lg text-text-secondary">
                  ${selectedTotal.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {wizardStep === "details" && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              confirm vendor and add optional notes before reviewing the order.
            </p>

            <VendorAutocomplete
              label="vendor"
              value={form.vendor}
              onChange={(name) => {
                setVendorTouched(true);
                setForm((prev) => ({ ...prev, vendor: name }));
              }}
              onSelect={(name) => {
                setVendorTouched(true);
                setForm((prev) => ({ ...prev, vendor: name }));
              }}
              quickPicks={vendorQuickPicks}
              required
            />

            <div>
              <label className="block mb-2 text-sm text-text-muted">
                notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="input-modern resize-none"
                rows={3}
                placeholder="include budgets, shipping guidance, account codes..."
              />
            </div>
          </div>
        )}

        {wizardStep === "review" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border-glass px-4 py-3">
                <h4 className="text-xs uppercase tracking-wide text-text-muted">
                  order details
                </h4>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-text-dim">vendor</span>
                    <span className="text-text-secondary">
                      {form.vendor}
                    </span>
                  </div>
                  {form.notes && (
                    <div className="pt-2 text-xs text-text-muted">{form.notes}</div>
                  )}
                  {selectedRequests.length > 1 && inferredVendor &&
                    selectedRequests.some(
                      (request) => request.vendorName !== inferredVendor
                    ) && (
                      <p className="text-xs text-yellow-400">
                        multiple vendors detected; ensure the vendor field is correct.
                      </p>
                    )}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border-glass px-4 py-3">
                <label className="text-xs uppercase tracking-wide text-text-muted">
                  total to submit *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.totalCost}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, totalCost: e.target.value }))
                  }
                  className="input-modern"
                  placeholder={selectedTotal.toFixed(2)}
                  required
                />
                <label className="text-xs uppercase tracking-wide text-text-muted">
                  cart/order link
                </label>
                <input
                  type="url"
                  value={form.cartLink}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, cartLink: e.target.value }))
                  }
                  className="input-modern"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border-glass">
              <div className="grid grid-cols-12 bg-glass px-4 py-2 text-xs uppercase tracking-wide text-text-muted">
                <span className="col-span-6">item</span>
                <span className="col-span-2 text-right">qty</span>
                <span className="col-span-2 text-right">unit</span>
                <span className="col-span-2 text-right">subtotal</span>
              </div>
              {selectedRequests.map((request) => {
                const quantity = request.quantity ?? 1;
                const subtotal = request.estimatedCost * quantity;
                return (
                  <div
                    key={request._id}
                    className="grid grid-cols-12 items-center border-t border-border-glass/60 px-4 py-3 text-sm"
                  >
                    <div className="col-span-6 min-w-0">
                      <p className="truncate text-text-secondary">{request.title}</p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-text-muted">
                        {request.vendorName && (
                          <span className="capitalize">{request.vendorName}</span>
                        )}
                        <span>
                          requested {new Date(request.requestedAt ?? Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2 text-right font-mono">{quantity}</div>
                    <div className="col-span-2 text-right font-mono">
                      ${request.estimatedCost.toFixed(2)}
                    </div>
                    <div className="col-span-2 text-right font-mono">
                      ${subtotal.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <div className="rounded-xl border border-border-glass px-4 py-3 text-sm">
                <div className="flex items-center gap-8 text-text-secondary">
                  <span className="text-text-muted">line total</span>
                  <span className="font-mono text-lg">
                    ${selectedTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border-glass pt-4">
          <button type="button" onClick={handleBack} className="btn-modern">
            {wizardStep === "select" ? "cancel" : "back"}
          </button>

          {wizardStep !== "review" ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn-modern btn-primary"
              disabled={
                (wizardStep === "select" && !canAdvanceFromSelect) ||
                (wizardStep === "details" && !canAdvanceFromDetails)
              }
            >
              next
            </button>
          ) : (
            <button
              type="submit"
              className="btn-modern btn-primary"
              disabled={isSubmitting}
            >
              place order
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
