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
 * Get all morning post assignments for a specific month from localStorage
 */
export function getLocalMorningPostAssignments(
  year: number,
  month: number
): Record<string, MorningPostAssignment> {
  try {
    const saved = localStorage.getItem(`${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return {};
}

/**
 * Fetch all morning post assignments from Supabase and merge with local
 */
export async function fetchMorningPostAssignmentsFromSupabase(
  year: number,
  month: number
): Promise<Record<string, MorningPostAssignment>> {
  const local = getLocalMorningPostAssignments(year, month);
  const client = getSupabaseClient();
  if (!client) return local;

  try {
    const schedId = `${year}_${month}`;
    const { data } = await client
      .from('morning_posts')
      .select('assignments_json')
      .eq('schedule_id', schedId)
      .maybeSingle();

    if (data?.assignments_json && typeof data.assignments_json === 'object') {
      const merged = { ...local, ...data.assignments_json };
      try {
        localStorage.setItem(`${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(merged));
      } catch {}
      window.dispatchEvent(new CustomEvent('morning_post_assignments_updated', { detail: { year, month } }));
      return merged;
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

  const mergedAssignment: MorningPostAssignment = {
    ...existing,
    ...assignment,
    updatedAt: new Date().toISOString(),
  };

  current[key] = mergedAssignment;

  try {
    localStorage.setItem(`${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(current));
  } catch {}

  window.dispatchEvent(new CustomEvent('morning_post_assignments_updated', { detail: { year, month, assignment: mergedAssignment } }));

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const schedId = `${year}_${month}`;
    await client.from('morning_posts').upsert({
      schedule_id: schedId,
      assignments_json: current,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch (err: any) {
    console.warn('[MorningPost] Supabase save notice:', err);
    return true;
  }
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

  const assignment: MorningPostAssignment = {
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
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin',
  };

  if (!quranAssistance) {
    delete assignment.quranAssistance;
  }

  current[key] = assignment;
  try {
    localStorage.setItem(`${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(current));
  } catch {}

  window.dispatchEvent(new CustomEvent('morning_post_assignments_updated', { detail: { year, month, assignment } }));

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const schedId = `${year}_${month}`;
    await client.from('morning_posts').upsert({
      schedule_id: schedId,
      assignments_json: current,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return true;
  }
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

  const assignment: MorningPostAssignment = {
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
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin',
  };

  if (!trimmed) {
    delete assignment.medicalGuardLabel;
  }

  current[key] = assignment;
  try {
    localStorage.setItem(`${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(current));
  } catch {}

  window.dispatchEvent(new CustomEvent('morning_post_assignments_updated', { detail: { year, month, assignment } }));

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const schedId = `${year}_${month}`;
    await client.from('morning_posts').upsert({
      schedule_id: schedId,
      assignments_json: current,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return true;
  }
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

  const updated: MorningPostAssignment = {
    ...existing,
    updatedAt: new Date().toISOString(),
  };
  delete updated.postTitle;
  delete updated.customDetail;

  current[key] = updated;
  try {
    localStorage.setItem(`${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(current));
  } catch {}

  window.dispatchEvent(new CustomEvent('morning_post_assignments_updated', { detail: { year, month, assignment: updated } }));

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const schedId = `${year}_${month}`;
    await client.from('morning_posts').upsert({
      schedule_id: schedId,
      assignments_json: current,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return true;
  }
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

  try {
    localStorage.setItem(`${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(current));
  } catch {}

  window.dispatchEvent(new CustomEvent('morning_post_assignments_updated', { detail: { year, month } }));

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const schedId = `${year}_${month}`;
    await client.from('morning_posts').upsert({
      schedule_id: schedId,
      assignments_json: current,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return true;
  }
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
  const localData = getLocalMorningPostAssignments(year, month);
  onData(localData);

  const handleLocalUpdate = () => {
    onData(getLocalMorningPostAssignments(year, month));
  };
  window.addEventListener('morning_post_assignments_updated', handleLocalUpdate);

  const client = getSupabaseClient();
  if (!client) {
    return () => {
      window.removeEventListener('morning_post_assignments_updated', handleLocalUpdate);
    };
  }

  fetchMorningPostAssignmentsFromSupabase(year, month).then((res) => {
    if (res) onData(res);
  });

  const schedId = `${year}_${month}`;
  try {
    const channel = client
      .channel(`morning_posts_${schedId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'morning_posts', filter: `schedule_id=eq.${schedId}` },
        (payload: any) => {
          if (payload.new?.assignments_json) {
            try {
              localStorage.setItem(`${MORNING_POST_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(payload.new.assignments_json));
            } catch {}
            onData(payload.new.assignments_json);
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('morning_post_assignments_updated', handleLocalUpdate);
      client.removeChannel(channel);
    };
  } catch {
    return () => {
      window.removeEventListener('morning_post_assignments_updated', handleLocalUpdate);
    };
  }
}
