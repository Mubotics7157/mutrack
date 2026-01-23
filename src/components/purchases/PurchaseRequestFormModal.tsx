import { Modal } from '../Modal';
import ProductAutocomplete, { ProductSuggestion } from './ProductAutocomplete';
import { VendorAutocomplete } from './VendorAutocomplete';
import { BulkRequestForm } from './BulkRequestForm';

export type RequestFormState = {
  title: string;
  description: string;
  estimatedCost: string;
  priority: 'low' | 'medium' | 'high';
  link: string;
  quantity: string;
  vendorName: string;
};

interface PurchaseRequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formMode: 'single' | 'bulk';
  onFormModeChange: (mode: 'single' | 'bulk') => void;
  form: RequestFormState;
  onFormChange: (form: RequestFormState) => void;
  selectedProduct: ProductSuggestion | null;
  onProductSelect: (product: ProductSuggestion) => void;
  onProductClear: () => void;
  editingRequestId: string | null;
  vendorQuickPicks: string[];
  onSubmit: (e: React.FormEvent) => void;
  ensureVendor: (args: { name: string }) => Promise<string>;
  ensureProduct: (args: any) => Promise<string>;
  createRequest: (args: any) => Promise<any>;
}

export function PurchaseRequestFormModal({
  isOpen,
  onClose,
  formMode,
  onFormModeChange,
  form,
  onFormChange,
  selectedProduct,
  onProductSelect,
  onProductClear,
  editingRequestId,
  vendorQuickPicks,
  onSubmit,
  ensureVendor,
  ensureProduct,
  createRequest,
}: PurchaseRequestFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formMode === 'single' ? (editingRequestId ? 'edit purchase request' : 'new purchase request') : 'bulk add requests'}
      maxWidthClassName={formMode === 'single' ? 'max-w-2xl' : 'max-w-5xl'}
    >
      {formMode === 'single' ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <ProductAutocomplete
            label="item/service *"
            value={form.title}
            onChange={(value) => {
              onFormChange({ ...form, title: value });
              if (selectedProduct && value !== selectedProduct.name) {
                onProductClear();
              }
            }}
            onProductSelect={onProductSelect}
            vendorFilter={form.vendorName}
          />

          <div>
            <label className="block mb-2 text-sm text-text-muted">description *</label>
            <textarea
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              className="input-modern resize-none"
              rows={3}
              required
              placeholder="detailed description, specifications, intended use..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm text-text-muted">estimated cost *</label>
              <input
                type="number"
                step="0.01"
                value={form.estimatedCost}
                onChange={(e) => onFormChange({ ...form, estimatedCost: e.target.value })}
                className="input-modern"
                required
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">priority</label>
              <select
                value={form.priority}
                onChange={(e) => onFormChange({ ...form, priority: e.target.value as any })}
                className="input-modern"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm text-text-muted">item link *</label>
              <input
                type="url"
                value={form.link}
                onChange={(e) => onFormChange({ ...form, link: e.target.value })}
                className="input-modern"
                required
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">quantity *</label>
              <input
                type="number"
                min={1}
                step={1}
                value={form.quantity}
                onChange={(e) => onFormChange({ ...form, quantity: e.target.value })}
                className="input-modern"
                required
                placeholder="1"
              />
            </div>
          </div>

          <VendorAutocomplete
            label="vendor"
            value={form.vendorName}
            onChange={(name) => {
              onProductClear();
              onFormChange({ ...form, vendorName: name });
            }}
            onSelect={(name) => onFormChange({ ...form, vendorName: name })}
            quickPicks={vendorQuickPicks}
            required
          />

          <div className="flex flex-col gap-3 pt-4">
            <div className="flex gap-4">
              <button type="submit" className="btn-modern btn-primary flex-1 touch-feedback">
                {editingRequestId ? 'save changes' : 'submit request'}
              </button>
              <button type="button" onClick={onClose} className="btn-modern flex-1 touch-feedback">
                cancel
              </button>
            </div>
            {!editingRequestId && (
              <button
                type="button"
                onClick={() => onFormModeChange('bulk')}
                className="text-xs uppercase tracking-wide text-sunset-orange hover:text-sunset-orange/80"
              >
                need to add multiple items? switch to bulk add
              </button>
            )}
          </div>
        </form>
      ) : (
        <BulkRequestForm
          isActive={formMode === 'bulk'}
          ensureVendor={ensureVendor}
          ensureProduct={ensureProduct}
          createRequest={createRequest}
          vendorSuggestions={vendorQuickPicks}
          onCancel={() => onFormModeChange('single')}
          onComplete={onClose}
        />
      )}
    </Modal>
  );
}
