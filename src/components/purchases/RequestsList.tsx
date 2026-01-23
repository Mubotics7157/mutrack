import { ExternalLink, FileText, Check, X, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge, Button } from '../ui';

type RequestStatus = 'pending' | 'approved' | 'ordered' | 'fulfilled' | 'rejected';

type PurchaseRequest = {
  _id: string;
  title: string;
  description: string;
  status: RequestStatus;
  priority: string;
  estimatedCost: number;
  quantity?: number;
  vendorName?: string;
  requesterName?: string;
  requestedAt?: number;
  rejectionReason?: string;
  link?: string;
  approvals?: Array<{ memberName: string; approvedAt: number }>;
  productId?: string;
};

interface RequestsListProps {
  requests: PurchaseRequest[];
  canManageOrders: boolean;
  onStatusUpdate: (
    id: string,
    status: 'approved' | 'rejected',
    reason?: string
  ) => void;
  isAdmin: boolean;
  onEdit?: (request: PurchaseRequest) => void;
  onDelete?: (request: PurchaseRequest) => void;
}

function getStatusVariant(status: RequestStatus): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
    case 'fulfilled':
      return 'success';
    case 'ordered':
      return 'default';
    case 'rejected':
      return 'error';
    default:
      return 'default';
  }
}

function getPriorityVariant(priority: string): 'default' | 'success' | 'warning' | 'error' {
  switch (priority) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
}

export function RequestsList({
  requests,
  canManageOrders,
  onStatusUpdate,
  isAdmin,
  onEdit,
  onDelete,
}: RequestsListProps) {
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

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const quantity = request.quantity ?? 1;
        const lineTotal = request.estimatedCost * quantity;
        const requestedDate = request.requestedAt
          ? new Date(request.requestedAt).toLocaleDateString()
          : null;

        return (
          <div
            key={request._id}
            className="bg-bg-secondary border border-border rounded-xl p-4"
          >
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-medium text-text-primary">{request.title}</h4>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={getStatusVariant(request.status)}>
                      {request.status}
                    </Badge>
                    <Badge variant={getPriorityVariant(request.priority)}>
                      {request.priority}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-text-muted mt-2 line-clamp-2">{request.description}</p>

                <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                  <span className="text-text-secondary font-medium">
                    ${request.estimatedCost.toFixed(2)} × {quantity}
                  </span>
                  <span className="text-accent-orange font-semibold">
                    ${lineTotal.toFixed(2)}
                  </span>
                  {request.approvals && request.approvals.length > 0 && (
                    <span className="text-xs text-accent-success">
                      {request.approvals.length} approval{request.approvals.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-text-muted">
                  <span>{request.vendorName || 'Unknown vendor'}</span>
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
                    className="inline-flex items-center gap-1 mt-2 text-xs text-accent hover:text-accent/80 transition-colors"
                  >
                    <ExternalLink size={12} />
                    View Item
                  </a>
                )}

                {request.status === 'rejected' && request.rejectionReason && (
                  <div className="mt-3 rounded-lg border border-accent-error/30 bg-accent-error/10 p-3">
                    <p className="text-sm text-accent-error">
                      <strong>Rejection reason:</strong> {request.rejectionReason}
                    </p>
                  </div>
                )}

                {request.approvals && request.approvals.length > 0 && (
                  <div className="mt-3 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-muted">
                    <span className="font-medium text-text-secondary">Approvals:</span>{' '}
                    {request.approvals.map((approval) => approval.memberName).join(', ')}
                  </div>
                )}
              </div>

              {(canManageOrders || isAdmin) && (
                <div className="flex flex-wrap gap-2 shrink-0">
                  {canManageOrders && request.status === 'pending' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Check size={14} />}
                        onClick={() => onStatusUpdate(request._id, 'approved')}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<X size={14} />}
                        className="text-accent-error hover:bg-accent-error/10"
                        onClick={() => {
                          const reason = prompt('Rejection reason (optional):');
                          onStatusUpdate(request._id, 'rejected', reason || undefined);
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  )}

                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil size={14} />}
                        onClick={() => onEdit?.(request)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        className="text-accent-error hover:bg-accent-error/10"
                        onClick={() => onDelete?.(request)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
