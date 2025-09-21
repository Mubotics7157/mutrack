import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { RequestsList } from "./purchases/RequestsList";
import { OrdersList } from "./purchases/OrdersList";
import { OutstandingSummary } from "./purchases/OutstandingSummary";
import { PurchaseOrderWizard } from "./purchases/PurchaseOrderWizard";
import { OrderPlacementModal } from "./purchases/OrderPlacementModal";
import ProductAutocomplete, {
  ProductSuggestion,
} from "./purchases/ProductAutocomplete";
import { VendorAutocomplete } from "./purchases/VendorAutocomplete";
import { BulkRequestForm } from "./purchases/BulkRequestForm";
import { MemberWithProfile } from "../lib/members";
import { OrderEditModal } from "./purchases/OrderEditModal";

interface PurchasesPageProps {
  member: MemberWithProfile;
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
  const [requestSort, setRequestSort] = useState<"recent" | "vendor">("recent");
  const [orderBeingPlaced, setOrderBeingPlaced] = useState<any | null>(null);
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [requestForm, setRequestForm] =
    useState<RequestFormState>(INITIAL_REQUEST_FORM);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductSuggestion | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [requestFormMode, setRequestFormMode] =
    useState<"single" | "bulk">("single");
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [orderBeingEdited, setOrderBeingEdited] = useState<any | null>(null);
  const [showOrderEditModal, setShowOrderEditModal] = useState(false);
  const [isOrderEditSubmitting, setIsOrderEditSubmitting] = useState(false);
  const [orderEditCandidates, setOrderEditCandidates] = useState<any[]>([]);

  const workflowGuide = [
    {
      title: "submit a purchase request (any member)",
      body: "Requests should cover a single item or cart, like a McMaster cart submission or a heat gun off Amazon.",
    },
    {
      title: "use saved vendors and products",
      body: "Pick the vendor you plan to buy from - vendors are the companies we order from - and the product field will auto-fill from anything we've bought before. Reusing these saves time and keeps details consistent.",
    },
    {
      title: "open an order when you're ready to buy (lindsey/admin)",
      body: "Once the needed requests are approved, bundle them into a purchase order. Orders almost always map to one vendor (for example, a single Amazon checkout) and capture the total cost, cart link, and any notes the buyer needs.",
    },
    {
      title:
        "mark the order as placed and close the loop (almost always Eichinger)",
      body: "Every new order starts in the pending state until you confirm the checkout happened. You can upload the confirmation email or receipt and add notes or the final total so everyone knows it's handled.",
      points: [
        "Pending -> waiting for the purchaser to check out.",
        "Placed -> confirmation uploaded or notes added, with the final total recorded when you have it.",
      ],
    },
  ];

  const requests = useQuery(api.purchases.getPurchaseRequests) || [];
  const orders = useQuery(api.purchases.getPurchaseOrders) || [];

  useEffect(() => {
    if (showRequestForm) {
      setRequestFormMode("single");
    }
  }, [showRequestForm]);

  const createRequest = useMutation(api.purchases.createPurchaseRequest);
  const updateRequestStatus = useMutation(api.purchases.updateRequestStatus);
  const createOrder = useMutation(api.purchases.createPurchaseOrder);
  const ensureVendor = useMutation(api.purchases.ensureVendor);
  const ensureProduct = useMutation(api.purchases.ensureProduct);
  const generateUploadUrl = useMutation(api.purchases.generateUploadUrl);
  const markOrderPlaced = useMutation(api.purchases.markPurchaseOrderPlaced);
  const updateRequestDetails = useMutation(
    api.purchases.updatePurchaseRequestDetails
  );
  const deleteRequestMutation = useMutation(
    api.purchases.deletePurchaseRequest
  );
  const updateOrderDetails = useMutation(
    api.purchases.updatePurchaseOrderDetails
  );
  const deleteOrderMutation = useMutation(api.purchases.deletePurchaseOrder);

  const canManageOrders = member.role === "admin" || member.role === "lead";
  const isAdmin = member.role === "admin";

  const resetRequestFormState = () => {
    setRequestForm(INITIAL_REQUEST_FORM);
    setSelectedProduct(null);
    setEditingRequestId(null);
    setEditingProductId(null);
    setRequestFormMode("single");
  };

