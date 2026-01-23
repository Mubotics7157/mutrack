import { useState } from 'react';
import { Clock, CheckCircle, ExternalLink, Pencil, Trash2, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge, Button } from '../ui';

type OrderStatus = 'pending' | 'placed';

interface OrderRequest {
  _id: string;
  title: string;
  estimatedCost: number;
  quantity?: number;
  vendorName?: string;
  requestedAt: number;
  link?: string;
}

interface Order {
  _id: string;
  vendor: string;
  status: OrderStatus;
  totalCost: number;
  orderedAt: number;
  ordererName: string;
  placedAt?: number;
  placedByName?: string;
  cartLink?: string;
  notes?: string;
  placementNotes?: string;
  confirmationImageUrl?: string;
  requests: OrderRequest[];
}

interface OrderCardProps {
  order: Order;
  canManageOrders: boolean;
  isAdmin: boolean;
  onOpenPlacement: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
  onDeleteOrder?: (order: Order) => void;
}

export function OrderCard({
  order,
  canManageOrders,
  isAdmin,
  onOpenPlacement,
  onEditOrder,
  onDeleteOrder,
}: OrderCardProps) {
  const isPending = order.status === 'pending';
  const [isExpanded, setIsExpanded] = useState(isPending);

  const lineItemsTotal = order.requests.reduce((sum, request) => {
    const quantity = request.quantity ?? 1;
    return sum + request.estimatedCost * quantity;
  }, 0);

  const orderedDate = new Date(order.orderedAt).toLocaleDateString();
  const placedDate = order.placedAt ? new Date(order.placedAt).toLocaleDateString() : null;

  const statusConfig = {
    pending: {
      icon: <Clock size={20} />,
      color: 'text-accent-warning',
      bgColor: 'bg-accent-warning/10',
      borderColor: 'border-accent-warning/20',
    },
    placed: {
      icon: <CheckCircle size={20} />,
      color: 'text-accent-success',
      bgColor: 'bg-accent-success/10',
      borderColor: 'border-accent-success/20',
    },
  };

  const config = statusConfig[order.status as OrderStatus] || statusConfig.placed;

  return (
    <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
      {/* Header with gradient for pending */}
      <div
        className={cn(
          'flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between',
          isPending && 'bg-gradient-to-r from-accent-warning/5 to-transparent'
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              config.bgColor,
              config.color
            )}
          >
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold text-text-primary capitalize">{order.vendor}</h4>
              <Badge variant={isPending ? 'warning' : 'success'}>{order.status}</Badge>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span>{order.requests.length} item{order.requests.length !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>Created {orderedDate}</span>
              <span>·</span>
              <span>by {order.ordererName}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <div className="text-right">
            <span className="text-xs text-text-muted">Order Total</span>
            <div className="text-xl font-semibold text-accent-orange">
              ${order.totalCost.toFixed(2)}
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-1">
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

      {/* Content - collapsible */}
      <div className="border-t border-border-subtle">
        {/* Toggle button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm text-text-muted hover:bg-bg-tertiary transition-colors"
        >
          <span>
            {isExpanded ? 'Hide details' : 'Show details'} · Line items: ${lineItemsTotal.toFixed(2)}
          </span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isExpanded && (
          <div className="px-5 pb-5 space-y-4">
            {/* Quick info */}
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

            {/* Notes */}
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

            {/* Items table */}
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-12 bg-bg-tertiary px-4 py-2 text-xs uppercase tracking-wide text-text-muted">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-2 text-right">Unit</span>
                <span className="col-span-2 text-right">Subtotal</span>
              </div>
              {order.requests.map((request) => {
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
                        <span>{new Date(request.requestedAt).toLocaleDateString()}</span>
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
                    <div className="col-span-2 text-right font-mono text-text-secondary">
                      {quantity}
                    </div>
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

            {/* Confirmation image */}
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
        )}
      </div>
    </div>
  );
}
