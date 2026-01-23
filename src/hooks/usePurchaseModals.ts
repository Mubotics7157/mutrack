import { useState } from 'react';

interface Order {
  _id: string;
  vendor: string;
  status: string;
  totalCost: number;
  requestIds?: string[];
  [key: string]: any;
}

interface PurchaseRequest {
  _id: string;
  status: string;
  [key: string]: any;
}

interface OrderEditState {
  order: Order | null;
  candidates: PurchaseRequest[];
  isSubmitting: boolean;
}

interface PlacementState {
  order: Order | null;
  isOpen: boolean;
}

export function usePurchaseModals(requests: PurchaseRequest[] = []) {
  // Request form modal
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Order wizard modal
  const [showOrderForm, setShowOrderForm] = useState(false);

  // Placement modal state
  const [placementState, setPlacementState] = useState<PlacementState>({
    order: null,
    isOpen: false,
  });

  // Order edit modal state
  const [orderEditState, setOrderEditState] = useState<OrderEditState>({
    order: null,
    candidates: [],
    isSubmitting: false,
  });

  // Request form handlers
  const openRequestForm = () => setShowRequestForm(true);
  const closeRequestForm = () => setShowRequestForm(false);

  // Order wizard handlers
  const openOrderWizard = () => setShowOrderForm(true);
  const closeOrderWizard = () => setShowOrderForm(false);

  // Placement handlers
  const openPlacement = (order: Order) => {
    setPlacementState({ order, isOpen: true });
  };

  const closePlacement = () => {
    setPlacementState({ order: null, isOpen: false });
  };

  // Order edit handlers
  const openOrderEdit = (order: Order) => {
    const orderRequestIds = new Set((order.requestIds || []).map((id: any) => String(id)));
    const candidates = requests.filter(
      (request) => request.status === 'approved' || orderRequestIds.has(String(request._id))
    );
    setOrderEditState({
      order,
      candidates,
      isSubmitting: false,
    });
  };

  const closeOrderEdit = () => {
    setOrderEditState({
      order: null,
      candidates: [],
      isSubmitting: false,
    });
  };

  const setOrderEditSubmitting = (isSubmitting: boolean) => {
    setOrderEditState((prev) => ({ ...prev, isSubmitting }));
  };

  // Handle order deletion - close related modals
  const handleOrderDeleted = (orderId: string) => {
    if (orderEditState.order?._id === orderId) {
      closeOrderEdit();
    }
    if (placementState.order?._id === orderId) {
      closePlacement();
    }
  };

  return {
    // Request form
    showRequestForm,
    openRequestForm,
    closeRequestForm,

    // Order wizard
    showOrderForm,
    openOrderWizard,
    closeOrderWizard,

    // Placement
    placementOrder: placementState.order,
    showPlacementModal: placementState.isOpen,
    openPlacement,
    closePlacement,

    // Order edit
    orderBeingEdited: orderEditState.order,
    showOrderEditModal: orderEditState.order !== null,
    orderEditCandidates: orderEditState.candidates,
    isOrderEditSubmitting: orderEditState.isSubmitting,
    openOrderEdit,
    closeOrderEdit,
    setOrderEditSubmitting,

    // Cleanup
    handleOrderDeleted,
  };
}
