import { Clock, CheckCircle, Package, XCircle, ExternalLink, Check, X, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge, Button, Card } from '../ui';

type RequestStatus = 'pending' | 'approved' | 'ordered' | 'fulfilled' | 'rejected';
type Priority = 'low' | 'medium' | 'high';

export type PurchaseRequest = {
  _id: string;
  title: string;
  description: string;
  status: RequestStatus;
  priority: Priority;
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

interface RequestCardProps {
  request: PurchaseRequest;
  canManageOrders: boolean;
  isAdmin: boolean;
  onStatusUpdate: (id: string, status: 'approved' | 'rejected', reason?: string) => void;
  onEdit?: (request: PurchaseRequest) => void;
  onDelete?: (request: PurchaseRequest) => void;
}

const priorityConfig: Record<Priority, { color: string; barColor: string }> = {
  high: { color: 'text-accent-error', barColor: 'bg-accent-error' },
  medium: { color: 'text-accent-warning', barColor: 'bg-accent-warning' },
  low: { color: 'text-accent-success', barColor: 'bg-accent-success' },
};

const statusConfig: Record<RequestStatus, { icon: React.ReactNode; color: string; bgColor: string }> = {
  pending: {
    icon: <Clock size={20} />,
    color: 'text-accent-warning',
    bgColor: 'bg-accent-warning/10',
  },
  approved: {
    icon: <CheckCircle size={20} />,
    color: 'text-accent-success',
    bgColor: 'bg-accent-success/10',
  },
  ordered: {
    icon: <Package size={20} />,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
  fulfilled: {
    icon: <CheckCircle size={20} />,
    color: 'text-accent-success',
    bgColor: 'bg-accent-success/10',
  },
  rejected: {
    icon: <XCircle size={20} />,
    color: 'text-accent-error',
    bgColor: 'bg-accent-error/10',
  },
};

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

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function RequestCard({
  request,
  canManageOrders,
  isAdmin,
  onStatusUpdate,
  onEdit,
  onDelete,
}: RequestCardProps) {
  const quantity = request.quantity ?? 1;
  const lineTotal = request.estimatedCost * quantity;
  const priority = (request.priority as Priority) || 'medium';
  const status = request.status as RequestStatus;
  const statusInfo = statusConfig[status];
  const priorityInfo = priorityConfig[priority];

  const showActions = canManageOrders || isAdmin;
  const showApprovalActions = canManageOrders && status === 'pending';

  return (
    <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden group hover:border-border-glass-hover transition-colors">
      {/* Priority bar */}
      <div className={cn('h-1', priorityInfo.barColor)} />

      <div className="p-4">
        <div className="flex gap-4">
          {/* Status icon */}
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              statusInfo.bgColor,
              statusInfo.color
            )}
          >
            {statusInfo.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-medium text-text-primary truncate">{request.title}</h4>
                <p className="text-sm text-text-muted mt-1 line-clamp-2">{request.description}</p>
              </div>
              <Badge variant={getStatusVariant(status)} className="shrink-0">
                {status}
              </Badge>
            </div>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-sm">
              <span className="text-text-secondary">
                ${request.estimatedCost.toFixed(2)} × {quantity} ={' '}
                <span className="font-semibold text-accent-orange">${lineTotal.toFixed(2)}</span>
              </span>
              <span className="text-text-dim">·</span>
              <span className="text-text-muted capitalize">{request.vendorName || 'No vendor'}</span>
              {request.requestedAt && (
                <>
                  <span className="text-text-dim">·</span>
                  <span className="text-text-muted">{formatRelativeTime(request.requestedAt)}</span>
                </>
              )}
            </div>

            {/* Link */}
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

            {/* Rejection reason */}
            {status === 'rejected' && request.rejectionReason && (
              <div className="mt-3 rounded-lg border border-accent-error/30 bg-accent-error/10 p-3">
                <p className="text-sm text-accent-error">
                  <strong>Rejection reason:</strong> {request.rejectionReason}
                </p>
              </div>
            )}

            {/* Approvals */}
            {request.approvals && request.approvals.length > 0 && (
              <div className="mt-3 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-muted">
                <span className="font-medium text-text-secondary">Approvals:</span>{' '}
                {request.approvals.map((approval) => approval.memberName).join(', ')}
              </div>
            )}

            {/* Actions - visible on hover on desktop, always on mobile */}
            {showActions && (
              <div className="flex flex-wrap gap-2 mt-4 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {showApprovalActions && (
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
      </div>
    </div>
  );
}
