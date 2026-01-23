import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { Modal } from '../Modal';
import { VendorAutocomplete } from './VendorAutocomplete';
import { Input, Textarea, Button } from '../ui';
import { cn } from '../../lib/utils';

type OrderWizardStep = 'select' | 'details' | 'review';

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
  vendor: '',
  notes: '',
  cartLink: '',
  totalCost: '',
};

export function PurchaseOrderWizard({
  isOpen,
  onClose,
  approvedRequests,
  ensureVendor,
  createOrder,
}: OrderWizardProps) {
  const [wizardStep, setWizardStep] = useState<OrderWizardStep>('select');
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

  const inferredVendor = selectedRequests[0]?.vendorName || '';

  useEffect(() => {
    if (!vendorTouched) {
      setForm((prev) => ({ ...prev, vendor: inferredVendor }));
    }
  }, [inferredVendor, vendorTouched]);

  useEffect(() => {
    if (wizardStep !== 'review') return;
    if (!form.totalCost && selectedTotal > 0) {
      setForm((prev) => ({ ...prev, totalCost: selectedTotal.toFixed(2) }));
    }
  }, [wizardStep, selectedTotal, form.totalCost]);

  const steps: Array<{ id: OrderWizardStep; label: string }> = [
    { id: 'select', label: 'Line Items' },
    { id: 'details', label: 'Details' },
    { id: 'review', label: 'Review' },
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
    setWizardStep('select');
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
    if (wizardStep === 'select') {
      if (!canAdvanceFromSelect) {
        toast.error('Select at least one approved request');
        return;
      }
      setWizardStep('details');
      return;
    }

    if (wizardStep === 'details') {
      if (!canAdvanceFromDetails) {
        toast.error('Enter a vendor to continue');
        return;
      }
      if (!form.totalCost && selectedTotal > 0) {
        setForm((prev) => ({ ...prev, totalCost: selectedTotal.toFixed(2) }));
      }
      setWizardStep('review');
    }
  };

  const handleBack = () => {
    if (wizardStep === 'select') {
      handleClose();
      return;
    }

    if (wizardStep === 'details') {
      setWizardStep('select');
      return;
    }

    setWizardStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (wizardStep !== 'review') {
      handleNext();
      return;
    }

    if (selectedRequestIds.length === 0) {
      toast.error('Select at least one approved request');
      setWizardStep('select');
      return;
    }

    const vendorName = form.vendor.trim();
    if (!vendorName) {
      toast.error('Vendor is required');
      setWizardStep('details');
      return;
    }

    const parsedTotal = parseFloat(form.totalCost || '');
    const fallbackTotal = selectedTotal;
    const totalCostToSend = Number.isFinite(parsedTotal)
      ? parsedTotal
      : fallbackTotal;

    if (!Number.isFinite(totalCostToSend) || totalCostToSend <= 0) {
      toast.error('Enter a valid total before placing the order');
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
      toast.success('Purchase order created');
      handleClose();
    } catch (error) {
      toast.error('Failed to create order');
      setIsSubmitting(false);
    }
  };

  const sortedApprovedRequests = useMemo(
    () =>
      [...approvedRequests].sort((a, b) => {
        const vendorA = (a.vendorName || '').toLowerCase();
        const vendorB = (b.vendorName || '').toLowerCase();
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
      title="Create Purchase Order"
      maxWidthClassName="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step Indicator */}
        <div className="rounded-xl border border-border bg-bg-tertiary px-4 py-3">
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
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-mono transition-colors',
                      isActive
                        ? 'border-accent-orange bg-accent-orange/10 text-accent-orange'
                        : isComplete
                        ? 'border-accent-success/60 bg-accent-success/10 text-accent-success'
                        : 'border-border text-text-dim'
                    )}
                  >
                    {isComplete ? <Check size={14} /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      'text-sm',
                      isActive
                        ? 'text-text-primary font-medium'
                        : isComplete
                        ? 'text-text-secondary'
                        : 'text-text-muted'
                    )}
                  >
                    {step.label}
                  </span>
                  {index < steps.length - 1 && (
                    <span className="h-px w-10 bg-border" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step: Select */}
        {wizardStep === 'select' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-muted">
                Choose the approved purchase requests that belong in this order.
              </p>
              <span className="text-xs font-mono uppercase text-text-secondary">
                {selectedRequestIds.length} selected
              </span>
            </div>

            <div className="max-h-72 overflow-auto rounded-xl border border-border">
              {sortedApprovedRequests.length === 0 ? (
                <div className="p-6 text-center text-sm text-text-muted">
                  No approved requests available yet.
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {sortedApprovedRequests.map((request) => {
                    const checked = selectedRequestIds.includes(request._id);
                    const quantity = request.quantity ?? 1;
                    const lineTotal = request.estimatedCost * quantity;
                    return (
                      <label
                        key={request._id}
                        className={cn(
                          'flex items-center gap-4 px-4 py-3 text-sm cursor-pointer transition-colors',
                          checked ? 'bg-accent/5' : 'hover:bg-bg-tertiary'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            toggleSelection(request._id, e.target.checked)
                          }
                          className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {request.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                            <span className="capitalize">
                              {request.vendorName || 'Unknown vendor'}
                            </span>
                            <span>·</span>
                            <span>qty {quantity}</span>
                            <span>·</span>
                            <span>${request.estimatedCost.toFixed(2)} ea</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono text-text-primary">
                            ${lineTotal.toFixed(2)}
                          </div>
                          <div className="text-xs capitalize text-text-muted">
                            {request.status}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedRequests.length > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-border bg-bg-tertiary px-4 py-3 text-sm">
                <span className="text-text-muted">Line items total</span>
                <span className="font-mono text-lg text-text-primary">
                  ${selectedTotal.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step: Details */}
        {wizardStep === 'details' && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Confirm vendor and add optional notes before reviewing the order.
            </p>

            <VendorAutocomplete
              label="Vendor"
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
              <label className="block mb-2 text-sm font-medium text-text-primary">
                Notes
              </label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                placeholder="Include budgets, shipping guidance, account codes..."
              />
            </div>
          </div>
        )}

        {/* Step: Review */}
        {wizardStep === 'review' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-bg-tertiary px-4 py-3">
                <h4 className="text-xs uppercase tracking-wide text-text-muted">
                  Order Details
                </h4>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-text-muted">Vendor</span>
                    <span className="text-text-primary capitalize">
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
                      <p className="text-xs text-accent-warning">
                        Multiple vendors detected; ensure the vendor field is correct.
                      </p>
                    )}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-bg-tertiary px-4 py-3">
                <div>
                  <label className="block mb-2 text-xs uppercase tracking-wide text-text-muted">
                    Total to Submit *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.totalCost}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, totalCost: e.target.value }))
                    }
                    placeholder={selectedTotal.toFixed(2)}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-2 text-xs uppercase tracking-wide text-text-muted">
                    Cart/Order Link
                  </label>
                  <Input
                    type="url"
                    value={form.cartLink}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, cartLink: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-12 bg-bg-tertiary px-4 py-2 text-xs uppercase tracking-wide text-text-muted">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-2 text-right">Unit</span>
                <span className="col-span-2 text-right">Subtotal</span>
              </div>
              <div className="divide-y divide-border-subtle">
                {selectedRequests.map((request) => {
                  const quantity = request.quantity ?? 1;
                  const subtotal = request.estimatedCost * quantity;
                  return (
                    <div
                      key={request._id}
                      className="grid grid-cols-12 items-center px-4 py-3 text-sm"
                    >
                      <div className="col-span-6 min-w-0">
                        <p className="truncate text-text-primary">{request.title}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-text-muted">
                          {request.vendorName && (
                            <span className="capitalize">{request.vendorName}</span>
                          )}
                          <span>
                            Requested {new Date(request.requestedAt ?? Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-2 text-right font-mono text-text-secondary">{quantity}</div>
                      <div className="col-span-2 text-right font-mono text-text-secondary">
                        ${request.estimatedCost.toFixed(2)}
                      </div>
                      <div className="col-span-2 text-right font-mono text-text-primary font-medium">
                        ${subtotal.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <div className="rounded-xl border border-border bg-bg-tertiary px-4 py-3 text-sm">
                <div className="flex items-center gap-8">
                  <span className="text-text-muted">Line Total</span>
                  <span className="font-mono text-lg text-text-primary">
                    ${selectedTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={handleBack}>
            {wizardStep === 'select' ? 'Cancel' : 'Back'}
          </Button>

          {wizardStep !== 'review' ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={
                (wizardStep === 'select' && !canAdvanceFromSelect) ||
                (wizardStep === 'details' && !canAdvanceFromDetails)
              }
            >
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Placing...' : 'Place Order'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
