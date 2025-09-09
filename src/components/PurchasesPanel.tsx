import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface PurchasesPanelProps {
  member: Doc<"members">;
}

type ViewType = "requests" | "orders";

export function PurchasesPanel({ member }: PurchasesPanelProps) {
  const [activeView, setActiveView] = useState<ViewType>("requests");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

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

  const [requestForm, setRequestForm] = useState({
    title: "",
    description: "",
    estimatedCost: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  const [orderForm, setOrderForm] = useState({
    vendor: "",
    cartLink: "",
    totalCost: "",
    notes: "",
  });

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRequest({
        title: requestForm.title,
        description: requestForm.description,
        estimatedCost: parseFloat(requestForm.estimatedCost),
        priority: requestForm.priority,
      });
      toast.success("Purchase request submitted!");
      setRequestForm({
        title: "",
        description: "",
        estimatedCost: "",
        priority: "medium",
      });
      setShowRequestForm(false);
    } catch (error) {
      toast.error("Failed to submit request");
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
      toast.success(`Request ${status}!`);
    } catch (error) {
      toast.error(`Failed to ${status} request`);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      await createOrder({
        requestId: selectedRequest._id,
        vendor: orderForm.vendor,
        cartLink: orderForm.cartLink || undefined,
        totalCost: parseFloat(orderForm.totalCost),
        notes: orderForm.notes || undefined,
      });
      toast.success("Purchase order created!");
      setOrderForm({ vendor: "", cartLink: "", totalCost: "", notes: "" });
      setShowOrderForm(false);
      setSelectedRequest(null);
    } catch (error) {
      toast.error("Failed to create order");
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

      toast.success("Order confirmation uploaded!");
    } catch (error) {
      toast.error("Failed to upload confirmation");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "approved":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "ordered":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "fulfilled":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "rejected":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "low":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">
            Purchase Management
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            Track requests and orders for team equipment
          </p>
        </div>

        <div className="flex space-x-1 bg-black/30 rounded-lg p-1">
          <button
            onClick={() => setActiveView("requests")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeView === "requests"
                ? "bg-orange-500/15 text-orange-300"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Requests ({requests.length})
          </button>
          <button
            onClick={() => setActiveView("orders")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeView === "orders"
                ? "bg-orange-500/15 text-orange-300"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Orders ({orders.length})
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={() => setShowRequestForm(true)}
          className="btn-primary"
        >
          + New Request
        </button>
        {canManageOrders && activeView === "requests" && (
          <button
            onClick={() => {
              const approvedRequests = requests.filter(
                (r) => r.status === "approved"
              );
              if (approvedRequests.length === 0) {
                toast.error("No approved requests to create orders from");
                return;
              }
              setShowOrderForm(true);
            }}
            className="btn-secondary"
          >
            Create Order
          </button>
        )}
      </div>

      {/* Request Form */}
      {showRequestForm && (
        <div className="glass-panel p-6">
          <h4 className="text-lg font-medium text-white mb-4">
            New Purchase Request
          </h4>

          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Item/Service Title *
              </label>
              <input
                type="text"
                value={requestForm.title}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, title: e.target.value })
                }
                className="input-field"
                required
                placeholder="e.g., Arduino Uno R3, Workshop Tools"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={requestForm.description}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    description: e.target.value,
                  })
                }
                className="input-field"
                rows={3}
                required
                placeholder="Detailed description, specifications, intended use..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Estimated Cost *
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
                  className="input-field"
                  required
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={requestForm.priority}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      priority: e.target.value as any,
                    })
                  }
                  className="input-field"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button type="submit" className="btn-primary">
                Submit Request
              </button>
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Order Form */}
      {showOrderForm && (
        <div className="glass-panel p-6">
          <h4 className="text-lg font-medium text-white mb-4">
            Create Purchase Order
          </h4>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Approved Request *
            </label>
            <select
              value={selectedRequest?._id || ""}
              onChange={(e) => {
                const request = requests.find((r) => r._id === e.target.value);
                setSelectedRequest(request);
              }}
              className="input-field"
              required
            >
              <option value="">Choose a request...</option>
              {requests
                .filter((r) => r.status === "approved")
                .map((request) => (
                  <option key={request._id} value={request._id}>
                    {request.title} - ${request.estimatedCost}
                  </option>
                ))}
            </select>
          </div>

          {selectedRequest && (
            <form onSubmit={handleOrderSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Vendor *
                  </label>
                  <input
                    type="text"
                    value={orderForm.vendor}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, vendor: e.target.value })
                    }
                    className="input-field"
                    required
                    placeholder="e.g., Amazon, McMaster-Carr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Total Cost *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderForm.totalCost}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, totalCost: e.target.value })
                    }
                    className="input-field"
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cart/Order Link
                </label>
                <input
                  type="url"
                  value={orderForm.cartLink}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, cartLink: e.target.value })
                  }
                  className="input-field"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={orderForm.notes}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, notes: e.target.value })
                  }
                  className="input-field"
                  rows={2}
                  placeholder="Additional notes, special instructions..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn-primary">
                  Create Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOrderForm(false);
                    setSelectedRequest(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Content based on active view */}
      {activeView === "requests" ? (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="text-gray-400">No purchase requests yet.</p>
              <p className="text-sm text-gray-500 mt-2">
                Click "New Request" to submit your first purchase request.
              </p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request._id} className="glass-panel p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-white mb-2">
                      {request.title}
                    </h4>
                    <p className="text-gray-400 text-sm mb-3">
                      {request.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}
                      >
                        {request.status.charAt(0).toUpperCase() +
                          request.status.slice(1)}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}
                      >
                        {request.priority.charAt(0).toUpperCase() +
                          request.priority.slice(1)}{" "}
                        Priority
                      </span>
                      <span className="text-gray-400">
                        ${request.estimatedCost.toFixed(2)}
                      </span>
                      <span className="text-gray-500">
                        by {request.requesterName}
                      </span>
                    </div>
                  </div>

                  {canManageOrders && request.status === "pending" && (
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() =>
                          handleStatusUpdate(request._id, "approved")
                        }
                        className="text-green-400 hover:text-green-300 px-3 py-1 rounded-lg hover:bg-green-500/10 transition-colors text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt("Rejection reason (optional):");
                          handleStatusUpdate(
                            request._id,
                            "rejected",
                            reason || undefined
                          );
                        }}
                        className="text-red-400 hover:text-red-300 px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {request.status === "rejected" && request.rejectionReason && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-3">
                    <p className="text-red-300 text-sm">
                      <strong>Rejection reason:</strong>{" "}
                      {request.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="text-gray-400">No purchase orders yet.</p>
              <p className="text-sm text-gray-500 mt-2">
                Orders will appear here once created from approved requests.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order._id} className="glass-panel p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-white mb-2">
                      {order.request?.title || "Unknown Item"}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300 mb-3">
                      <div>
                        <span className="text-gray-400">Vendor:</span>{" "}
                        {order.vendor}
                      </div>
                      <div>
                        <span className="text-gray-400">Total Cost:</span> $
                        {order.totalCost.toFixed(2)}
                      </div>
                      <div>
                        <span className="text-gray-400">Ordered by:</span>{" "}
                        {order.ordererName}
                      </div>
                      <div>
                        <span className="text-gray-400">Order Date:</span>{" "}
                        {new Date(order.orderedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {order.cartLink && (
                      <div className="mb-3">
                        <a
                          href={order.cartLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 text-sm underline"
                        >
                          View Cart/Order Link →
                        </a>
                      </div>
                    )}

                    {order.notes && (
                      <p className="text-gray-400 text-sm mb-3">
                        <strong>Notes:</strong> {order.notes}
                      </p>
                    )}

                    {order.confirmationImageUrl && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-400 mb-2">
                          Order Confirmation:
                        </p>
                        <img
                          src={order.confirmationImageUrl}
                          alt="Order confirmation"
                          className="max-w-xs rounded-lg border border-white/20"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {canManageOrders && !order.confirmationImageId && (
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-sm text-gray-400 mb-2">
                      Upload order confirmation:
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(order._id, file);
                        }
                      }}
                      className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-500/15 file:text-orange-300 hover:file:bg-orange-500/25"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