  const stats = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      placed: orders.filter((o) => o.status === "placed").length,
      awaitingPlacement: orders.filter((o) => o.status !== "placed").length,
    }),
    [requests, orders]
  );

  const heroStats = [
    {
      label: "pending requests",
      value: stats.pending,
      color: "text-amber-300",
    },
    {
      label: "approved queue",
      value: stats.approved,
      color: "text-emerald-300",
    },
    {
      label: "awaiting placement",
      value: stats.awaitingPlacement,
      color: "text-sky-300",
    },
    {
      label: "orders placed",
      value: stats.placed,
      color: "text-rose-300",
    },
  ];

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

    return copy.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
  }, [requests, requestSort]);

  const approvedRequests = useMemo(
    () => requests.filter((r) => r.status === "approved"),
    [requests]
  );

  const outstandingRequests = useMemo(
    () =>
      requests.filter((r) => r.status === "pending" || r.status === "approved"),
    [requests]
  );

  const vendorQuickPicks = useMemo(() => {
    const seen = new Set<string>();
    const picks: string[] = [];
    requests.forEach((request: any) => {
      if (!request.vendorName) return;
      const normalized = request.vendorName.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        picks.push(request.vendorName);
      }
    });
    return picks;
  }, [requests]);

  const handleSelectProduct = (product: ProductSuggestion) => {
    setSelectedProduct(product);
    setEditingProductId(product._id);
    setRequestForm((prev) => ({
      ...prev,
      title: product.name,
      description: product.description,
      estimatedCost: product.estimatedCost.toString(),
      link: product.link,
      quantity: product.quantity.toString(),
      vendorName: product.vendorName,
    }));
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const estimatedCost = parseFloat(requestForm.estimatedCost || "0");
      const quantity = parseInt(requestForm.quantity || "1", 10);

      if (!Number.isFinite(estimatedCost) || estimatedCost <= 0) {
        toast.error("enter a valid estimated cost");
        return;
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        toast.error("quantity must be at least 1");
        return;
      }

      const vendorName = requestForm.vendorName.trim();
      if (!vendorName) {
        toast.error("vendor is required");
        return;
      }

      const vendorId = await ensureVendor({ name: vendorName });

      const baseProductId = selectedProduct?._id || editingProductId || undefined;

      let productId: string | undefined = baseProductId;
      try {
        productId = await ensureProduct({
          productId: baseProductId as any,
          name: requestForm.title,
          description: requestForm.description,
          link: requestForm.link,
          estimatedCost,
          quantity,
          vendorId,
        });
      } catch (error) {
        console.warn("ensureProduct failed", error);
      }

      if (editingRequestId) {
        await updateRequestDetails({
          requestId: editingRequestId as any,
          title: requestForm.title,
          description: requestForm.description,
          estimatedCost,
          priority: requestForm.priority,
          link: requestForm.link,
          quantity,
          vendorId,
          productId: productId ? (productId as any) : undefined,
        });
        toast.success("purchase request updated");
      } else {
        await createRequest({
          title: requestForm.title,
          description: requestForm.description,
          estimatedCost,
          priority: requestForm.priority,
          link: requestForm.link,
          quantity,
          vendorId,
          productId: productId ? (productId as any) : undefined,
        });
        toast.success("purchase request submitted");
      }

      resetRequestFormState();
      setShowRequestForm(false);
    } catch (error) {
      toast.error("failed to submit request");
    }
  };

  const handleRequestEdit = (request: any) => {
    setRequestFormMode("single");
    setEditingRequestId(request._id);
    setEditingProductId(request.productId ?? null);
    setRequestForm({
      title: request.title,
      description: request.description,
      estimatedCost: request.estimatedCost?.toString() || "",
      priority: request.priority,
      link: request.link || "",
      quantity: (request.quantity ?? 1).toString(),
      vendorName: request.vendorName || "",
    });
    setSelectedProduct(null);
    setShowRequestForm(true);
  };

  const handleRequestDelete = async (request: any) => {
    if (!confirm("Delete this purchase request?")) {
      return;
    }

    try {
      await deleteRequestMutation({ requestId: request._id as any });
      toast.success("purchase request deleted");
      if (editingRequestId === request._id) {
        resetRequestFormState();
        setShowRequestForm(false);
      }
    } catch (error) {
      toast.error("failed to delete request");
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

  const handleOrderEdit = (order: any) => {
    const orderRequestIds = new Set((order.requestIds || []).map((id: any) => id));
    const candidates = requests.filter((request: any) =>
      request.status === "approved" || orderRequestIds.has(request._id)
    );
    setOrderEditCandidates(candidates);
    setOrderBeingEdited(order);
    setShowOrderEditModal(true);
  };

  const handleOrderDelete = async (order: any) => {
    if (!confirm("Delete this purchase order?")) {
      return;
    }

    try {
      await deleteOrderMutation({ orderId: order._id as any });
      toast.success("purchase order deleted");
      if (orderBeingEdited?._id === order._id) {
        setShowOrderEditModal(false);
        setOrderBeingEdited(null);
        setIsOrderEditSubmitting(false);
        setOrderEditCandidates([]);
      }
      if (orderBeingPlaced?._id === order._id) {
        setShowPlacementModal(false);
        setOrderBeingPlaced(null);
      }
    } catch (error) {
      toast.error("failed to delete order");
    }
  };

  const handleOrderEditSubmit = async (
    form: { vendor: string; totalCost: string; cartLink: string; notes: string },
    requestIds: string[]
  ) => {
    if (!orderBeingEdited) return;

    const vendor = form.vendor.trim();
    if (!vendor) {
      toast.error("vendor is required");
      return;
    }

    const parsedTotal = parseFloat(form.totalCost || "0");
    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
      toast.error("enter a valid total cost");
      return;
    }

    if (requestIds.length === 0) {
      toast.error("select at least one line item");
      return;
    }

    setIsOrderEditSubmitting(true);
    try {
      await updateOrderDetails({
        orderId: orderBeingEdited._id as any,
        vendor,
        totalCost: parsedTotal,
        cartLink: form.cartLink.trim() === "" ? undefined : form.cartLink.trim(),
        notes: form.notes.trim() === "" ? undefined : form.notes.trim(),
        requestIds: requestIds as any,
      });
      toast.success("purchase order updated");
      setShowOrderEditModal(false);
      setOrderBeingEdited(null);
      setOrderEditCandidates([]);
    } catch (error) {
      toast.error("failed to update order");
    } finally {
      setIsOrderEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero header and workflow overview */}
      <div className="glass-panel p-8 space-y-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div>
              <h1 className="text-3xl font-light">purchase management</h1>
              <p className="text-text-muted">
                keep the team supplied and every order transparent
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide((prev) => !prev)}
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-sunset-orange hover:text-sunset-orange/80 transition-colors"
              aria-expanded={showGuide}
            >
              <span>how does purchasing work</span>
              <svg
                className={`h-3 w-3 transition-transform ${showGuide ? "rotate-180" : ""}`}
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 5L6 8L9 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6 w-full md:w-auto">
            {heroStats.map((stat) => (
              <div key={stat.label} className="card-modern p-4 text-left">
                <div className={`text-2xl font-light ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-xs uppercase tracking-wide text-text-muted mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {showGuide && (
          <div className="card-modern p-6 md:p-8 space-y-6 leading-relaxed">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-text-primary">
                how the purchasing flow works
              </h2>
              <p className="text-sm text-text-muted">
                Keep this checklist in mind so requests move smoothly from an
                idea to a confirmed order.
              </p>
            </div>

            {workflowGuide.map((section) => (
              <section key={section.title} className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
                  {section.title}
                </h3>
                <p className="text-sm text-text-muted">{section.body}</p>
                {section.points && (
                  <ul className="list-disc pl-5 text-sm text-text-muted space-y-1">
                    {section.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      {/* View Toggle and Actions */}
      <div className="glass-panel p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-nowrap gap-1 p-1 bg-glass backdrop-blur-md border border-border-glass rounded-full w-full">
              <button
                onClick={() => setActiveView("requests")}
                className={`flex-1 px-3 md:px-6 py-2 rounded-full text-xs md:text-sm font-mono text-center whitespace-nowrap transition-all ${
                  activeView === "requests"
                    ? "bg-sunset-orange text-void-black"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                requests ({requests.length})
              </button>
              <button
                onClick={() => setActiveView("orders")}
                className={`flex-1 px-3 md:px-6 py-2 rounded-full text-xs md:text-sm font-mono text-center whitespace-nowrap transition-all ${
                  activeView === "orders"
                    ? "bg-sunset-orange text-void-black"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                orders ({orders.length})
              </button>
              <button
                onClick={() => setActiveView("summary")}
                className={`flex-1 px-3 md:px-6 py-2 rounded-full text-xs md:text-sm font-mono text-center whitespace-nowrap transition-all ${
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
              onClick={() => {
                resetRequestFormState();
                setShowRequestForm(true);
              }}
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
        onClose={() => {
          setShowRequestForm(false);
          resetRequestFormState();
        }}
        title={
          requestFormMode === "single"
            ? editingRequestId
              ? "edit purchase request"
              : "new purchase request"
            : "bulk add requests"
        }
        maxWidthClassName={
          requestFormMode === "single" ? "max-w-2xl" : "max-w-5xl"
        }
      >
        {requestFormMode === "single" ? (
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <ProductAutocomplete
              label="item/service *"
              value={requestForm.title}
              onChange={(value) => {
                setRequestForm({ ...requestForm, title: value });
                if (selectedProduct && value !== selectedProduct.name) {
                  setSelectedProduct(null);
                }
              }}
              onProductSelect={handleSelectProduct}
              vendorFilter={requestForm.vendorName}
            />

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

            <VendorAutocomplete
              label="vendor"
              value={requestForm.vendorName}
              onChange={(name) => {
                setSelectedProduct(null);
                setRequestForm({ ...requestForm, vendorName: name });
              }}
              onSelect={(name) =>
                setRequestForm({ ...requestForm, vendorName: name })
              }
              quickPicks={vendorQuickPicks}
              required
            />

            <div className="flex flex-col gap-3 pt-4">
              <div className="flex gap-4">
                <button type="submit" className="btn-modern btn-primary flex-1">
                  {editingRequestId ? "save changes" : "submit request"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestForm(false);
                    resetRequestFormState();
                  }}
                  className="btn-modern flex-1"
                >
                  cancel
                </button>
              </div>
              {!editingRequestId && (
                <button
                  type="button"
                  onClick={() => setRequestFormMode("bulk")}
                  className="text-xs uppercase tracking-wide text-sunset-orange hover:text-sunset-orange/80"
                >
                  need to add multiple items? switch to bulk add
                </button>
              )}
            </div>
          </form>
        ) : (
          <BulkRequestForm
            isActive={requestFormMode === "bulk"}
            ensureVendor={ensureVendor}
            ensureProduct={ensureProduct}
            createRequest={async (args) =>
              createRequest({
                ...args,
                productId: args.productId as any,
              })
            }
            vendorSuggestions={vendorQuickPicks}
            onCancel={() => setRequestFormMode("single")}
            onComplete={() => {
              setShowRequestForm(false);
              resetRequestFormState();
            }}
          />
        )}
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
          isAdmin={isAdmin}
          onEdit={isAdmin ? handleRequestEdit : undefined}
          onDelete={isAdmin ? handleRequestDelete : undefined}
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
          isAdmin={isAdmin}
          onEditOrder={isAdmin ? handleOrderEdit : undefined}
          onDeleteOrder={isAdmin ? handleOrderDelete : undefined}
        />
      )}
      {activeView === "summary" && <OutstandingSummary requests={requests} />}

      <OrderPlacementModal
        order={orderBeingPlaced}
        isOpen={showPlacementModal}
        onClose={() => {
          setShowPlacementModal(false);
          setOrderBeingPlaced(null);
        }}
        onSubmit={handlePlacementSubmit}
      />

      <OrderEditModal
        order={orderBeingEdited}
        isOpen={showOrderEditModal}
        isSubmitting={isOrderEditSubmitting}
        candidates={orderEditCandidates}
        onClose={() => {
          setShowOrderEditModal(false);
          setOrderBeingEdited(null);
          setIsOrderEditSubmitting(false);
          setOrderEditCandidates([]);
        }}
        onSubmit={handleOrderEditSubmit}
      />
    </div>
  );
}
