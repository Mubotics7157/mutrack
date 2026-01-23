import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Input } from '../ui';

interface VendorAutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (vendorName: string) => void;
  quickPicks?: string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function VendorAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  quickPicks = [],
  placeholder = 'e.g., Amazon, McMaster-Carr',
  required,
  disabled,
}: VendorAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false);
  const suggestions =
    useQuery(api.purchases.searchVendors, {
      q: value,
    }) || [];

  const normalizedQuickPicks = useMemo(
    () =>
      quickPicks.filter((pick, index, arr) =>
        arr.findIndex((candidate) => candidate.toLowerCase() === pick.toLowerCase()) === index
      ),
    [quickPicks]
  );

  const handleSelect = (name: string) => {
    onChange(name);
    onSelect?.(name);
    setIsFocused(false);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-text-primary">
          {label}
          {required ? ' *' : ''}
        </label>
      )}
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // delay blur to allow click on suggestion
            setTimeout(() => setIsFocused(false), 150);
          }}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
        />
        {value && isFocused && suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-bg-elevated shadow-xl">
            {suggestions.map((vendor: any) => (
              <button
                type="button"
                key={vendor._id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(vendor.name)}
                className="block w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-hover"
              >
                {vendor.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {normalizedQuickPicks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted">
            Quick picks:
          </span>
          {normalizedQuickPicks.slice(0, 6).map((vendor) => (
            <button
              type="button"
              key={vendor.toLowerCase()}
              onClick={() => handleSelect(vendor)}
              className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary hover:border-accent hover:text-accent transition-colors"
            >
              {vendor}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
