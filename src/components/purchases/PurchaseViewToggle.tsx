import { Plus, Package } from 'lucide-react';
import { Tabs, Button, SearchInput } from '../ui';
import { cn } from '../../lib/utils';

type ViewType = 'requests' | 'orders' | 'summary';
type SortType = 'recent' | 'vendor';
type OrderStatusFilter = 'pending' | 'placed';

interface PurchaseViewToggleProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  requestsCount: number;
  ordersCount: number;
  outstandingCount: number;
  // Request controls
  requestSort: SortType;
  onSortChange: (sort: SortType) => void;
  // Search
  searchTerm: string;
  onSearchChange: (term: string) => void;
  // Order controls
  orderStatusFilter: OrderStatusFilter;
  onOrderStatusFilterChange: (filter: OrderStatusFilter) => void;
  pendingOrdersCount: number;
  placedOrdersCount: number;
  // Permissions and actions
  canManageOrders: boolean;
  onNewRequest: () => void;
  onCreateOrder: () => void;
}

export function PurchaseViewToggle({
  activeView,
  onViewChange,
  requestsCount,
  ordersCount,
  outstandingCount,
  requestSort,
  onSortChange,
  searchTerm,
  onSearchChange,
  orderStatusFilter,
  onOrderStatusFilterChange,
  pendingOrdersCount,
  placedOrdersCount,
  canManageOrders,
  onNewRequest,
  onCreateOrder,
}: PurchaseViewToggleProps) {
  const tabs = [
    { id: 'requests', label: `Requests (${requestsCount})` },
    { id: 'orders', label: `Orders (${ordersCount})` },
    { id: 'summary', label: `Outstanding (${outstandingCount})` },
  ];

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-4">
      {/* Main navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Tabs
          tabs={tabs}
          activeTab={activeView}
          onTabChange={(id) => onViewChange(id as ViewType)}
          variant="segment"
        />

        <div className="flex gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={onNewRequest}
          >
            New Request
          </Button>
          {canManageOrders && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Package size={16} />}
              onClick={onCreateOrder}
            >
              Create Order
            </Button>
          )}
        </div>
      </div>

      {/* Context-aware controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search - shown for requests and orders */}
        {(activeView === 'requests' || activeView === 'orders') && (
          <SearchInput
            placeholder={activeView === 'requests' ? 'Search requests...' : 'Search orders...'}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onClear={() => onSearchChange('')}
            size="sm"
            className="flex-1"
          />
        )}

        {/* Sort controls for requests */}
        {activeView === 'requests' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted whitespace-nowrap">Sort:</span>
            <div className="flex overflow-hidden rounded-lg border border-border bg-bg-tertiary">
              <button
                type="button"
                onClick={() => onSortChange('recent')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  requestSort === 'recent'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                )}
              >
                Recent
              </button>
              <button
                type="button"
                onClick={() => onSortChange('vendor')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  requestSort === 'vendor'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                )}
              >
                Vendor
              </button>
            </div>
          </div>
        )}

        {/* Status filter for orders */}
        {activeView === 'orders' && (
          <div className="flex items-center gap-3">
            <div className="flex gap-3 text-xs text-text-muted">
              <span>
                Pending: <span className="text-text-primary font-medium">{pendingOrdersCount}</span>
              </span>
              <span>
                Placed: <span className="text-text-primary font-medium">{placedOrdersCount}</span>
              </span>
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden bg-bg-tertiary">
              <button
                type="button"
                onClick={() => onOrderStatusFilterChange('pending')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  orderStatusFilter === 'pending'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                )}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => onOrderStatusFilterChange('placed')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  orderStatusFilter === 'placed'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                )}
              >
                Placed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
