import { useEffect, useState } from "react";
import { Modal } from "../Modal";

interface OrderEditModalProps {
  order: any | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (form: {
    vendor: string;
    totalCost: string;
    cartLink: string;
    notes: string;
  }) => void;
}

const INITIAL_FORM = {
  vendor: "",
  totalCost: "",
  cartLink: "",
  notes: "",
};

export function OrderEditModal({
  order,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: OrderEditModalProps) {
  const [form, setForm] = useState(INITIAL_FORM);

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
    }
    if (!isOpen) {
      setForm(INITIAL_FORM);
    }
  }, [order, isOpen]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  const handleChange = (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={order ? `edit order - ${order.vendor}` : "edit order"}
      maxWidthClassName="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-2 text-sm text-text-muted">
              vendor *
            </label>
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
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm text-text-muted">
              cart link
            </label>
            <input
              type="url"
              value={form.cartLink}
              onChange={handleChange("cartLink")}
              className="input-modern"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block mb-2 text-sm text-text-muted">
              notes
            </label>
            <textarea
              value={form.notes}
              onChange={handleChange("notes")}
              className="input-modern resize-none"
              rows={3}
              placeholder="include account codes, shipping details, etc"
            />
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
