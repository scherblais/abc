import type { Booking, Occupant } from '../types';

export type ContactAddress = {
  address: string;
  lastShootAt?: string;
  count: number;
};

export type Contact = {
  /** Stable id derived from phone (digits-only) > email > name. */
  key: string;
  /** Display name, picked from the most recent booking that had one. */
  name: string;
  phone?: string;
  email?: string;
  /** Most recent non-empty access notes — useful when re-shooting the
   *  same property. */
  accessNotes?: string;
  bookingIds: string[];
  /** ISO of the most recent booking's scheduledAt (or createdAt for tasks). */
  lastShootAt?: string;
  firstShootAt: string;
  totalRevenue: number;
  totalShoots: number;
  /** Distinct addresses we've shot for this contact, newest first. */
  addresses: ContactAddress[];
  /** Most recently used address — what the "+ New shoot" prefill uses. */
  lastAddress?: string;
};

export function normalizePhone(raw: string | undefined): string {
  return (raw ?? '').replace(/\D+/g, '');
}

function normalizeEmail(raw: string | undefined): string {
  return (raw ?? '').trim().toLowerCase();
}

function normalizeName(raw: string | undefined): string {
  return (raw ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Derive a stable contact key for a booking's occupant. Returns null when
 *  the occupant has no identifying info — we don't surface anonymous shoots
 *  in the CRM. */
export function contactKeyFor(occ: Occupant | undefined): string | null {
  if (!occ) return null;
  const phone = normalizePhone(occ.phone);
  if (phone.length >= 7) return `p:${phone}`;
  const email = normalizeEmail(occ.email);
  if (email.includes('@')) return `e:${email}`;
  const name = normalizeName(occ.name);
  if (name.length > 0) return `n:${name}`;
  return null;
}

function bookingSortKey(b: Booking): string {
  return b.scheduledAt ?? b.createdAt;
}

function bookingRevenue(b: Booking): number {
  return (b.price ?? 0) + (b.travelFee ?? 0);
}

export function aggregateContacts(bookings: Booking[]): Contact[] {
  const groups = new Map<string, Booking[]>();
  for (const b of bookings) {
    const key = contactKeyFor(b.occupant);
    if (!key) continue;
    const arr = groups.get(key);
    if (arr) arr.push(b);
    else groups.set(key, [b]);
  }

  const contacts: Contact[] = [];
  for (const [key, items] of groups) {
    items.sort((a, b) => bookingSortKey(b).localeCompare(bookingSortKey(a)));
    const newest = items[0];
    const oldest = items[items.length - 1];

    const name =
      items.find((b) => b.occupant?.name?.trim())?.occupant?.name?.trim() ??
      '(no name)';
    const phone = items.find((b) => b.occupant?.phone?.trim())?.occupant?.phone?.trim();
    const email = items.find((b) => b.occupant?.email?.trim())?.occupant?.email?.trim();
    const accessNotes = items.find((b) => b.occupant?.accessNotes?.trim())
      ?.occupant?.accessNotes?.trim();

    const addrMap = new Map<string, ContactAddress>();
    for (const b of items) {
      const addr = b.address?.trim();
      if (!addr) continue;
      const existing = addrMap.get(addr);
      const stamp = bookingSortKey(b);
      if (existing) {
        existing.count += 1;
        if (!existing.lastShootAt || stamp > existing.lastShootAt) {
          existing.lastShootAt = stamp;
        }
      } else {
        addrMap.set(addr, { address: addr, lastShootAt: stamp, count: 1 });
      }
    }
    const addresses = [...addrMap.values()].sort((a, b) =>
      (b.lastShootAt ?? '').localeCompare(a.lastShootAt ?? ''),
    );

    contacts.push({
      key,
      name,
      phone,
      email,
      accessNotes,
      bookingIds: items.map((b) => b.id),
      lastShootAt: newest.scheduledAt ?? newest.createdAt,
      firstShootAt: oldest.scheduledAt ?? oldest.createdAt,
      totalRevenue: items.reduce((sum, b) => sum + bookingRevenue(b), 0),
      totalShoots: items.length,
      addresses,
      lastAddress: addresses[0]?.address,
    });
  }

  contacts.sort((a, b) =>
    (b.lastShootAt ?? '').localeCompare(a.lastShootAt ?? ''),
  );
  return contacts;
}

export function matchesContactSearch(c: Contact, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (c.name.toLowerCase().includes(q)) return true;
  if (c.email?.toLowerCase().includes(q)) return true;
  const phoneDigits = normalizePhone(c.phone);
  const queryDigits = normalizePhone(q);
  if (queryDigits.length >= 3 && phoneDigits.includes(queryDigits)) return true;
  for (const a of c.addresses) {
    if (a.address.toLowerCase().includes(q)) return true;
  }
  return false;
}
