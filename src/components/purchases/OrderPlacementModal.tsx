import { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { Input, Textarea, Button } from '../ui';

interface OrderPlacementModalProps {
  order: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    orderId: string;
    file?: File | null;
    placementNotes?: string;
    totalCost?: number | null;
  }) => Promise<void>;
}

export function OrderPlacementModal({
  order,
  isOpen,
  onClose,
  onSubmit,
}: OrderPlacementModalProps) {
  const [placementNotes, setPlacementNotes] = useState('');
  const [placementTotal, setPlacementTotal] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (order && isOpen) {
      setPlacementNotes(order.placementNotes || '');
      setPlacementTotal(
        typeof order.totalCost === 'number' ? order.totalCost.toFixed(2) : ''
      );
      setFile(null);
      setIsSubmitting(false);
    }
    if (!isOpen) {
      setFile(null);
      setIsSubmitting(false);
    }
  }, [order, isOpen]);

  if (!order) {
    return null;
  }

  const requestItems: any[] = order.requests || [];
  const lineItemsTotal = requestItems.reduce((sum: number, request: any) => {
    if (!request) return sum;
    const quantity = request.quantity ?? 1;
    return sum + request.estimatedCost * quantity;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const parsedTotal =
      placementTotal.trim() === '' ? null : parseFloat(placementTotal);

    try {
      await onSubmit({
        orderId: order._id,
        file,
        placementNotes,
        totalCost: parsedTotal,
      });
    } catch (error) {
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Place Order - ${order.vendor}`}
      maxWidthClassName="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-bg-tertiary px-4 py-3">
            <h4 className="text-xs uppercase tracking-wide text-text-muted mb-3">
              Overview
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Vendor</span>
                <span className="text-text-primary capitalize">
                  {order.vendor}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Created</span>
                <span className="text-text-primary">
                  {new Date(order.orderedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Line Items Total</span>
                <span className="font-mono text-text-primary">
                  ${lineItemsTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-bg-tertiary px-4 py-3">
            <label className="block text-xs uppercase tracking-wide text-text-muted">
              Total Charged
            </label>
            <Input
              type="number"
              step="0.01"
              value={placementTotal}
              onChange={(e) => setPlacementTotal(e.target.value)}
              placeholder={lineItemsTotal.toFixed(2)}
            />
            <p className="text-xs text-text-muted">
              Adjust if shipping, taxes, or discounts change the total cost.
            </p>
          </div>
        </div>

        {order.notes && (
          <div className="rounded-lg border border-border bg-bg-tertiary px-4 py-3 text-sm text-text-muted">
            <span className="text-text-dim">Request notes:</span> {order.notes}
          </div>
        )}

        <div>
          <label className="block mb-2 text-sm font-medium text-text-primary">
            Placement Notes
          </label>
          <Textarea
            value={placementNotes}
            onChange={(e) => setPlacementNotes(e.target.value)}
            rows={3}
            placeholder="Add order numbers, shipping expectations, or other context"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-text-primary">
            Attach Confirmation (Optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-accent/10 file:text-accent hover:file:bg-accent/20 file:cursor-pointer file:transition-colors"
          />
          {order.confirmationImageUrl && (
            <div className="mt-3 rounded-lg border border-border bg-bg-tertiary px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-text-muted mb-2">
                Current Confirmation
              </p>
              <img
                src={order.confirmationImageUrl}
                alt={`Current confirmation for ${order.vendor}`}
                className="max-w-xs rounded-lg border border-border"
              />
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-12 bg-bg-tertiary px-4 py-2 text-xs uppercase tracking-wide text-text-muted">
            <span className="col-span-6">Item</span>
            <span className="col-span-2 text-right">Qty</span>
            <span className="col-span-2 text-right">Unit</span>
            <span className="col-span-2 text-right">Subtotal</span>
          </div>
          {requestItems.map((request: any) => {
            const quantity = request.quantity ?? 1;
            const subtotal = request.estimatedCost * quantity;
            return (
              <div
                key={request._id}
                className="grid grid-cols-12 items-center border-t border-border-subtle px-4 py-3 text-sm"
              >
                <div className="col-span-6 min-w-0">
                  <p className="truncate text-text-primary">{request.title}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-text-muted">
                    {request.vendorName && (
                      <span className="capitalize">{request.vendorName}</span>
                    )}
                    <span>
                      Requested {new Date(request.requestedAt).toLocaleDateString()}
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

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {order.status === 'pending' ? 'Mark as Placed' : 'Save Updates'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
