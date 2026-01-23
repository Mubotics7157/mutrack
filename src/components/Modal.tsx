import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
}: ModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Desktop: Centered Modal */}
      <div className="hidden md:flex fixed inset-0 items-center justify-center p-4">
        <div
          className={cn(
            'relative w-full bg-bg-secondary border border-border rounded-2xl shadow-xl',
            'max-h-[85vh] overflow-hidden animate-fade-in-scale',
            sizeClasses[size]
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {/* Header */}
          {(title || onClose) && (
            <div className="flex items-start justify-between p-6 border-b border-border-subtle">
              <div>
                {title && (
                  <h2 id="modal-title" className="text-xl font-semibold text-text-primary">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-1 text-sm text-text-secondary">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 -m-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile: Bottom Sheet */}
      <div className="md:hidden fixed inset-x-0 bottom-0">
        <div
          className={cn(
            'bg-bg-secondary border-t border-border rounded-t-2xl shadow-xl',
            'max-h-[90vh] overflow-hidden',
            'animate-slide-up'
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title-mobile' : undefined}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Handle bar */}
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>

          {/* Header */}
          {(title || onClose) && (
            <div className="flex items-start justify-between px-5 pb-4 border-b border-border-subtle">
              <div>
                {title && (
                  <h2 id="modal-title-mobile" className="text-lg font-semibold text-text-primary">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-1 text-sm text-text-secondary">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 -m-2 text-text-muted hover:text-text-primary rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="px-5 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Sheet component - always bottom sheet style
interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Sheet({ isOpen, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 bg-bg-secondary border-t border-border rounded-t-2xl shadow-xl max-h-[90vh] overflow-hidden animate-slide-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pb-4 border-b border-border-subtle">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -m-2 text-text-muted hover:text-text-primary rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-4 overflow-y-auto max-h-[calc(90vh-100px)]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
