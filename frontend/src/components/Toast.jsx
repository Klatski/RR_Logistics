import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'info', timeout = 3500) => {
    const tid = ++id;
    setToasts((t) => [...t, { id: tid, message, type }]);
    if (timeout) {
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== tid));
      }, timeout);
    }
  }, []);

  const success = useCallback((m) => show(m, 'success'), [show]);
  const error = useCallback((m) => show(m, 'danger', 4500), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role="status">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastContext);
  if (!c) throw new Error('ToastProvider missing');
  return c;
}
