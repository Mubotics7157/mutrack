import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import ProductAutocomplete, { ProductSuggestion } from './ProductAutocomplete';
import { Input, Textarea, Select, Button } from '../ui';
import { cn } from '../../lib/utils';

type Priority = 'low' | 'medium' | 'high';

type BulkRequestRow = {
  id: string;
  title: string;
  description: string;
  vendorName: string;
  link: string;
  quantity: string;
  estimatedCost: string;
  priority: Priority;
};

type RowErrorMap = Record<string, string>;

interface BulkRequestFormProps {
  isActive: boolean;
  ensureVendor: (args: { name: string }) => Promise<string>;
  ensureProduct: (args: {
    productId?: string;
    name: string;
    description: string;
    link: string;
    estimatedCost: number;
    quantity: number;
    vendorId: string;
  }) => Promise<string>;
  createRequest: (args: {
    title: string;
    description: string;
    estimatedCost: number;
    priority: Priority;
    link: string;
    quantity: number;
    vendorId: string;
    productId?: string;
  }) => Promise<string>;
  vendorSuggestions: string[];
  onCancel: () => void;
  onComplete: () => void;
}

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

function createEmptyRow(): BulkRequestRow {
  return {
    id: Math.random().toString(36).slice(2),
    title: '',
    description: '',
    vendorName: '',
    link: '',
    quantity: '1',
    estimatedCost: '',
    priority: 'medium',
  };
}

