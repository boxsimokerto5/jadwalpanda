import { LeavePermissionRecord, LeaveType, MonthSchedule, Staff } from '../types';
import { getSupabaseClient } from './supabaseService';

const LEAVE_STORAGE_PREFIX = 'wali_asuh_leave_records_v1';
const LEAVE_DELETED_PREFIX = 'wali_asuh_leave_deleted_v1';

export function getLeaveRecordStorageKey(year: number, month: number): string {
  return `${LEAVE_STORAGE_PREFIX}_${year}_${month}`;
}

function getLeaveDeletedStorageKey(year: number, month: number): string {
  return `${LEAVE_DELETED_PREFIX}_${year}_${month}`;
}

export function getLeaveRecordId(year: number, month: number, day: number, staffId: number): string {
  return `${year}_${month}_${day}_${staffId}`;
}

function getLeaveCloudScheduleMirrorId(year: number, month: number): string {
  return `leave_records_${year}_${String(month).padStart(2, '0')}`;
}

function getLocalDeletedLeaveIds(year: number, month: number): Set<string> {
  try {
    const raw = localStorage.getItem(getLeaveDeletedStorageKey(year, month));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed.map(String));
    }
  } catch {}
  return new Set<string>();
}

function saveLocalDeletedLeaveIds(year: number, month: number, ids: Set<string>): void {
  try {
    localStorage.setItem(getLeaveDeletedStorageKey(year, month), JSON.stringify(Array.from(ids)));
  } catch {}
}

/**
 * Normalize Google Drive or external proof URL so it always opens properly as an external link
 */
export function normalizeDriveUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Synchronize matrix 'IZIN' (and 'C') cells with stored leave records so that every 'IZIN'
 * in the active month's schedule matrix automatically appears in the Rekapitulasi Izin view.
 */
export function getSynchronizedLeaveRecords(
  schedule: MonthSchedule,
  staffList: Staff[],
  storedRecords: Record<string, LeavePermissionRecord>
): LeavePermissionRecord[] {
  const effectiveStaffList =
    staffList && staffList.length > 0 ? staffList : schedule.staffList || [];
  const staffMap = new Map<number, Staff>();
  effectiveStaffList.forEach((s) => staffMap.set(s.id, s));

  const mergedMap = new Map<string, LeavePermissionRecord>();
  const totalDays = schedule.totalDays || 31;

  // 1. Scan all days & staff in the schedule matrix for 'IZIN' or 'C'
  for (let day = 1; day <= totalDays; day++) {
    const dayShifts = schedule.days?.[day];
    if (!dayShifts) continue;

    for (const staff of effectiveStaffList) {
      const shift = dayShifts[staff.id];
      if (shift === 'IZIN' || shift === 'C') {
        const recordId = getLeaveRecordId(schedule.year, schedule.month, day, staff.id);
        const existing = storedRecords[recordId];
        if (existing) {
          mergedMap.set(recordId, {
            ...existing,
            staffId: staff.id,
            staffName: staff.name,
            day,
            month: schedule.month,
            year: schedule.year,
            proofUrl: existing.proofUrl ? normalizeDriveUrl(existing.proofUrl) : undefined,
          });
        } else {
          mergedMap.set(recordId, {
            id: recordId,
            staffId: staff.id,
            staffName: staff.name,
            day,
            month: schedule.month,
            year: schedule.year,
            leaveType: 'keperluan_lain',
            notes: shift === 'C' ? 'Cuti Resmi (Matriks Jadwal)' : '',
            createdAt: schedule.updatedAt || new Date().toISOString(),
            updatedAt: schedule.updatedAt || new Date().toISOString(),
          });
        }
      }
    }
  }

  // 2. Also include any explicitly saved records for this month & year whose staff still exists
  Object.values(storedRecords).forEach((rec) => {
    if (
      rec &&
      rec.year === schedule.year &&
      rec.month === schedule.month &&
      !mergedMap.has(rec.id)
    ) {
      const currentShift = schedule.days?.[rec.day]?.[rec.staffId];
      if (currentShift === 'IZIN' || currentShift === 'C' || Boolean(rec.proofUrl) || Boolean(rec.notes)) {
        const st = staffMap.get(rec.staffId);
        if (st || currentShift === 'IZIN' || currentShift === 'C') {
          mergedMap.set(rec.id, {
            ...rec,
            staffName: st ? st.name : rec.staffName,
            proofUrl: rec.proofUrl ? normalizeDriveUrl(rec.proofUrl) : undefined,
          });
        }
      }
    }
  });

  return Array.from(mergedMap.values()).sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.staffId - b.staffId;
  });
}

