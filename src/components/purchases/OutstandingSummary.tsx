import { useMemo, useState } from 'react';
import { ExternalLink, Package, Plus, CheckCircle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge, Button, Card } from '../ui';

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
  onCreateOrderForVendor?: (vendorName: string) => void;
}

export function OutstandingSummary({ requests, onCreateOrderForVendor }: OutstandingSummaryProps) {
  const outstanding = useMemo(
    () =>
      requests.filter(
        (request) => request.status === 'pending' || request.status === 'approved'
      ),
    [requests]
  );
  const [sortMode, setSortMode] = useState<'total' | 'alpha'>('total');

  const vendorSummaries = useMemo(() => {
    const grouped = new Map<
      string,
      {
        vendorName: string;
        requests: PurchaseRequest[];
        total: number;
        pendingCount: number;
        approvedCount: number;
      }
    >();

    outstanding.forEach((request) => {
      const vendorName = request.vendorName || 'Unknown Vendor';
      if (!grouped.has(vendorName)) {
        grouped.set(vendorName, {
          vendorName,
          requests: [],
          total: 0,
          pendingCount: 0,
          approvedCount: 0,
        });
      }
      const quantity = request.quantity ?? 1;
      const subtotal = request.estimatedCost * quantity;
      const entry = grouped.get(vendorName)!;
      entry.requests.push(request);
      entry.total += subtotal;
      if (request.status === 'pending') {
        entry.pendingCount += 1;
      } else {
        entry.approvedCount += 1;
      }
    });

    return Array.from(grouped.values());
  }, [outstanding]);

  const sortedVendors = useMemo(() => {
    const entries = [...vendorSummaries];
    if (sortMode === 'alpha') {
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
    () => outstanding.filter((request) => request.status === 'pending').length,
    [outstanding]
  );

  const approvedCount = useMemo(
    () => outstanding.filter((request) => request.status === 'approved').length,
    [outstanding]
  );

  if (outstanding.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
          <Package size={24} className="text-text-muted" />
        </div>
        <p className="text-text-muted">All purchase requests are either ordered or fulfilled</p>
        <p className="mt-2 text-sm text-text-dim">
          Once new requests are submitted or approved, they will appear here with a cost breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card className="!p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Outstanding Summary</h2>
            <p className="text-sm text-text-muted mt-1">
              {outstanding.length} requests awaiting purchase across {vendorSummaries.length} vendor
              {vendorSummaries.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-text-muted">Estimated Spend</span>
            <div className="text-2xl font-semibold text-accent-orange">
              ${overallTotal.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent-warning/10 border border-accent-warning/20">
            <Clock size={18} className="text-accent-warning shrink-0" />
            <div>
              <span className="text-lg font-semibold text-text-primary">{pendingCount}</span>
              <span className="text-sm text-text-muted ml-1">pending review</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent-success/10 border border-accent-success/20">
            <CheckCircle size={18} className="text-accent-success shrink-0" />
            <div>
              <span className="text-lg font-semibold text-text-primary">{approvedCount}</span>
              <span className="text-sm text-text-muted ml-1">ready to order</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-text-muted">Sort by:</span>
          <div className="flex rounded-lg border border-border overflow-hidden bg-bg-tertiary">
            <button
              type="button"
              onClick={() => setSortMode('total')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                sortMode === 'total'
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
              )}
            >
              Value
            </button>
            <button
              type="button"
              onClick={() => setSortMode('alpha')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                sortMode === 'alpha'
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
              )}
            >
              Name
            </button>
          </div>
        </div>
      </Card>

      {/* Vendor Cards */}
      <div className="space-y-4">
        {sortedVendors.map((vendor) => {
          const vendorRequests = [...vendor.requests].sort((a, b) => {
            const statusBucket = (status: string) => {
              switch (status) {
                case 'approved':
                  return 0;
                case 'pending':
                  return 1;
                default:
                  return 2;
              }
            };
            const statusDiff = statusBucket(a.status) - statusBucket(b.status);
            if (statusDiff !== 0) return statusDiff;
            return (b.requestedAt || 0) - (a.requestedAt || 0);
          });

          const canCreateOrder = vendor.approvedCount > 0;

          return (
            <Card key={vendor.vendorName} padding="none" className="overflow-hidden">
              {/* Vendor Header */}
              <div className="flex flex-col gap-3 border-b border-border-subtle px-6 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-text-primary capitalize">
                      {vendor.vendorName}
                    </h3>
                    <div className="flex gap-2">
                      {vendor.approvedCount > 0 && (
                        <Badge variant="success" size="sm">
                          {vendor.approvedCount} approved
                        </Badge>
                      )}
                      {vendor.pendingCount > 0 && (
                        <Badge variant="warning" size="sm">
                          {vendor.pendingCount} pending
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {vendor.requests.length} outstanding request
                    {vendor.requests.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-text-muted">Estimated Total</span>
                    <div className="text-xl font-semibold text-text-primary">
                      ${vendor.total.toFixed(2)}
                    </div>
                  </div>
                  {onCreateOrderForVendor && canCreateOrder && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Plus size={14} />}
                      onClick={() => onCreateOrderForVendor(vendor.vendorName)}
                    >
                      Create Order
                    </Button>
                  )}
                </div>
              </div>

              {/* Request Items */}
              <div className="divide-y divide-border-subtle">
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text-primary truncate">{request.title}</p>
                          <Badge variant={request.status === 'approved' ? 'success' : 'warning'}>
                            {request.status}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                          <span>qty {quantity}</span>
                          <span>·</span>
                          <span>${request.estimatedCost.toFixed(2)} ea</span>
                          <span>·</span>
                          <span>by {request.requesterName}</span>
                          {requestedDate && (
                            <>
                              <span>·</span>
                              <span>{requestedDate}</span>
                            </>
                          )}
                        </div>
                        {request.link && (
                          <a
                            href={request.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                          >
                            <ExternalLink size={12} />
                            View Item
                          </a>
                        )}
                      </div>
                      <div className="text-right font-mono font-medium text-text-primary">
                        ${subtotal.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
