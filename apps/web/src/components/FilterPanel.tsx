const specialties = ["Engineering", "Design", "Data", "Security", "DevOps", "Product"] as const;

const tiers = ["Starter", "Pro", "Enterprise"] as const;

const sortOptions = [
  { value: "rating-desc", label: "Top Rated" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A-Z" },
] as const;

interface FilterPanelProps {
  specialty?: string;
  tier?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  onSpecialtyChange: (v: string | undefined) => void;
  onTierChange: (v: string | undefined) => void;
  onMinPriceChange: (v: number | undefined) => void;
  onMaxPriceChange: (v: number | undefined) => void;
  onSortChange: (v: string | undefined) => void;
}

/** Parses a price input's text; empty or non-numeric text clears the filter. */
function parsePrice(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

const priceInputClass =
  "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none";

export function FilterPanel({
  specialty,
  tier,
  minPrice,
  maxPrice,
  sort,
  onSpecialtyChange,
  onTierChange,
  onMinPriceChange,
  onMaxPriceChange,
  onSortChange,
}: FilterPanelProps) {
  return (
    <div className="lg:w-56 flex-shrink-0 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Specialty</h3>
        <div className="flex flex-wrap lg:flex-col gap-2">
          {specialties.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => onSpecialtyChange(specialty === s ? undefined : s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-left ${
                specialty === s ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Tier</h3>
        <div className="flex flex-wrap lg:flex-col gap-2">
          {tiers.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => onTierChange(tier === t ? undefined : t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-left ${
                tier === t ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Price (per month)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            aria-label="Min price"
            placeholder="Min"
            value={minPrice ?? ""}
            onChange={(e) => onMinPriceChange(parsePrice(e.target.value))}
            className={priceInputClass}
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            aria-label="Max price"
            placeholder="Max"
            value={maxPrice ?? ""}
            onChange={(e) => onMaxPriceChange(parsePrice(e.target.value))}
            className={priceInputClass}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Sort By</h3>
        <select
          value={sort ?? ""}
          onChange={(e) => onSortChange(e.target.value || undefined)}
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">Default</option>
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