export function BulkRequestForm({
  isActive,
  ensureVendor,
  ensureProduct,
  createRequest,
  vendorSuggestions,
  onCancel,
  onComplete,
}: BulkRequestFormProps) {
  const [rows, setRows] = useState<BulkRequestRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ]);
  const [rowErrors, setRowErrors] = useState<RowErrorMap>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
    setRowErrors({});
    setIsSubmitting(false);
  }, [isActive]);

  const activeRows = useMemo(
    () =>
      rows.filter((row) => {
        const fields = [
          row.title,
          row.description,
          row.vendorName,
          row.link,
          row.quantity,
          row.estimatedCost,
        ];
        return fields.some((value) => value.trim() !== '');
      }),
    [rows]
  );

  const handleRowChange = <K extends keyof BulkRequestRow>(
    rowId: string,
    key: K,
    value: BulkRequestRow[K]
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, [key]: value } : row
      )
    );
  };

  const handleProductSelect = (rowId: string, product: ProductSuggestion) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              title: product.name,
              description: product.description,
              link: product.link,
              quantity: product.quantity.toString(),
              estimatedCost: product.estimatedCost.toString(),
              vendorName: product.vendorName,
            }
          : row
      )
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (rowId: string) => {
    setRows((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((row) => row.id !== rowId);
    });
  };

  const validateRows = () => {
    const errors: RowErrorMap = {};

    if (activeRows.length === 0) {
      toast.error('Add at least one row with data');
      return errors;
    }

    activeRows.forEach((row) => {
      const missing: string[] = [];
      if (row.title.trim() === '') missing.push('item name');
      if (row.description.trim() === '') missing.push('description');
      if (row.vendorName.trim() === '') missing.push('vendor');
      if (row.link.trim() === '') missing.push('link');
      if (row.estimatedCost.trim() === '') missing.push('estimated cost');
      if (row.quantity.trim() === '') missing.push('quantity');

      const cost = parseFloat(row.estimatedCost);
      const quantity = parseInt(row.quantity, 10);

      if (!Number.isFinite(cost) || cost <= 0) {
        missing.push('valid cost');
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        missing.push('valid quantity');
      }

      if (missing.length > 0) {
        errors[row.id] = `Missing ${missing.join(', ')}`;
      }
    });

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateRows();
    if (Object.keys(errors).length > 0) {
      setRowErrors(errors);
      toast.error('Check the rows for missing information');
      return;
    }

    setRowErrors({});
    setIsSubmitting(true);

    try {
      let created = 0;
      for (const row of activeRows) {
        const normalizedTitle = row.title.trim();
        const normalizedDescription = row.description.trim();
        const normalizedVendor = row.vendorName.trim();
        const normalizedLink = row.link.trim();
        const estimatedCost = parseFloat(row.estimatedCost);
        const quantity = parseInt(row.quantity, 10);
        const priority = row.priority;

        const vendorId = await ensureVendor({ name: normalizedVendor });

        let productId: string | undefined;
        try {
          productId = await ensureProduct({
            name: normalizedTitle,
            description: normalizedDescription,
            link: normalizedLink,
            estimatedCost,
            quantity,
            vendorId,
          });
        } catch (error) {
          console.warn('ensureProduct failed for bulk row', error);
        }

        await createRequest({
          title: normalizedTitle,
          description: normalizedDescription,
          estimatedCost,
          priority,
          link: normalizedLink,
          quantity,
          vendorId,
          productId,
        });
        created += 1;
      }

      toast.success(`Created ${created} request${created === 1 ? '' : 's'}`);
      onComplete();
    } catch (error) {
      console.error('bulk request creation failed', error);
      toast.error('Failed to create all requests');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-muted">
        Use this sheet to paste or collect multiple purchase needs. Selecting an
        existing product will auto-fill the rest of the row.
      </p>

      <div className="space-y-4">
        {rows.map((row, index) => {
          const hasError = Boolean(rowErrors[row.id]);
          return (
            <div
              key={row.id}
              className={cn(
                'rounded-xl border bg-bg-tertiary p-4 md:p-6',
                hasError ? 'border-accent-error/60' : 'border-border'
              )}
            >
              <div className="flex items-center justify-between pb-4">
                <span className="text-sm font-medium text-text-primary">
                  Item {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveRow(row.id)}
                  className="text-xs text-text-muted hover:text-accent-error transition-colors disabled:opacity-50"
                  disabled={rows.length === 1}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ProductAutocomplete
                  label="Item Name *"
                  value={row.title}
                  onChange={(value) => handleRowChange(row.id, 'title', value)}
                  onProductSelect={(product) => handleProductSelect(row.id, product)}
                  vendorFilter={row.vendorName}
                  placeholder="Search saved products"
                />
                <div>
                  <label className="block mb-2 text-sm font-medium text-text-primary">
                    Vendor *
                  </label>
                  <Input
                    value={row.vendorName}
                    onChange={(event) =>
                      handleRowChange(row.id, 'vendorName', event.target.value)
                    }
                    list="bulk-vendor-suggestions"
                    placeholder="e.g. Amazon"
                  />
                  {vendorSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {vendorSuggestions.slice(0, 5).map((vendor) => (
                        <button
                          type="button"
                          key={`${row.id}-${vendor}`}
                          onClick={() => handleRowChange(row.id, 'vendorName', vendor)}
                          className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted hover:border-accent hover:text-accent transition-colors"
                        >
                          {vendor}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-text-primary">
                    Description *
                  </label>
                  <Textarea
                    value={row.description}
                    onChange={(event) =>
                      handleRowChange(row.id, 'description', event.target.value)
                    }
                    rows={3}
                    placeholder="Details, specs, intended use"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-text-primary">
                      Quantity *
                    </label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={row.quantity}
                      onChange={(event) =>
                        handleRowChange(row.id, 'quantity', event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-text-primary">
                      Est. Cost *
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.estimatedCost}
                      onChange={(event) =>
                        handleRowChange(row.id, 'estimatedCost', event.target.value)
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-text-primary">
                      Priority
                    </label>
                    <Select
                      value={row.priority}
                      onChange={(event) =>
                        handleRowChange(row.id, 'priority', event.target.value as Priority)
                      }
                      options={priorityOptions}
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-text-primary">
                      Item Link *
                    </label>
                    <Input
                      value={row.link}
                      onChange={(event) =>
                        handleRowChange(row.id, 'link', event.target.value)
                      }
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              {hasError && (
                <p className="mt-3 text-xs text-accent-error">{rowErrors[row.id]}</p>
              )}
            </div>
          );
        })}
      </div>

      {vendorSuggestions.length > 0 && (
        <datalist id="bulk-vendor-suggestions">
          {vendorSuggestions.map((vendor) => (
            <option key={vendor} value={vendor} />
          ))}
        </datalist>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Button
          type="button"
          variant="secondary"
          icon={<Plus size={16} />}
          onClick={handleAddRow}
        >
          Add Row
        </Button>
        <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Back to Single Form
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Saving...'
              : `Create ${activeRows.length || '0'} Request${activeRows.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
