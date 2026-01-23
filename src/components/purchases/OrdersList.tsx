import { useMemo } from 'react';
import { Package, Search } from 'lucide-react';
import { OrderCard } from './OrderCard';

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
  status: string;
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

interface OrdersListProps {
  orders: Order[];
  statusFilter: OrderStatus;
  searchTerm: string;
  canManageOrders: boolean;
  onOpenPlacement: (order: Order) => void;
  isAdmin: boolean;
  onEditOrder?: (order: Order) => void;
  onDeleteOrder?: (order: Order) => void;
}

export function OrdersList({
  orders,
  statusFilter,
  searchTerm,
  canManageOrders,
  onOpenPlacement,
  isAdmin,
  onEditOrder,
  onDeleteOrder,
}: OrdersListProps) {
  const normalizedOrders = useMemo(
    () =>
      orders.map((order) => ({
        ...order,
        status: order.status || 'placed',
        requests: (order.requests || []).filter(Boolean),
      })),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    let result = normalizedOrders.filter((order) =>
      statusFilter === 'pending' ? order.status === 'pending' : order.status !== 'pending'
    );

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (order) =>
          order.vendor.toLowerCase().includes(term) ||
          order.ordererName.toLowerCase().includes(term) ||
          order.requests.some((r) => r.title.toLowerCase().includes(term))
      );
    }

    return result;
  }, [normalizedOrders, statusFilter, searchTerm]);

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

  if (filteredOrders.length === 0) {
    if (searchTerm.trim()) {
      return (
        <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
          <Search size={24} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">No orders match "{searchTerm}"</p>
          <p className="text-sm text-text-dim mt-1">Try a different search term</p>
        </div>
      );
    }

    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
        <p className="text-text-muted">
          {statusFilter === 'pending' ? 'No pending orders to place' : 'No placed orders yet'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredOrders.map((order) => (
        <OrderCard
          key={order._id}
          order={order as any}
          canManageOrders={canManageOrders}
          isAdmin={isAdmin}
          onOpenPlacement={onOpenPlacement as any}
          onEditOrder={onEditOrder as any}
          onDeleteOrder={onDeleteOrder as any}
        />
      ))}
    </div>
  );
}

// Export order counts helper for parent component
export function getOrderCounts(orders: Order[]): { pending: number; placed: number } {
  return orders.reduce(
    (acc, order) => {
      const status = order.status || 'placed';
      if (status === 'pending') {
        acc.pending += 1;
      } else {
        acc.placed += 1;
      }
      return acc;
    },
    { pending: 0, placed: 0 }
  );
}
