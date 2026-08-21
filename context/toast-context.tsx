import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import { ToastNotification } from "../components/ToastNotification";

export type ToastType = "error" | "warning" | "success";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  addToast: () => "",
  removeToast: () => undefined,
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    return id;
  }, []);

  const value = useMemo(
    () => ({ addToast, removeToast }),
    [addToast, removeToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <View style={styles.container} pointerEvents="box-none">
          {toasts.map((toast) => (
            <ToastNotification
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 52,
    right: 16,
    left: 16,
    zIndex: 9999,
    pointerEvents: "box-none",
  },
});
