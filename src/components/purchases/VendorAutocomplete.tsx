import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

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
  placeholder = "e.g., amazon, mcmaster-carr",
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
        <label className="block text-sm text-text-muted">
          {label}
          {required ? " *" : ""}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // delay blur to allow click on suggestion
            setTimeout(() => setIsFocused(false), 150);
          }}
          className="input-modern"
          placeholder={placeholder}
          required={required}
          disabled={disabled}
        />
        {value && isFocused && suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border-glass bg-void-black/95 shadow-xl">
            {suggestions.map((vendor: any) => (
              <button
                type="button"
                key={vendor._id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(vendor.name)}
                className="block w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-white/10"
              >
                {vendor.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {normalizedQuickPicks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-text-muted">
            quick picks
          </span>
          {normalizedQuickPicks.slice(0, 6).map((vendor) => (
            <button
              type="button"
              key={vendor.toLowerCase()}
              onClick={() => handleSelect(vendor)}
              className="rounded-full border border-border-glass px-3 py-1 text-xs text-text-secondary hover:border-sunset-orange hover:text-sunset-orange"
            >
              {vendor}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
