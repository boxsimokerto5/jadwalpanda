import { Staff, MonthSchedule, ShiftCode } from '../types';
import { SEPTEMBER_2026_STAFF_LIST } from '../data/septemberSchedule';
import { OCTOBER_2026_STAFF_LIST } from '../data/octoberSchedule';
import { getSupabaseClient } from './supabaseService';

export const STAFF_STORAGE_KEY = 'wali_asuh_master_staff_list_v2';
const STAFF_DOC_ID = 'staff_roster';

export type Unsubscribe = () => void;

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
 * Retrieve master staff list from localStorage or fallback to baseline
 */
export function getLocalStaffList(): Staff[] {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= OCTOBER_2026_STAFF_LIST.length) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[StaffService] Error reading local staff list:', e);
  }
  return OCTOBER_2026_STAFF_LIST;
}

/**
 * Save staff list to localStorage and trigger global custom event
 */
export function saveLocalStaffList(list: Staff[]): void {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent('wali_asuh_staff_list_updated', { detail: list })
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
  saveLocalStaffList(list);

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    // 1. Save to system_settings
    await client.from('system_settings').upsert({
      key: STAFF_DOC_ID,
      value_json: { list, count: list.length, updatedAt: new Date().toISOString(), updatedBy },
      updated_at: new Date().toISOString(),
    });

    // 2. Also upsert to relational staff table
    const records = list.map((s) => ({
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
    return true;
  } catch (err: any) {
    console.warn('[StaffService] Notice when saving staff to Supabase:', err);
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

    if (settingData?.value_json?.list && Array.isArray(settingData.value_json.list) && settingData.value_json.list.length > 0) {
      saveLocalStaffList(settingData.value_json.list);
      return settingData.value_json.list as Staff[];
    }

    // Fallback to staff table
    const { data: staffRows } = await client.from('staff').select('*').order('id', { ascending: true });
    if (staffRows && staffRows.length > 0) {
      const mapped: Staff[] = staffRows.map((r: any) => ({
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
  const client = getSupabaseClient();
  if (!client) {
    // Local fallback listener
    const handler = (e: any) => {
      if (e.detail) onData(e.detail);
    };
    window.addEventListener('wali_asuh_staff_list_updated', handler);
    return () => window.removeEventListener('wali_asuh_staff_list_updated', handler);
  }

  try {
    const channel = client
      .channel('staff_roster_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: `key=eq.${STAFF_DOC_ID}` },
        (payload: any) => {
          if (payload.new?.value_json?.list) {
            saveLocalStaffList(payload.new.value_json.list);
            onData(payload.new.value_json.list);
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
      client.removeChannel(channel);
    };
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Suggest next unique ID for a newly created staff member
 */
export function suggestNextStaffId(currentList: Staff[]): number {
  if (!currentList || currentList.length === 0) return 1;
  const maxId = Math.max(...currentList.map((s) => s.id || 0));
  return maxId + 1;
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

