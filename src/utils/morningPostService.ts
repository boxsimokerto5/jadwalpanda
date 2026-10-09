import { MorningPostAssignment, MorningPostCustomOption, MedicalGuardCustomOption, QuranAssistanceLevel, Staff, ShiftCode } from '../types';
import { getSupabaseClient } from './supabaseService';

export const DEFAULT_MORNING_POST_OPTIONS: MorningPostCustomOption[] = [
  { id: 'uks_sd', label: 'UKS SD', isDefault: true },
  { id: 'uks_smp', label: 'UKS SMP', isDefault: true },
  { id: 'uks_sma', label: 'UKS SMA', isDefault: true },
  { id: 'mobile_keliling', label: 'Mobile / Keliling', isDefault: true },
];

export const DEFAULT_QURAN_ASSISTANCE_OPTIONS: { id: string; label: QuranAssistanceLevel; desc: string }[] = [
  { id: 'mengaji_sd', label: 'Mengaji SD', desc: 'Pendampingan santri SD' },
  { id: 'mengaji_smp', label: 'Mengaji SMP', desc: 'Pendampingan santri SMP' },
  { id: 'mengaji_sma', label: 'Mengaji SMA', desc: 'Pendampingan santri SMA' },
];

export const DEFAULT_MEDICAL_GUARD_OPTIONS: MedicalGuardCustomOption[] = [
  { id: 'jaga_puskesmas', label: 'Jaga Puskesmas', desc: 'Pendampingan santri di Puskesmas', isDefault: true },
  { id: 'jaga_rs', label: 'Jaga Rumah Sakit', desc: 'Pendampingan santri di Rumah Sakit', isDefault: true },
];

const MORNING_POST_OPTIONS_STORAGE_KEY = 'wali_asuh_morning_post_options_v1';
const MEDICAL_GUARD_OPTIONS_STORAGE_KEY = 'wali_asuh_medical_guard_options_v1';
const MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX = 'wali_asuh_morning_post_assignments_v1';

/**
 * Get current P1/P2 morning post options from localStorage
 */
