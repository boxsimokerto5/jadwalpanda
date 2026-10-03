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

export function subscribeToSwapLogs(
  year: number,
  month: number,
  onData: (logs: ShiftSwapRecord[]) => void
): Unsubscribe {
  // 1. Emit local cache immediately
  try {
    const raw = localStorage.getItem(`${SWAP_LOGS_STORAGE_PREFIX}_${year}_${month}`);
    if (raw) {
      onData(JSON.parse(raw));
    } else {
      onData([]);
    }
  } catch {
    onData([]);
  }

  const client = getSupabaseClient();
  if (!client) {
    const handler = (e: any) => {
      if (e.detail?.logs) onData(e.detail.logs);
    };
    window.addEventListener('swap_logs_updated', handler);
    return () => window.removeEventListener('swap_logs_updated', handler);
  }

  // 2. Fetch from Supabase
  Promise.resolve(
    client
      .from('shift_swaps')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .order('created_at', { ascending: false })
  )
    .then(({ data, error }: any) => {
      if (!error && Array.isArray(data)) {
        const mapped: ShiftSwapRecord[] = data.map((d: any) => ({
          id: d.id,
          timestamp: new Date(d.created_at).toLocaleString('id-ID'),
          year: d.year,
          month: d.month,
          type: (d.swap_type as any) || 'swap',
          day1: d.day1,
          staff1Id: d.staff1_id,
          staff1Name: d.staff1_name,
          staff1OldShift: d.staff1_old_shift,
          staff1NewShift: d.staff1_new_shift,
          day2: d.day2,
          staff2Id: d.staff2_id,
          staff2Name: d.staff2_name,
          staff2OldShift: d.staff2_old_shift,
          staff2NewShift: d.staff2_new_shift,
          reason: d.reason || '',
          undone: Boolean(d.undone),
        }));
        try {
          localStorage.setItem(`${SWAP_LOGS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(mapped));
        } catch {}
        onData(mapped);
      }
    })
    .catch(() => {});

  // 3. Realtime subscription
  try {
    const channel = client
      .channel(`shift_swaps_${year}_${month}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shift_swaps', filter: `year=eq.${year}` },
        async () => {
          const { data } = await client
            .from('shift_swaps')
            .select('*')
            .eq('year', year)
            .eq('month', month)
            .order('created_at', { ascending: false });
          if (Array.isArray(data)) {
            const mapped: ShiftSwapRecord[] = data.map((d: any) => ({
              id: d.id,
              timestamp: new Date(d.created_at).toLocaleString('id-ID'),
              year: d.year,
              month: d.month,
              type: (d.swap_type as any) || 'swap',
              day1: d.day1,
              staff1Id: d.staff1_id,
              staff1Name: d.staff1_name,
              staff1OldShift: d.staff1_old_shift,
              staff1NewShift: d.staff1_new_shift,
              day2: d.day2,
              staff2Id: d.staff2_id,
              staff2Name: d.staff2_name,
              staff2OldShift: d.staff2_old_shift,
              staff2NewShift: d.staff2_new_shift,
              reason: d.reason || '',
              undone: Boolean(d.undone),
            }));
            onData(mapped);
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

export async function saveSwapLogsToSupabase(
  year: number,
  month: number,
  logs: ShiftSwapRecord[]
): Promise<boolean> {
  try {
    localStorage.setItem(`${SWAP_LOGS_STORAGE_PREFIX}_${year}_${month}`, JSON.stringify(logs));
    window.dispatchEvent(new CustomEvent('swap_logs_updated', { detail: { year, month, logs } }));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

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
      undone: Boolean(log.undone),
    }));

    await client.from('shift_swaps').upsert(records, { onConflict: 'id' });
    return true;
  } catch (err) {
    console.warn('[Supabase] Notice saving swap logs:', err);
    return true;
  }
}

// ==================== HANDOVER REPORTS SYNC ====================

const HANDOVER_REPORTS_STORAGE_KEY = 'wali_asuh_handover_reports_v1';

function mapRowToHandoverReport(d: any): HandoverReport {
  return {
    id: d.id,
    dateStr: d.date_str || '',
    day: d.day || 1,
    month: d.month || 9,
    year: d.year || 2026,
    shiftType: d.shift_type || 'PAGI_KE_SORE',
    handoverTime: d.handover_time || '',
    outgoingStaffIds: d.outgoing_staff_ids || [],
    outgoingStaffNames: d.outgoing_staff_names || [],
    incomingStaffIds: d.incoming_staff_ids || [],
    incomingStaffNames: d.incoming_staff_names || [],
    studentCountTotal: d.student_count_total || 0,
    studentCountPresent: d.student_count_present || 0,
    studentCountPermit: d.student_count_permit || 0,
    studentCountSick: d.student_count_sick || 0,
    studentCountFasting: d.student_count_fasting || 0,
    sickStudents: Array.isArray(d.sick_students) ? d.sick_students : [],
    fastingStudents: Array.isArray(d.fasting_students) ? d.fasting_students : [],
    permits: Array.isArray(d.permits) ? d.permits : [],
    cleanlinessStatus: d.cleanliness_status || 'Cukup Bersih',
    disciplineStatus: d.discipline_status || 'Kondusif & Tertib',
    specialIncidents: d.special_incidents || '',
    completedActivities: Array.isArray(d.completed_activities) ? d.completed_activities : [],
    inventoryNotes: d.inventory_notes || '',
    notesForNextShift: d.notes_for_next_shift || '',
    submittedBy: d.submitted_by || 'Admin',
    submittedAt: d.submitted_at || new Date().toISOString(),
  };
}

export function subscribeToHandoverReports(
  onData: (reports: HandoverReport[]) => void
): Unsubscribe {
  try {
    const raw = localStorage.getItem(HANDOVER_REPORTS_STORAGE_KEY);
    if (raw) onData(JSON.parse(raw));
    else onData([]);
  } catch {
    onData([]);
  }

  const client = getSupabaseClient();
  if (!client) {
    const handler = (e: any) => {
      if (e.detail?.reports) onData(e.detail.reports);
    };
    window.addEventListener('handover_reports_updated', handler);
    return () => window.removeEventListener('handover_reports_updated', handler);
  }

  Promise.resolve(
    client
      .from('handover_reports')
      .select('*')
      .order('submitted_at', { ascending: false })
  )
    .then(({ data, error }: any) => {
      if (!error && Array.isArray(data)) {
        const mapped: HandoverReport[] = data.map(mapRowToHandoverReport);
        try {
          localStorage.setItem(HANDOVER_REPORTS_STORAGE_KEY, JSON.stringify(mapped));
        } catch {}
        onData(mapped);
      }
    })
    .catch(() => {});

  try {
    const channel = client
      .channel('handover_reports_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'handover_reports' },
        async () => {
          const { data } = await client
            .from('handover_reports')
            .select('*')
            .order('submitted_at', { ascending: false });
          if (Array.isArray(data)) {
            const mapped: HandoverReport[] = data.map(mapRowToHandoverReport);
            onData(mapped);
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

export async function saveHandoverReportsToSupabase(
  reports: HandoverReport[]
): Promise<boolean> {
  try {
    localStorage.setItem(HANDOVER_REPORTS_STORAGE_KEY, JSON.stringify(reports));
    window.dispatchEvent(new CustomEvent('handover_reports_updated', { detail: { reports } }));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const records = reports.map((r) => ({
      id: r.id,
      date_str: r.dateStr,
      day: r.day,
      month: r.month,
      year: r.year,
      shift_type: r.shiftType,
      handover_time: r.handoverTime,
      outgoing_staff_ids: r.outgoingStaffIds,
      outgoing_staff_names: r.outgoingStaffNames,
      incoming_staff_ids: r.incomingStaffIds,
      incoming_staff_names: r.incomingStaffNames,
      student_count_total: r.studentCountTotal || 0,
      student_count_present: r.studentCountPresent || 0,
      student_count_permit: r.studentCountPermit || 0,
      student_count_sick: r.studentCountSick || 0,
      student_count_fasting: r.studentCountFasting || 0,
      sick_students: r.sickStudents || [],
      permits: r.permits || [],
      cleanliness_status: r.cleanlinessStatus,
      discipline_status: r.disciplineStatus,
      special_incidents: r.specialIncidents || '',
      notes_for_next_shift: r.notesForNextShift || '',
      submitted_by: r.submittedBy,
      submitted_at: r.submittedAt,
    }));

    await client.from('handover_reports').upsert(records, { onConflict: 'id' });
    return true;
  } catch (err) {
    console.warn('[Supabase] Notice saving handover reports:', err);
    return true;
  }
}

// ==================== DAILY TASKS SYNC ====================

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

  fetchSopTasksFromSupabase().then((tasks) => {
    if (tasks) onData(tasks);
  });

  return () => {};
}

export async function saveSopTasksToSupabase(
  tasks: DailyTask[],
  updatedBy: string = 'Admin'
): Promise<boolean> {
  try {
    localStorage.setItem(SOP_TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('system_settings').upsert({
      key: 'checklist_sop',
      value_json: { tasks, updatedAt: new Date().toISOString(), updatedBy },
      updated_at: new Date().toISOString(),
    });
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

  const client = getSupabaseClient();
  if (!client) return () => {};

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
      client.removeChannel(channel);
    };
  } catch {
    return () => {};
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
      const mapped: StudentMedicalPlan[] = data.map((d: any) => ({
        id: d.id,
        studentName: d.student_name,
        studentClassOrRoom: d.dorm_room || d.grade || '',
        facility: (d.treatment_location as any) || 'UKS',
        facilityDetail: d.treatment_location,
        date: d.start_date,
        time: '08:00',
        planType: 'berobat',
        complaint: d.diagnosis || d.symptoms || '',
        accompanyingStaffName: d.reported_by,
        accompanyingStaffId: 1,
        notes: d.special_care_notes || '',
        status: (d.status as any) || 'rencana',
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        createdBy: d.reported_by,
      }));
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

  fetchStudentMedicalPlansFromSupabase().then((res) => {
    if (res) onData(res);
  });

  const client = getSupabaseClient();
  if (!client) return () => {};

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
      client.removeChannel(channel);
    };
  } catch {
    return () => {};
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
  } catch {}

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('medical_plans').upsert({
      id: plan.id,
      student_id: 1,
      student_name: plan.studentName,
      grade: '-',
      dorm_room: plan.studentClassOrRoom,
      diagnosis: plan.complaint,
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

  fetchStudentNotesFromSupabase().then((res) => {
    if (res) onData(res);
  });

  const client = getSupabaseClient();
  if (!client) return () => {};

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
      client.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}

export async function saveStudentNoteToSupabase(note: StudentPortfolioNote): Promise<boolean> {
  const current = getLocalStudentNotes();
  const index = current.findIndex((n) => n.id === note.id);
  const updated = index >= 0 ? [...current] : [note, ...current];
  if (index >= 0) updated[index] = note;

  try {
    localStorage.setItem(STUDENT_NOTES_STORAGE_KEY, JSON.stringify(updated));
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
      const map: Record<number, Partial<Student>> = {};
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

  fetchStudentOverridesFromSupabase().then((res) => {
    if (res) onData(res);
  });

  const client = getSupabaseClient();
  if (!client) return () => {};

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
      client.removeChannel(channel);
    };
  } catch {
    return () => {};
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

