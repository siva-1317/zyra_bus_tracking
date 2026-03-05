import { useEffect, useState } from "react";
import { onToast } from "../utils/toast";

export default function GlobalToast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return onToast((payload) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toastItem = {
        id,
        type: payload.type || "info",
        title: payload.title || "",
        message: payload.message || "",
      };

      setToasts((prev) => [...prev, toastItem]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    });
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="global-toast">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-card toast-${t.type}`}>
          <div className="toast-content">
            {t.title && <div className="toast-title">{t.title}</div>}
            <div className="toast-message">{t.message}</div>
          </div>
          <button
            className="toast-close"
            onClick={() => removeToast(t.id)}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
