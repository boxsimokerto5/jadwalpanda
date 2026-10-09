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

async function persistP5AssignmentsToCloud(
  year: number,
  month: number,
  assignments: Record<string, P5TaskAssignment>
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return true;

  const schedId = `${year}_${month}`;
  const settingKey = `p5_assignments_${year}_${month}`;
  const mirrorSchedId = `p5_assign_${year}_${String(month).padStart(2, '0')}`;
  const nowIso = new Date().toISOString();

  await Promise.allSettled([
    client.from('p5_assignments').upsert({
      schedule_id: schedId,
      assignments_json: assignments,
      updated_at: nowIso,
    }),
    client.from('system_settings').upsert({
      key: settingKey,
      value_json: {
        assignments,
        updatedAt: nowIso,
      },
      updated_at: nowIso,
    }),
    client.from('schedules').upsert(
      {
        id: mirrorSchedId,
        year: -(year * 10 + 4),
        month: -month,
        total_days: 0,
        days_json: {
          assignments,
          updatedAt: nowIso,
        } as any,
        updated_at: nowIso,
        updated_by: 'P5 Cloud Sync',
      },
      { onConflict: 'id' }
    ),
  ]);

  return true;
}

/**
 * Fetch P5 assignments from Supabase across all 3 cloud layers
 */
export async function fetchP5AssignmentsFromSupabase(
  year: number,
  month: number
): Promise<Record<string, P5TaskAssignment>> {
  const local = getLocalP5Assignments(year, month);
  const client = getSupabaseClient();
  if (!client) return local;

  const schedId = `${year}_${month}`;
  const settingKey = `p5_assignments_${year}_${month}`;
  const mirrorSchedId = `p5_assign_${year}_${String(month).padStart(2, '0')}`;

  try {
    const [tableRes, settingRes, schedMirrorRes] = await Promise.allSettled([
      client.from('p5_assignments').select('assignments_json, updated_at').eq('schedule_id', schedId).maybeSingle(),
      client.from('system_settings').select('value_json, updated_at').eq('key', settingKey).maybeSingle(),
      client.from('schedules').select('days_json, updated_at').eq('id', mirrorSchedId).maybeSingle(),
    ]);

    const candidates: { data: Record<string, P5TaskAssignment>; time: number }[] = [];

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

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.time - a.time);
      const remote = candidates[0].data;
      try {
        localStorage.setItem(`${P5_ASSIGNMENTS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(remote));
      } catch {}
      return remote;
    }

    if (Object.keys(local).length > 0) {
      persistP5AssignmentsToCloud(year, month, local).catch(() => {});
    }

    return local;
  } catch {
    return local;
  }
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

  return await persistP5AssignmentsToCloud(year, month, current);
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

  return await persistP5AssignmentsToCloud(year, month, current);
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

  let isMounted = true;
  const pullLatest = async () => {
    const fresh = await fetchP5AssignmentsFromSupabase(year, month);
    if (isMounted) onData(fresh);
  };

  pullLatest();

  const handleFocus = () => {
    if (document.visibilityState === 'visible') pullLatest();
  };
  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleFocus);

  const pollTimer = setInterval(pullLatest, 8000);
  const schedId = `${year}_${month}`;
  const mirrorSchedId = `p5_assign_${year}_${String(month).padStart(2, '0')}`;

  try {
    const channel = client
      .channel(`p5_assignments_${schedId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'p5_assignments', filter: `schedule_id=eq.${schedId}` },
        () => pullLatest()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules', filter: `id=eq.${mirrorSchedId}` },
        () => pullLatest()
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      client.removeChannel(channel);
    };
  } catch {
    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }
}
