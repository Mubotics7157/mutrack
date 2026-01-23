import { Plus, Package } from 'lucide-react';
import { Tabs, Button } from '../ui';

type ViewType = 'requests' | 'orders' | 'summary';
type SortType = 'recent' | 'vendor';

interface PurchaseViewToggleProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  requestsCount: number;
  ordersCount: number;
  outstandingCount: number;
  requestSort: SortType;
  onSortChange: (sort: SortType) => void;
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
    <div className="bg-bg-secondary border border-border rounded-xl p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <Tabs
            tabs={tabs}
            activeTab={activeView}
            onTabChange={(id) => onViewChange(id as ViewType)}
            variant="segment"
          />

          {activeView === 'requests' && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>Sort:</span>
              <div className="flex overflow-hidden rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => onSortChange('recent')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    requestSort === 'recent'
                      ? 'bg-accent text-white'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  Recent
                </button>
                <button
                  type="button"
                  onClick={() => onSortChange('vendor')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    requestSort === 'vendor'
                      ? 'bg-accent text-white'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  Vendor
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={onNewRequest}
          >
            New Request
          </Button>
          {canManageOrders && activeView === 'requests' && (
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
    </div>
  );
}
