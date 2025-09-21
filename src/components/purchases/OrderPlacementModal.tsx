import { useEffect, useState } from "react";
import { Modal } from "../Modal";

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
  const [placementNotes, setPlacementNotes] = useState("");
  const [placementTotal, setPlacementTotal] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (order && isOpen) {
      setPlacementNotes(order.placementNotes || "");
      setPlacementTotal(
        typeof order.totalCost === "number" ? order.totalCost.toFixed(2) : ""
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
      placementTotal.trim() === "" ? null : parseFloat(placementTotal);

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
      title={`place order - ${order.vendor}`}
      maxWidthClassName="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border-glass px-4 py-3">
            <h4 className="text-xs uppercase tracking-wide text-text-muted">
              overview
            </h4>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-text-dim">vendor</span>
                <span className="text-text-secondary capitalize">
                  {order.vendor}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-dim">created</span>
                <span className="text-text-secondary">
                  {new Date(order.orderedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-dim">line items total</span>
                <span className="font-mono text-text-secondary">
                  ${lineItemsTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-border-glass px-4 py-3">
            <label className="text-xs uppercase tracking-wide text-text-muted">
              total charged
            </label>
            <input
              type="number"
              step="0.01"
              value={placementTotal}
              onChange={(e) => setPlacementTotal(e.target.value)}
              className="input-modern"
              placeholder={lineItemsTotal.toFixed(2)}
            />
            <p className="text-xs text-text-muted">
              adjust if shipping, taxes, or discounts change the total cost.
            </p>
          </div>
        </div>

        {order.notes && (
          <div className="rounded-xl border border-border-glass px-4 py-3 text-sm text-text-muted">
            <span className="text-text-dim">request notes:</span>{" "}
            {order.notes}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-text-muted">
            placement notes
          </label>
          <textarea
            value={placementNotes}
            onChange={(e) => setPlacementNotes(e.target.value)}
            className="input-modern resize-none"
            rows={3}
            placeholder="add order numbers, shipping expectations, or other context"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-text-muted">
            attach confirmation (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-mono file:bg-sunset-orange/15 file:text-sunset-orange hover:file:bg-sunset-orange/25 file:cursor-pointer"
          />
          {order.confirmationImageUrl && (
            <div className="rounded-xl border border-border-glass px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-text-muted mb-2">
                current confirmation
              </p>
              <img
                src={order.confirmationImageUrl}
                alt={`Current confirmation for ${order.vendor}`}
                className="max-w-xs rounded-lg border border-border-glass"
              />
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border-glass">
          <div className="grid grid-cols-12 bg-glass px-4 py-2 text-xs uppercase tracking-wide text-text-muted">
            <span className="col-span-6">item</span>
            <span className="col-span-2 text-right">qty</span>
            <span className="col-span-2 text-right">unit</span>
            <span className="col-span-2 text-right">subtotal</span>
          </div>
          {requestItems.map((request: any) => {
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
                      requested {new Date(request.requestedAt).toLocaleDateString()}
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

        <div className="flex items-center justify-between gap-3 border-t border-border-glass pt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-modern"
            disabled={isSubmitting}
          >
            cancel
          </button>
          <button
            type="submit"
            className="btn-modern btn-primary"
            disabled={isSubmitting}
          >
            {order.status === "pending" ? "mark as placed" : "save updates"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
