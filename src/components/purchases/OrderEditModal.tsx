import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Modal } from "../Modal";

type OrderEditForm = {
  vendor: string;
  totalCost: string;
  cartLink: string;
  notes: string;
};

type OrderEditRequest = {
  _id: string;
  title: string;
  vendorName?: string;
  estimatedCost: number;
  quantity?: number;
  requestedAt?: number;
  status?: string;
  link?: string;
};

interface OrderEditModalProps {
  order: any | null;
  isOpen: boolean;
  isSubmitting: boolean;
  candidates: OrderEditRequest[];
  onClose: () => void;
  onSubmit: (form: OrderEditForm, requestIds: string[]) => void;
}

const INITIAL_FORM: OrderEditForm = {
  vendor: "",
  totalCost: "",
  cartLink: "",
  notes: "",
};

export function OrderEditModal({
  order,
  isOpen,
  isSubmitting,
  candidates,
  onClose,
  onSubmit,
}: OrderEditModalProps) {
  const [form, setForm] = useState<OrderEditForm>(INITIAL_FORM);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);

  useEffect(() => {
    if (order && isOpen) {
      setForm({
        vendor: order.vendor || "",
        totalCost:
          typeof order.totalCost === "number"
            ? order.totalCost.toFixed(2)
            : order.totalCost || "",
        cartLink: order.cartLink || "",
        notes: order.notes || "",
      });
      setSelectedRequestIds(order.requestIds || []);
    }
    if (!isOpen) {
      setForm(INITIAL_FORM);
      setSelectedRequestIds([]);
    }
  }, [order, isOpen]);

  const availableRequests = useMemo(() => {
    if (!order) return candidates;
    const existingIds = new Set(candidates.map((request) => request._id));
    const orderRequests: OrderEditRequest[] = (order.requests || [])
      .filter(Boolean)
      .map((request: any) => ({
        _id: request._id,
        title: request.title,
        vendorName: request.vendorName,
        estimatedCost: request.estimatedCost,
        quantity: request.quantity,
        requestedAt: request.requestedAt,
        status: request.status,
        link: request.link,
      }));

    const merged = [...candidates];
    orderRequests.forEach((request) => {
      if (!existingIds.has(request._id)) {
        merged.push(request);
      }
    });

    return merged;
  }, [candidates, order]);

  const selectedRequests = useMemo(
    () =>
      availableRequests.filter((request) =>
        selectedRequestIds.includes(request._id)
      ),
    [availableRequests, selectedRequestIds]
  );

  const lineItemsTotal = useMemo(
    () =>
      selectedRequests.reduce((sum, request) => {
        const quantity = request.quantity ?? 1;
        return sum + request.estimatedCost * quantity;
      }, 0),
    [selectedRequests]
  );

  const handleToggleRequest = (requestId: string, checked: boolean) => {
    setSelectedRequestIds((prev) => {
      if (checked) {
        if (prev.includes(requestId)) return prev;
        return [...prev, requestId];
      }
      return prev.filter((id) => id !== requestId);
    });
  };

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      totalCost: lineItemsTotal === 0 ? "" : lineItemsTotal.toFixed(2),
    }));
  }, [lineItemsTotal]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form, selectedRequestIds);
  };

  const handleChange = (field: keyof OrderEditForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={order ? `edit order - ${order.vendor}` : "edit order"}
      maxWidthClassName="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-2 text-sm text-text-muted">vendor *</label>
            <input
              value={form.vendor}
              onChange={handleChange("vendor")}
              className="input-modern"
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm text-text-muted">
              total cost *
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.totalCost}
              onChange={handleChange("totalCost")}
              className="input-modern"
              placeholder={lineItemsTotal.toFixed(2)}
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm text-text-muted">cart link</label>
            <input
              type="url"
              value={form.cartLink}
              onChange={handleChange("cartLink")}
              className="input-modern"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block mb-2 text-sm text-text-muted">notes</label>
            <textarea
              value={form.notes}
              onChange={handleChange("notes")}
              className="input-modern resize-none"
              rows={3}
              placeholder="include account codes, shipping details, etc"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-wide text-text-muted">
              line items
            </h3>
            <span className="text-xs font-mono uppercase text-text-secondary">
              {selectedRequestIds.length} selected
            </span>
          </div>

          <div className="max-h-72 overflow-auto rounded-xl border border-border-glass">
            {availableRequests.length === 0 ? (
              <div className="p-6 text-center text-sm text-text-muted">
                no requests available to attach
              </div>
            ) : (
              availableRequests.map((request) => {
                const checked = selectedRequestIds.includes(request._id);
                const quantity = request.quantity ?? 1;
                const subtotal = request.estimatedCost * quantity;
                return (
                  <label
                    key={request._id}
                    className="flex items-center gap-4 border-b border-border-glass px-4 py-3 text-sm hover:bg-white/5 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        handleToggleRequest(request._id, event.target.checked)
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text-secondary">
                        {request.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                        {request.vendorName && (
                          <span className="capitalize">{request.vendorName}</span>
                        )}
                        <span>qty {quantity}</span>
                        <span>${request.estimatedCost.toFixed(2)} ea</span>
                        {request.link && (
                          <a
                            href={request.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sunset-orange hover:text-sunset-orange/80"
                          >
                            view item
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-text-secondary">
                        ${subtotal.toFixed(2)}
                      </div>
                      {request.status && (
                        <div className="text-xs capitalize text-text-muted">
                          {request.status}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <div className="flex justify-end">
            <div className="rounded-xl border border-border-glass px-4 py-3 text-sm">
              <div className="flex items-center gap-8 text-text-secondary">
                <span className="text-text-muted">line total</span>
                <span className="font-mono text-lg">
                  ${lineItemsTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border-glass pt-4">
          <button type="button" onClick={onClose} className="btn-modern" disabled={isSubmitting}>
            cancel
          </button>
          <button type="submit" className="btn-modern btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "saving..." : "save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
