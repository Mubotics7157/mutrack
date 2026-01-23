import { Modal } from '../Modal';
import ProductAutocomplete, { ProductSuggestion } from './ProductAutocomplete';
import { VendorAutocomplete } from './VendorAutocomplete';
import { BulkRequestForm } from './BulkRequestForm';
import { Input, Textarea, Select, Button } from '../ui';

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
  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formMode === 'single' ? (editingRequestId ? 'Edit Purchase Request' : 'New Purchase Request') : 'Bulk Add Requests'}
      maxWidthClassName={formMode === 'single' ? 'max-w-2xl' : 'max-w-5xl'}
    >
      {formMode === 'single' ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <ProductAutocomplete
            label="Item/Service *"
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
            <label className="block mb-2 text-sm font-medium text-text-primary">Description *</label>
            <Textarea
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              rows={3}
              required
              placeholder="Detailed description, specifications, intended use..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-text-primary">Estimated Cost *</label>
              <Input
                type="number"
                step="0.01"
                value={form.estimatedCost}
                onChange={(e) => onFormChange({ ...form, estimatedCost: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-text-primary">Priority</label>
              <Select
                value={form.priority}
                onChange={(e) => onFormChange({ ...form, priority: e.target.value as any })}
                options={priorityOptions}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-text-primary">Item Link *</label>
              <Input
                type="url"
                value={form.link}
                onChange={(e) => onFormChange({ ...form, link: e.target.value })}
                required
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-text-primary">Quantity *</label>
              <Input
                type="number"
                min={1}
                step={1}
                value={form.quantity}
                onChange={(e) => onFormChange({ ...form, quantity: e.target.value })}
                required
                placeholder="1"
              />
            </div>
          </div>

          <VendorAutocomplete
            label="Vendor"
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
            <div className="flex gap-3">
              <Button type="submit" variant="primary" className="flex-1">
                {editingRequestId ? 'Save Changes' : 'Submit Request'}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
            {!editingRequestId && (
              <button
                type="button"
                onClick={() => onFormModeChange('bulk')}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                Need to add multiple items? Switch to bulk add
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
