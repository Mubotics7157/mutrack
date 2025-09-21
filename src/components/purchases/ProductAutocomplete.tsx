import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export interface ProductSuggestion {
  _id: string;
  name: string;
  normalizedName: string;
  description: string;
  link: string;
  estimatedCost: number;
  quantity: number;
  vendorId: string;
  vendorName: string;
}

interface ProductAutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onProductSelect: (product: ProductSuggestion) => void;
  vendorFilter?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function ProductAutocomplete({
  label,
  value,
  onChange,
  onProductSelect,
  vendorFilter,
  placeholder = "search existing products",
  disabled,
}: ProductAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false);
  const suggestions =
    useQuery(api.purchases.searchProducts, {
      q: value,
    }) || [];

  const filteredSuggestions = useMemo(() => {
    if (!vendorFilter) return suggestions as ProductSuggestion[];
    const normalizedVendor = vendorFilter.trim().toLowerCase();
    return (suggestions as ProductSuggestion[]).filter((product) =>
      (product.vendorName || "").toLowerCase().includes(normalizedVendor)
    );
  }, [suggestions, vendorFilter]);

  const handleSelect = (product: ProductSuggestion) => {
    onChange(product.name);
    onProductSelect(product);
    setIsFocused(false);
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm text-text-muted">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          className="input-modern"
          placeholder={placeholder}
          disabled={disabled}
        />
        {value && isFocused && filteredSuggestions.length > 0 && (
          <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border-glass bg-void-black/95 shadow-xl">
            {filteredSuggestions.map((product) => (
              <button
                type="button"
                key={product._id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(product)}
                className="block w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-white/10"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium">{product.name}</span>
                  <span className="ml-3 text-xs text-text-muted">
                    {product.vendorName}
                  </span>
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  ${product.estimatedCost.toFixed(2)} • qty {product.quantity}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductAutocomplete;
