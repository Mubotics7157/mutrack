import { useMemo, useState } from "react";

type PurchaseRequest = {
  _id: string;
  title: string;
  status: string;
  quantity?: number;
  estimatedCost: number;
  vendorName?: string;
  requesterName?: string;
  requestedAt?: number;
  link?: string;
};

interface OutstandingSummaryProps {
  requests: PurchaseRequest[];
}

export function OutstandingSummary({ requests }: OutstandingSummaryProps) {
  const outstanding = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "pending" || request.status === "approved"
      ),
    [requests]
  );
  const [sortMode, setSortMode] = useState<"total" | "alpha">("total");

  const vendorSummaries = useMemo(() => {
    const grouped = new Map<
      string,
      { vendorName: string; requests: PurchaseRequest[]; total: number }
    >();

    outstanding.forEach((request) => {
      const vendorName = request.vendorName || "unknown vendor";
      if (!grouped.has(vendorName)) {
        grouped.set(vendorName, {
          vendorName,
          requests: [],
          total: 0,
        });
      }
      const quantity = request.quantity ?? 1;
      const subtotal = request.estimatedCost * quantity;
      const entry = grouped.get(vendorName)!;
      entry.requests.push(request);
      entry.total += subtotal;
    });

    return Array.from(grouped.values());
  }, [outstanding]);

  const sortedVendors = useMemo(() => {
    const entries = [...vendorSummaries];
    if (sortMode === "alpha") {
      return entries.sort((a, b) =>
        a.vendorName.toLowerCase().localeCompare(b.vendorName.toLowerCase())
      );
    }

    return entries.sort((a, b) => b.total - a.total);
  }, [vendorSummaries, sortMode]);

  const overallTotal = useMemo(
    () => vendorSummaries.reduce((sum, vendor) => sum + vendor.total, 0),
    [vendorSummaries]
  );

  const pendingCount = useMemo(
    () => outstanding.filter((request) => request.status === "pending").length,
    [outstanding]
  );

  if (outstanding.length === 0) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-text-muted">
          all purchase requests are either ordered or fulfilled
        </p>
        <p className="mt-2 text-sm text-text-dim">
          once new requests are submitted or approved, they will appear here with a cost breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-light mb-1">outstanding summary</h2>
            <p className="text-sm text-text-muted">
              {outstanding.length} requests awaiting purchase; {pendingCount} still pending approval.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              estimated spend
            </span>
            <div className="text-3xl font-mono text-text-secondary">
              ${overallTotal.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-text-muted">
          <span>sort vendors by</span>
          <div className="flex overflow-hidden rounded-full border border-border-glass">
            <button
              type="button"
              onClick={() => setSortMode("total")}
              className={`px-4 py-1 text-xs font-mono transition-colors ${
                sortMode === "total"
                  ? "bg-sunset-orange text-void-black"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              value
            </button>
            <button
              type="button"
              onClick={() => setSortMode("alpha")}
              className={`px-4 py-1 text-xs font-mono transition-colors ${
                sortMode === "alpha"
                  ? "bg-sunset-orange text-void-black"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              name
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sortedVendors.map((vendor) => {
          const vendorRequests = [...vendor.requests].sort((a, b) => {
            const statusBucket = (status: string) => {
              switch (status) {
                case "approved":
                  return 0;
                case "pending":
                  return 1;
                default:
                  return 2;
              }
            };
            const statusDiff = statusBucket(a.status) - statusBucket(b.status);
            if (statusDiff !== 0) return statusDiff;
            return (b.requestedAt || 0) - (a.requestedAt || 0);
          });

          return (
            <div key={vendor.vendorName} className="card-modern p-0 overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-border-glass px-6 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-light capitalize">
                    {vendor.vendorName}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {vendor.requests.length} outstanding request
                    {vendor.requests.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wide text-text-muted">
                    estimated total
                  </span>
                  <div className="text-2xl font-mono text-text-secondary">
                    ${vendor.total.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-border-glass">
                {vendorRequests.map((request) => {
                  const quantity = request.quantity ?? 1;
                  const subtotal = request.estimatedCost * quantity;
                  const requestedDate = request.requestedAt
                    ? new Date(request.requestedAt).toLocaleDateString()
                    : null;

                  return (
                    <div
                      key={request._id}
                      className="flex flex-col gap-3 px-6 py-4 text-sm md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-secondary">
                          {request.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                          <span className="capitalize">status: {request.status}</span>
                          <span>qty {quantity}</span>
                          <span>${request.estimatedCost.toFixed(2)} ea</span>
                          <span>by {request.requesterName}</span>
                          {requestedDate && <span>{requestedDate}</span>}
                        </div>
                        {request.link && (
                          <a
                            href={request.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center text-xs text-sunset-orange hover:text-sunset-orange/80"
                          >
                            view item →
                          </a>
                        )}
                      </div>
                      <div className="text-right font-mono text-text-secondary">
                        ${subtotal.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