/**
 * Get all leave records for a specific year & month from LocalStorage
 */
export function getLocalLeaveRecords(year: number, month: number): Record<string, LeavePermissionRecord> {
  try {
    const key = getLeaveRecordStorageKey(year, month);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read local leave records:', err);
  }
  return {};
}

/**
 * Internal helper to persist the entire month's leave records map to all 3 Supabase cloud layers:
 * 1) public.leave_permissions (relational rows, with FK-safe fallback)
 * 2) public.system_settings (value_json JSONB column)
 * 3) public.schedules (days_json JSONB mirror row so it works even if only public.schedules table exists)
 */
async function persistLeaveMapToSupabaseCloud(
  year: number,
  month: number,
  recordsMap: Record<string, LeavePermissionRecord>,
  deletedIds: Set<string>,
  singleRecordToUpsert?: LeavePermissionRecord
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const nowIso = new Date().toISOString();
  const mirrorScheduleId = getLeaveCloudScheduleMirrorId(year, month);
  const mirrorYear = -(year * 10 + 1);
  const mirrorMonth = -month;

  let anySuccess = false;

  // 1. Upsert relational row(s) in public.leave_permissions
  const recordsToUpsert = singleRecordToUpsert
    ? [singleRecordToUpsert]
    : Object.values(recordsMap).filter((r) => r && r.id && !deletedIds.has(r.id));

  if (recordsToUpsert.length > 0) {
    const rows = recordsToUpsert.map((r) => ({
      id: r.id,
      year: r.year,
      month: r.month,
      day: r.day,
      staff_id: r.staffId,
      staff_name: r.staffName,
      leave_type: r.leaveType || 'keperluan_lain',
      reason: r.notes || '',
      proof_url: r.proofUrl ? normalizeDriveUrl(r.proofUrl) : null,
      proof_file_name: r.proofFileName || null,
      status: 'approved',
      created_at: r.updatedAt || r.createdAt || nowIso,
    }));

    try {
      const { error } = await client.from('leave_permissions').upsert(rows, { onConflict: 'id' });
      if (!error) {
        anySuccess = true;
      } else {
        // Retry with staff_id: null in case staff row is not yet in public.staff (FK constraint)
        const fkSafeRows = rows.map((row) => ({ ...row, staff_id: null }));
        const { error: retryErr } = await client.from('leave_permissions').upsert(fkSafeRows, { onConflict: 'id' });
        if (!retryErr) anySuccess = true;
      }
    } catch {}
  }

  // 2. Upsert JSONB map in public.system_settings (using value_json column)
  try {
    const { error: sysErr } = await client.from('system_settings').upsert(
      {
        key: `leave_records_${year}_${month}`,
        value_json: {
          records: recordsMap,
          deletedIds: Array.from(deletedIds),
          updatedAt: nowIso,
        },
        updated_at: nowIso,
      },
      { onConflict: 'key' }
    );
    if (!sysErr) anySuccess = true;
  } catch {}

  // 3. Upsert JSONB mirror in public.schedules (guaranteed to exist in all Supabase setups)
  try {
    const { error: schedMirrorErr } = await client.from('schedules').upsert(
      {
        id: mirrorScheduleId,
        year: mirrorYear,
        month: mirrorMonth,
        total_days: 0,
        days_json: {
          _isLeaveMirror: true,
          records: recordsMap,
          deletedIds: Array.from(deletedIds),
          updatedAt: nowIso,
        } as any,
        updated_at: nowIso,
        updated_by: 'Supabase Leave Cloud Sync',
      },
      { onConflict: 'id' }
    );
    if (!schedMirrorErr) anySuccess = true;
  } catch {}

  return anySuccess;
}

/**
 * Save single leave permission record (Admin or Staff assigns/updates) directly to Supabase Cloud
 */