export function getLocalMorningPostOptions(): MorningPostCustomOption[] {
  try {
    const saved = localStorage.getItem(MORNING_POST_OPTIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_MORNING_POST_OPTIONS;
}

/**
 * Save morning post options locally & to Supabase
 */
export async function saveMorningPostOptions(options: MorningPostCustomOption[]): Promise<boolean> {
  try {
    localStorage.setItem(MORNING_POST_OPTIONS_STORAGE_KEY, JSON.stringify(options));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('morning_post_options').upsert({
      id: 'current',
      options_json: options,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch (err: any) {
    console.warn('[MorningPost] Supabase notice:', err);
    return true;
  }
}

/**
 * Fetch morning post options from Supabase
 */
export async function fetchMorningPostOptionsFromSupabase(): Promise<MorningPostCustomOption[] | null> {
  const client = getSupabaseClient();
  if (!client) return getLocalMorningPostOptions();

  try {
    const { data } = await client
      .from('morning_post_options')
      .select('options_json')
      .eq('id', 'current')
      .maybeSingle();

    if (data?.options_json && Array.isArray(data.options_json)) {
      localStorage.setItem(MORNING_POST_OPTIONS_STORAGE_KEY, JSON.stringify(data.options_json));
      return data.options_json;
    }
    return getLocalMorningPostOptions();
  } catch {
    return getLocalMorningPostOptions();
  }
}

/**
 * Realtime subscribe to morning post options
 */
export function subscribeToMorningPostOptions(
  onData: (options: MorningPostCustomOption[]) => void,
  onError?: (err: unknown) => void
): () => void {
  onData(getLocalMorningPostOptions());

  const client = getSupabaseClient();
  if (!client) return () => {};

  fetchMorningPostOptionsFromSupabase().then((res) => {
    if (res) onData(res);
  });

  try {
    const channel = client
      .channel('morning_post_options_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'morning_post_options', filter: 'id=eq.current' },
        (payload: any) => {
          if (payload.new?.options_json && Array.isArray(payload.new.options_json)) {
            localStorage.setItem(MORNING_POST_OPTIONS_STORAGE_KEY, JSON.stringify(payload.new.options_json));
            onData(payload.new.options_json);
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}

/**
 * Sanitize and normalize MorningPostAssignment records:
 * 1. Strips out empty records (no postTitle, no quranAssistance, no medicalGuardLabel)
 * 2. Cleans up stale/ghost "Jaga Puskesmas Wates" pins on staff other than Aziz Fajar Yusniza (staffId 37)
 *    that were stuck in local cache before the v2 sync fix.
 */
function sanitizeMorningPostAssignments(
  year: number,
  month: number,
  raw: Record<string, MorningPostAssignment> | null | undefined
): { cleaned: Record<string, MorningPostAssignment>; wasModified: boolean } {
  const cleaned: Record<string, MorningPostAssignment> = {};
  let wasModified = false;

  if (!raw || typeof raw !== 'object') {
    return { cleaned, wasModified };
  }

  for (const [key, item] of Object.entries(raw)) {
    if (!item || typeof item !== 'object') {
      wasModified = true;
      continue;
    }

    const nextItem: MorningPostAssignment & { explicitlyVerifiedV2?: boolean } = { ...item };

    // Clean up stale cached "Jaga Puskesmas Wates" on staff other than Aziz Fajar Yusniza (staffId === 37)
    const isAziz =
      Number(nextItem.staffId) === 37 ||
      /aziz\s*fajar/i.test(nextItem.staffName || '');

    if (
      year === 2026 &&
      month === 10 &&
      !isAziz &&
      nextItem.medicalGuardLabel &&
      /puskesmas\s*wates/i.test(nextItem.medicalGuardLabel) &&
      !nextItem.explicitlyVerifiedV2
    ) {
      delete nextItem.medicalGuardLabel;
      wasModified = true;
    }

    const hasPost = Boolean(nextItem.postTitle && String(nextItem.postTitle).trim());
    const hasQuran = Boolean(nextItem.quranAssistance && String(nextItem.quranAssistance).trim());
    const hasMedGuard = Boolean(nextItem.medicalGuardLabel && String(nextItem.medicalGuardLabel).trim());

    if (!hasPost && !hasQuran && !hasMedGuard) {
      wasModified = true;
      continue;
    }

    cleaned[key] = nextItem;
  }

  return { cleaned, wasModified };
}

/**
 * Persist morning post assignments to both morning_posts table and system_settings backup
 */
async function persistMorningPostAssignmentsToCloud(
  year: number,
  month: number,
  assignments: Record<string, MorningPostAssignment>
): Promise<boolean> {
  const { cleaned } = sanitizeMorningPostAssignments(year, month, assignments);
  const storageKey = `${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`;

  try {
    localStorage.setItem(storageKey, JSON.stringify(cleaned));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  const schedId = `${year}_${month}`;
  const settingKey = `morning_posts_${year}_${month}`;
  const mirrorSchedId = `mpost_assign_${year}_${String(month).padStart(2, '0')}`;
  const nowIso = new Date().toISOString();

  await Promise.allSettled([
    client.from('morning_posts').upsert({
      schedule_id: schedId,
      assignments_json: cleaned,
      updated_at: nowIso,
    }),
    client.from('system_settings').upsert({
      key: settingKey,
      value_json: {
        assignments: cleaned,
        updatedAt: nowIso,
      },
      updated_at: nowIso,
    }),
    client.from('schedules').upsert(
      {
        id: mirrorSchedId,
        year: -(year * 10 + 3),
        month: -month,
        total_days: 0,
        days_json: {
          assignments: cleaned,
          updatedAt: nowIso,
        } as any,
        updated_at: nowIso,
        updated_by: 'Morning Post Cloud Sync',
      },
      { onConflict: 'id' }
    ),
  ]);

  return true;
}

/**
 * Push all current local morning post assignments for a specific month to Supabase Cloud
 */
export async function saveAllMorningPostAssignmentsToSupabase(
  year: number,
  month: number
): Promise<boolean> {
  const current = getLocalMorningPostAssignments(year, month);
  return persistMorningPostAssignmentsToCloud(year, month, current);
}

/**
 * Get all morning post assignments for a specific month from localStorage
 */
export function getLocalMorningPostAssignments(
  year: number,
  month: number
): Record<string, MorningPostAssignment> {
  const storageKey = `${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      const { cleaned, wasModified } = sanitizeMorningPostAssignments(year, month, parsed);
      if (wasModified) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(cleaned));
        } catch {}
      }
      return cleaned;
    }
  } catch {}
  return {};
}

/**
 * Fetch all morning post assignments from Supabase (Single Source of Truth - overwrites stale local cache)
 */
export async function fetchMorningPostAssignmentsFromSupabase(
  year: number,
  month: number
): Promise<Record<string, MorningPostAssignment>> {
  const local = getLocalMorningPostAssignments(year, month);
  const client = getSupabaseClient();
  if (!client) return local;

  const schedId = `${year}_${month}`;
  const settingKey = `morning_posts_${year}_${month}`;
  const mirrorSchedId = `mpost_assign_${year}_${String(month).padStart(2, '0')}`;
  const storageKey = `${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`;

  try {
    const [tableRes, settingRes, schedMirrorRes] = await Promise.allSettled([
      client
        .from('morning_posts')
        .select('assignments_json, updated_at')
        .eq('schedule_id', schedId)
        .maybeSingle(),
      client
        .from('system_settings')
        .select('value_json, updated_at')
        .eq('key', settingKey)
        .maybeSingle(),
      client
        .from('schedules')
        .select('days_json, updated_at')
        .eq('id', mirrorSchedId)
        .maybeSingle(),
    ]);

    const candidates: { data: Record<string, MorningPostAssignment>; time: number }[] = [];

    if (
      tableRes.status === 'fulfilled' &&
      !tableRes.value.error &&
      tableRes.value.data?.assignments_json &&
      typeof tableRes.value.data.assignments_json === 'object'
    ) {
      candidates.push({
        data: tableRes.value.data.assignments_json,
        time: tableRes.value.data.updated_at ? Date.parse(tableRes.value.data.updated_at) || 0 : 0,
      });
    }

    if (
      settingRes.status === 'fulfilled' &&
      !settingRes.value.error &&
      settingRes.value.data?.value_json?.assignments &&
      typeof settingRes.value.data.value_json.assignments === 'object'
    ) {
      const rawTs = settingRes.value.data.value_json.updatedAt || settingRes.value.data.updated_at;
      candidates.push({
        data: settingRes.value.data.value_json.assignments,
        time: rawTs ? Date.parse(rawTs) || 0 : 0,
      });
    }

    if (
      schedMirrorRes.status === 'fulfilled' &&
      !schedMirrorRes.value.error &&
      (schedMirrorRes.value.data?.days_json as any)?.assignments &&
      typeof (schedMirrorRes.value.data?.days_json as any).assignments === 'object'
    ) {
      const rawTs =
        (schedMirrorRes.value.data.days_json as any).updatedAt || schedMirrorRes.value.data.updated_at;
      candidates.push({
        data: (schedMirrorRes.value.data.days_json as any).assignments,
        time: rawTs ? Date.parse(rawTs) || 0 : 0,
      });
    }

    // Pick authoritative server snapshot (prefer newest timestamp)
    let authoritativeRemote: Record<string, MorningPostAssignment> | null = null;
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.time - a.time);
      authoritativeRemote = candidates[0].data;
    }

    if (authoritativeRemote !== null) {
      const { cleaned, wasModified } = sanitizeMorningPostAssignments(year, month, authoritativeRemote);
      try {
        localStorage.setItem(storageKey, JSON.stringify(cleaned));
      } catch {}

      if (wasModified) {
        persistMorningPostAssignmentsToCloud(year, month, cleaned).catch(() => {});
      }

      window.dispatchEvent(new CustomEvent('morning_post_assignments_updated', { detail: { year, month } }));
      return cleaned;
    }

    // If cloud had no records yet but local device has assignments, auto-push to cloud
    if (Object.keys(local).length > 0) {
      persistMorningPostAssignmentsToCloud(year, month, local).catch(() => {});
    }

    return local;
  } catch {
    return local;
  }
}

/**
 * Save single morning post assignment locally and to Supabase
 */
export async function saveMorningPostAssignmentToSupabase(
  assignment: MorningPostAssignment
): Promise<boolean> {
  const { year, month, day, staffId } = assignment;
  const current = getLocalMorningPostAssignments(year, month);
  const key = `${day}_${staffId}`;
  const existing = current[key];

  const mergedAssignment: MorningPostAssignment & { explicitlyVerifiedV2?: boolean } = {
    ...existing,
    ...assignment,
    explicitlyVerifiedV2: true,
    updatedAt: new Date().toISOString(),
  };

  current[key] = mergedAssignment;
  const { cleaned } = sanitizeMorningPostAssignments(year, month, current);

  try {
    localStorage.setItem(`${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(cleaned));
  } catch {}

  window.dispatchEvent(new CustomEvent('morning_post_assignments_updated', { detail: { year, month, assignment: mergedAssignment } }));

  return persistMorningPostAssignmentsToCloud(year, month, cleaned);
}

/**
 * Get current customizable Medical Guard options (Jaga Puskesmas, Jaga Rumah Sakit, etc.)
 */
export function getLocalMedicalGuardOptions(): MedicalGuardCustomOption[] {
  try {
    const saved = localStorage.getItem(MEDICAL_GUARD_OPTIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_MEDICAL_GUARD_OPTIONS;
}

/**
 * Save customizable Medical Guard options locally & to Supabase
 */
export async function saveMedicalGuardOptions(options: MedicalGuardCustomOption[]): Promise<boolean> {
  try {
    localStorage.setItem(MEDICAL_GUARD_OPTIONS_STORAGE_KEY, JSON.stringify(options));
    window.dispatchEvent(new CustomEvent('medical_guard_options_updated', { detail: { options } }));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('morning_post_options').upsert({
      id: 'medical_guard_options',
      options_json: options,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch (err: any) {
    console.warn('[MedicalGuard] Supabase notice:', err);
    return true;
  }
}

/**
 * Fetch customizable Medical Guard options from Supabase
 */
export async function fetchMedicalGuardOptionsFromSupabase(): Promise<MedicalGuardCustomOption[] | null> {
  const client = getSupabaseClient();
  if (!client) return getLocalMedicalGuardOptions();

  try {
    const { data } = await client
      .from('morning_post_options')
      .select('options_json')
      .eq('id', 'medical_guard_options')
      .maybeSingle();

    if (data?.options_json && Array.isArray(data.options_json) && data.options_json.length > 0) {
      localStorage.setItem(MEDICAL_GUARD_OPTIONS_STORAGE_KEY, JSON.stringify(data.options_json));
      return data.options_json;
    }
    return getLocalMedicalGuardOptions();
  } catch {
    return getLocalMedicalGuardOptions();
  }
}

/**
 * Realtime subscribe to customizable Medical Guard options
 */
export function subscribeToMedicalGuardOptions(
  onData: (options: MedicalGuardCustomOption[]) => void
): () => void {
  onData(getLocalMedicalGuardOptions());

  const handleLocal = () => {
    onData(getLocalMedicalGuardOptions());
  };
  window.addEventListener('medical_guard_options_updated', handleLocal);

  const client = getSupabaseClient();
  if (!client) {
    return () => {
      window.removeEventListener('medical_guard_options_updated', handleLocal);
    };
  }

  fetchMedicalGuardOptionsFromSupabase().then((res) => {
    if (res) onData(res);
  });

  try {
    const channel = client
      .channel('medical_guard_options_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'morning_post_options', filter: 'id=eq.medical_guard_options' },
        (payload: any) => {
          if (payload.new?.options_json && Array.isArray(payload.new.options_json)) {
            localStorage.setItem(MEDICAL_GUARD_OPTIONS_STORAGE_KEY, JSON.stringify(payload.new.options_json));
            onData(payload.new.options_json);
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('medical_guard_options_updated', handleLocal);
      client.removeChannel(channel);
    };
  } catch {
    return () => {
      window.removeEventListener('medical_guard_options_updated', handleLocal);
    };
  }
}

/**
 * Update Quran assistance specifically without touching main postTitle or medicalGuardLabel
 */
export async function updateStaffQuranAssistance(
  year: number,
  month: number,
  day: number,
  staffId: number,
  staffName: string,
  shiftCode: ShiftCode | string,
  quranAssistance: QuranAssistanceLevel | undefined
): Promise<boolean> {
  const current = getLocalMorningPostAssignments(year, month);
  const key = `${day}_${staffId}`;
  const existing = current[key];

  if (!quranAssistance && !existing?.postTitle && !existing?.medicalGuardLabel) {
    return deleteMorningPostAssignment(year, month, day, staffId);
  }

  const assignment: MorningPostAssignment & { explicitlyVerifiedV2?: boolean } = {
    ...existing,
    staffId,
    staffName,
    day,
    month,
    year,
    shiftCode: existing?.shiftCode || shiftCode,
    postTitle: existing?.postTitle,
    quranAssistance: quranAssistance,
    medicalGuardLabel: existing?.medicalGuardLabel,
    explicitlyVerifiedV2: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin',
  };

  if (!quranAssistance) {
    delete assignment.quranAssistance;
  }

  current[key] = assignment;
  const { cleaned } = sanitizeMorningPostAssignments(year, month, current);
  try {
    localStorage.setItem(`${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(cleaned));
  } catch {}

  window.dispatchEvent(new CustomEvent('morning_post_assignments_updated', { detail: { year, month, assignment } }));

  return persistMorningPostAssignmentsToCloud(year, month, cleaned);
}

/**
 * Update Medical Guard Label (Jaga Puskesmas / Jaga Rumah Sakit / Custom) across ANY shift (Pagi, Sore, Malam)
 * without touching postTitle or quranAssistance
 */
export async function updateStaffMedicalGuardLabel(
  year: number,
  month: number,
  day: number,
  staffId: number,
  staffName: string,
  shiftCode: ShiftCode | string,
  medicalGuardLabel: string | undefined
): Promise<boolean> {
  const current = getLocalMorningPostAssignments(year, month);
  const key = `${day}_${staffId}`;
  const existing = current[key];

  const trimmed = medicalGuardLabel?.trim() || undefined;

  if (!trimmed && !existing?.postTitle && !existing?.quranAssistance) {
    return deleteMorningPostAssignment(year, month, day, staffId);
  }

  const assignment: MorningPostAssignment & { explicitlyVerifiedV2?: boolean } = {
    ...existing,
    staffId,
    staffName,
    day,
    month,
    year,
    shiftCode: shiftCode || existing?.shiftCode || 'P1',
    postTitle: existing?.postTitle,
    quranAssistance: existing?.quranAssistance,
    medicalGuardLabel: trimmed,
    explicitlyVerifiedV2: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin',
  };

  if (!trimmed) {
    delete assignment.medicalGuardLabel;
  }

  current[key] = assignment;
  const { cleaned } = sanitizeMorningPostAssignments(year, month, current);
  try {
    localStorage.setItem(`${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(cleaned));
  } catch {}

  window.dispatchEvent(new CustomEvent('morning_post_assignments_updated', { detail: { year, month, assignment } }));

  return persistMorningPostAssignmentsToCloud(year, month, cleaned);
}

/**
 * Clear main postTitle specifically without removing quranAssistance or medicalGuardLabel
 */
export async function clearStaffMainPost(
  year: number,
  month: number,
  day: number,
  staffId: number
): Promise<boolean> {
  const current = getLocalMorningPostAssignments(year, month);
  const key = `${day}_${staffId}`;
  const existing = current[key];

  if (!existing) return true;

  if (!existing.quranAssistance && !existing.medicalGuardLabel) {
    return deleteMorningPostAssignment(year, month, day, staffId);
  }

  const updated: MorningPostAssignment & { explicitlyVerifiedV2?: boolean } = {
    ...existing,
    explicitlyVerifiedV2: true,
    updatedAt: new Date().toISOString(),
  };
  delete updated.postTitle;
  delete updated.customDetail;

  current[key] = updated;
  const { cleaned } = sanitizeMorningPostAssignments(year, month, current);
  try {
    localStorage.setItem(`${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(cleaned));
  } catch {}

  window.dispatchEvent(new CustomEvent('morning_post_assignments_updated', { detail: { year, month, assignment: updated } }));

  return persistMorningPostAssignmentsToCloud(year, month, cleaned);
}

/**
 * Delete a morning post assignment safely
 */
export async function deleteMorningPostAssignment(
  year: number,
  month: number,
  day: number,
  staffId: number
): Promise<boolean> {
  const current = getLocalMorningPostAssignments(year, month);
  const key = `${day}_${staffId}`;
  delete current[key];

  const { cleaned } = sanitizeMorningPostAssignments(year, month, current);
  try {
    localStorage.setItem(`${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(cleaned));
  } catch {}

  window.dispatchEvent(new CustomEvent('morning_post_assignments_updated', { detail: { year, month } }));

  return persistMorningPostAssignmentsToCloud(year, month, cleaned);
}

/**
 * Realtime subscribe to morning post assignments for a specific month
 */
export function subscribeToMorningPostAssignments(
  year: number,
  month: number,
  onData: (assignments: Record<string, MorningPostAssignment>) => void,
  onError?: (err: unknown) => void
): () => void {
  const storageKey = `${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`;
  let lastFingerprint = '';

  const emitIfChanged = (data: Record<string, MorningPostAssignment>) => {
    const { cleaned } = sanitizeMorningPostAssignments(year, month, data);
    const fp = JSON.stringify(cleaned);
    if (fp === lastFingerprint) return;
    lastFingerprint = fp;
    onData(cleaned);
  };

  emitIfChanged(getLocalMorningPostAssignments(year, month));

  const handleLocalUpdate = () => {
    emitIfChanged(getLocalMorningPostAssignments(year, month));
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === storageKey && e.newValue) {
      try {
        emitIfChanged(JSON.parse(e.newValue));
      } catch {}
    }
  };

  window.addEventListener('morning_post_assignments_updated', handleLocalUpdate);
  window.addEventListener('storage', handleStorageEvent);

  const client = getSupabaseClient();
  if (!client) {
    return () => {
      window.removeEventListener('morning_post_assignments_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }

  fetchMorningPostAssignmentsFromSupabase(year, month).then((res) => {
    if (res) emitIfChanged(res);
  });

  const handleFocus = () => {
    fetchMorningPostAssignmentsFromSupabase(year, month).then((res) => {
      if (res) emitIfChanged(res);
    });
  };
  window.addEventListener('focus', handleFocus);

  const schedId = `${year}_${month}`;
  const settingKey = `morning_posts_${year}_${month}`;

  // Resilient polling fallback every 6 seconds to guarantee multi-device sync
  const pollInterval = setInterval(() => {
    fetchMorningPostAssignmentsFromSupabase(year, month)
      .then((res) => {
        if (res) emitIfChanged(res);
      })
      .catch(() => {});
  }, 6000);

  try {
    const channel = client
      .channel(`morning_posts_${schedId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'morning_posts', filter: `schedule_id=eq.${schedId}` },
        (payload: any) => {
          if (payload.new?.assignments_json && typeof payload.new.assignments_json === 'object') {
            const { cleaned } = sanitizeMorningPostAssignments(year, month, payload.new.assignments_json);
            try {
              localStorage.setItem(storageKey, JSON.stringify(cleaned));
            } catch {}
            emitIfChanged(cleaned);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: `key=eq.${settingKey}` },
        (payload: any) => {
          const remoteMap = payload.new?.value_json?.assignments;
          if (remoteMap && typeof remoteMap === 'object') {
            const { cleaned } = sanitizeMorningPostAssignments(year, month, remoteMap);
            try {
              localStorage.setItem(storageKey, JSON.stringify(cleaned));
            } catch {}
            emitIfChanged(cleaned);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('morning_post_assignments_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleFocus);
      client.removeChannel(channel);
    };
  } catch {
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('morning_post_assignments_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleFocus);
    };
  }
}
