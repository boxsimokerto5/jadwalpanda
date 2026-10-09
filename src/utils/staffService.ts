import { Staff, MonthSchedule, ShiftCode } from '../types';
import { SEPTEMBER_2026_STAFF_LIST } from '../data/septemberSchedule';
import { OCTOBER_2026_STAFF_LIST } from '../data/octoberSchedule';
import { getSupabaseClient } from './supabaseService';

export const STAFF_STORAGE_KEY = 'wali_asuh_master_staff_list_v2';
export const DELETED_STAFF_IDS_KEY = 'wali_asuh_deleted_staff_ids_v1';
const STAFF_DOC_ID = 'staff_roster';

export type Unsubscribe = () => void;

/**
 * Retrieve set of permanently deleted staff IDs from localStorage
 */
export function getDeletedStaffIds(): Set<number> {
  try {
    const raw = localStorage.getItem(DELETED_STAFF_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map(Number).filter((n) => !isNaN(n) && n > 0));
      }
    }
  } catch {}
  return new Set<number>();
}

/**
 * Save set of permanently deleted staff IDs to localStorage
 */
export function saveDeletedStaffIds(ids: Set<number>): void {
  try {
    localStorage.setItem(DELETED_STAFF_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

/**
 * Mark a staff ID as permanently deleted
 */
export function markStaffDeletedPermanently(staffId: number): Set<number> {
  const ids = getDeletedStaffIds();
  ids.add(Number(staffId));
  saveDeletedStaffIds(ids);
  return ids;
}

/**
 * Unmark a staff ID from permanently deleted list (e.g. when re-imported or restored)
 */
export function unmarkStaffDeletedPermanently(staffId: number): Set<number> {
  const ids = getDeletedStaffIds();
  if (ids.has(Number(staffId))) {
    ids.delete(Number(staffId));
    saveDeletedStaffIds(ids);
  }
  return ids;
}

/**
 * Generate automatic short initials from a staff member's name
 */
export function generateStaffInitials(name: string): string {
  if (!name) return 'wa';
  const clean = name.replace(/['’`".,\-_\/\\()]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 3).toLowerCase();
  }
  if (words.length === 2) {
    return (words[0][0] + words[1].slice(0, 2)).toLowerCase();
  }
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toLowerCase();
}

/**
 * Build default baseline master staff list (September + October) excluding permanently deleted IDs
 */
export function getDefaultMasterStaffList(): Staff[] {
  const deletedIds = getDeletedStaffIds();
  const map = new Map<number, Staff>();
  SEPTEMBER_2026_STAFF_LIST.forEach((s) => {
    if (!deletedIds.has(s.id)) map.set(s.id, s);
  });
  OCTOBER_2026_STAFF_LIST.forEach((s) => {
    if (!deletedIds.has(s.id)) map.set(s.id, s);
  });
  return Array.from(map.values()).sort((a, b) => a.id - b.id);
}

/**
 * Retrieve master staff list from localStorage or fallback to baseline (always filtering out permanently deleted IDs)
 */
export function getLocalStaffList(): Staff[] {
  const deletedIds = getDeletedStaffIds();
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter((s: Staff) => s && typeof s.id === 'number' && !deletedIds.has(s.id))
          .sort((a: Staff, b: Staff) => a.id - b.id);
      }
    }
  } catch (e) {
    console.warn('[StaffService] Error reading local staff list:', e);
  }
  return getDefaultMasterStaffList();
}

/**
 * Save staff list to localStorage and trigger global custom event
 */
export function saveLocalStaffList(list: Staff[]): void {
  try {
    const deletedIds = getDeletedStaffIds();
    const cleanList = list
      .filter((s) => s && typeof s.id === 'number' && !deletedIds.has(s.id))
      .sort((a, b) => a.id - b.id);
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(cleanList));
    window.dispatchEvent(
      new CustomEvent('wali_asuh_staff_list_updated', { detail: cleanList })
    );
  } catch (e) {
    console.error('[StaffService] Failed to save staff list locally:', e);
  }
}