export async function saveLeaveRecord(record: LeavePermissionRecord): Promise<boolean> {
  const { year, month } = record;
  const nowIso = new Date().toISOString();
  const normalizedRecord: LeavePermissionRecord = {
    ...record,
    proofUrl: record.proofUrl ? normalizeDriveUrl(record.proofUrl) : undefined,
    updatedAt: nowIso,
    createdAt: record.createdAt || nowIso,
  };

  const deletedIds = getLocalDeletedLeaveIds(year, month);
  if (deletedIds.has(normalizedRecord.id)) {
    deletedIds.delete(normalizedRecord.id);
    saveLocalDeletedLeaveIds(year, month, deletedIds);
  }

  const key = getLeaveRecordStorageKey(year, month);
  const current = getLocalLeaveRecords(year, month);
  current[normalizedRecord.id] = normalizedRecord;

  try {
    localStorage.setItem(key, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('leave_records_updated', { detail: { record: normalizedRecord } }));
  } catch (err) {
    console.error('Failed to save leave record to localStorage:', err);
  }

  return await persistLeaveMapToSupabaseCloud(year, month, current, deletedIds, normalizedRecord);
}

/**
 * Push all local leave records for a given year & month to Supabase Cloud
 */
export async function syncAllLeaveRecordsToSupabase(year: number, month: number): Promise<boolean> {
  const current = getLocalLeaveRecords(year, month);
  const deletedIds = getLocalDeletedLeaveIds(year, month);
  return await persistLeaveMapToSupabaseCloud(year, month, current, deletedIds);
}

/**
 * Delete leave permission record from LocalStorage and all Supabase Cloud layers
 */
export async function deleteLeaveRecord(year: number, month: number, day: number, staffId: number): Promise<boolean> {
  const id = getLeaveRecordId(year, month, day, staffId);
  const key = getLeaveRecordStorageKey(year, month);
  const current = getLocalLeaveRecords(year, month);
  delete current[id];

  const deletedIds = getLocalDeletedLeaveIds(year, month);
  deletedIds.add(id);
  saveLocalDeletedLeaveIds(year, month, deletedIds);

  try {
    localStorage.setItem(key, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('leave_records_updated', { detail: { id, deleted: true } }));
  } catch (err) {
    console.error('Failed to delete leave record from localStorage:', err);
  }

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('leave_permissions').delete().eq('id', id);
  } catch {}

  await persistLeaveMapToSupabaseCloud(year, month, current, deletedIds);
  return true;
}

/**
 * Attach Google Drive link proof to existing or new leave record and sync to Supabase Cloud
 */
export async function attachLeaveProof(
  year: number,
  month: number,
  day: number,
  staffId: number,
  staffName: string,
  leaveType: LeaveType,
  proofUrl: string,
  proofFileName: string,
  uploadedBy: string,
  notes?: string
): Promise<boolean> {
  const id = getLeaveRecordId(year, month, day, staffId);
  const current = getLocalLeaveRecords(year, month);
  const existing = current[id];
  const cleanedUrl = normalizeDriveUrl(proofUrl);
  const nowIso = new Date().toISOString();

  const updatedRecord: LeavePermissionRecord = {
    id,
    staffId,
    staffName: existing?.staffName || staffName,
    day,
    month,
    year,
    leaveType: leaveType || existing?.leaveType || 'sakit',
    notes: notes !== undefined ? notes : existing?.notes || '',
    proofUrl: cleanedUrl || undefined,
    proofFileName: cleanedUrl ? proofFileName || 'Link Google Drive' : undefined,
    proofUploadedAt: cleanedUrl ? nowIso : undefined,
    proofUploadedBy: cleanedUrl ? uploadedBy : undefined,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
  };

  return await saveLeaveRecord(updatedRecord);
}

/**
 * Fetch and merge leave records from all Supabase Cloud layers (and auto-push any unsynced local records to Supabase)
 */
