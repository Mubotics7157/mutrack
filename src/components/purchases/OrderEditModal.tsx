import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { ExternalLink } from 'lucide-react';
import { Modal } from '../Modal';
import { Input, Textarea, Button } from '../ui';
import { cn } from '../../lib/utils';

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
  vendor: '',
  totalCost: '',
  cartLink: '',
  notes: '',
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
        vendor: order.vendor || '',
        totalCost:
          typeof order.totalCost === 'number'
            ? order.totalCost.toFixed(2)
            : order.totalCost || '',
        cartLink: order.cartLink || '',
        notes: order.notes || '',
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
      totalCost: lineItemsTotal === 0 ? '' : lineItemsTotal.toFixed(2),
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
      title={order ? `Edit Order - ${order.vendor}` : 'Edit Order'}
      maxWidthClassName="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">
              Vendor *
            </label>
            <Input
              value={form.vendor}
              onChange={handleChange('vendor')}
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">
              Total Cost *
            </label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={form.totalCost}
              onChange={handleChange('totalCost')}
              placeholder={lineItemsTotal.toFixed(2)}
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">
              Cart Link
            </label>
            <Input
              type="url"
              value={form.cartLink}
              onChange={handleChange('cartLink')}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-text-primary">
              Notes
            </label>
            <Textarea
              value={form.notes}
              onChange={handleChange('notes')}
              rows={3}
              placeholder="Include account codes, shipping details, etc"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-wide text-text-muted">
              Line Items
            </h3>
            <span className="text-xs font-mono uppercase text-text-secondary">
              {selectedRequestIds.length} selected
            </span>
          </div>

          <div className="max-h-72 overflow-auto rounded-xl border border-border">
            {availableRequests.length === 0 ? (
              <div className="p-6 text-center text-sm text-text-muted">
                No requests available to attach
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {availableRequests.map((request) => {
                  const checked = selectedRequestIds.includes(request._id);
                  const quantity = request.quantity ?? 1;
                  const subtotal = request.estimatedCost * quantity;
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
                        onChange={(event) =>
                          handleToggleRequest(request._id, event.target.checked)
                        }
                        className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-text-primary">
                          {request.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                          {request.vendorName && (
                            <>
                              <span className="capitalize">{request.vendorName}</span>
                              <span>·</span>
                            </>
                          )}
                          <span>qty {quantity}</span>
                          <span>·</span>
                          <span>${request.estimatedCost.toFixed(2)} ea</span>
                          {request.link && (
                            <>
                              <span>·</span>
                              <a
                                href={request.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-accent hover:text-accent/80 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={10} />
                                View
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-text-primary">
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
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <div className="rounded-xl border border-border bg-bg-tertiary px-4 py-3 text-sm">
              <div className="flex items-center gap-8">
                <span className="text-text-muted">Line Total</span>
                <span className="font-mono text-lg text-text-primary">
                  ${lineItemsTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
