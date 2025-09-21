import { useMemo, useState } from "react";

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
  const [statusFilter, setStatusFilter] = useState<"pending" | "placed">(
    "pending"
  );

  const normalizedOrders = useMemo(
    () =>
      orders.map((order) => ({
        ...order,
        status: order.status || "placed",
        requests: (order.requests || []).filter(Boolean),
      })),
    [orders]
  );

  const counts = useMemo(
    () =>
      normalizedOrders.reduce(
        (acc, order) => {
          if (order.status === "pending") {
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
        statusFilter === "pending"
          ? order.status === "pending"
          : order.status !== "pending"
      ),
    [normalizedOrders, statusFilter]
  );

  if (normalizedOrders.length === 0) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-text-muted">no purchase orders yet</p>
        <p className="text-sm text-text-dim mt-2">
          orders will appear here once created from approved requests
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-xs uppercase tracking-wide text-text-muted">
          <span>pending {counts.pending}</span>
          <span>placed {counts.placed}</span>
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
          <span>view</span>
          <div className="flex overflow-hidden rounded-full border border-border-glass">
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1 text-xs font-mono transition-colors ${
                statusFilter === "pending"
                  ? "bg-sunset-orange text-void-black"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              pending
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("placed")}
              className={`px-3 py-1 text-xs font-mono transition-colors ${
                statusFilter === "placed"
                  ? "bg-sunset-orange text-void-black"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              placed
            </button>
          </div>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-text-muted">
            {statusFilter === "pending"
              ? "no pending orders to place"
              : "no placed orders yet"}
          </p>
        </div>
      ) : (
        filteredOrders.map((order) => {
          const isPending = order.status === "pending";
          const lineItemsTotal = order.requests.reduce((sum: number, request: any) => {
            const quantity = request.quantity ?? 1;
            return sum + request.estimatedCost * quantity;
          }, 0);
          const orderedDate = new Date(order.orderedAt).toLocaleDateString();
          const placedDate = order.placedAt
            ? new Date(order.placedAt).toLocaleDateString()
            : null;

          return (
            <div key={order._id} className="card-modern p-0 overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-border-glass px-6 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="text-lg font-light capitalize">{order.vendor}</h4>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                    <span>created {orderedDate}</span>
                    <span>by {order.ordererName}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <OrderStatusBadge status={order.status} />
                  <div className="text-right">
                    <span className="text-xs uppercase tracking-wide text-text-muted">
                      order total
                    </span>
                    <div className="text-xl font-mono text-text-secondary">
                      ${order.totalCost.toFixed(2)}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEditOrder?.(order)}
                        className="btn-modern"
                      >
                        edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteOrder?.(order)}
                        className="btn-modern btn-danger"
                      >
                        delete
                      </button>
                    </div>
                  )}
                  {canManageOrders && (
                    <button
                      type="button"
                      onClick={() => onOpenPlacement(order)}
                      className={`btn-modern ${isPending ? "btn-primary" : ""}`}
                    >
                      {isPending ? "place order" : "update placement"}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4 px-6 py-4">
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  {order.cartLink && (
                    <div>
                      <span className="text-text-dim">cart link:</span>{" "}
                      <a
                        href={order.cartLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sunset-orange hover:text-sunset-orange/80"
                      >
                        open →
                      </a>
                    </div>
                  )}
                  <div>
                    <span className="text-text-dim">line items total:</span>{" "}
                    <span className="font-mono text-text-secondary">
                      ${lineItemsTotal.toFixed(2)}
                    </span>
                  </div>
                  {order.placedByName && (
                    <div>
                      <span className="text-text-dim">placed by:</span>{" "}
                      <span className="text-text-secondary">{order.placedByName}</span>
                    </div>
                  )}
                  {placedDate && (
                    <div>
                      <span className="text-text-dim">placed on:</span>{" "}
                      <span className="text-text-secondary">{placedDate}</span>
                    </div>
                  )}
                </div>

                {order.notes && (
                  <div className="rounded-xl border border-border-glass px-4 py-3 text-sm text-text-muted">
                    <span className="text-text-dim">request notes:</span>{" "}
                    {order.notes}
                  </div>
                )}

                {order.placementNotes && (
                  <div className="rounded-xl border border-border-glass px-4 py-3 text-sm text-text-muted">
                    <span className="text-text-dim">placement notes:</span>{" "}
                    {order.placementNotes}
                  </div>
                )}

                <div className="overflow-hidden rounded-xl border border-border-glass">
                  <div className="grid grid-cols-12 bg-glass px-4 py-2 text-xs uppercase tracking-wide text-text-muted">
                    <span className="col-span-6">item</span>
                    <span className="col-span-2 text-right">qty</span>
                    <span className="col-span-2 text-right">unit</span>
                    <span className="col-span-2 text-right">subtotal</span>
                  </div>
                  {order.requests.map((request: any) => {
                    const quantity = request.quantity ?? 1;
                    const subtotal = request.estimatedCost * quantity;
                    return (
                      <div
                        key={request._id}
                        className="grid grid-cols-12 items-center border-t border-border-glass/60 px-4 py-3 text-sm"
                      >
                        <div className="col-span-6 min-w-0">
                          <p className="truncate text-text-secondary">{request.title}</p>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-text-muted">
                            {request.vendorName && (
                              <span className="capitalize">{request.vendorName}</span>
                            )}
                            <span>
                              requested {new Date(request.requestedAt).toLocaleDateString()}
                            </span>
                            {request.link && (
                              <a
                                href={request.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sunset-orange hover:text-sunset-orange/80"
                              >
                                view item
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2 text-right font-mono">{quantity}</div>
                        <div className="col-span-2 text-right font-mono">
                          ${request.estimatedCost.toFixed(2)}
                        </div>
                        <div className="col-span-2 text-right font-mono">
                          ${subtotal.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {order.confirmationImageUrl && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted mb-2">
                      confirmation
                    </p>
                    <img
                      src={order.confirmationImageUrl}
                      alt={`Order confirmation for ${order.vendor}`}
                      className="max-w-sm rounded-xl border border-border-glass"
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

function OrderStatusBadge({ status }: { status: string }) {
  const className = (() => {
    switch (status) {
      case "pending":
        return "badge badge-pending";
      case "placed":
        return "badge badge-ordered";
      default:
        return "badge";
    }
  })();

  return <span className={className}>{status}</span>;
}
