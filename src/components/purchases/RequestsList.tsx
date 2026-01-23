import { useMemo } from 'react';
import { FileText, Search } from 'lucide-react';
import { RequestCard, type PurchaseRequest } from './RequestCard';

interface RequestsListProps {
  requests: PurchaseRequest[];
  searchTerm: string;
  canManageOrders: boolean;
  onStatusUpdate: (id: string, status: 'approved' | 'rejected', reason?: string) => void;
  isAdmin: boolean;
  onEdit?: (request: PurchaseRequest) => void;
  onDelete?: (request: PurchaseRequest) => void;
}

export function RequestsList({
  requests,
  searchTerm,
  canManageOrders,
  onStatusUpdate,
  isAdmin,
  onEdit,
  onDelete,
}: RequestsListProps) {
  const filteredRequests = useMemo(() => {
    if (!searchTerm.trim()) return requests;

    const term = searchTerm.toLowerCase();
    return requests.filter(
      (request) =>
        request.title.toLowerCase().includes(term) ||
        request.description.toLowerCase().includes(term) ||
        request.vendorName?.toLowerCase().includes(term) ||
        request.requesterName?.toLowerCase().includes(term)
    );
  }, [requests, searchTerm]);

  if (requests.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
          <FileText size={24} className="text-text-muted" />
        </div>
        <p className="text-text-muted">No purchase requests yet</p>
        <p className="text-sm text-text-dim mt-1">
          Click "New Request" to submit your first purchase request
        </p>
      </div>
    );
  }

  if (filteredRequests.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
        <Search size={24} className="text-text-muted mx-auto mb-3" />
        <p className="text-text-muted">No requests match "{searchTerm}"</p>
        <p className="text-sm text-text-dim mt-1">Try a different search term</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredRequests.map((request) => (
        <RequestCard
          key={request._id}
          request={request}
          canManageOrders={canManageOrders}
          isAdmin={isAdmin}
          onStatusUpdate={onStatusUpdate}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

// Re-export type for convenience
export type { PurchaseRequest };
