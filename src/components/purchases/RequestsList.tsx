import clsx from "clsx";

type RequestStatus = "pending" | "approved" | "ordered" | "fulfilled" | "rejected";

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
};

interface RequestsListProps {
  requests: PurchaseRequest[];
  canManageOrders: boolean;
  onStatusUpdate: (
    id: string,
    status: "approved" | "rejected",
    reason?: string
  ) => void;
}

export function RequestsList({
  requests,
  canManageOrders,
  onStatusUpdate,
}: RequestsListProps) {
  if (requests.length === 0) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-text-muted">no purchase requests yet</p>
        <p className="text-sm text-text-dim mt-2">
          click "new request" to submit your first purchase request
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => {
        const quantity = request.quantity ?? 1;
        const lineTotal = request.estimatedCost * quantity;
        const requestedDate = request.requestedAt
          ? new Date(request.requestedAt).toLocaleDateString()
          : null;

        return (
          <div key={request._id} className="card-modern">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <h4 className="text-lg font-light mb-2">{request.title}</h4>
                <p className="text-sm text-text-muted mb-3">{request.description}</p>

                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={request.status} />
                  <PriorityBadge priority={request.priority} />
                  <span className="text-sm text-text-secondary">
                    ${request.estimatedCost.toFixed(2)} ea
                  </span>
                  <span className="text-sm text-text-dim">qty {quantity}</span>
                  <span className="text-sm font-mono text-text-secondary">
                    ${lineTotal.toFixed(2)} total
                  </span>
                  {request.approvals && request.approvals.length > 0 && (
                    <span className="text-xs uppercase tracking-wide text-accent-green">
                      {request.approvals.length} approval
                      {request.approvals.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                  <span className="capitalize">
                    vendor: {request.vendorName || "unknown vendor"}
                  </span>
                  <span>by {request.requesterName}</span>
                  {requestedDate && <span>requested {requestedDate}</span>}
                </div>

                {request.link && (
                  <a
                    href={request.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center text-xs text-sunset-orange hover:text-sunset-orange/80"
                  >
                    view item →
                  </a>
                )}

                {request.status === "rejected" && request.rejectionReason && (
                  <div className="mt-3 rounded-xl border border-error-red/30 bg-error-red/10 p-3">
                    <p className="text-sm text-error-red">
                      <strong>rejection reason:</strong> {request.rejectionReason}
                    </p>
                  </div>
                )}
                {request.approvals && request.approvals.length > 0 && (
                  <div className="mt-3 rounded-xl border border-border-glass px-3 py-2 text-xs text-text-muted">
                    <span className="font-medium text-text-secondary">
                      approvals:
                    </span>{" "}
                    {request.approvals
                      .map((approval) => approval.memberName)
                      .join(", ")}
                  </div>
                )}
              </div>

              {canManageOrders && request.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onStatusUpdate(request._id, "approved")}
                    className="btn-modern btn-success"
                  >
                    approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt("rejection reason (optional):");
                      onStatusUpdate(request._id, "rejected", reason || undefined);
                    }}
                    className="btn-modern btn-danger"
                  >
                    reject
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const className = (() => {
    switch (status) {
      case "pending":
        return "badge-pending";
      case "approved":
        return "badge-approved";
      case "ordered":
        return "badge-ordered";
      case "fulfilled":
        return "badge-fulfilled";
      case "rejected":
        return "badge-rejected";
      default:
        return "badge";
    }
  })();

  return <span className={clsx("badge", className)}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const className = (() => {
    switch (priority) {
      case "high":
        return "badge-rejected";
      case "medium":
        return "badge-pending";
      case "low":
        return "badge-approved";
      default:
        return "badge";
    }
  })();

  return <span className={clsx("badge", className)}>{priority} priority</span>;
}
