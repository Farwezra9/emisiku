// Simpan sebagai: app/components/ui/alert-modal.tsx (file baru)
// Satu-satunya bentuk alert di aplikasi: modal kecil di tengah layar.
"use client";

import { useEffect, useRef } from "react";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export type AlertType = "success" | "error" | "confirm";

interface AlertModalProps {
  isOpen: boolean;
  type: AlertType;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
}

const display = "font-[family-name:var(--font-display)]";
const SUCCESS_MS = 3000;
const ERROR_MS = 6000;

export default function AlertModal({
  isOpen,
  type,
  title,
  message,
  onClose,
  onConfirm,
}: AlertModalProps) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Sukses dan error menutup sendiri; konfirmasi menunggu pilihan pengguna
  useEffect(() => {
    if (!isOpen || type === "confirm") return;
    const t = setTimeout(
      () => closeRef.current(),
      type === "success" ? SUCCESS_MS : ERROR_MS
    );
    return () => clearTimeout(t);
  }, [isOpen, type, title, message]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const icon =
    type === "success" ? (
      <CheckCircle size={40} strokeWidth={1.5} className="text-emerald-700" />
    ) : type === "error" ? (
      <XCircle size={40} strokeWidth={1.5} className="text-red-700" />
    ) : (
      <AlertTriangle size={40} strokeWidth={1.5} className="text-amber-600" />
    );

  return (
    <div
      role={type === "confirm" ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-labelledby="alert-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-emerald-950/50 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && type !== "confirm") onClose();
      }}
    >
      <style>{`
        @keyframes alert-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes alert-bar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
      `}</style>

      <div
        className="w-full max-w-sm overflow-hidden rounded-md border border-stone-300 bg-[#fbfaf6] text-center shadow-2xl"
        style={{ animation: "alert-in 200ms cubic-bezier(0.22,1,0.36,1) backwards" }}
      >
        <div className="space-y-3 px-6 pb-5 pt-6">
          <div className="flex justify-center">{icon}</div>

          <div className="space-y-1.5">
            <h3
              id="alert-modal-title"
              className={`${display} text-lg font-medium text-emerald-950`}
            >
              {title}
            </h3>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-stone-600">
              {message}
            </p>
          </div>

          {type === "confirm" && (
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded border border-stone-300 bg-white py-2 text-[13px] font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm?.();
                  onClose();
                }}
                className="flex-1 rounded bg-red-700 py-2 text-[13px] font-semibold text-white transition hover:bg-red-800"
              >
                Ya, hapus
              </button>
            </div>
          )}

          {type === "error" && (
            <button
              type="button"
              onClick={onClose}
              className="mt-1 rounded border border-stone-300 bg-white px-5 py-1.5 text-[13px] font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              Tutup
            </button>
          )}
        </div>

        {type === "success" && (
          <div
            key={`${title}-${message}`}
            className="h-0.5 origin-left bg-emerald-700"
            style={{ animation: `alert-bar ${SUCCESS_MS}ms linear forwards` }}
          />
        )}
        {type === "error" && <div className="h-0.5 bg-red-700" />}
      </div>
    </div>
  );
}