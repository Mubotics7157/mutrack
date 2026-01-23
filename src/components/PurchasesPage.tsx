import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { RequestsList } from './purchases/RequestsList';
import { OrdersList, getOrderCounts } from './purchases/OrdersList';
import { OutstandingSummary } from './purchases/OutstandingSummary';
import { PurchaseOrderWizard } from './purchases/PurchaseOrderWizard';
import { OrderPlacementModal } from './purchases/OrderPlacementModal';
import { OrderEditModal } from './purchases/OrderEditModal';
import { PurchaseStatsRow } from './purchases/PurchaseStatsRow';
import { PurchaseViewToggle } from './purchases/PurchaseViewToggle';
import { PurchaseRequestFormModal, RequestFormState } from './purchases/PurchaseRequestFormModal';
import { ProductSuggestion } from './purchases/ProductAutocomplete';
import { MemberWithProfile } from '../lib/members';
import { usePurchaseModals } from '../hooks/usePurchaseModals';

interface PurchasesPageProps {
  member: MemberWithProfile;
}

type ViewType = 'requests' | 'orders' | 'summary';
type OrderStatusFilter = 'pending' | 'placed';

const INITIAL_REQUEST_FORM: RequestFormState = {
  title: '',
  description: '',
  estimatedCost: '',
  priority: 'medium',
  link: '',
  quantity: '1',
  vendorName: '',
};

const workflowGuide = [
  {
    title: 'Submit a purchase request (any member)',
    body: "Requests should cover a single item or cart, like a McMaster cart submission or a heat gun off Amazon.",
  },
  {
    title: 'Use saved vendors and products',
    body: "Pick the vendor you plan to buy from - vendors are the companies we order from - and the product field will auto-fill from anything we've bought before. Reusing these saves time and keeps details consistent.",
  },
  {
    title: "Open an order when you're ready to buy (lead/admin)",
    body: "Once the needed requests are approved, bundle them into a purchase order. Orders almost always map to one vendor (for example, a single Amazon checkout) and capture the total cost, cart link, and any notes the buyer needs.",
  },
  {
    title: 'Mark the order as placed and close the loop',
    body: "Every new order starts in the pending state until you confirm the checkout happened. You can upload the confirmation email or receipt and add notes or the final total so everyone knows it's handled.",
    points: [
      'Pending -> waiting for the purchaser to check out.',
      'Placed -> confirmation uploaded or notes added, with the final total recorded when you have it.',
    ],
  },
];

