import { useMemo, useState } from 'react';
import { Package, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge, Button } from '../ui';

interface OrdersListProps {
  orders: any[];
  canManageOrders: boolean;
  onOpenPlacement: (order: any) => void;
  isAdmin: boolean;
  onEditOrder?: (order: any) => void;
  onDeleteOrder?: (order: any) => void;
}

export function OrdersList({
  orders,
  canManageOrders,
  onOpenPlacement,
  isAdmin,
  onEditOrder,
  onDeleteOrder,
}: OrdersListProps) {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'placed'>('pending');

  const normalizedOrders = useMemo(
    () =>
      orders.map((order) => ({
        ...order,
        status: order.status || 'placed',
        requests: (order.requests || []).filter(Boolean),
      })),
    [orders]
  );

  const counts = useMemo(
    () =>
      normalizedOrders.reduce(
        (acc, order) => {
          if (order.status === 'pending') {
            acc.pending += 1;
          } else {
            acc.placed += 1;
          }
          return acc;
        },
        { pending: 0, placed: 0 }
      ),
    [normalizedOrders]
  );

  const filteredOrders = useMemo(
    () =>
      normalizedOrders.filter((order) =>
        statusFilter === 'pending'
          ? order.status === 'pending'
          : order.status !== 'pending'
      ),
    [normalizedOrders, statusFilter]
  );

  if (normalizedOrders.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
          <Package size={24} className="text-text-muted" />
        </div>
        <p className="text-text-muted">No purchase orders yet</p>
        <p className="text-sm text-text-dim mt-1">
          Orders will appear here once created from approved requests
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-sm text-text-muted">
          <span>Pending: <span className="text-text-primary font-medium">{counts.pending}</span></span>
          <span>Placed: <span className="text-text-primary font-medium">{counts.placed}</span></span>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden bg-bg-tertiary">
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              statusFilter === 'pending'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
            )}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('placed')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              statusFilter === 'placed'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
            )}
          >
            Placed
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
          <p className="text-text-muted">
            {statusFilter === 'pending'
              ? 'No pending orders to place'
              : 'No placed orders yet'}
          </p>
        </div>
      ) : (
        filteredOrders.map((order) => {
          const isPending = order.status === 'pending';
          const lineItemsTotal = order.requests.reduce((sum: number, request: any) => {
            const quantity = request.quantity ?? 1;
            return sum + request.estimatedCost * quantity;
          }, 0);
          const orderedDate = new Date(order.orderedAt).toLocaleDateString();
          const placedDate = order.placedAt
            ? new Date(order.placedAt).toLocaleDateString()
            : null;

          return (
            <div key={order._id} className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex flex-col gap-3 border-b border-border-subtle px-6 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-text-primary capitalize">{order.vendor}</h4>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    <span>Created {orderedDate}</span>
                    <span>·</span>
                    <span>by {order.ordererName}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <Badge variant={isPending ? 'warning' : 'success'}>
                    {order.status}
                  </Badge>
                  <div className="text-right">
                    <span className="text-xs text-text-muted">Order Total</span>
                    <div className="text-xl font-semibold text-accent-orange">
                      ${order.totalCost.toFixed(2)}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil size={14} />}
                        onClick={() => onEditOrder?.(order)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        className="text-accent-error hover:bg-accent-error/10"
                        onClick={() => onDeleteOrder?.(order)}
                      />
                    </div>
                  )}
                  {canManageOrders && (
                    <Button
                      variant={isPending ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => onOpenPlacement(order)}
                    >
                      {isPending ? 'Place Order' : 'Update'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="space-y-4 px-6 py-4">
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  {order.cartLink && (
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted">Cart:</span>
                      <a
                        href={order.cartLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent/80 flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        Open
                      </a>
                    </div>
                  )}
                  <div>
                    <span className="text-text-muted">Line items:</span>{' '}
                    <span className="font-medium text-text-secondary">
                      ${lineItemsTotal.toFixed(2)}
                    </span>
                  </div>
                  {order.placedByName && (
                    <div>
                      <span className="text-text-muted">Placed by:</span>{' '}
                      <span className="text-text-secondary">{order.placedByName}</span>
                    </div>
                  )}
                  {placedDate && (
                    <div>
                      <span className="text-text-muted">Placed on:</span>{' '}
                      <span className="text-text-secondary">{placedDate}</span>
                    </div>
                  )}
                </div>

                {order.notes && (
                  <div className="rounded-lg border border-border bg-bg-tertiary px-4 py-3 text-sm text-text-muted">
                    <span className="text-text-dim">Request notes:</span> {order.notes}
                  </div>
                )}

                {order.placementNotes && (
                  <div className="rounded-lg border border-border bg-bg-tertiary px-4 py-3 text-sm text-text-muted">
                    <span className="text-text-dim">Placement notes:</span> {order.placementNotes}
                  </div>
                )}

                {/* Items Table */}
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="grid grid-cols-12 bg-bg-tertiary px-4 py-2 text-xs uppercase tracking-wide text-text-muted">
                    <span className="col-span-6">Item</span>
                    <span className="col-span-2 text-right">Qty</span>
                    <span className="col-span-2 text-right">Unit</span>
                    <span className="col-span-2 text-right">Subtotal</span>
                  </div>
                  {order.requests.map((request: any) => {
                    const quantity = request.quantity ?? 1;
                    const subtotal = request.estimatedCost * quantity;
                    return (
                      <div
                        key={request._id}
                        className="grid grid-cols-12 items-center border-t border-border-subtle px-4 py-3 text-sm"
                      >
                        <div className="col-span-6 min-w-0">
                          <p className="truncate text-text-primary">{request.title}</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-text-muted">
                            {request.vendorName && (
                              <span className="capitalize">{request.vendorName}</span>
                            )}
                            <span>
                              {new Date(request.requestedAt).toLocaleDateString()}
                            </span>
                            {request.link && (
                              <a
                                href={request.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:text-accent/80 flex items-center gap-1"
                              >
                                <ExternalLink size={10} />
                                View
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2 text-right font-mono text-text-secondary">{quantity}</div>
                        <div className="col-span-2 text-right font-mono text-text-secondary">
                          ${request.estimatedCost.toFixed(2)}
                        </div>
                        <div className="col-span-2 text-right font-mono text-text-primary font-medium">
                          ${subtotal.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {order.confirmationImageUrl && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted mb-2">
                      Confirmation
                    </p>
                    <img
                      src={order.confirmationImageUrl}
                      alt={`Order confirmation for ${order.vendor}`}
                      className="max-w-sm rounded-lg border border-border"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