/**
 * Save master staff list to Supabase and LocalStorage
 */
export async function saveStaffListToSupabase(
  list: Staff[],
  updatedBy: string = 'Admin'
): Promise<boolean> {
  const deletedIds = getDeletedStaffIds();
  const cleanList = list
    .filter((s) => s && typeof s.id === 'number' && !deletedIds.has(s.id))
    .sort((a, b) => a.id - b.id);

  saveLocalStaffList(cleanList);

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const nowIso = new Date().toISOString();
    // 1. Save authoritative list + deletedIds to system_settings
    await client.from('system_settings').upsert({
      key: STAFF_DOC_ID,
      value_json: {
        list: cleanList,
        deletedIds: Array.from(deletedIds),
        count: cleanList.length,
        updatedAt: nowIso,
        updatedBy,
      },
      updated_at: nowIso,
    });

    // 2. Also upsert active records to relational staff table
    if (cleanList.length > 0) {
      const records = cleanList.map((s) => ({
        id: s.id,
        code: s.code || '',
        name: s.name,
        gender: s.gender || 'L',
        jenjang: s.jenjang || '-',
        role: s.role || 'Wali Asuh',
        group_name: s.group || '',
        initials: s.initials || generateStaffInitials(s.name),
        phone: s.phone || '',
        nip: s.nip || '',
        is_active: s.status !== 'archived',
      }));

      await client.from('staff').upsert(records, { onConflict: 'id' });
    }

    // 3. Ensure any permanently deleted IDs are removed from relational staff table
    if (deletedIds.size > 0) {
      const delArray = Array.from(deletedIds);
      try {
        await client.from('schedule_assignments').delete().in('staff_id', delArray);
      } catch {}
      try {
        await client.from('staff').delete().in('id', delArray);
      } catch {}
    }

    return true;
  } catch (err: any) {
    console.warn('[StaffService] Notice when saving staff to Supabase:', err);
    return true;
  }
}

/**
 * Permanently delete a staff member from Master Directory, LocalStorage, and Supabase tables
 */
export async function deleteStaffPermanentlyFromSupabase(
  staffId: number,
  updatedList: Staff[],
  updatedBy: string = 'Admin'
): Promise<boolean> {
  const deletedIds = markStaffDeletedPermanently(staffId);
  const cleanList = updatedList
    .filter((s) => s && typeof s.id === 'number' && s.id !== staffId && !deletedIds.has(s.id))
    .sort((a, b) => a.id - b.id);

  saveLocalStaffList(cleanList);

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const nowIso = new Date().toISOString();

    // 1. Update system_settings FIRST so real-time listeners immediately receive the deletedIds and updated list
    await client.from('system_settings').upsert({
      key: STAFF_DOC_ID,
      value_json: {
        list: cleanList,
        deletedIds: Array.from(deletedIds),
        count: cleanList.length,
        updatedAt: nowIso,
        updatedBy,
      },
      updated_at: nowIso,
    });

    // 2. Clean up foreign key references in dependent tables before deleting from staff table
    try {
      await client.from('schedule_assignments').delete().eq('staff_id', staffId);
    } catch {}
    try {
      await client.from('daily_tasks').delete().eq('staff_id', staffId);
    } catch {}
    try {
      await client.from('shift_swaps').update({ staff1_id: null }).eq('staff1_id', staffId);
      await client.from('shift_swaps').update({ staff2_id: null }).eq('staff2_id', staffId);
    } catch {}

    // 3. Delete row permanently from relational staff table in Supabase
    await client.from('staff').delete().eq('id', staffId);

    return true;
  } catch (err: any) {
    console.warn('[StaffService] Notice when deleting staff permanently from Supabase:', err);
    return true;
  }
}

/**
 * Fetch staff roster from Supabase or LocalStorage
 */
