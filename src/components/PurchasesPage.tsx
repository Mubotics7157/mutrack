import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { RequestsList } from "./purchases/RequestsList";
import { OrdersList } from "./purchases/OrdersList";
import { OutstandingSummary } from "./purchases/OutstandingSummary";
import { PurchaseOrderWizard } from "./purchases/PurchaseOrderWizard";
import { OrderPlacementModal } from "./purchases/OrderPlacementModal";

interface PurchasesPageProps {
  member: Doc<"members">;
}

type ViewType = "requests" | "orders" | "summary";

type RequestFormState = {
  title: string;
  description: string;
  estimatedCost: string;
  priority: "low" | "medium" | "high";
  link: string;
  quantity: string;
  vendorName: string;
};

const INITIAL_REQUEST_FORM: RequestFormState = {
  title: "",
  description: "",
  estimatedCost: "",
  priority: "medium",
  link: "",
  quantity: "1",
  vendorName: "",
};

export function PurchasesPage({ member }: PurchasesPageProps) {
  const [activeView, setActiveView] = useState<ViewType>("requests");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [requestSort, setRequestSort] = useState<"recent" | "vendor">(
    "recent"
  );
  const [orderBeingPlaced, setOrderBeingPlaced] = useState<any | null>(null);
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [requestForm, setRequestForm] = useState<RequestFormState>(
    INITIAL_REQUEST_FORM
  );

  const requests = useQuery(api.purchases.getPurchaseRequests) || [];
  const orders = useQuery(api.purchases.getPurchaseOrders) || [];

  const createRequest = useMutation(api.purchases.createPurchaseRequest);
  const updateRequestStatus = useMutation(api.purchases.updateRequestStatus);
  const createOrder = useMutation(api.purchases.createPurchaseOrder);
  const ensureVendor = useMutation(api.purchases.ensureVendor);
  const generateUploadUrl = useMutation(api.purchases.generateUploadUrl);
  const markOrderPlaced = useMutation(api.purchases.markPurchaseOrderPlaced);

  const canManageOrders = member.role === "admin" || member.role === "lead";

  const stats = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      totalOrders: orders.length,
    }),
    [requests, orders]
  );

  const sortedRequests = useMemo(() => {
    const copy = [...requests];
    if (requestSort === "vendor") {
      return copy.sort((a, b) => {
        const vendorA = (a.vendorName || "").toLowerCase();
        const vendorB = (b.vendorName || "").toLowerCase();
        if (vendorA === vendorB) {
          return (b.requestedAt || 0) - (a.requestedAt || 0);
        }
        return vendorA.localeCompare(vendorB);
      });
    }

    return copy.sort(
      (a, b) => (b.requestedAt || 0) - (a.requestedAt || 0)
    );
  }, [requests, requestSort]);

  const approvedRequests = useMemo(
    () => requests.filter((r) => r.status === "approved"),
    [requests]
  );

  const outstandingRequests = useMemo(
    () =>
      requests.filter(
        (r) => r.status === "pending" || r.status === "approved"
      ),
    [requests]
  );

  const vendorResults =
    useQuery(api.purchases.searchVendors, { q: requestForm.vendorName }) || [];

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
      setRequestForm(INITIAL_REQUEST_FORM);
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

  const handleWizardCreateOrder = async ({
    requestIds,
    vendor,
    totalCost,
    cartLink,
    notes,
  }: {
    requestIds: string[];
    vendor: string;
    totalCost: number;
    cartLink?: string;
    notes?: string;
  }) => {
    await createOrder({
      requestIds: requestIds as any,
      vendor,
      totalCost,
      cartLink,
      notes,
    });
  };

  const handlePlacementSubmit = async ({
    orderId,
    file,
    placementNotes,
    totalCost,
  }: {
    orderId: string;
    file?: File | null;
    placementNotes?: string;
    totalCost?: number | null;
  }) => {
    try {
      let confirmationImageId: string | undefined;

      if (file) {
        const uploadUrl = await generateUploadUrl();

        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error("upload failed");
        }

        const { storageId } = await result.json();
        confirmationImageId = storageId;
      }

      const normalizedNotes = placementNotes?.trim();
      const normalizedTotal =
        typeof totalCost === "number" && !Number.isNaN(totalCost)
          ? totalCost
          : undefined;

      await markOrderPlaced({
        orderId: orderId as any,
        confirmationImageId: confirmationImageId as any,
        placementNotes: normalizedNotes ? normalizedNotes : undefined,
        totalCost: normalizedTotal,
      });

      toast.success("order marked as placed");
      setShowPlacementModal(false);
      setOrderBeingPlaced(null);
    } catch (error) {
      toast.error("failed to place order");
      throw error;
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
          <div className="flex flex-col gap-3">
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
              <button
                onClick={() => setActiveView("summary")}
                className={`px-6 py-2 rounded-full text-sm font-mono transition-all ${
                  activeView === "summary"
                    ? "bg-sunset-orange text-void-black"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                outstanding ({outstandingRequests.length})
              </button>
            </div>

            {activeView === "requests" && (
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
                <span>sort</span>
                <div className="flex overflow-hidden rounded-full border border-border-glass">
                  <button
                    type="button"
                    onClick={() => setRequestSort("recent")}
                    className={`px-3 py-1 text-xs font-mono transition-colors ${
                      requestSort === "recent"
                        ? "bg-sunset-orange text-void-black"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    recent
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestSort("vendor")}
                    className={`px-3 py-1 text-xs font-mono transition-colors ${
                      requestSort === "vendor"
                        ? "bg-sunset-orange text-void-black"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    vendor
                  </button>
                </div>
              </div>
            )}
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
                onClick={() => setShowOrderForm(true)}
                className="btn-modern"
              >
                create order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Request Form Modal */}
      <Modal
        isOpen={showRequestForm}
        onClose={() => setShowRequestForm(false)}
        title="new purchase request"
        maxWidthClassName="max-w-2xl"
      >
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
      </Modal>

      <PurchaseOrderWizard
        isOpen={showOrderForm}
        onClose={() => setShowOrderForm(false)}
        approvedRequests={approvedRequests}
        ensureVendor={ensureVendor}
        createOrder={handleWizardCreateOrder}
      />

      {/* Content based on active view */}
      {activeView === "requests" && (
        <RequestsList
          requests={sortedRequests}
          canManageOrders={canManageOrders}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
      {activeView === "orders" && (
        <OrdersList
          orders={orders}
          canManageOrders={canManageOrders}
          onOpenPlacement={(order) => {
            setOrderBeingPlaced(order);
            setShowPlacementModal(true);
          }}
        />
      )}
      {activeView === "summary" && (
        <OutstandingSummary requests={requests} />
      )}

      <OrderPlacementModal
        order={orderBeingPlaced}
        isOpen={showPlacementModal}
        onClose={() => {
          setShowPlacementModal(false);
          setOrderBeingPlaced(null);
        }}
        onSubmit={handlePlacementSubmit}
      />
    </div>
  );
}
