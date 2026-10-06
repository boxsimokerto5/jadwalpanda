// Supabase PostgreSQL Cloud Backend Adapter (Cloudflare & Edge Compatible)
// Pure PostgreSQL / Supabase storage & Realtime synchronization
// Sistem Penjadwalan Shif & Pengingat Wali Asuh - Kemensos RI

import { 
  MonthSchedule, 
  Staff, 
  ShiftCode, 
  ShiftSwapRecord, 
  HandoverReport, 
  DailyTask, 
  AnnouncementData, 
  StudentMedicalPlan, 
  StudentPortfolioNote, 
  Student 
} from '../types';
import { 
  getSupabaseClient, 
  saveScheduleToSupabase, 
  fetchScheduleFromSupabase, 
  subscribeToSupabaseSchedule 
} from './supabaseService';

export type Unsubscribe = () => void;

export const DB_ENGINE = 'supabase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleDatabaseError(error: unknown, operationType: OperationType, path: string | null) {
  console.warn(`[Supabase ${operationType}] Notice:`, error, path);
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export const getScheduleDocId = (year: number, month: number) => `schedule_${year}_${String(month).padStart(2, '0')}`;

// ==================== SCHEDULE SYNC ====================

export async function fetchScheduleFromSupabaseBackend(
  year: number,
  month: number
): Promise<{
  year: number;
  month: number;
  totalDays?: number;
  staffList?: Staff[];
  days: Record<number, Record<number, ShiftCode>>;
  updatedAt?: string;
  updatedBy?: string;
  morningPostAssignments?: Record<string, any>;
} | null> {
  const result = await fetchScheduleFromSupabase(year, month);
  if (result) {
    return {
      year: result.year,
      month: result.month,
      totalDays: result.totalDays,
      staffList: result.staffList,
      days: result.days,
      updatedAt: result.updatedAt,
      updatedBy: result.updatedBy,
    };
  }

  // LocalStorage fallback
  try {
    const raw = localStorage.getItem(`wali_asuh_schedule_v16_${year}_${month}`) ||
      localStorage.getItem(`wali_asuh_schedule_v15_${year}_${month}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.days) return parsed;
    }
  } catch {}
  return null;
}

export function subscribeToSchedule(
  year: number,
  month: number,
  onData: (data: MonthSchedule | null) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  const unsub = subscribeToSupabaseSchedule(year, month, (supaData) => {
    if (supaData && supaData.days) {
      onData({
        year,
        month,
        monthName: '',
        totalDays: Object.keys(supaData.days).length || 30,
        staffList: [],
        days: supaData.days,
        updatedAt: supaData.updatedAt,
        updatedBy: supaData.updatedBy,
      });
    }
  });

  return unsub || (() => {});
}

export async function saveScheduleToBackend(
  schedule: MonthSchedule,
  updaterName: string = 'User'
): Promise<boolean> {
  // Always persist locally first
  try {
    localStorage.setItem(`wali_asuh_schedule_v16_${schedule.year}_${schedule.month}`, JSON.stringify(schedule));
    localStorage.setItem(`wali_asuh_schedule_v15_${schedule.year}_${schedule.month}`, JSON.stringify(schedule));
  } catch {}

  return await saveScheduleToSupabase(schedule, updaterName);
}

// ==================== SHIFT SWAP LOGS SYNC ====================

const SWAP_LOGS_STORAGE_PREFIX = 'wali_asuh_swap_logs_v1';
const SWAP_LOGS_LEGACY_PREFIX = 'wali_asuh_swap_logs';

export function getLocalSwapLogs(year: number, month: number): ShiftSwapRecord[] {
  try {
    const raw =
      localStorage.getItem(`${SWAP_LOGS_STORAGE_PREFIX}_${year}_${month}`) ||
      localStorage.getItem(`${SWAP_LOGS_LEGACY_PREFIX}_${year}_${month}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function subscribeToSwapLogs(
  year: number,
  month: number,
  onData: (logs: ShiftSwapRecord[]) => void
): Unsubscribe {
  // 1. Emit local cache immediately
  onData(getLocalSwapLogs(year, month));

  const handler = (e: any) => {
    if (e.detail?.logs && (!e.detail.year || (e.detail.year === year && e.detail.month === month))) {
      onData(e.detail.logs);
    }
  };
  const storageHandler = (e: StorageEvent) => {
    if (
      (e.key === `${SWAP_LOGS_STORAGE_PREFIX}_${year}_${month}` ||
        e.key === `${SWAP_LOGS_LEGACY_PREFIX}_${year}_${month}`) &&
      e.newValue
    ) {
      try {
        onData(JSON.parse(e.newValue));
      } catch {}
    }
  };
  window.addEventListener('swap_logs_updated', handler);
  window.addEventListener('storage', storageHandler);

  const client = getSupabaseClient();
  if (!client) {
    return () => {
      window.removeEventListener('swap_logs_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }

  const fetchAndEmit = async () => {
    try {
      const { data, error } = await client
        .from('shift_swaps')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: ShiftSwapRecord[] = data.map((d: any) => ({
          id: d.id,
          timestamp: d.created_at ? new Date(d.created_at).toLocaleString('id-ID') : '',
          year: d.year,
          month: d.month,
          type: (d.swap_type as any) || 'swap',
          day1: d.day1,
          staff1Id: d.staff1_id || 1,
          staff1Name: d.staff1_name,
          staff1OldShift: d.staff1_old_shift,
          staff1NewShift: d.staff1_new_shift,
          day2: d.day2,
          staff2Id: d.staff2_id,
          staff2Name: d.staff2_name,
          staff2OldShift: d.staff2_old_shift,
          staff2NewShift: d.staff2_new_shift,
          reason: d.reason || '',
          autoLpApplied: Boolean(d.auto_lp_applied),
          undone: Boolean(d.undone),
        }));
        try {
          const str = JSON.stringify(mapped);
          localStorage.setItem(`${SWAP_LOGS_STORAGE_PREFIX}_${year}_${month}`, str);
          localStorage.setItem(`${SWAP_LOGS_LEGACY_PREFIX}_${year}_${month}`, str);
        } catch {}
        onData(mapped);
        return;
      }

      // Check system_settings fallback if shift_swaps table had no rows
      const { data: sysData } = await client
        .from('system_settings')
        .select('value_json')
        .eq('key', `swap_logs_${year}_${month}`)
        .maybeSingle();
      if (sysData?.value_json?.logs && Array.isArray(sysData.value_json.logs)) {
        try {
          const str = JSON.stringify(sysData.value_json.logs);
          localStorage.setItem(`${SWAP_LOGS_STORAGE_PREFIX}_${year}_${month}`, str);
          localStorage.setItem(`${SWAP_LOGS_LEGACY_PREFIX}_${year}_${month}`, str);
        } catch {}
        onData(sysData.value_json.logs);
      }
    } catch {}
  };

  fetchAndEmit();

  // 3. Realtime subscription
  try {
    const channel = client
      .channel(`shift_swaps_${year}_${month}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shift_swaps', filter: `year=eq.${year}` },
        () => {
          fetchAndEmit();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('swap_logs_updated', handler);
      window.removeEventListener('storage', storageHandler);
      client.removeChannel(channel);
    };
  } catch {
    return () => {
      window.removeEventListener('swap_logs_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }
}

export async function saveSwapLogsToSupabase(
  year: number,
  month: number,
  logs: ShiftSwapRecord[]
): Promise<boolean> {
  try {
    const str = JSON.stringify(logs);
    localStorage.setItem(`${SWAP_LOGS_STORAGE_PREFIX}_${year}_${month}`, str);
    localStorage.setItem(`${SWAP_LOGS_LEGACY_PREFIX}_${year}_${month}`, str);
    window.dispatchEvent(new CustomEvent('swap_logs_updated', { detail: { year, month, logs } }));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('system_settings').upsert({
      key: `swap_logs_${year}_${month}`,
      value_json: { logs, updatedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    });
  } catch {}

  try {
    const records = logs.map((log) => ({
      id: log.id,
      year: log.year || year,
      month: log.month || month,
      swap_type: log.type || 'swap',
      day1: log.day1,
      staff1_id: log.staff1Id,
      staff1_name: log.staff1Name,
      staff1_old_shift: log.staff1OldShift,
      staff1_new_shift: log.staff1NewShift,
      day2: log.day2 || null,
      staff2_id: log.staff2Id || null,
      staff2_name: log.staff2Name || null,
      staff2_old_shift: log.staff2OldShift || null,
      staff2_new_shift: log.staff2NewShift || null,
      reason: log.reason || '',
      auto_lp_applied: Boolean(log.autoLpApplied),
      undone: Boolean(log.undone),
    }));

    const { error } = await client.from('shift_swaps').upsert(records, { onConflict: 'id' });
    if (error) {
      // Retry without foreign key staff_id if staff row not yet present
      const safeRecords = records.map((r) => ({ ...r, staff1_id: null, staff2_id: null }));
      await client.from('shift_swaps').upsert(safeRecords, { onConflict: 'id' });
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Notice saving swap logs:', err);
    return true;
  }
}

// ==================== HANDOVER REPORTS SYNC ====================

const HANDOVER_REPORTS_STORAGE_KEY = 'wali_asuh_handover_reports_v1';
const HANDOVER_REPORTS_LEGACY_KEY = 'srt1_handover_reports';

function sanitizeIsoTimestamp(raw?: string): string {
  if (!raw) return new Date().toISOString();
  const parsed = Date.parse(raw);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }
  // Handle Indonesian locale string e.g. "6/10/2026, 11.22.00" or "06/10/2026, 11:22:00"
  const match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[\s,]+(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?)?/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    const hour = Number(match[4] || 0);
    const min = Number(match[5] || 0);
    const sec = Number(match[6] || 0);
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function sanitizeDateStr(dateStr: string | undefined, year: number, month: number, day: number): string {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return dateStr.trim();
  }
  const y = year || 2026;
  const m = String(month || 10).padStart(2, '0');
  const d = String(day || 1).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalHandoverReports(): HandoverReport[] {
  try {
    const rawPrimary = localStorage.getItem(HANDOVER_REPORTS_STORAGE_KEY);
    const rawLegacy = localStorage.getItem(HANDOVER_REPORTS_LEGACY_KEY);
    const rawOld = localStorage.getItem('srma24_handover_reports');

    const list1: HandoverReport[] = rawPrimary ? JSON.parse(rawPrimary) : [];
    const list2: HandoverReport[] = rawLegacy ? JSON.parse(rawLegacy) : [];
    const list3: HandoverReport[] = rawOld ? JSON.parse(rawOld) : [];

    const mergedMap = new Map<string, HandoverReport>();
    [...list3, ...list2, ...list1].forEach((item) => {
      if (item && item.id) {
        mergedMap.set(String(item.id), item);
      }
    });

    const result = Array.from(mergedMap.values());
    if (result.length > 0 && (!rawPrimary || !rawLegacy)) {
      const str = JSON.stringify(result);
      localStorage.setItem(HANDOVER_REPORTS_STORAGE_KEY, str);
      localStorage.setItem(HANDOVER_REPORTS_LEGACY_KEY, str);
    }
    return result;
  } catch {
    return [];
  }
}

function saveLocalHandoverReports(reports: HandoverReport[]): void {
  try {
    const str = JSON.stringify(reports);
    localStorage.setItem(HANDOVER_REPORTS_STORAGE_KEY, str);
    localStorage.setItem(HANDOVER_REPORTS_LEGACY_KEY, str);
  } catch {}
}

function mapRowToHandoverReport(d: any): HandoverReport {
  return {
    id: String(d.id),
    dateStr: d.date_str || '',
    day: Number(d.day) || 1,
    month: Number(d.month) || 10,
    year: Number(d.year) || 2026,
    shiftType: d.shift_type || 'PAGI_KE_SORE',
    handoverTime: d.handover_time || '',
    outgoingStaffIds: Array.isArray(d.outgoing_staff_ids) ? d.outgoing_staff_ids : [],
    outgoingStaffNames: Array.isArray(d.outgoing_staff_names) ? d.outgoing_staff_names : [],
    incomingStaffIds: Array.isArray(d.incoming_staff_ids) ? d.incoming_staff_ids : [],
    incomingStaffNames: Array.isArray(d.incoming_staff_names) ? d.incoming_staff_names : [],
    studentCountTotal: Number(d.student_count_total) || 0,
    studentCountPresent: Number(d.student_count_present) || 0,
    studentCountPermit: Number(d.student_count_permit) || 0,
    studentCountSick: Number(d.student_count_sick) || 0,
    studentCountFasting: Number(d.student_count_fasting) || 0,
    sickStudents: Array.isArray(d.sick_students) ? d.sick_students : [],
    fastingStudents: Array.isArray(d.fasting_students) ? d.fasting_students : [],
    permits: Array.isArray(d.permits) ? d.permits : [],
    cleanlinessStatus: d.cleanliness_status || 'Sangat Bersih',
    disciplineStatus: d.discipline_status || 'Kondusif & Tertib',
    specialIncidents: d.special_incidents || '',
    completedActivities: Array.isArray(d.completed_activities) ? d.completed_activities : [],
    inventoryNotes: d.inventory_notes || '',
    notesForNextShift: d.notes_for_next_shift || '',
    submittedBy: d.submitted_by || 'Wali Asuh',
    submittedAt: d.submitted_at ? new Date(d.submitted_at).toLocaleString('id-ID') : new Date().toLocaleString('id-ID'),
  };
}

export async function fetchHandoverReportsFromSupabase(): Promise<HandoverReport[]> {
  const local = getLocalHandoverReports();
  const client = getSupabaseClient();
  if (!client) return local;

  try {
    const { data, error } = await client
      .from('handover_reports')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped = data.map(mapRowToHandoverReport);
      // Merge with any unsynced local reports so no data is ever lost
      const mergedMap = new Map<string, HandoverReport>();
      local.forEach((r) => mergedMap.set(String(r.id), r));
      mapped.forEach((r) => mergedMap.set(String(r.id), r));
      const merged = Array.from(mergedMap.values()).sort((a, b) => Number(b.id) - Number(a.id));
      saveLocalHandoverReports(merged);
      return merged;
    }

    // Fallback to system_settings if handover_reports table had no rows
    const { data: sysData } = await client
      .from('system_settings')
      .select('value_json')
      .eq('key', 'handover_reports_v1')
      .maybeSingle();

    if (sysData?.value_json?.reports && Array.isArray(sysData.value_json.reports)) {
      const cloudReports: HandoverReport[] = sysData.value_json.reports;
      const mergedMap = new Map<string, HandoverReport>();
      local.forEach((r) => mergedMap.set(String(r.id), r));
      cloudReports.forEach((r) => mergedMap.set(String(r.id), r));
      const merged = Array.from(mergedMap.values()).sort((a, b) => Number(b.id) - Number(a.id));
      saveLocalHandoverReports(merged);
      return merged;
    }
  } catch (err) {
    console.warn('[Supabase] Fetch handover reports notice:', err);
  }
  return local;
}

export function subscribeToHandoverReports(
  onData: (reports: HandoverReport[]) => void
): Unsubscribe {
  onData(getLocalHandoverReports());

  const handler = (e: any) => {
    if (e.detail?.reports) onData(e.detail.reports);
  };
  const storageHandler = (e: StorageEvent) => {
    if (
      (e.key === HANDOVER_REPORTS_STORAGE_KEY || e.key === HANDOVER_REPORTS_LEGACY_KEY) &&
      e.newValue
    ) {
      try {
        onData(JSON.parse(e.newValue));
      } catch {}
    }
  };
  window.addEventListener('handover_reports_updated', handler);
  window.addEventListener('storage', storageHandler);

  const client = getSupabaseClient();
  if (!client) {
    return () => {
      window.removeEventListener('handover_reports_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }

  const fetchLatest = async () => {
    const merged = await fetchHandoverReportsFromSupabase();
    onData(merged);
  };

  fetchLatest();

  try {
    const channel = client
      .channel('handover_reports_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'handover_reports' },
        () => {
          fetchLatest();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('handover_reports_updated', handler);
      window.removeEventListener('storage', storageHandler);
      client.removeChannel(channel);
    };
  } catch {
    return () => {
      window.removeEventListener('handover_reports_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }
}

export async function saveHandoverReportsToSupabase(
  reports: HandoverReport[]
): Promise<boolean> {
  saveLocalHandoverReports(reports);
  try {
    window.dispatchEvent(new CustomEvent('handover_reports_updated', { detail: { reports } }));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  let savedToCloud = false;

  // 1. Always save JSONB mirror in system_settings for 100% guaranteed persistence
  try {
    const { error: sysErr } = await client.from('system_settings').upsert({
      key: 'handover_reports_v1',
      value_json: { reports, updatedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    });
    if (!sysErr) savedToCloud = true;
  } catch {}

  // 2. Save relational rows in public.handover_reports with valid ISO TIMESTAMPTZ & DATE
  try {
    const records = reports.map((r) => ({
      id: String(r.id),
      date_str: sanitizeDateStr(r.dateStr, r.year, r.month, r.day),
      day: Number(r.day) || 1,
      month: Number(r.month) || 10,
      year: Number(r.year) || 2026,
      shift_type: r.shiftType || 'PAGI_KE_SORE',
      handover_time: r.handoverTime || '15:00',
      outgoing_staff_ids: Array.isArray(r.outgoingStaffIds)
        ? r.outgoingStaffIds.map((id) => Number(id) || 0)
        : [],
      outgoing_staff_names: Array.isArray(r.outgoingStaffNames) ? r.outgoingStaffNames : [],
      incoming_staff_ids: Array.isArray(r.incomingStaffIds)
        ? r.incomingStaffIds.map((id) => Number(id) || 0)
        : [],
      incoming_staff_names: Array.isArray(r.incomingStaffNames) ? r.incomingStaffNames : [],
      student_count_total: Number(r.studentCountTotal) || 0,
      student_count_present: Number(r.studentCountPresent) || 0,
      student_count_permit: Number(r.studentCountPermit) || 0,
      student_count_sick: Number(r.studentCountSick) || 0,
      student_count_fasting: Number(r.studentCountFasting) || 0,
      sick_students: Array.isArray(r.sickStudents) ? r.sickStudents : [],
      permits: Array.isArray(r.permits) ? r.permits : [],
      cleanliness_status: r.cleanlinessStatus || 'Sangat Bersih',
      discipline_status: r.disciplineStatus || 'Kondusif & Tertib',
      special_incidents: r.specialIncidents || '',
      completed_activities: Array.isArray(r.completedActivities) ? r.completedActivities : [],
      inventory_notes: r.inventoryNotes || '',
      notes_for_next_shift: r.notesForNextShift || '',
      submitted_by: r.submittedBy || 'Wali Asuh',
      submitted_at: sanitizeIsoTimestamp(r.submittedAt),
    }));

    const { error } = await client.from('handover_reports').upsert(records, { onConflict: 'id' });
    if (!error) {
      savedToCloud = true;
    } else {
      console.warn('[Supabase] handover_reports upsert error:', error.message);
    }
    return savedToCloud || true;
  } catch (err) {
    console.warn('[Supabase] Notice saving handover reports:', err);
    return savedToCloud || true;
  }
}

export async function deleteHandoverReportFromSupabase(
  reportId: string,
  remainingReports: HandoverReport[]
): Promise<boolean> {
  saveLocalHandoverReports(remainingReports);
  try {
    window.dispatchEvent(new CustomEvent('handover_reports_updated', { detail: { reports: remainingReports } }));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('handover_reports').delete().eq('id', String(reportId));
  } catch {}

  try {
    await client.from('system_settings').upsert({
      key: 'handover_reports_v1',
      value_json: { reports: remainingReports, updatedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    });
  } catch {}

  return true;
}

// ==================== DAILY TASKS & LOGBOOK SYNC ====================

export function subscribeToDailyTasks(
  dateKey: string,
  staffId: number,
  onData: (tasks: DailyTask[] | null) => void
): Unsubscribe {
  const localKey = `daily_tasks_${dateKey}_staff_${staffId}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) onData(JSON.parse(raw));
    else onData(null);
  } catch {
    onData(null);
  }

  const client = getSupabaseClient();
  if (!client) return () => {};

  Promise.resolve(
    client
      .from('daily_tasks')
      .select('*')
      .eq('date_key', dateKey)
      .eq('staff_id', staffId)
  )
    .then(({ data, error }: any) => {
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: DailyTask[] = data.map((t: any) => ({
          id: t.task_id,
          shiftCode: (t.shift_code as ShiftCode) || 'P',
          time: t.time_range || '',
          title: t.title,
          description: t.description || '',
          category: (t.category as any) || 'patroli',
          priority: (t.priority as any) || 'normal',
        }));
        try {
          localStorage.setItem(localKey, JSON.stringify(mapped));
        } catch {}
        onData(mapped);
      }
    })
    .catch(() => {});

  return () => {};
}

export async function saveDailyTasksToSupabase(
  dateKey: string,
  staffId: number,
  tasks: DailyTask[]
): Promise<boolean> {
  const localKey = `daily_tasks_${dateKey}_staff_${staffId}`;
  try {
    localStorage.setItem(localKey, JSON.stringify(tasks));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const records = tasks.map((t) => ({
      id: `${dateKey}_${staffId}_${t.id}`,
      date_key: dateKey,
      staff_id: staffId,
      shift_code: t.shiftCode || 'P',
      task_id: t.id,
      time_range: t.time,
      title: t.title,
      description: t.description,
      completed: true,
      updated_at: new Date().toISOString(),
    }));

    await client.from('daily_tasks').upsert(records, { onConflict: 'id' });
    return true;
  } catch (err) {
    console.warn('[Supabase] Notice saving daily tasks:', err);
    return true;
  }
}

export async function syncMonthTasksCompletion(
  year: number,
  month: number,
  completedMap: Record<string, boolean>
): Promise<void> {
  const localKey = `tasks_${year}_${month}`;
  try {
    localStorage.setItem(localKey, JSON.stringify(completedMap));
    window.dispatchEvent(new CustomEvent('tasks_completion_updated', { detail: { year, month, completedMap } }));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('system_settings').upsert({
      key: `tasks_done_${year}_${month}`,
      value_json: { completedMap, updatedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    });
  } catch {}
}

export async function fetchMonthTasksCompletion(
  year: number,
  month: number
): Promise<Record<string, boolean>> {
  const localKey = `tasks_${year}_${month}`;
  let local: Record<string, boolean> = {};
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) local = JSON.parse(raw);
  } catch {}

  const client = getSupabaseClient();
  if (!client) return local;

  try {
    const { data } = await client
      .from('system_settings')
      .select('value_json')
      .eq('key', `tasks_done_${year}_${month}`)
      .maybeSingle();
    if (data?.value_json?.completedMap && typeof data.value_json.completedMap === 'object') {
      const merged = { ...local, ...data.value_json.completedMap };
      try {
        localStorage.setItem(localKey, JSON.stringify(merged));
      } catch {}
      return merged;
    }
  } catch {}
  return local;
}

export async function syncDailyLogbook(
  year: number,
  month: number,
  day: number,
  text: string
): Promise<void> {
  const localKey = `logbook_${year}_${month}_${day}`;
  try {
    localStorage.setItem(localKey, text);
  } catch {}

  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('system_settings').upsert({
      key: localKey,
      value_json: { text, updatedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    });
  } catch {}
}

export async function fetchDailyLogbook(
  year: number,
  month: number,
  day: number
): Promise<string> {
  const localKey = `logbook_${year}_${month}_${day}`;
  let local = '';
  try {
    local = localStorage.getItem(localKey) || '';
  } catch {}

  const client = getSupabaseClient();
  if (!client) return local;

  try {
    const { data } = await client
      .from('system_settings')
      .select('value_json')
      .eq('key', localKey)
      .maybeSingle();
    if (typeof data?.value_json?.text === 'string' && data.value_json.text.length > 0) {
      try {
        localStorage.setItem(localKey, data.value_json.text);
      } catch {}
      return data.value_json.text;
    }
  } catch {}
  return local;
}

// ==================== CUSTOM SOP CHECKLIST TASKS SYNC ====================

const SOP_TASKS_STORAGE_KEY = 'wali_asuh_sop_tasks_v1';

export function subscribeToSopTasks(
  onData: (tasks: DailyTask[] | null) => void,
  _onError?: (err: any) => void
): Unsubscribe {
  try {
    const raw = localStorage.getItem(SOP_TASKS_STORAGE_KEY);
    if (raw) onData(JSON.parse(raw));
    else onData(null);
  } catch {
    onData(null);
  }

  const handler = (e: any) => {
    if (e.detail?.tasks) onData(e.detail.tasks);
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === SOP_TASKS_STORAGE_KEY && e.newValue) {
      try {
        onData(JSON.parse(e.newValue));
      } catch {}
    }
  };
  window.addEventListener('sop_tasks_updated', handler);
  window.addEventListener('storage', storageHandler);

  fetchSopTasksFromSupabase().then((tasks) => {
    if (tasks) onData(tasks);
  });

  const client = getSupabaseClient();
  if (!client) {
    return () => {
      window.removeEventListener('sop_tasks_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }

  try {
    const channel = client
      .channel('sop_tasks_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: 'key=eq.checklist_sop' },
        (payload: any) => {
          if (payload.new?.value_json?.tasks && Array.isArray(payload.new.value_json.tasks)) {
            try {
              localStorage.setItem(SOP_TASKS_STORAGE_KEY, JSON.stringify(payload.new.value_json.tasks));
            } catch {}
            onData(payload.new.value_json.tasks);
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('sop_tasks_updated', handler);
      window.removeEventListener('storage', storageHandler);
      client.removeChannel(channel);
    };
  } catch {
    return () => {
      window.removeEventListener('sop_tasks_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }
}

export async function saveSopTasksToSupabase(
  tasks: DailyTask[],
  updatedBy: string = 'Admin'
): Promise<boolean> {
  try {
    localStorage.setItem(SOP_TASKS_STORAGE_KEY, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent('sop_tasks_updated', { detail: { tasks } }));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('system_settings').upsert({
      key: 'checklist_sop',
      value_json: { tasks, updatedAt: new Date().toISOString(), updatedBy },
      updated_at: new Date().toISOString(),
    });

    if (tasks.length > 0) {
      const sopRecords = tasks.map((t, idx) => ({
        id: t.id,
        shift_code: t.shiftCode,
        time_range: t.time,
        title: t.title,
        description: t.description || '',
        category: t.category || 'presensi',
        priority: t.priority || 'normal',
        order_num: idx + 1,
      }));
      await client.from('sop_templates').upsert(sopRecords, { onConflict: 'id' });
    }
    return true;
  } catch {
    return true;
  }
}

export async function fetchSopTasksFromSupabase(): Promise<DailyTask[] | null> {
  const client = getSupabaseClient();
  if (!client) {
    try {
      const raw = localStorage.getItem(SOP_TASKS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  try {
    const { data } = await client
      .from('system_settings')
      .select('value_json')
      .eq('key', 'checklist_sop')
      .maybeSingle();

    if (data?.value_json?.tasks && Array.isArray(data.value_json.tasks)) {
      localStorage.setItem(SOP_TASKS_STORAGE_KEY, JSON.stringify(data.value_json.tasks));
      return data.value_json.tasks;
    }
    return null;
  } catch {
    return null;
  }
}

// ==================== ANNOUNCEMENT TICKER SYNC ====================

export const DEFAULT_ANNOUNCEMENT: AnnouncementData = {
  text: '📢 Pengumuman: Shif Sore tidak dapat ditukar dengan Shif Malam (M), karena memiliki jam kerja yang sama & ketentuan operasional asrama.',
  enabled: true,
  updatedAt: new Date().toISOString(),
  updatedBy: 'Admin',
};

const ANNOUNCEMENT_STORAGE_KEY = 'wali_asuh_announcement_ticker_v1';

export function getLocalAnnouncement(): AnnouncementData {
  try {
    const saved = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.text === 'string') return parsed;
    }
  } catch {}
  return DEFAULT_ANNOUNCEMENT;
}

export function subscribeToAnnouncement(
  onData: (data: AnnouncementData) => void
): Unsubscribe {
  onData(getLocalAnnouncement());

  const handler = (e: any) => {
    if (e.detail?.announcement) onData(e.detail.announcement);
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === ANNOUNCEMENT_STORAGE_KEY && e.newValue) {
      try {
        onData(JSON.parse(e.newValue));
      } catch {}
    }
  };
  window.addEventListener('announcement_updated', handler);
  window.addEventListener('storage', storageHandler);

  const client = getSupabaseClient();
  if (!client) {
    return () => {
      window.removeEventListener('announcement_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }

  Promise.resolve(
    client
      .from('announcements')
      .select('*')
      .eq('id', 'current')
      .maybeSingle()
  )
    .then(({ data }: any) => {
      if (data) {
        const item: AnnouncementData = {
          text: data.text || DEFAULT_ANNOUNCEMENT.text,
          enabled: Boolean(data.is_active),
          updatedAt: data.updated_at,
          updatedBy: data.updated_by || 'Admin',
        };
        try {
          localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(item));
        } catch {}
        onData(item);
      }
    })
    .catch(() => {});

  try {
    const channel = client
      .channel('announcements_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements', filter: 'id=eq.current' },
        (payload: any) => {
          if (payload.new) {
            const item: AnnouncementData = {
              text: payload.new.text,
              enabled: Boolean(payload.new.is_active),
              updatedAt: payload.new.updated_at,
              updatedBy: payload.new.updated_by,
            };
            try {
              localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(item));
            } catch {}
            onData(item);
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('announcement_updated', handler);
      window.removeEventListener('storage', storageHandler);
      client.removeChannel(channel);
    };
  } catch {
    return () => {
      window.removeEventListener('announcement_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }
}

export async function saveAnnouncementToSupabase(
  announcement: Partial<AnnouncementData>,
  updaterName: string = 'Admin'
): Promise<boolean> {
  const current = getLocalAnnouncement();
  const updated: AnnouncementData = {
    ...current,
    ...announcement,
    updatedAt: new Date().toISOString(),
    updatedBy: updaterName,
  };

  try {
    localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('announcement_updated', { detail: { announcement: updated } }));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('announcements').upsert({
      id: 'current',
      text: updated.text,
      is_active: updated.enabled,
      category: 'info',
      updated_at: updated.updatedAt,
      updated_by: updaterName,
    });
    return true;
  } catch {
    return true;
  }
}

// ==================== STUDENT MEDICAL PLANS ====================

const MEDICAL_PLANS_STORAGE_KEY = 'wali_asuh_student_medical_plans_v1';

export function getInitialDefaultMedicalPlans(): StudentMedicalPlan[] {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  return [
    {
      id: 'med-plan-1',
      studentName: 'Ahmad Faiz Al-Ghifari',
      studentClassOrRoom: 'X-2 (Kamar Ibnu Khaldun)',
      facility: 'Puskesmas',
      facilityDetail: 'Puskesmas Semen - Poli Umum',
      date: todayStr,
      time: '08:30',
      planType: 'kontrol_kembali',
      complaint: 'Demam hari ke-2 & nyeri tenggorokan',
      accompanyingStaffName: 'M. Ali Shodikin',
      accompanyingStaffId: 1,
      notes: 'Bawa kartu BPJS dan buku rekam medis santri',
      status: 'rencana',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'Wali Asuh',
    },
  ];
}

export function getLocalStudentMedicalPlans(): StudentMedicalPlan[] {
  try {
    const saved = localStorage.getItem(MEDICAL_PLANS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return getInitialDefaultMedicalPlans();
}

export async function fetchStudentMedicalPlansFromSupabase(): Promise<StudentMedicalPlan[] | null> {
  const client = getSupabaseClient();
  if (!client) return getLocalStudentMedicalPlans();

  try {
    const { data, error } = await client.from('medical_plans').select('*').order('created_at', { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      const localMap = new Map<string, StudentMedicalPlan>();
      getLocalStudentMedicalPlans().forEach((p) => localMap.set(p.id, p));

      const mapped: StudentMedicalPlan[] = data.map((d: any) => {
        const meta = Array.isArray(d.medicines) && d.medicines[0]?._meta ? d.medicines[0]._meta : null;
        const localExisting = localMap.get(d.id);
        return {
          id: d.id,
          studentName: d.student_name || meta?.studentName || localExisting?.studentName || '',
          studentClassOrRoom: d.dorm_room || d.grade || meta?.studentClassOrRoom || localExisting?.studentClassOrRoom || '',
          facility: (d.treatment_location as any) || meta?.facility || localExisting?.facility || 'UKS',
          facilityDetail: meta?.facilityDetail || d.diet_notes || localExisting?.facilityDetail || d.treatment_location,
          date: d.start_date || meta?.date || localExisting?.date || '',
          time: meta?.time || d.symptoms || localExisting?.time || '08:00',
          planType: meta?.planType || localExisting?.planType || 'berobat',
          complaint: d.diagnosis || meta?.complaint || localExisting?.complaint || '',
          accompanyingStaffName: d.reported_by || meta?.accompanyingStaffName || localExisting?.accompanyingStaffName || 'Wali Asuh',
          accompanyingStaffId: meta?.accompanyingStaffId || d.student_id || localExisting?.accompanyingStaffId || 1,
          notes: d.special_care_notes ?? meta?.notes ?? localExisting?.notes ?? '',
          status: (d.status as any) || meta?.status || localExisting?.status || 'rencana',
          createdAt: d.created_at || meta?.createdAt || new Date().toISOString(),
          updatedAt: d.updated_at || meta?.updatedAt || new Date().toISOString(),
          createdBy: d.reported_by || meta?.createdBy || 'Wali Asuh',
        };
      });
      localStorage.setItem(MEDICAL_PLANS_STORAGE_KEY, JSON.stringify(mapped));
      return mapped;
    }
    return getLocalStudentMedicalPlans();
  } catch {
    return getLocalStudentMedicalPlans();
  }
}

export function subscribeToStudentMedicalPlans(
  onData: (plans: StudentMedicalPlan[]) => void,
  _onError?: (err: any) => void
): Unsubscribe {
  onData(getLocalStudentMedicalPlans());

  const handler = (e: any) => {
    if (e.detail?.plans) onData(e.detail.plans);
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === MEDICAL_PLANS_STORAGE_KEY && e.newValue) {
      try {
        onData(JSON.parse(e.newValue));
      } catch {}
    }
  };
  window.addEventListener('medical_plans_updated', handler);
  window.addEventListener('storage', storageHandler);

  fetchStudentMedicalPlansFromSupabase().then((res) => {
    if (res) onData(res);
  });

  const client = getSupabaseClient();
  if (!client) {
    return () => {
      window.removeEventListener('medical_plans_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }

  try {
    const channel = client
      .channel('medical_plans_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medical_plans' },
        async () => {
          const fresh = await fetchStudentMedicalPlansFromSupabase();
          if (fresh) onData(fresh);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('medical_plans_updated', handler);
      window.removeEventListener('storage', storageHandler);
      client.removeChannel(channel);
    };
  } catch {
    return () => {
      window.removeEventListener('medical_plans_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }
}

export async function saveStudentMedicalPlanToSupabase(
  plan: StudentMedicalPlan
): Promise<boolean> {
  const current = getLocalStudentMedicalPlans();
  const idx = current.findIndex((p) => p.id === plan.id);
  const updated = idx >= 0 ? current.map((p) => (p.id === plan.id ? plan : p)) : [plan, ...current];
  try {
    localStorage.setItem(MEDICAL_PLANS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('medical_plans_updated', { detail: { plans: updated } }));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('medical_plans').upsert({
      id: plan.id,
      student_id: plan.accompanyingStaffId || 1,
      student_name: plan.studentName,
      grade: plan.planType || 'berobat',
      dorm_room: plan.studentClassOrRoom,
      diagnosis: plan.complaint,
      symptoms: plan.time || '08:00',
      diet_notes: plan.facilityDetail || '',
      medicines: [{ _meta: plan }],
      treatment_location: plan.facility,
      special_care_notes: plan.notes || '',
      start_date: plan.date,
      status: plan.status,
      reported_by: plan.accompanyingStaffName || plan.createdBy,
      created_at: plan.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return true;
  }
}

export async function deleteStudentMedicalPlanFromSupabase(planId: string): Promise<boolean> {
  const current = getLocalStudentMedicalPlans();
  const updated = current.filter((p) => p.id !== planId);
  try {
    localStorage.setItem(MEDICAL_PLANS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('medical_plans_updated', { detail: { plans: updated } }));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('medical_plans').delete().eq('id', planId);
    return true;
  } catch {
    return true;
  }
}

export async function saveAllStudentMedicalPlansToSupabase(plans: StudentMedicalPlan[]): Promise<boolean> {
  try {
    localStorage.setItem(MEDICAL_PLANS_STORAGE_KEY, JSON.stringify(plans));
    window.dispatchEvent(new CustomEvent('medical_plans_updated', { detail: { plans } }));
  } catch {}
  return true;
}

// ==================== STUDENT PORTFOLIO NOTES ====================

const STUDENT_NOTES_STORAGE_KEY = 'student_portfolio_notes';

export function getInitialStudentNotes(): StudentPortfolioNote[] {
  return [
    {
      id: 'note-sample-1',
      studentNo: 1,
      studentName: 'Adam Julian Shano',
      date: '2026-09-05',
      category: 'Ibadah',
      content: 'Aktif mengikuti sholat Subuh dan Maghrib berjamaah di musholla asrama.',
      authorName: 'M. Ali Shodikin',
      authorRole: 'Wali Asuh',
      createdAt: '2026-09-05T19:30:00.000Z',
    },
  ];
}

export function getLocalStudentNotes(): StudentPortfolioNote[] {
  try {
    const raw = localStorage.getItem(STUDENT_NOTES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return getInitialStudentNotes();
}

export async function fetchStudentNotesFromSupabase(): Promise<StudentPortfolioNote[] | null> {
  const client = getSupabaseClient();
  if (!client) return getLocalStudentNotes();

  try {
    const { data, error } = await client.from('student_notes').select('*').order('created_at', { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped: StudentPortfolioNote[] = data.map((d: any) => ({
        id: d.id,
        studentNo: d.student_no,
        studentName: d.student_name,
        date: d.date_str,
        category: d.category,
        content: d.content,
        authorName: d.author_name,
        authorRole: 'Wali Asuh',
        createdAt: d.created_at,
      }));
      localStorage.setItem(STUDENT_NOTES_STORAGE_KEY, JSON.stringify(mapped));
      return mapped;
    }
    return getLocalStudentNotes();
  } catch {
    return getLocalStudentNotes();
  }
}

export function subscribeToStudentNotes(
  onData: (notes: StudentPortfolioNote[]) => void,
  _onError?: (err: any) => void
): Unsubscribe {
  onData(getLocalStudentNotes());

  const handler = (e: any) => {
    if (e.detail?.notes) onData(e.detail.notes);
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STUDENT_NOTES_STORAGE_KEY && e.newValue) {
      try {
        onData(JSON.parse(e.newValue));
      } catch {}
    }
  };
  window.addEventListener('student_notes_updated', handler);
  window.addEventListener('storage', storageHandler);

  fetchStudentNotesFromSupabase().then((res) => {
    if (res) onData(res);
  });

  const client = getSupabaseClient();
  if (!client) {
    return () => {
      window.removeEventListener('student_notes_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }

  try {
    const channel = client
      .channel('student_notes_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_notes' },
        async () => {
          const fresh = await fetchStudentNotesFromSupabase();
          if (fresh) onData(fresh);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('student_notes_updated', handler);
      window.removeEventListener('storage', storageHandler);
      client.removeChannel(channel);
    };
  } catch {
    return () => {
      window.removeEventListener('student_notes_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }
}

export async function saveStudentNoteToSupabase(note: StudentPortfolioNote): Promise<boolean> {
  const current = getLocalStudentNotes();
  const index = current.findIndex((n) => n.id === note.id);
  const updated = index >= 0 ? [...current] : [note, ...current];
  if (index >= 0) updated[index] = note;

  try {
    localStorage.setItem(STUDENT_NOTES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('student_notes_updated', { detail: { notes: updated } }));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('student_notes').upsert({
      id: note.id,
      student_no: note.studentNo,
      student_name: note.studentName,
      author_id: 1,
      author_name: note.authorName,
      date_str: note.date,
      category: note.category,
      content: note.content,
      created_at: note.createdAt || new Date().toISOString(),
    });
    return true;
  } catch {
    return true;
  }
}

export async function deleteStudentNoteFromSupabase(noteId: string): Promise<boolean> {
  const current = getLocalStudentNotes();
  const updated = current.filter((n) => n.id !== noteId);
  try {
    localStorage.setItem(STUDENT_NOTES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('student_notes_updated', { detail: { notes: updated } }));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('student_notes').delete().eq('id', noteId);
    return true;
  } catch {
    return true;
  }
}

// ==================== STUDENT CUSTOM OVERRIDES ====================

const STUDENT_OVERRIDES_STORAGE_KEY = 'student_custom_overrides';

export function getLocalStudentOverrides(): Record<number, Partial<Student>> {
  try {
    const raw = localStorage.getItem(STUDENT_OVERRIDES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export async function fetchStudentOverridesFromSupabase(): Promise<Record<number, Partial<Student>> | null> {
  const client = getSupabaseClient();
  if (!client) return getLocalStudentOverrides();

  try {
    const { data, error } = await client.from('student_overrides').select('*');
    if (!error && Array.isArray(data) && data.length > 0) {
      const map: Record<number, Partial<Student>> = { ...getLocalStudentOverrides() };
      data.forEach((r: any) => {
        if (r.student_no && r.data_json) {
          map[r.student_no] = r.data_json;
        }
      });
      localStorage.setItem(STUDENT_OVERRIDES_STORAGE_KEY, JSON.stringify(map));
      return map;
    }
    return getLocalStudentOverrides();
  } catch {
    return getLocalStudentOverrides();
  }
}

export function subscribeToStudentOverrides(
  onData: (overrides: Record<number, Partial<Student>>) => void,
  _onError?: (err: any) => void
): Unsubscribe {
  onData(getLocalStudentOverrides());

  const handler = (e: any) => {
    if (e.detail?.overrides) onData(e.detail.overrides);
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STUDENT_OVERRIDES_STORAGE_KEY && e.newValue) {
      try {
        onData(JSON.parse(e.newValue));
      } catch {}
    }
  };
  window.addEventListener('student_overrides_updated', handler);
  window.addEventListener('storage', storageHandler);

  fetchStudentOverridesFromSupabase().then((res) => {
    if (res) onData(res);
  });

  const client = getSupabaseClient();
  if (!client) {
    return () => {
      window.removeEventListener('student_overrides_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }

  try {
    const channel = client
      .channel('student_overrides_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_overrides' },
        async () => {
          const fresh = await fetchStudentOverridesFromSupabase();
          if (fresh) onData(fresh);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('student_overrides_updated', handler);
      window.removeEventListener('storage', storageHandler);
      client.removeChannel(channel);
    };
  } catch {
    return () => {
      window.removeEventListener('student_overrides_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }
}

export async function saveStudentOverrideToSupabase(
  studentNo: number,
  updatedFields: Partial<Student>
): Promise<boolean> {
  const current = getLocalStudentOverrides();
  const merged = {
    ...(current[studentNo] || {}),
    ...updatedFields,
    studentNo,
    updatedAt: new Date().toISOString(),
  };
  current[studentNo] = merged;

  try {
    localStorage.setItem(STUDENT_OVERRIDES_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('student_overrides_updated', { detail: { overrides: { ...current } } }));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('student_overrides').upsert({
      student_no: studentNo,
      data_json: merged,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return true;
  }
}