export async function fetchLeaveRecordsFromSupabase(
  year: number,
  month: number
): Promise<Record<string, LeavePermissionRecord>> {
  const local = getLocalLeaveRecords(year, month);
  const deletedIds = getLocalDeletedLeaveIds(year, month);
  const client = getSupabaseClient();
  if (!client) return local;

  const mirrorScheduleId = getLeaveCloudScheduleMirrorId(year, month);

  try {
    const [tableRes, settingsRes, schedMirrorRes] = await Promise.allSettled([
      client.from('leave_permissions').select('*').eq('year', year).eq('month', month),
      client
        .from('system_settings')
        .select('value_json, updated_at')
        .eq('key', `leave_records_${year}_${month}`)
        .maybeSingle(),
      client
        .from('schedules')
        .select('days_json, updated_at')
        .eq('id', mirrorScheduleId)
        .maybeSingle(),
    ]);

    const cloudRecords: Record<string, LeavePermissionRecord> = {};

    const mergeRecordInto = (target: Record<string, LeavePermissionRecord>, incoming: LeavePermissionRecord) => {
      if (!incoming || !incoming.id) return;
      if (deletedIds.has(incoming.id)) return;
      const normalizedIncoming: LeavePermissionRecord = {
        ...incoming,
        proofUrl: incoming.proofUrl ? normalizeDriveUrl(incoming.proofUrl) : undefined,
      };
      const existing = target[incoming.id];
      if (!existing) {
        target[incoming.id] = normalizedIncoming;
        return;
      }
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime() || 0;
      const incomingTime = new Date(normalizedIncoming.updatedAt || normalizedIncoming.createdAt || 0).getTime() || 0;
      if (incomingTime >= existingTime) {
        target[incoming.id] = {
          ...existing,
          ...normalizedIncoming,
          proofUrl: normalizedIncoming.proofUrl ?? existing.proofUrl,
          proofFileName: normalizedIncoming.proofFileName ?? existing.proofFileName,
          notes: normalizedIncoming.notes || existing.notes || '',
        };
      } else {
        target[incoming.id] = {
          ...normalizedIncoming,
          ...existing,
          proofUrl: existing.proofUrl ?? normalizedIncoming.proofUrl,
          proofFileName: existing.proofFileName ?? normalizedIncoming.proofFileName,
          notes: existing.notes || normalizedIncoming.notes || '',
        };
      }
    };

    // 1. Extract deletedIds & records from schedules mirror
    if (
      schedMirrorRes.status === 'fulfilled' &&
      !schedMirrorRes.value.error &&
      schedMirrorRes.value.data?.days_json
    ) {
      const mirrorData = schedMirrorRes.value.data.days_json as any;
      if (Array.isArray(mirrorData.deletedIds)) {
        mirrorData.deletedIds.forEach((id: string) => deletedIds.add(String(id)));
      }
      const mapObj = mirrorData.records || (!mirrorData._isLeaveMirror ? mirrorData : {});
      if (mapObj && typeof mapObj === 'object') {
        Object.values(mapObj as Record<string, LeavePermissionRecord>).forEach((rec) => {
          if (rec && rec.id && typeof rec.day === 'number') {
            mergeRecordInto(cloudRecords, rec);
          }
        });
      }
    }

    // 2. Extract deletedIds & records from system_settings.value_json
    if (
      settingsRes.status === 'fulfilled' &&
      !settingsRes.value.error &&
      settingsRes.value.data?.value_json
    ) {
      const valJson = settingsRes.value.data.value_json as any;
      if (Array.isArray(valJson.deletedIds)) {
        valJson.deletedIds.forEach((id: string) => deletedIds.add(String(id)));
      }
      const mapObj = valJson.records || valJson;
      if (mapObj && typeof mapObj === 'object') {
        Object.values(mapObj as Record<string, LeavePermissionRecord>).forEach((rec) => {
          if (rec && rec.id && typeof rec.day === 'number') {
            mergeRecordInto(cloudRecords, rec);
          }
        });
      }
    }

    // 3. Extract relational rows from public.leave_permissions
    if (
      tableRes.status === 'fulfilled' &&
      !tableRes.value.error &&
      Array.isArray(tableRes.value.data)
    ) {
      tableRes.value.data.forEach((r: any) => {
        if (!r || !r.id || deletedIds.has(String(r.id))) return;
        const staffIdFromId = Number(String(r.id).split('_')[3]) || 0;
        const rec: LeavePermissionRecord = {
          id: String(r.id),
          staffId: Number(r.staff_id) || staffIdFromId,
          staffName: r.staff_name || 'Wali Asuh',
          day: Number(r.day) || 1,
          month: Number(r.month) || month,
          year: Number(r.year) || year,
          leaveType: (r.leave_type as LeaveType) || 'keperluan_lain',
          notes: r.reason || '',
          proofUrl: r.proof_url ? normalizeDriveUrl(r.proof_url) : undefined,
          proofFileName: r.proof_file_name || undefined,
          proofUploadedAt: r.created_at,
          proofUploadedBy: r.staff_name,
          createdAt: r.created_at || new Date().toISOString(),
          updatedAt: r.created_at || new Date().toISOString(),
        };
        mergeRecordInto(cloudRecords, rec);
      });
    }

    saveLocalDeletedLeaveIds(year, month, deletedIds);

    // 4. Merge local and cloud, and check if local has any unsynced records (e.g. Google Drive links saved locally earlier)
    const finalMerged: Record<string, LeavePermissionRecord> = { ...cloudRecords };
    let hasUnsyncedLocalChanges = false;

    Object.values(local).forEach((localRec) => {
      if (!localRec || !localRec.id || deletedIds.has(localRec.id)) return;
      const cloudRec = cloudRecords[localRec.id];
      if (!cloudRec) {
        hasUnsyncedLocalChanges = true;
        mergeRecordInto(finalMerged, localRec);
      } else {
        const localHasDrive = Boolean(localRec.proofUrl && !cloudRec.proofUrl);
        const localTime = new Date(localRec.updatedAt || localRec.createdAt || 0).getTime() || 0;
        const cloudTime = new Date(cloudRec.updatedAt || cloudRec.createdAt || 0).getTime() || 0;
        if (localHasDrive || localTime > cloudTime) {
          hasUnsyncedLocalChanges = true;
        }
        mergeRecordInto(finalMerged, localRec);
      }
    });

    try {
      localStorage.setItem(getLeaveRecordStorageKey(year, month), JSON.stringify(finalMerged));
    } catch {}

    // Automatically push any unsynced local records (such as previously entered Google Drive links) to Supabase Cloud
    if (hasUnsyncedLocalChanges && Object.keys(finalMerged).length > 0) {
      persistLeaveMapToSupabaseCloud(year, month, finalMerged, deletedIds).catch(() => {});
    }

    return finalMerged;
  } catch {
    return local;
  }
}

