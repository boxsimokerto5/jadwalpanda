import { P5TaskAssignment, P5CustomTaskOption } from '../types';
import { getSupabaseClient } from './supabaseService';

export const DEFAULT_P5_TASK_OPTIONS: P5CustomTaskOption[] = [
  { id: 'perhotelan', label: 'Mendampingi Perhotelan', isDefault: true },
  { id: 'tata_boga', label: 'Mendampingi Tata Boga', isDefault: true },
  { id: 'peternakan', label: 'Mendampingi Peternakan', isDefault: true },
  { id: 'pertanian', label: 'Mendampingi Pertanian', isDefault: true },
  { id: 'tata_rias', label: 'Mendampingi Tata Rias', isDefault: true },
];

const P5_OPTIONS_STORAGE_KEY = 'wali_asuh_p5_task_options_v1';
const P5_ASSIGNMENTS_STORAGE_PREFIX = 'wali_asuh_p5_assignments_v1';

/**
 * Get current P5 task options from localStorage
 */
export function getLocalP5TaskOptions(): P5CustomTaskOption[] {
  try {
    const saved = localStorage.getItem(P5_OPTIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_P5_TASK_OPTIONS;
}

/**
 * Save P5 task options locally & to Supabase
 */
export async function saveP5TaskOptions(options: P5CustomTaskOption[]): Promise<boolean> {
  try {
    localStorage.setItem(P5_OPTIONS_STORAGE_KEY, JSON.stringify(options));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('p5_task_options').upsert({
      id: 'current',
      options_json: options,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch (err: any) {
    console.warn('[P5Service] Supabase notice:', err);
    return true;
  }
}

/**
 * Fetch P5 task options from Supabase
 */
export async function fetchP5TaskOptionsFromSupabase(): Promise<P5CustomTaskOption[] | null> {
  const client = getSupabaseClient();
  if (!client) return getLocalP5TaskOptions();

  try {
    const { data } = await client
      .from('p5_task_options')
      .select('options_json')
      .eq('id', 'current')
      .maybeSingle();

    if (data?.options_json && Array.isArray(data.options_json)) {
      localStorage.setItem(P5_OPTIONS_STORAGE_KEY, JSON.stringify(data.options_json));
      return data.options_json;
    }
    return getLocalP5TaskOptions();
  } catch {
    return getLocalP5TaskOptions();
  }
}

/**
 * Realtime subscribe to P5 task options
 */
export function subscribeToP5TaskOptions(
  onData: (options: P5CustomTaskOption[]) => void,
  onError?: (err: unknown) => void
): () => void {
  onData(getLocalP5TaskOptions());

  const client = getSupabaseClient();
  if (!client) return () => {};

  fetchP5TaskOptionsFromSupabase().then((res) => {
    if (res) onData(res);
  });

  try {
    const channel = client
      .channel('p5_task_options_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'p5_task_options', filter: 'id=eq.current' },
        (payload: any) => {
          if (payload.new?.options_json && Array.isArray(payload.new.options_json)) {
            localStorage.setItem(P5_OPTIONS_STORAGE_KEY, JSON.stringify(payload.new.options_json));
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
 * Get local P5 task assignments map for year and month
 */
export function getLocalP5Assignments(year: number, month: number): Record<string, P5TaskAssignment> {
  try {
    const key = `${P5_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch {}
  return {};
}

/**
 * Save single or multiple P5 assignments locally and to Supabase
 */
export async function saveP5AssignmentToSupabase(
  assignment: P5TaskAssignment
): Promise<boolean> {
  const { year, month, day, staffId } = assignment;
  const current = getLocalP5Assignments(year, month);
  const key = `${day}_${staffId}`;
  current[key] = {
    ...assignment,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(`${P5_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(current));
  } catch {}

  window.dispatchEvent(new CustomEvent('p5_assignments_updated', { detail: { year, month, assignment } }));

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const schedId = `${year}_${month}`;
    await client.from('p5_assignments').upsert({
      schedule_id: schedId,
      assignments_json: current,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch (err: any) {
    console.warn('[P5Service] Supabase notice:', err);
    return true;
  }
}

/**
 * Delete a P5 assignment
 */
export async function deleteP5Assignment(
  year: number,
  month: number,
  day: number,
  staffId: number
): Promise<boolean> {
  const current = getLocalP5Assignments(year, month);
  const key = `${day}_${staffId}`;
  delete current[key];

  try {
    localStorage.setItem(`${P5_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(current));
  } catch {}

  window.dispatchEvent(new CustomEvent('p5_assignments_updated', { detail: { year, month } }));

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const schedId = `${year}_${month}`;
    await client.from('p5_assignments').upsert({
      schedule_id: schedId,
      assignments_json: current,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch (err: any) {
    console.warn('[P5Service] Supabase notice:', err);
    return true;
  }
}

/**
 * Realtime subscribe to P5 assignments for a specific month
 */
export function subscribeToP5Assignments(
  year: number,
  month: number,
  onData: (assignments: Record<string, P5TaskAssignment>) => void,
  onError?: (err: unknown) => void
): () => void {
  const local = getLocalP5Assignments(year, month);
  onData(local);

  const client = getSupabaseClient();
  if (!client) return () => {};

  const schedId = `${year}_${month}`;
  Promise.resolve(
    client
      .from('p5_assignments')
      .select('assignments_json')
      .eq('schedule_id', schedId)
      .maybeSingle()
  )
    .then(({ data, error }: any) => {
      if (!error && data?.assignments_json) {
        try {
          localStorage.setItem(`${P5_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(data.assignments_json));
        } catch {}
        onData(data.assignments_json);
      }
    })
    .catch(() => {});

  try {
    const channel = client
      .channel(`p5_assignments_${schedId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'p5_assignments', filter: `schedule_id=eq.${schedId}` },
        (payload: any) => {
          if (payload.new?.assignments_json) {
            try {
              localStorage.setItem(`${P5_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(payload.new.assignments_json));
            } catch {}
            onData(payload.new.assignments_json);
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
