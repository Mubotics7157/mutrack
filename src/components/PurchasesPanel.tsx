import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { ExternalLink, Plus, ShoppingCart } from 'lucide-react';
import { MemberWithProfile } from '../lib/members';
import { Input, Textarea, Select, Button, Badge } from './ui';
import { cn } from '../lib/utils';

interface PurchasesPanelProps {
  member: MemberWithProfile;
}

type ViewType = 'requests' | 'orders';

export function PurchasesPanel({ member }: PurchasesPanelProps) {
  const [activeView, setActiveView] = useState<ViewType>('requests');
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
  const ensureVendor = useMutation(api.purchases.ensureVendor);

  const canManageOrders = member.role === 'admin' || member.role === 'lead';

  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    estimatedCost: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    link: '',
    quantity: '1',
    vendorName: '',
  });

  const [orderForm, setOrderForm] = useState({
    vendor: '',
    cartLink: '',
    totalCost: '',
    notes: '',
  });

  const vendorResults =
    useQuery(api.purchases.searchVendors, { q: requestForm.vendorName }) || [];
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
        quantity: parseInt(requestForm.quantity || '1', 10),
        vendorId,
      });
      toast.success('Purchase request submitted!');
      setRequestForm({
        title: '',
        description: '',
        estimatedCost: '',
        priority: 'medium',
        link: '',
        quantity: '1',
        vendorName: '',
      });
      setShowRequestForm(false);
    } catch (error) {
      toast.error('Failed to submit request');
    }
  };

  const handleStatusUpdate = async (
    requestId: string,
    status: 'approved' | 'rejected',
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

    try {
      await ensureVendor({ name: orderForm.vendor.trim() });
      await createOrder({
        requestIds: selectedRequestIds as any,
        vendor: orderForm.vendor,
        cartLink: orderForm.cartLink || undefined,
        totalCost: parseFloat(orderForm.totalCost),
        notes: orderForm.notes || undefined,
      });
      toast.success('Purchase order created!');
      setOrderForm({ vendor: '', cartLink: '', totalCost: '', notes: '' });
      setShowOrderForm(false);
      setSelectedRequestIds([]);
    } catch (error) {
      toast.error('Failed to create order');
    }
  };

  const handleImageUpload = async (orderId: string, file: File) => {
    try {
      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      const { storageId } = await result.json();

      await updateOrderConfirmation({
        orderId: orderId as any,
        confirmationImageId: storageId,
      });

      toast.success('Order confirmation uploaded!');
    } catch (error) {
      toast.error('Failed to upload confirmation');
    }
  };

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
      case 'fulfilled':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityVariant = (priority: string): 'default' | 'success' | 'warning' | 'error' => {
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
  };

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-text-primary">
            Purchase Management
          </h3>
          <p className="text-text-muted text-sm mt-1">
            Track requests and orders for team equipment
          </p>
        </div>

        <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
          <button
            onClick={() => setActiveView('requests')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              activeView === 'requests'
                ? 'bg-accent/15 text-accent'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            Requests ({requests.length})
          </button>
          <button
            onClick={() => setActiveView('orders')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              activeView === 'orders'
                ? 'bg-accent/15 text-accent'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            Orders ({orders.length})
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => setShowRequestForm(true)}
        >
          New Request
        </Button>
        {canManageOrders && activeView === 'requests' && (
          <Button
            variant="secondary"
            onClick={() => setShowOrderForm(true)}
          >
            Create Order
          </Button>
        )}
      </div>

      {/* Request Form */}
      {showRequestForm && (
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <h4 className="text-lg font-medium text-text-primary mb-4">
            New Purchase Request
          </h4>

          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Item/Service Title *
              </label>
              <Input
                type="text"
                value={requestForm.title}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, title: e.target.value })
                }
                required
                placeholder="e.g., Arduino Uno R3, Workshop Tools"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Description *
              </label>
              <Textarea
                value={requestForm.description}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    description: e.target.value,
                  })
                }
                rows={3}
                required
                placeholder="Detailed description, specifications, intended use..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Item Link *
                </label>
                <Input
                  type="url"
                  value={requestForm.link}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, link: e.target.value })
                  }
                  required
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Quantity *
                </label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={requestForm.quantity}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, quantity: e.target.value })
                  }
                  required
                  placeholder="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Vendor *
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={requestForm.vendorName}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      vendorName: e.target.value,
                    })
                  }
                  required
                  placeholder="e.g., Amazon, McMaster-Carr"
                />
                {requestForm.vendorName && vendorResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-bg-elevated border border-border rounded-lg max-h-48 overflow-auto shadow-xl">
                    {vendorResults.map((v: any) => (
                      <button
                        type="button"
                        key={v._id}
                        onClick={() =>
                          setRequestForm({ ...requestForm, vendorName: v.name })
                        }
                        className="block w-full text-left px-3 py-2 hover:bg-bg-hover text-sm text-text-secondary"
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Estimated Cost *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={requestForm.estimatedCost}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      estimatedCost: e.target.value,
                    })
                  }
                  required
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Priority
                </label>
                <Select
                  value={requestForm.priority}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      priority: e.target.value as any,
                    })
                  }
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                  ]}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary">
                Submit Request
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowRequestForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Order Form */}
      {showOrderForm && (
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <h4 className="text-lg font-medium text-text-primary mb-4">
            Create Purchase Order
          </h4>

          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Select Approved Requests (optional)
            </label>
            <div className="max-h-60 overflow-auto border border-border rounded-lg divide-y divide-border-subtle">
              {requests
                .filter((r) => r.status === 'approved')
                .map((r) => {
                  const checked = selectedRequestIds.includes(r._id);
                  return (
                    <label
                      key={r._id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 text-sm cursor-pointer transition-colors',
                        checked ? 'bg-accent/5' : 'hover:bg-bg-tertiary'
                      )}
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
                        className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <span className="flex-1 truncate text-text-primary">{r.title}</span>
                      <span className="text-text-muted font-mono">
                        ${r.estimatedCost.toFixed(2)}
                      </span>
                    </label>
                  );
                })}
            </div>
          </div>

          <form onSubmit={handleOrderSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Vendor *
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={orderForm.vendor}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, vendor: e.target.value })
                    }
                    required
                    placeholder="e.g., Amazon, McMaster-Carr"
                  />
                  {orderForm.vendor && vendorResultsForOrder.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-bg-elevated border border-border rounded-lg max-h-48 overflow-auto shadow-xl">
                      {vendorResultsForOrder.map((v: any) => (
                        <button
                          type="button"
                          key={v._id}
                          onClick={() =>
                            setOrderForm({ ...orderForm, vendor: v.name })
                          }
                          className="block w-full text-left px-3 py-2 hover:bg-bg-hover text-sm text-text-secondary"
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Total Cost *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={orderForm.totalCost}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, totalCost: e.target.value })
                  }
                  required
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Cart/Order Link
              </label>
              <Input
                type="url"
                value={orderForm.cartLink}
                onChange={(e) =>
                  setOrderForm({ ...orderForm, cartLink: e.target.value })
                }
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Notes
              </label>
              <Textarea
                value={orderForm.notes}
                onChange={(e) =>
                  setOrderForm({ ...orderForm, notes: e.target.value })
                }
                rows={2}
                placeholder="Additional notes, special instructions..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary">
                Create Order
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowOrderForm(false);
                  setSelectedRequestIds([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Content based on active view */}
      {activeView === 'requests' ? (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
                <ShoppingCart size={24} className="text-text-muted" />
              </div>
              <p className="text-text-muted">No purchase requests yet.</p>
              <p className="text-sm text-text-dim mt-2">
                Click "New Request" to submit your first purchase request.
              </p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request._id} className="bg-bg-secondary border border-border rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-text-primary mb-2">
                      {request.title}
                    </h4>
                    <p className="text-text-muted text-sm mb-3">
                      {request.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant={getStatusVariant(request.status)}>
                        {request.status.charAt(0).toUpperCase() +
                          request.status.slice(1)}
                      </Badge>
                      <Badge variant={getPriorityVariant(request.priority)}>
                        {request.priority.charAt(0).toUpperCase() +
                          request.priority.slice(1)}{' '}
                        Priority
                      </Badge>
                      <span className="text-text-muted font-mono">
                        ${request.estimatedCost.toFixed(2)}
                      </span>
                      <span className="text-text-muted">x{request.quantity}</span>
                      <a
                        className="inline-flex items-center gap-1 text-accent hover:text-accent/80 transition-colors"
                        href={request.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={12} />
                        Link
                      </a>
                      <span className="text-text-muted capitalize">
                        {request.vendorName}
                      </span>
                      <span className="text-text-dim">
                        by {request.requesterName}
                      </span>
                    </div>
                  </div>

                  {canManageOrders && request.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() =>
                          handleStatusUpdate(request._id, 'approved')
                        }
                        className="text-accent-success hover:text-accent-success/80 px-3 py-1 rounded-lg hover:bg-accent-success/10 transition-colors text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Rejection reason (optional):');
                          handleStatusUpdate(
                            request._id,
                            'rejected',
                            reason || undefined
                          );
                        }}
                        className="text-accent-error hover:text-accent-error/80 px-3 py-1 rounded-lg hover:bg-accent-error/10 transition-colors text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {request.status === 'rejected' && request.rejectionReason && (
                  <div className="bg-accent-error/10 border border-accent-error/30 rounded-lg p-3 mt-3">
                    <p className="text-accent-error text-sm">
                      <strong>Rejection reason:</strong>{' '}
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
            <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
                <ShoppingCart size={24} className="text-text-muted" />
              </div>
              <p className="text-text-muted">No purchase orders yet.</p>
              <p className="text-sm text-text-dim mt-2">
                Orders will appear here once created from approved requests.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order._id} className="bg-bg-secondary border border-border rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-text-primary mb-2">
                      {order.requests
                        ?.map((r: any) => r?.title)
                        .filter(Boolean)
                        .join(', ') || 'Unknown Items'}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-secondary mb-3">
                      <div>
                        <span className="text-text-muted">Vendor:</span>{' '}
                        <span className="capitalize">{order.vendor}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Total Cost:</span>{' '}
                        <span className="font-mono">${order.totalCost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Ordered by:</span>{' '}
                        {order.ordererName}
                      </div>
                      <div>
                        <span className="text-text-muted">Order Date:</span>{' '}
                        {new Date(order.orderedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {order.cartLink && (
                      <div className="mb-3">
                        <a
                          href={order.cartLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent hover:text-accent/80 text-sm transition-colors"
                        >
                          <ExternalLink size={12} />
                          View Cart/Order Link
                        </a>
                      </div>
                    )}

                    {order.notes && (
                      <p className="text-text-muted text-sm mb-3">
                        <strong>Notes:</strong> {order.notes}
                      </p>
                    )}

                    {order.confirmationImageUrl && (
                      <div className="mb-3">
                        <p className="text-sm text-text-muted mb-2">
                          Order Confirmation:
                        </p>
                        <img
                          src={order.confirmationImageUrl}
                          alt="Order confirmation"
                          className="max-w-xs rounded-lg border border-border"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {canManageOrders && !order.confirmationImageId && (
                  <div className="border-t border-border pt-4">
                    <p className="text-sm text-text-muted mb-2">
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
                      className="text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-accent/10 file:text-accent hover:file:bg-accent/20 file:cursor-pointer file:transition-colors"
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