/**
 * Subscribe to leave records in Supabase with Realtime + Polling + Focus sync across all devices
 */
export function subscribeToLeaveRecords(
  year: number,
  month: number,
  callback: (records: Record<string, LeavePermissionRecord>) => void
): () => void {
  const local = getLocalLeaveRecords(year, month);
  callback(local);

  const storageKey = getLeaveRecordStorageKey(year, month);
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === storageKey && e.newValue) {
      try {
        callback(JSON.parse(e.newValue));
      } catch {}
    }
  };
  const handleCustomEvent = () => {
    callback(getLocalLeaveRecords(year, month));
  };

  window.addEventListener('storage', handleStorageEvent);
  window.addEventListener('leave_records_updated', handleCustomEvent);

  const client = getSupabaseClient();
  if (!client) {
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('leave_records_updated', handleCustomEvent);
    };
  }

  let isMounted = true;
  const pullLatest = async () => {
    const merged = await fetchLeaveRecordsFromSupabase(year, month);
    if (isMounted) {
      callback(merged);
    }
  };

  pullLatest();

  const handleFocus = () => {
    if (document.visibilityState === 'visible') {
      pullLatest();
    }
  };
  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleFocus);

  const pollTimer = setInterval(pullLatest, 6000);
  const mirrorScheduleId = getLeaveCloudScheduleMirrorId(year, month);

  // Realtime subscription across all 3 cloud layers
  try {
    const channel = client
      .channel(`leave_permissions_sync_${year}_${month}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leave_permissions', filter: `year=eq.${year}` },
        () => {
          pullLatest();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: `key=eq.leave_records_${year}_${month}` },
        () => {
          pullLatest();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules', filter: `id=eq.${mirrorScheduleId}` },
        () => {
          pullLatest();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('leave_records_updated', handleCustomEvent);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      client.removeChannel(channel);
    };
  } catch {
    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('leave_records_updated', handleCustomEvent);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }
}

/**
 * Get human readable label for leave type
 */
export function getLeaveTypeLabel(type: LeaveType): string {
  switch (type) {
    case 'sakit':
      return 'Sakit (Surat Dokter)';
    case 'dinas':
      return 'Dinas Luar (Surat Tugas)';
    case 'keperluan_lain':
      return 'Keperluan Lain';
    default:
      return 'Izin';
  }
}

