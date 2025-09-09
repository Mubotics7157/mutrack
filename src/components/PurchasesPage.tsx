import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface PurchasesPageProps {
  member: Doc<"members">;
}

type ViewType = "requests" | "orders";

export function PurchasesPage({ member }: PurchasesPageProps) {
  const [activeView, setActiveView] = useState<ViewType>("requests");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState<Array<string>>(
    []
  );

  const requests = useQuery(api.purchases.getPurchaseRequests) || [];
  const orders = useQuery(api.purchases.getPurchaseOrders) || [];

  const createRequest = useMutation(api.purchases.createPurchaseRequest);
  const updateRequestStatus = useMutation(api.purchases.updateRequestStatus);
  const createOrder = useMutation(api.purchases.createPurchaseOrder);
  const generateUploadUrl = useMutation(api.purchases.generateUploadUrl);
  const updateOrderConfirmation = useMutation(
    api.purchases.updateOrderConfirmation
  );

  const canManageOrders = member.role === "admin" || member.role === "lead";

  // Calculate stats
  const stats = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    totalOrders: orders.length,
  };

  const [requestForm, setRequestForm] = useState({
    title: "",
    description: "",
    estimatedCost: "",
    priority: "medium" as "low" | "medium" | "high",
    link: "",
    quantity: "1",
    vendorName: "",
  });

  const [orderForm, setOrderForm] = useState({
    vendor: "",
    cartLink: "",
    totalCost: "",
    notes: "",
  });

  const vendorResults =
    useQuery(api.purchases.searchVendors, { q: requestForm.vendorName }) || [];
  const ensureVendor = useMutation(api.purchases.ensureVendor);
  const vendorResultsForOrder =
    useQuery(api.purchases.searchVendors, { q: orderForm.vendor }) || [];

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vendorId = await ensureVendor({
        name: requestForm.vendorName.trim(),
      });
      await createRequest({
        title: requestForm.title,
        description: requestForm.description,
        estimatedCost: parseFloat(requestForm.estimatedCost),
        priority: requestForm.priority,
        link: requestForm.link,
        quantity: parseInt(requestForm.quantity || "1", 10),
        vendorId,
      });
      toast.success("purchase request submitted");
      setRequestForm({
        title: "",
        description: "",
        estimatedCost: "",
        priority: "medium",
        link: "",
        quantity: "1",
        vendorName: "",
      });
      setShowRequestForm(false);
    } catch (error) {
      toast.error("failed to submit request");
    }
  };

  const handleStatusUpdate = async (
    requestId: string,
    status: "approved" | "rejected",
    reason?: string
  ) => {
    try {
      await updateRequestStatus({
        requestId: requestId as any,
        status,
        rejectionReason: reason,
      });
      toast.success(`request ${status}`);
    } catch (error) {
      toast.error(`failed to ${status} request`);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await ensureVendor({ name: orderForm.vendor.trim() });
      await createOrder({
        requestIds: selectedRequestIds as any,
        vendor: orderForm.vendor,
        cartLink: orderForm.cartLink || undefined,
        totalCost: parseFloat(orderForm.totalCost),
        notes: orderForm.notes || undefined,
      });
      toast.success("purchase order created");
      setOrderForm({ vendor: "", cartLink: "", totalCost: "", notes: "" });
      setShowOrderForm(false);
      setSelectedRequestIds([]);
    } catch (error) {
      toast.error("failed to create order");
    }
  };

  const handleImageUpload = async (orderId: string, file: File) => {
    try {
      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      await updateOrderConfirmation({
        orderId: orderId as any,
        confirmationImageId: storageId,
      });

      toast.success("order confirmation uploaded");
    } catch (error) {
      toast.error("failed to upload confirmation");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="glass-panel p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-light mb-2">purchase management</h1>
            <p className="text-text-muted">
              track requests and orders for team equipment
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="card-modern text-center">
            <div className="text-2xl font-light text-yellow-400 mb-1">
              {stats.pending}
            </div>
            <div className="text-sm text-text-muted">pending</div>
          </div>
          <div className="card-modern text-center">
            <div className="text-2xl font-light text-accent-green mb-1">
              {stats.approved}
            </div>
            <div className="text-sm text-text-muted">approved</div>
          </div>
          <div className="card-modern text-center">
            <div className="text-2xl font-light text-blue-400 mb-1">
              {stats.totalOrders}
            </div>
            <div className="text-sm text-text-muted">orders</div>
          </div>
        </div>
      </div>

      {/* View Toggle and Actions */}
      <div className="glass-panel p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-1 p-1 bg-glass backdrop-blur-md border border-border-glass rounded-full">
            <button
              onClick={() => setActiveView("requests")}
              className={`px-6 py-2 rounded-full text-sm font-mono transition-all ${
                activeView === "requests"
                  ? "bg-sunset-orange text-void-black"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              requests ({requests.length})
            </button>
            <button
              onClick={() => setActiveView("orders")}
              className={`px-6 py-2 rounded-full text-sm font-mono transition-all ${
                activeView === "orders"
                  ? "bg-sunset-orange text-void-black"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              orders ({orders.length})
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowRequestForm(!showRequestForm)}
              className="btn-modern btn-primary"
            >
              + new request
            </button>
            {canManageOrders && activeView === "requests" && (
              <button
                onClick={() => {
                  setShowOrderForm(true);
                }}
                className="btn-modern"
              >
                create order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Request Form */}
      {showRequestForm && (
        <div className="glass-panel p-8">
          <h3 className="text-xl font-light mb-6">new purchase request</h3>

          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm text-text-muted">
                item/service title *
              </label>
              <input
                type="text"
                value={requestForm.title}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, title: e.target.value })
                }
                className="input-modern"
                required
                placeholder="e.g., arduino uno r3, workshop tools"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">
                description *
              </label>
              <textarea
                value={requestForm.description}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    description: e.target.value,
                  })
                }
                className="input-modern resize-none"
                rows={3}
                required
                placeholder="detailed description, specifications, intended use..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm text-text-muted">
                  estimated cost *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={requestForm.estimatedCost}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      estimatedCost: e.target.value,
                    })
                  }
                  className="input-modern"
                  required
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-text-muted">
                  priority
                </label>
                <select
                  value={requestForm.priority}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      priority: e.target.value as any,
                    })
                  }
                  className="input-modern"
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm text-text-muted">
                  item link *
                </label>
                <input
                  type="url"
                  value={requestForm.link}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, link: e.target.value })
                  }
                  className="input-modern"
                  required
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-text-muted">
                  quantity *
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={requestForm.quantity}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, quantity: e.target.value })
                  }
                  className="input-modern"
                  required
                  placeholder="1"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm text-text-muted">
                vendor *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={requestForm.vendorName}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      vendorName: e.target.value,
                    })
                  }
                  className="input-modern"
                  required
                  placeholder="e.g., amazon, mcmaster-carr"
                />
                {requestForm.vendorName && vendorResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-void-black/95 border border-border-glass rounded-xl max-h-48 overflow-auto">
                    {vendorResults.map((v: any) => (
                      <button
                        type="button"
                        key={v._id}
                        onClick={() =>
                          setRequestForm({ ...requestForm, vendorName: v.name })
                        }
                        className="block w-full text-left px-3 py-2 hover:bg-white/10 text-sm"
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button type="submit" className="btn-modern btn-primary flex-1">
                submit request
              </button>
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="btn-modern flex-1"
              >
                cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Order Form */}
      {showOrderForm && (
        <div className="glass-panel p-8">
          <h3 className="text-xl font-light mb-6">create purchase order</h3>

          <div className="mb-4">
            <label className="block mb-2 text-sm text-text-muted">
              select approved requests to link to this order
            </label>
            <div className="max-h-60 overflow-auto border border-border-glass rounded-xl divide-y divide-border-glass">
              {requests
                .filter((r) => r.status === "approved")
                .map((r) => {
                  const checked = selectedRequestIds.includes(r._id);
                  return (
                    <label
                      key={r._id}
                      className="flex items-center gap-3 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRequestIds([
                              ...selectedRequestIds,
                              r._id,
                            ]);
                          } else {
                            setSelectedRequestIds(
                              selectedRequestIds.filter((id) => id !== r._id)
                            );
                          }
                        }}
                      />
                      <span className="flex-1 truncate">{r.title}</span>
                      <span className="text-text-muted">
                        ${r.estimatedCost.toFixed(2)}
                      </span>
                    </label>
                  );
                })}
            </div>
          </div>

          {true && (
            <form onSubmit={handleOrderSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm text-text-muted">
                    vendor *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={orderForm.vendor}
                      onChange={(e) =>
                        setOrderForm({ ...orderForm, vendor: e.target.value })
                      }
                      className="input-modern"
                      required
                      placeholder="e.g., amazon, mcmaster-carr"
                    />
                    {orderForm.vendor && vendorResultsForOrder.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-void-black/95 border border-border-glass rounded-xl max-h-48 overflow-auto">
                        {vendorResultsForOrder.map((v: any) => (
                          <button
                            type="button"
                            key={v._id}
                            onClick={() =>
                              setOrderForm({ ...orderForm, vendor: v.name })
                            }
                            className="block w-full text-left px-3 py-2 hover:bg-white/10 text-sm"
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm text-text-muted">
                    total cost *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderForm.totalCost}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, totalCost: e.target.value })
                    }
                    className="input-modern"
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm text-text-muted">
                  cart/order link
                </label>
                <input
                  type="url"
                  value={orderForm.cartLink}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, cartLink: e.target.value })
                  }
                  className="input-modern"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-text-muted">
                  notes
                </label>
                <textarea
                  value={orderForm.notes}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, notes: e.target.value })
                  }
                  className="input-modern resize-none"
                  rows={2}
                  placeholder="additional notes, special instructions..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="btn-modern btn-primary flex-1">
                  create order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOrderForm(false);
                    setSelectedRequestIds([]);
                  }}
                  className="btn-modern flex-1"
                >
                  cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Content based on active view */}
      {activeView === "requests" ? (
        <RequestsList
          requests={requests}
          canManageOrders={canManageOrders}
          onStatusUpdate={handleStatusUpdate}
        />
      ) : (
        <OrdersList
          orders={orders}
          canManageOrders={canManageOrders}
          onImageUpload={handleImageUpload}
        />
      )}
    </div>
  );
}