export async function fetchStaffListFromSupabase(): Promise<Staff[] | null> {
  const client = getSupabaseClient();
  if (!client) {
    return getLocalStaffList();
  }

  try {
    // Try system_settings first
    const { data: settingData } = await client
      .from('system_settings')
      .select('value_json')
      .eq('key', STAFF_DOC_ID)
      .maybeSingle();

    const localDeletedIds = getDeletedStaffIds();
    if (Array.isArray(settingData?.value_json?.deletedIds)) {
      settingData.value_json.deletedIds.forEach((id: any) => {
        const n = Number(id);
        if (!isNaN(n) && n > 0) localDeletedIds.add(n);
      });
      saveDeletedStaffIds(localDeletedIds);
    }

    if (settingData?.value_json?.list && Array.isArray(settingData.value_json.list) && settingData.value_json.list.length > 0) {
      const filtered = (settingData.value_json.list as Staff[])
        .filter((s) => s && typeof s.id === 'number' && !localDeletedIds.has(s.id))
        .sort((a, b) => a.id - b.id);
      saveLocalStaffList(filtered);
      return filtered;
    }

    // Fallback to staff table
    const { data: staffRows } = await client.from('staff').select('*').order('id', { ascending: true });
    if (staffRows && staffRows.length > 0) {
      const mapped: Staff[] = staffRows
        .filter((r: any) => r && !localDeletedIds.has(Number(r.id)))
        .map((r: any) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          gender: r.gender,
          jenjang: r.jenjang,
          role: r.role,
          group: r.group_name,
          initials: r.initials,
          phone: r.phone,
          nip: r.nip,
          isActive: r.is_active,
        }));
      saveLocalStaffList(mapped);
      return mapped;
    }
    return getLocalStaffList();
  } catch (err: any) {
    console.warn('[StaffService] Notice when fetching staff from Supabase:', err);
    return getLocalStaffList();
  }
}

/**
 * Subscribe to real-time changes of the staff roster in Supabase
 */
