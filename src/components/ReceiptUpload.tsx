import { useEffect, useRef, useState } from 'react';
import type { ReceiptRef } from '../lib/receipts';

type Props = {
  /** Receipt currently saved on the record (server URL). */
  existing: ReceiptRef | null;
  /** File the user has picked but not yet saved. */
  pendingFile: File | null;
  /** True when the user has tapped Remove on an existing receipt. */
  removed: boolean;
  onPick: (file: File | null) => void;
  onRemove: () => void;
  onUndoRemove: () => void;
  /** Disable the picker (e.g. during in-flight upload). */
  disabled?: boolean;
};

/**
 * Receipt photo picker for the expense form. Opens the OS picker on tap
 * (which on iOS/Android offers Take Photo / Choose from Library / Files).
 * Shows a preview thumbnail for the pending file or the existing server
 * URL; tap to open full-size, "Replace" to repick, "Remove" to clear.
 */
export function ReceiptUpload({
  existing,
  pendingFile,
  removed,
  onPick,
  onRemove,
  onUndoRemove,
  disabled,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Object URLs for the local pending file. Revoke on change/unmount so
  // the browser can free the underlying blob memory.
  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const showingExisting = !pendingFile && existing && !removed;
  const url = pendingFile ? previewUrl : showingExisting ? existing.url : null;
  const isPdf =
    pendingFile?.type === 'application/pdf' ||
    (showingExisting && existing?.contentType === 'application/pdf');

  const pick = () => fileInput.current?.click();

  return (
    <div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          // Reset value so picking the same file again still fires onChange.
          e.target.value = '';
          if (f) onPick(f);
        }}
      />

      {url ? (
        <div className="card overflow-hidden">
          {isPdf ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="tap flex items-center gap-3 px-4 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
            >
              <span
                aria-hidden
                className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 3v5h5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-neutral-900 dark:text-neutral-100">
                  {pendingFile?.name ?? 'Receipt PDF'}
                </p>
                <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                  Tap to open
                </p>
              </div>
            </a>
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="tap block"
            >
              <img
                src={url}
                alt="Receipt"
                className="block max-h-72 w-full object-contain bg-neutral-50 dark:bg-neutral-950"
              />
            </a>
          )}
          <div className="flex divide-x divide-neutral-100 dark:divide-neutral-800 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={pick}
              disabled={disabled}
              className="tap flex-1 px-4 py-2.5 text-[13px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => {
                if (pendingFile) onPick(null);
                else onRemove();
              }}
              disabled={disabled}
              className="tap flex-1 px-4 py-2.5 text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : removed && existing ? (
        <div className="card flex items-center gap-3 px-4 py-3.5">
          <span className="flex-1 text-[13px] text-neutral-500 dark:text-neutral-400">
            Receipt will be removed when you save.
          </span>
          <button
            type="button"
            onClick={onUndoRemove}
            disabled={disabled}
            className="tap shrink-0 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 disabled:opacity-50"
          >
            Undo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={disabled}
          className="tap flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-5 text-[13.5px] font-medium text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600 hover:text-neutral-900 dark:hover:text-white disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
            <path d="m3 17 4-4 4 4 3-3 7 7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <circle cx="9" cy="11" r="1.6" fill="currentColor" />
            <path d="M9 4h6M12 1v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          Add receipt photo
        </button>
      )}
    </div>
  );
}
