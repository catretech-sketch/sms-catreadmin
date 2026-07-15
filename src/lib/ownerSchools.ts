import type { Client } from '../api/types';

/** Normalize owner contact email for grouping schools under one portfolio. */
export function ownerEmailKey(email: string | null | undefined): string | null {
  const e = (email ?? '').trim().toLowerCase();
  return e || null;
}

export interface OwnerGroup {
  key: string;
  email: string | null;
  ownerName: string | null;
  schools: Client[];
  mrr: number;
}

function pickOwnerName(schools: Client[]): string | null {
  const names = schools.map(s => (s.contact_name ?? '').trim()).filter(Boolean);
  const preferred = names.find(n => n.toLowerCase() !== 'vitmadmin' && !n.toLowerCase().includes('admin'));
  return preferred ?? names[0] ?? null;
}

/** One portfolio row per owner email; schools without email stay solo. */
export function groupClientsByOwner(clients: Client[]): OwnerGroup[] {
  const map = new Map<string, Client[]>();
  const order: string[] = [];
  for (const c of clients) {
    const email = ownerEmailKey(c.contact_email);
    const key = email ?? `solo:${c.id}`;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(c);
  }
  return order.map(key => {
    const schools = [...(map.get(key) ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    const email = key.startsWith('solo:') ? null : key;
    return {
      key,
      email,
      ownerName: pickOwnerName(schools),
      schools,
      mrr: schools.reduce((sum, c) => sum + (c.mrr ?? 0), 0),
    };
  });
}

/** Count of schools sharing the same owner email (portfolio). */
export function schoolCountByOwner(clients: Client[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of clients) {
    const key = ownerEmailKey(c.contact_email);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/** All schools for this owner email, current school first. */
export function schoolsForOwner(clients: Client[], email: string | null | undefined, currentId?: string): Client[] {
  const key = ownerEmailKey(email);
  if (!key) return [];
  const siblings = clients.filter(c => ownerEmailKey(c.contact_email) === key);
  if (!currentId) return siblings;
  return [
    ...siblings.filter(c => c.id === currentId),
    ...siblings.filter(c => c.id !== currentId),
  ];
}