interface RequestsListProps {
  requests: any[];
  canManageOrders: boolean;
  onStatusUpdate: (
    id: string,
    status: "approved" | "rejected",
    reason?: string
  ) => void;
}

function RequestsList({
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
      {requests.map((request) => (
        <div key={request._id} className="card-modern">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h4 className="text-lg font-light mb-2">{request.title}</h4>
              <p className="text-sm text-text-muted mb-3">
                {request.description}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={request.status} />
                <PriorityBadge priority={request.priority} />
                <span className="text-sm text-text-secondary">
                  ${request.estimatedCost.toFixed(2)}
                </span>
                <span className="text-sm text-text-dim">
                  by {request.requesterName}
                </span>
              </div>

              {request.status === "rejected" && request.rejectionReason && (
                <div className="mt-3 p-3 bg-error-red/10 border border-error-red/30 rounded-xl">
                  <p className="text-sm text-error-red">
                    <strong>rejection reason:</strong> {request.rejectionReason}
                  </p>
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
                    onStatusUpdate(
                      request._id,
                      "rejected",
                      reason || undefined
                    );
                  }}
                  className="btn-modern btn-danger"
                >
                  reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface OrdersListProps {
  orders: any[];
  canManageOrders: boolean;
  onImageUpload: (orderId: string, file: File) => void;
}

function OrdersList({
  orders,
  canManageOrders,
  onImageUpload,
}: OrdersListProps) {
  if (orders.length === 0) {
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
      {orders.map((order) => (
        <div key={order._id} className="card-modern">
          <h4 className="text-lg font-light mb-3">
            {order.requests
              ?.map((r: any) => r?.title)
              .filter(Boolean)
              .join(", ") || "unknown items"}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="text-text-dim">vendor:</span>{" "}
              <span className="text-text-secondary">{order.vendor}</span>
            </div>
            <div>
              <span className="text-text-dim">total cost:</span>{" "}
              <span className="text-text-secondary">
                ${order.totalCost.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-text-dim">ordered by:</span>{" "}
              <span className="text-text-secondary">{order.ordererName}</span>
            </div>
            <div>
              <span className="text-text-dim">order date:</span>{" "}
              <span className="text-text-secondary">
                {new Date(order.orderedAt).toLocaleDateString().toLowerCase()}
              </span>
            </div>
          </div>

          {order.cartLink && (
            <div className="mb-3">
              <a
                href={order.cartLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sunset-orange hover:text-sunset-orange/80 text-sm underline"
              >
                view cart/order link →
              </a>
            </div>
          )}

          {order.notes && (
            <p className="text-sm text-text-muted mb-3">
              <span className="text-text-dim">notes:</span> {order.notes}
            </p>
          )}

          {order.confirmationImageUrl && (
            <div className="mb-3">
              <p className="text-sm text-text-dim mb-2">order confirmation:</p>
              <img
                src={order.confirmationImageUrl}
                alt="Order confirmation"
                className="max-w-xs rounded-xl border border-border-glass"
              />
            </div>
          )}

          {canManageOrders && !order.confirmationImageId && (
            <div className="pt-4 border-t border-border-glass">
              <p className="text-sm text-text-muted mb-2">
                upload order confirmation:
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onImageUpload(order._id, file);
                  }
                }}
                className="text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-mono file:bg-sunset-orange/15 file:text-sunset-orange hover:file:bg-sunset-orange/25 file:cursor-pointer"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getClass = () => {
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
  };

  return <span className={`badge ${getClass()}`}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const getClass = () => {
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
  };

  return <span className={`badge ${getClass()}`}>{priority} priority</span>;
}
