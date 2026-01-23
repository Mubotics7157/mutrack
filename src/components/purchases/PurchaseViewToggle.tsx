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
  return (
    <div className="glass-panel p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-nowrap gap-1 p-1 bg-glass backdrop-blur-md border border-border-glass rounded-full w-full">
            <button
              onClick={() => onViewChange('requests')}
              className={`flex-1 px-3 md:px-6 py-2 rounded-full text-xs md:text-sm font-mono text-center whitespace-nowrap transition-all touch-feedback ${
                activeView === 'requests'
                  ? 'bg-sunset-orange text-void-black'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              requests ({requestsCount})
            </button>
            <button
              onClick={() => onViewChange('orders')}
              className={`flex-1 px-3 md:px-6 py-2 rounded-full text-xs md:text-sm font-mono text-center whitespace-nowrap transition-all touch-feedback ${
                activeView === 'orders'
                  ? 'bg-sunset-orange text-void-black'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              orders ({ordersCount})
            </button>
            <button
              onClick={() => onViewChange('summary')}
              className={`flex-1 px-3 md:px-6 py-2 rounded-full text-xs md:text-sm font-mono text-center whitespace-nowrap transition-all touch-feedback ${
                activeView === 'summary'
                  ? 'bg-sunset-orange text-void-black'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              outstanding ({outstandingCount})
            </button>
          </div>

          {activeView === 'requests' && (
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
              <span>sort</span>
              <div className="flex overflow-hidden rounded-full border border-border-glass">
                <button
                  type="button"
                  onClick={() => onSortChange('recent')}
                  className={`px-3 py-1 text-xs font-mono transition-colors touch-feedback ${
                    requestSort === 'recent'
                      ? 'bg-sunset-orange text-void-black'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  recent
                </button>
                <button
                  type="button"
                  onClick={() => onSortChange('vendor')}
                  className={`px-3 py-1 text-xs font-mono transition-colors touch-feedback ${
                    requestSort === 'vendor'
                      ? 'bg-sunset-orange text-void-black'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  vendor
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onNewRequest} className="btn-modern btn-primary touch-feedback">
            + new request
          </button>
          {canManageOrders && activeView === 'requests' && (
            <button onClick={onCreateOrder} className="btn-modern touch-feedback">
              create order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