export function PurchasesPage({ member }: PurchasesPageProps) {
  // View state
  const [activeView, setActiveView] = useState<ViewType>('requests');
  const [requestSort, setRequestSort] = useState<'recent' | 'vendor'>('recent');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  // Request form state
  const [requestForm, setRequestForm] = useState<RequestFormState>(INITIAL_REQUEST_FORM);
  const [selectedProduct, setSelectedProduct] = useState<ProductSuggestion | null>(null);
  const [requestFormMode, setRequestFormMode] = useState<'single' | 'bulk'>('single');
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Data queries
  const requests = useQuery(api.purchases.getPurchaseRequests) || [];
  const orders = useQuery(api.purchases.getPurchaseOrders) || [];

  // Modal state (extracted to hook)
  const modals = usePurchaseModals(requests as any[]);

  // Reset form mode when opening
  useEffect(() => {
    if (modals.showRequestForm) setRequestFormMode('single');
  }, [modals.showRequestForm]);

  // Mutations
  const createRequest = useMutation(api.purchases.createPurchaseRequest);
  const updateRequestStatus = useMutation(api.purchases.updateRequestStatus);
  const createOrder = useMutation(api.purchases.createPurchaseOrder);
  const ensureVendor = useMutation(api.purchases.ensureVendor);
  const ensureProduct = useMutation(api.purchases.ensureProduct);
  const generateUploadUrl = useMutation(api.purchases.generateUploadUrl);
  const markOrderPlaced = useMutation(api.purchases.markPurchaseOrderPlaced);
  const updateRequestDetails = useMutation(api.purchases.updatePurchaseRequestDetails);
  const deleteRequestMutation = useMutation(api.purchases.deletePurchaseRequest);
  const updateOrderDetails = useMutation(api.purchases.updatePurchaseOrderDetails);
  const deleteOrderMutation = useMutation(api.purchases.deletePurchaseOrder);

  // Permissions
  const canManageOrders = member.role === 'admin' || member.role === 'lead';
  const isAdmin = member.role === 'admin';

  // Computed values
  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending').length;
    const approved = requests.filter((r) => r.status === 'approved').length;
    const awaitingPlacement = orders.filter((o) => o.status !== 'placed').length;

    // Calculate outstanding total from pending + approved requests
    const outstandingTotal = requests
      .filter((r) => r.status === 'pending' || r.status === 'approved')
      .reduce((sum, r) => sum + r.estimatedCost * (r.quantity ?? 1), 0);

    return { pending, approved, awaitingPlacement, outstandingTotal };
  }, [requests, orders]);

  const orderCounts = useMemo(() => getOrderCounts(orders as any[]), [orders]);

  const sortedRequests = useMemo(() => {
    const copy = [...requests];
    if (requestSort === 'vendor') {
      return copy.sort((a, b) => {
        const vendorA = (a.vendorName || '').toLowerCase();
        const vendorB = (b.vendorName || '').toLowerCase();
        if (vendorA === vendorB) return (b.requestedAt || 0) - (a.requestedAt || 0);
        return vendorA.localeCompare(vendorB);
      });
    }
    return copy.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
  }, [requests, requestSort]);

  const approvedRequests = useMemo(() => requests.filter((r) => r.status === 'approved'), [requests]);
  const outstandingRequests = useMemo(
    () => requests.filter((r) => r.status === 'pending' || r.status === 'approved'),
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

  // Form handlers
  const resetRequestFormState = () => {
    setRequestForm(INITIAL_REQUEST_FORM);
    setSelectedProduct(null);
    setEditingRequestId(null);
    setEditingProductId(null);
    setRequestFormMode('single');
  };

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
      const estimatedCost = parseFloat(requestForm.estimatedCost || '0');
      const quantity = parseInt(requestForm.quantity || '1', 10);

      if (!Number.isFinite(estimatedCost) || estimatedCost <= 0) {
        toast.error('enter a valid estimated cost');
        return;
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        toast.error('quantity must be at least 1');
        return;
      }

      const vendorName = requestForm.vendorName.trim();
      if (!vendorName) {
        toast.error('vendor is required');
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
      } catch {}

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
        toast.success('purchase request updated');
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
        toast.success('purchase request submitted');
      }

      resetRequestFormState();
      modals.closeRequestForm();
    } catch {
      toast.error('failed to submit request');
    }
  };

  const handleRequestEdit = (request: any) => {
    setRequestFormMode('single');
    setEditingRequestId(request._id);
    setEditingProductId(request.productId ?? null);
    setRequestForm({
      title: request.title,
      description: request.description,
      estimatedCost: request.estimatedCost?.toString() || '',
      priority: request.priority,
      link: request.link || '',
      quantity: (request.quantity ?? 1).toString(),
      vendorName: request.vendorName || '',
    });
    setSelectedProduct(null);
    modals.openRequestForm();
  };

  const handleRequestDelete = async (request: any) => {
    if (!confirm('Delete this purchase request?')) return;
    try {
      await deleteRequestMutation({ requestId: request._id as any });
      toast.success('purchase request deleted');
      if (editingRequestId === request._id) {
        resetRequestFormState();
        modals.closeRequestForm();
      }
    } catch {
      toast.error('failed to delete request');
    }
  };

  const handleStatusUpdate = async (requestId: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      await updateRequestStatus({ requestId: requestId as any, status, rejectionReason: reason });
      toast.success(`request ${status}`);
    } catch {
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
    await createOrder({ requestIds: requestIds as any, vendor, totalCost, cartLink, notes });
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
        const result = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
        if (!result.ok) throw new Error('upload failed');
        const { storageId } = await result.json();
        confirmationImageId = storageId;
      }

      const normalizedNotes = placementNotes?.trim();
      const normalizedTotal = typeof totalCost === 'number' && !Number.isNaN(totalCost) ? totalCost : undefined;

      await markOrderPlaced({
        orderId: orderId as any,
        confirmationImageId: confirmationImageId as any,
        placementNotes: normalizedNotes ? normalizedNotes : undefined,
        totalCost: normalizedTotal,
      });

      toast.success('order marked as placed');
      modals.closePlacement();
    } catch {
      toast.error('failed to place order');
    }
  };

  const handleOrderDelete = async (order: any) => {
    if (!confirm('Delete this purchase order?')) return;
    try {
      await deleteOrderMutation({ orderId: order._id as any });
      toast.success('purchase order deleted');
      modals.handleOrderDeleted(order._id);
    } catch {
      toast.error('failed to delete order');
    }
  };

  const handleOrderEditSubmit = async (
    form: { vendor: string; totalCost: string; cartLink: string; notes: string },
    requestIds: string[]
  ) => {
    if (!modals.orderBeingEdited) return;

    const vendor = form.vendor.trim();
    if (!vendor) {
      toast.error('vendor is required');
      return;
    }

    const parsedTotal = parseFloat(form.totalCost || '0');
    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
      toast.error('enter a valid total cost');
      return;
    }

    if (requestIds.length === 0) {
      toast.error('select at least one line item');
      return;
    }

    modals.setOrderEditSubmitting(true);
    try {
      await updateOrderDetails({
        orderId: modals.orderBeingEdited._id as any,
        vendor,
        totalCost: parsedTotal,
        cartLink: form.cartLink.trim() === '' ? undefined : form.cartLink.trim(),
        notes: form.notes.trim() === '' ? undefined : form.notes.trim(),
        requestIds: requestIds as any,
      });
      toast.success('purchase order updated');
      modals.closeOrderEdit();
    } catch {
      toast.error('failed to update order');
    } finally {
      modals.setOrderEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pt-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Purchases</h1>
          <p className="text-sm text-text-muted mt-1">
            Keep the team supplied and every order transparent
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide((prev) => !prev)}
          className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
          aria-expanded={showGuide}
        >
          <HelpCircle size={16} />
          <span>How it works</span>
          <ChevronDown
            size={14}
            className={`transition-transform ${showGuide ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Guide */}
      {showGuide && (
        <div className="bg-bg-secondary border border-border rounded-xl p-4 md:p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              How the purchasing flow works
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Keep this checklist in mind so requests move smoothly from an idea to a confirmed order.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {workflowGuide.map((section, index) => (
              <div key={section.title} className="bg-bg-tertiary rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent text-white text-xs font-medium shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">
                      {section.title}
                    </h3>
                    <p className="text-sm text-text-muted mt-1">{section.body}</p>
                    {section.points && (
                      <ul className="list-disc pl-4 text-sm text-text-muted mt-2 space-y-1">
                        {section.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <PurchaseStatsRow
        pending={stats.pending}
        approved={stats.approved}
        awaitingPlacement={stats.awaitingPlacement}
        outstandingTotal={stats.outstandingTotal}
      />

      {/* Navigation + Controls */}
      <PurchaseViewToggle
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          setSearchTerm(''); // Reset search when switching views
        }}
        requestsCount={requests.length}
        ordersCount={orders.length}
        outstandingCount={outstandingRequests.length}
        requestSort={requestSort}
        onSortChange={setRequestSort}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        orderStatusFilter={orderStatusFilter}
        onOrderStatusFilterChange={setOrderStatusFilter}
        pendingOrdersCount={orderCounts.pending}
        placedOrdersCount={orderCounts.placed}
        canManageOrders={canManageOrders}
        onNewRequest={() => {
          resetRequestFormState();
          modals.openRequestForm();
        }}
        onCreateOrder={modals.openOrderWizard}
      />

      {/* Content */}
      {activeView === 'requests' && (
        <RequestsList
          requests={sortedRequests as any[]}
          searchTerm={searchTerm}
          canManageOrders={canManageOrders}
          onStatusUpdate={handleStatusUpdate}
          isAdmin={isAdmin}
          onEdit={isAdmin ? handleRequestEdit : undefined}
          onDelete={isAdmin ? handleRequestDelete : undefined}
        />
      )}
      {activeView === 'orders' && (
        <OrdersList
          orders={orders as any[]}
          statusFilter={orderStatusFilter}
          searchTerm={searchTerm}
          canManageOrders={canManageOrders}
          onOpenPlacement={modals.openPlacement}
          isAdmin={isAdmin}
          onEditOrder={isAdmin ? modals.openOrderEdit : undefined}
          onDeleteOrder={isAdmin ? handleOrderDelete : undefined}
        />
      )}
      {activeView === 'summary' && (
        <OutstandingSummary
          requests={requests as any[]}
          onCreateOrderForVendor={canManageOrders ? () => modals.openOrderWizard() : undefined}
        />
      )}

      {/* Modals */}
      <PurchaseRequestFormModal
        isOpen={modals.showRequestForm}
        onClose={() => {
          modals.closeRequestForm();
          resetRequestFormState();
        }}
        formMode={requestFormMode}
        onFormModeChange={setRequestFormMode}
        form={requestForm}
        onFormChange={setRequestForm}
        selectedProduct={selectedProduct}
        onProductSelect={handleSelectProduct}
        onProductClear={() => setSelectedProduct(null)}
        editingRequestId={editingRequestId}
        vendorQuickPicks={vendorQuickPicks}
        onSubmit={handleRequestSubmit}
        ensureVendor={ensureVendor}
        ensureProduct={ensureProduct}
        createRequest={async (args) => createRequest({ ...args, productId: args.productId as any })}
      />

      <PurchaseOrderWizard
        isOpen={modals.showOrderForm}
        onClose={modals.closeOrderWizard}
        approvedRequests={approvedRequests}
        ensureVendor={ensureVendor}
        createOrder={handleWizardCreateOrder}
      />

      <OrderPlacementModal
        order={modals.placementOrder}
        isOpen={modals.showPlacementModal}
        onClose={modals.closePlacement}
        onSubmit={handlePlacementSubmit}
      />

      <OrderEditModal
        order={modals.orderBeingEdited}
        isOpen={modals.showOrderEditModal}
        isSubmitting={modals.isOrderEditSubmitting}
        candidates={modals.orderEditCandidates}
        onClose={modals.closeOrderEdit}
        onSubmit={handleOrderEditSubmit}
      />
    </div>
  );
}
