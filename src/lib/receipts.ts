import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { getFirebaseStorage } from './firebase';

export type ReceiptRef = { url: string; path: string; contentType?: string };

const MAX_DIMENSION = 1600;
const COMPRESS_THRESHOLD_BYTES = 600 * 1024;
const JPEG_QUALITY = 0.85;
const STALL_TIMEOUT_MS = 20_000;
const COMPRESS_TIMEOUT_MS = 15_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      },
    );
  });
}

async function compress(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= COMPRESS_THRESHOLD_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await withTimeout(
      createImageBitmap(file),
      COMPRESS_TIMEOUT_MS,
      'image decode',
    );
  } catch (err) {
    console.warn('[receipts] compress: decode skipped:', err);
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  try {
    return await withTimeout(
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
          'image/jpeg',
          JPEG_QUALITY,
        );
      }),
      COMPRESS_TIMEOUT_MS,
      'image encode',
    );
  } catch (err) {
    console.warn('[receipts] compress: encode skipped:', err);
    return file;
  }
}

function extensionFor(file: File, blob: Blob): string {
  const fromName = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (blob.type === 'image/jpeg') return 'jpg';
  if (blob.type === 'image/png') return 'png';
  if (blob.type === 'application/pdf') return 'pdf';
  return fromName ?? 'bin';
}

export async function uploadReceipt(
  uid: string,
  expenseId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ReceiptRef> {
  console.info('[receipts] upload start:', { uid, expenseId, size: file.size, type: file.type });
  const blob = await compress(file);
  console.info('[receipts] compressed:', { bytes: blob.size, type: blob.type });
  const ext = extensionFor(file, blob);
  const path = `users/${uid}/receipts/${expenseId}/receipt.${ext}`;
  const r = ref(getFirebaseStorage(), path);
  const contentType = blob.type || file.type || 'application/octet-stream';

  const task = uploadBytesResumable(r, blob, { contentType });

  await new Promise<void>((resolve, reject) => {
    let lastProgressAt = Date.now();
    let lastBytes = 0;
    const stallTimer = setInterval(() => {
      if (Date.now() - lastProgressAt > STALL_TIMEOUT_MS) {
        clearInterval(stallTimer);
        task.cancel();
        reject(
          new Error(
            `Upload stalled: no bytes sent for ${STALL_TIMEOUT_MS / 1000}s. Check that Firebase Storage is enabled and your network can reach firebasestorage.googleapis.com.`,
          ),
        );
      }
    }, 2_000);

    task.on(
      'state_changed',
      (snap) => {
        if (snap.bytesTransferred !== lastBytes) {
          lastBytes = snap.bytesTransferred;
          lastProgressAt = Date.now();
        }
        const pct = snap.totalBytes
          ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
          : 0;
        onProgress?.(pct);
        console.debug('[receipts] progress:', `${pct}%`, snap.state);
      },
      (err) => {
        clearInterval(stallTimer);
        console.error('[receipts] upload error:', err);
        reject(err);
      },
      () => {
        clearInterval(stallTimer);
        resolve();
      },
    );
  });

  const url = await getDownloadURL(r);
  console.info('[receipts] upload done:', path);
  return { url, path, contentType };
}

export async function deleteReceipt(path: string): Promise<void> {
  try {
    await deleteObject(ref(getFirebaseStorage(), path));
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'storage/object-not-found') return;
    console.warn('[receipts] delete failed:', err);
  }
}