export function subscribeToStaffList(
  onData: (list: Staff[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const localHandler = (e: any) => {
    if (e.detail && Array.isArray(e.detail)) {
      const deletedIds = getDeletedStaffIds();
      onData(e.detail.filter((s: Staff) => !deletedIds.has(s.id)));
    }
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STAFF_STORAGE_KEY || e.key === DELETED_STAFF_IDS_KEY) {
      onData(getLocalStaffList());
    }
  };

  window.addEventListener('wali_asuh_staff_list_updated', localHandler);
  window.addEventListener('storage', storageHandler);

  const client = getSupabaseClient();
  if (!client) {
    return () => {
      window.removeEventListener('wali_asuh_staff_list_updated', localHandler);
      window.removeEventListener('storage', storageHandler);
    };
  }

  try {
    const channel = client
      .channel('staff_roster_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: `key=eq.${STAFF_DOC_ID}` },
        (payload: any) => {
          const deletedIds = getDeletedStaffIds();
          if (Array.isArray(payload.new?.value_json?.deletedIds)) {
            payload.new.value_json.deletedIds.forEach((id: any) => {
              const n = Number(id);
              if (!isNaN(n) && n > 0) deletedIds.add(n);
            });
            saveDeletedStaffIds(deletedIds);
          }
          if (Array.isArray(payload.new?.value_json?.list)) {
            const filtered = (payload.new.value_json.list as Staff[])
              .filter((s) => s && typeof s.id === 'number' && !deletedIds.has(s.id))
              .sort((a, b) => a.id - b.id);
            saveLocalStaffList(filtered);
            onData(filtered);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff' },
        async () => {
          const fresh = await fetchStaffListFromSupabase();
          if (fresh) onData(fresh);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('wali_asuh_staff_list_updated', localHandler);
      window.removeEventListener('storage', storageHandler);
      client.removeChannel(channel);
    };
  } catch (err: any) {
    if (onError) onError(err);
    return () => {
      window.removeEventListener('wali_asuh_staff_list_updated', localHandler);
      window.removeEventListener('storage', storageHandler);
    };
  }
}

/**
 * Suggest next unique ID for a newly created staff member (never reusing baseline or deleted IDs)
 */
export function suggestNextStaffId(currentList: Staff[]): number {
  const deletedIds = getDeletedStaffIds();
  const allIds = [
    ...(currentList || []).map((s) => s.id || 0),
    ...SEPTEMBER_2026_STAFF_LIST.map((s) => s.id || 0),
    ...OCTOBER_2026_STAFF_LIST.map((s) => s.id || 0),
    ...Array.from(deletedIds),
  ];
  if (allIds.length === 0) return 1;
  return Math.max(...allIds) + 1;
}

/**
 * Suggest next staff code (e.g. L18 for male, P15 for female)
 */
export function suggestNextStaffCode(gender: 'L' | 'P', currentList: Staff[]): string {
  const prefix = gender === 'L' ? 'L' : 'P';
  let maxNum = 0;

  currentList.forEach((s) => {
    if (s.code && s.code.startsWith(prefix)) {
      const numPart = parseInt(s.code.slice(1), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });

  return `${prefix}${maxNum + 1}`;
}

/**
 * Add a staff member to a specific month's schedule (e.g. November)
 * Initializes their shifts with 'L' (Libur) for each day in that month
 */
export function addStaffToMonthSchedule(
  schedule: MonthSchedule,
  staff: Staff,
  initialShift: ShiftCode = 'L'
): MonthSchedule {
  const currentList = schedule.staffList || [];
  if (currentList.some((s) => s.id === staff.id)) {
    return schedule; // already present
  }

  const updatedStaffList = [...currentList, staff];
  const newDays: Record<number, Record<number, ShiftCode>> = { ...schedule.days };

  for (let d = 1; d <= schedule.totalDays; d++) {
    newDays[d] = {
      ...(newDays[d] || {}),
      [staff.id]: initialShift,
    };
  }

  return {
    ...schedule,
    staffList: updatedStaffList,
    days: newDays,
  };
}

/**
 * Remove a staff member from a specific month's schedule (e.g. Eko Wahyudi in October)
 * Past and future months are 100% unaffected!
 */
export function removeStaffFromMonthSchedule(
  schedule: MonthSchedule,
  staffId: number
): MonthSchedule {
  const currentList = schedule.staffList || [];
  const updatedStaffList = currentList.filter((s) => s.id !== staffId);

  const newDays: Record<number, Record<number, ShiftCode>> = {};
  for (let d = 1; d <= schedule.totalDays; d++) {
    const dayMap = { ...(schedule.days[d] || {}) };
    delete dayMap[staffId];
    newDays[d] = dayMap;
  }

  return {
    ...schedule,
    staffList: updatedStaffList,
    days: newDays,
  };
}

/**
 * Update staff data in a specific month's schedule
 */
export function updateStaffInMonthSchedule(
  schedule: MonthSchedule,
  updatedStaff: Staff
): MonthSchedule {
  const currentList = schedule.staffList || [];
  const updatedStaffList = currentList.map((s) =>
    s.id === updatedStaff.id ? updatedStaff : s
  );

  return {
    ...schedule,
    staffList: updatedStaffList,
  };
}

/**
 * Update a staff member in the Master Directory
 */
export function updateStaffInMasterList(
  masterList: Staff[],
  updatedStaff: Staff
): Staff[] {
  const exists = masterList.some((s) => s.id === updatedStaff.id);
  if (!exists) {
    return [...masterList, updatedStaff];
  }
  return masterList.map((s) => (s.id === updatedStaff.id ? updatedStaff : s));
}

/**
 * Remove a staff member completely from Master Directory
 */
export function removeStaffFromMasterList(
  masterList: Staff[],
  staffId: number
): Staff[] {
  return masterList.filter((s) => s.id !== staffId);
}

