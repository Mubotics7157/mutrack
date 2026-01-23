import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { RequestsList } from './purchases/RequestsList';
import { OrdersList } from './purchases/OrdersList';
import { OutstandingSummary } from './purchases/OutstandingSummary';
import { PurchaseOrderWizard } from './purchases/PurchaseOrderWizard';
import { OrderPlacementModal } from './purchases/OrderPlacementModal';
import { OrderEditModal } from './purchases/OrderEditModal';
import { PurchaseHero } from './purchases/PurchaseHero';
import { PurchaseViewToggle } from './purchases/PurchaseViewToggle';
import { PurchaseRequestFormModal, RequestFormState } from './purchases/PurchaseRequestFormModal';
import { ProductSuggestion } from './purchases/ProductAutocomplete';
import { MemberWithProfile } from '../lib/members';

interface PurchasesPageProps {
  member: MemberWithProfile;
}

type ViewType = 'requests' | 'orders' | 'summary';

const INITIAL_REQUEST_FORM: RequestFormState = {
  title: '',
  description: '',
  estimatedCost: '',
  priority: 'medium',
  link: '',
  quantity: '1',
  vendorName: '',
};

export function PurchasesPage({ member }: PurchasesPageProps) {
  const [activeView, setActiveView] = useState<ViewType>('requests');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [requestSort, setRequestSort] = useState<'recent' | 'vendor'>('recent');
  const [orderBeingPlaced, setOrderBeingPlaced] = useState<any | null>(null);
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [requestForm, setRequestForm] = useState<RequestFormState>(INITIAL_REQUEST_FORM);
  const [selectedProduct, setSelectedProduct] = useState<ProductSuggestion | null>(null);
  const [requestFormMode, setRequestFormMode] = useState<'single' | 'bulk'>('single');
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [orderBeingEdited, setOrderBeingEdited] = useState<any | null>(null);
  const [showOrderEditModal, setShowOrderEditModal] = useState(false);
  const [isOrderEditSubmitting, setIsOrderEditSubmitting] = useState(false);
  const [orderEditCandidates, setOrderEditCandidates] = useState<any[]>([]);

  const requests = useQuery(api.purchases.getPurchaseRequests) || [];
  const orders = useQuery(api.purchases.getPurchaseOrders) || [];

  useEffect(() => {
    if (showRequestForm) setRequestFormMode('single');
  }, [showRequestForm]);

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

  const canManageOrders = member.role === 'admin' || member.role === 'lead';
  const isAdmin = member.role === 'admin';

  const resetRequestFormState = () => {
    setRequestForm(INITIAL_REQUEST_FORM);
    setSelectedProduct(null);
    setEditingRequestId(null);
    setEditingProductId(null);
    setRequestFormMode('single');
  };

  const stats = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      placed: orders.filter((o) => o.status === 'placed').length,
      awaitingPlacement: orders.filter((o) => o.status !== 'placed').length,
    }),
    [requests, orders]
  );

  const heroStats = [
    { label: 'pending requests', value: stats.pending, color: 'text-amber-300' },
    { label: 'approved queue', value: stats.approved, color: 'text-emerald-300' },
    { label: 'awaiting placement', value: stats.awaitingPlacement, color: 'text-sky-300' },
    { label: 'orders placed', value: stats.placed, color: 'text-rose-300' },
  ];

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
      setShowRequestForm(false);
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
    setShowRequestForm(true);
  };

  const handleRequestDelete = async (request: any) => {
    if (!confirm('Delete this purchase request?')) return;
    try {
      await deleteRequestMutation({ requestId: request._id as any });
      toast.success('purchase request deleted');
      if (editingRequestId === request._id) {
        resetRequestFormState();
        setShowRequestForm(false);
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
      setShowPlacementModal(false);
      setOrderBeingPlaced(null);
    } catch {
      toast.error('failed to place order');
    }
  };

  const handleOrderEdit = (order: any) => {
    const orderRequestIds = new Set((order.requestIds || []).map((id: any) => id));
    const candidates = requests.filter(
      (request: any) => request.status === 'approved' || orderRequestIds.has(request._id)
    );
    setOrderEditCandidates(candidates);
    setOrderBeingEdited(order);
    setShowOrderEditModal(true);
  };

  const handleOrderDelete = async (order: any) => {
    if (!confirm('Delete this purchase order?')) return;
    try {
      await deleteOrderMutation({ orderId: order._id as any });
      toast.success('purchase order deleted');
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
    } catch {
      toast.error('failed to delete order');
    }
  };

  const handleOrderEditSubmit = async (
    form: { vendor: string; totalCost: string; cartLink: string; notes: string },
    requestIds: string[]
  ) => {
    if (!orderBeingEdited) return;

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

    setIsOrderEditSubmitting(true);
    try {
      await updateOrderDetails({
        orderId: orderBeingEdited._id as any,
        vendor,
        totalCost: parsedTotal,
        cartLink: form.cartLink.trim() === '' ? undefined : form.cartLink.trim(),
        notes: form.notes.trim() === '' ? undefined : form.notes.trim(),
        requestIds: requestIds as any,
      });
      toast.success('purchase order updated');
      setShowOrderEditModal(false);
      setOrderBeingEdited(null);
      setOrderEditCandidates([]);
    } catch {
      toast.error('failed to update order');
    } finally {
      setIsOrderEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PurchaseHero stats={heroStats} />

      <PurchaseViewToggle
        activeView={activeView}
        onViewChange={setActiveView}
        requestsCount={requests.length}
        ordersCount={orders.length}
        outstandingCount={outstandingRequests.length}
        requestSort={requestSort}
        onSortChange={setRequestSort}
        canManageOrders={canManageOrders}
        onNewRequest={() => {
          resetRequestFormState();
          setShowRequestForm(true);
        }}
        onCreateOrder={() => setShowOrderForm(true)}
      />

      <PurchaseRequestFormModal
        isOpen={showRequestForm}
        onClose={() => {
          setShowRequestForm(false);
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
        isOpen={showOrderForm}
        onClose={() => setShowOrderForm(false)}
        approvedRequests={approvedRequests}
        ensureVendor={ensureVendor}
        createOrder={handleWizardCreateOrder}
      />

      {activeView === 'requests' && (
        <RequestsList
          requests={sortedRequests}
          canManageOrders={canManageOrders}
          onStatusUpdate={handleStatusUpdate}
          isAdmin={isAdmin}
          onEdit={isAdmin ? handleRequestEdit : undefined}
          onDelete={isAdmin ? handleRequestDelete : undefined}
        />
      )}
      {activeView === 'orders' && (
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
      {activeView === 'summary' && <OutstandingSummary requests={requests} />}

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
