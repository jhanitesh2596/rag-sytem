import React, { useEffect } from "react";
import { CheckCircleIcon, AlertCircleIcon, CloseIcon } from "./Icons";

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === "error";
  const isSuccess = toast.type === "success";

  return (
    <div className="toast-container" role="status" aria-live="polite">
      <div className={`toast-card ${toast.type}`}>
        <div className="toast-icon">
          {isSuccess ? (
            <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
          ) : isError ? (
            <AlertCircleIcon className="w-5 h-5 text-rose-500" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          )}
        </div>
        <div className="toast-content">
          <p className="toast-title">{isError ? "Error" : isSuccess ? "Success" : "Notice"}</p>
          <p className="toast-message">{toast.text}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="toast-close"
          aria-label="Close notification"
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}
