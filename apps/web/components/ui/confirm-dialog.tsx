"use client";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  pending,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Close"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-fade-in border border-border"
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        <div className="flex flex-col-reverse sm:flex-row flex-wrap gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-xl text-sm font-medium border border-border hover:bg-secondary disabled:opacity-60 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 min-h-[44px]"
          >
            {pending ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
