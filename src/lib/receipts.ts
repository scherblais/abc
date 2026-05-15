import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { getFirebaseStorage } from './firebase';

export type ReceiptRef = { url: string; path: string; contentType?: string };

const MAX_DIMENSION = 1600;
const COMPRESS_THRESHOLD_BYTES = 600 * 1024;
const JPEG_QUALITY = 0.85;

/**
 * Downscale a phone-size receipt photo to keep upload + storage costs sane.
 * Skips work for already-small files and for non-image / unsupported types
 * (e.g. PDF, HEIC where the browser can't decode it natively).
 */
async function compress(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= COMPRESS_THRESHOLD_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // HEIC etc. — let the upload pass through as-is.
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

  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

function extensionFor(file: File, blob: Blob): string {
  const fromName = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (blob.type === 'image/jpeg') return 'jpg';
  if (blob.type === 'image/png') return 'png';
  if (blob.type === 'application/pdf') return 'pdf';
  return fromName ?? 'bin';
}

/** Upload a receipt for the given expense. Replaces the file at the same
 *  path on every call, so the storage object is keyed by expense id +
 *  filename rather than accumulating one blob per pick. */
export async function uploadReceipt(
  uid: string,
  expenseId: string,
  file: File,
): Promise<ReceiptRef> {
  const blob = await compress(file);
  const ext = extensionFor(file, blob);
  const path = `users/${uid}/receipts/${expenseId}/receipt.${ext}`;
  const r = ref(getFirebaseStorage(), path);
  const contentType = blob.type || file.type || 'application/octet-stream';
  await uploadBytes(r, blob, { contentType });
  const url = await getDownloadURL(r);
  return { url, path, contentType };
}

/** Best-effort delete; a missing object isn't an error worth bubbling. */
export async function deleteReceipt(path: string): Promise<void> {
  try {
    await deleteObject(ref(getFirebaseStorage(), path));
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'storage/object-not-found') return;
    console.warn('[receipts] delete failed:', err);
  }
}
