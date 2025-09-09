import React from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  maxWidthClassName?: string; // e.g., "max-w-lg", "max-w-2xl"
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  maxWidthClassName = "max-w-lg",
  children,
}: ModalProps) {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full p-4 ${maxWidthClassName}`}
      >
        <div className="glass-panel p-8 max-h-[85vh] overflow-y-auto">
          {(title || onClose) && (
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-light">{title}</h2>
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-primary"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
