import { LeavePermissionRecord, LeaveType, MonthSchedule, Staff } from '../types';
import { getSupabaseClient } from './supabaseService';

const LEAVE_STORAGE_PREFIX = 'wali_asuh_leave_records_v1';

export function getLeaveRecordStorageKey(year: number, month: number): string {
  return `${LEAVE_STORAGE_PREFIX}_${year}_${month}`;
}

export function getLeaveRecordId(year: number, month: number, day: number, staffId: number): string {
  return `${year}_${month}_${day}_${staffId}`;
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
      // Include if cell is IZIN/C or if it has custom proof/notes attached and staff is in current month
      if (currentShift === 'IZIN' || currentShift === 'C') {
        const st = staffMap.get(rec.staffId);
        mergedMap.set(rec.id, {
          ...rec,
          staffName: st ? st.name : rec.staffName,
        });
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
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Failed to read local leave records:', err);
  }
  return {};
}

/**
 * Save single leave permission record (Admin or Staff assigns/updates)
 */
export async function saveLeaveRecord(record: LeavePermissionRecord): Promise<boolean> {
  const { year, month } = record;
  const normalizedRecord: LeavePermissionRecord = {
    ...record,
    proofUrl: record.proofUrl ? normalizeDriveUrl(record.proofUrl) : undefined,
  };
  const key = getLeaveRecordStorageKey(year, month);
  const current = getLocalLeaveRecords(year, month);
  current[normalizedRecord.id] = normalizedRecord;

  try {
    localStorage.setItem(key, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('leave_records_updated', { detail: { record: normalizedRecord } }));
  } catch (err) {
    console.error('Failed to save leave record to localStorage:', err);
  }

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await Promise.allSettled([
      client.from('leave_permissions').upsert({
        id: normalizedRecord.id,
        year: normalizedRecord.year,
        month: normalizedRecord.month,
        day: normalizedRecord.day,
        staff_id: normalizedRecord.staffId,
        staff_name: normalizedRecord.staffName,
        leave_type: normalizedRecord.leaveType,
        reason: normalizedRecord.notes || '',
        proof_url: normalizedRecord.proofUrl || null,
        proof_file_name: normalizedRecord.proofFileName || null,
        status: 'approved',
        created_at: normalizedRecord.createdAt || new Date().toISOString(),
      }),
      client.from('system_settings').upsert(
        {
          key: `leave_records_${year}_${month}`,
          value: current,
          updated_at: new Date().toISOString(),
          updated_by: normalizedRecord.proofUploadedBy || normalizedRecord.createdBy || 'System',
        },
        { onConflict: 'key' }
      ),
    ]);
    return true;
  } catch (err: any) {
    console.warn('[LeaveService] Supabase notice:', err);
    return true;
  }
}

/**
 * Delete leave permission record
 */
export async function deleteLeaveRecord(year: number, month: number, day: number, staffId: number): Promise<boolean> {
  const id = getLeaveRecordId(year, month, day, staffId);
  const key = getLeaveRecordStorageKey(year, month);
  const current = getLocalLeaveRecords(year, month);
  delete current[id];

  try {
    localStorage.setItem(key, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('leave_records_updated', { detail: { id, deleted: true } }));
  } catch (err) {
    console.error('Failed to delete leave record from localStorage:', err);
  }

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await Promise.allSettled([
      client.from('leave_permissions').delete().eq('id', id),
      client.from('system_settings').upsert(
        {
          key: `leave_records_${year}_${month}`,
          value: current,
          updated_at: new Date().toISOString(),
          updated_by: 'Admin Delete',
        },
        { onConflict: 'key' }
      ),
    ]);
    return true;
  } catch (err: any) {
    console.warn('[LeaveService] Supabase delete notice:', err);
    return true;
  }
}

/**
 * Attach Google Drive link proof to existing or new leave record
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
    proofUploadedAt: cleanedUrl ? new Date().toISOString() : undefined,
    proofUploadedBy: cleanedUrl ? uploadedBy : undefined,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return await saveLeaveRecord(updatedRecord);
}

/**
 * Subscribe to leave records in Supabase
 */
export function subscribeToLeaveRecords(
  year: number,
  month: number,
  callback: (records: Record<string, LeavePermissionRecord>) => void
): () => void {
  const local = getLocalLeaveRecords(year, month);
  callback(local);

  const client = getSupabaseClient();
  if (!client) {
    const handler = () => callback(getLocalLeaveRecords(year, month));
    window.addEventListener('leave_records_updated', handler);
    return () => window.removeEventListener('leave_records_updated', handler);
  }

  const fetchAndMergeFromCloud = async () => {
    try {
      const [tableRes, settingsRes] = await Promise.allSettled([
        client.from('leave_permissions').select('*').eq('year', year).eq('month', month),
        client.from('system_settings').select('value').eq('key', `leave_records_${year}_${month}`).maybeSingle(),
      ]);

      const merged: Record<string, LeavePermissionRecord> = {
        ...getLocalLeaveRecords(year, month),
      };

      if (
        settingsRes.status === 'fulfilled' &&
        settingsRes.value.data?.value &&
        typeof settingsRes.value.data.value === 'object'
      ) {
        Object.entries(settingsRes.value.data.value as Record<string, LeavePermissionRecord>).forEach(
          ([k, val]) => {
            if (val && val.id) {
              merged[k] = {
                ...val,
                proofUrl: val.proofUrl ? normalizeDriveUrl(val.proofUrl) : undefined,
              };
            }
          }
        );
      }

      if (tableRes.status === 'fulfilled' && !tableRes.value.error && Array.isArray(tableRes.value.data)) {
        tableRes.value.data.forEach((r: any) => {
          const existing = merged[r.id];
          merged[r.id] = {
            id: r.id,
            staffId: r.staff_id,
            staffName: r.staff_name,
            day: r.day,
            month: r.month,
            year: r.year,
            leaveType: (r.leave_type as LeaveType) || existing?.leaveType || 'keperluan_lain',
            notes: r.reason || existing?.notes || '',
            proofUrl: r.proof_url ? normalizeDriveUrl(r.proof_url) : existing?.proofUrl,
            proofFileName: r.proof_file_name || existing?.proofFileName,
            proofUploadedAt: existing?.proofUploadedAt || r.created_at,
            proofUploadedBy: existing?.proofUploadedBy || r.staff_name,
            createdAt: r.created_at || existing?.createdAt || new Date().toISOString(),
            updatedAt: existing?.updatedAt || r.created_at || new Date().toISOString(),
          };
        });
      }

      try {
        localStorage.setItem(getLeaveRecordStorageKey(year, month), JSON.stringify(merged));
      } catch {}
      callback(merged);
    } catch {}
  };

  fetchAndMergeFromCloud();

  // Realtime subscription
  try {
    const channel = client
      .channel(`leave_permissions_${year}_${month}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leave_permissions', filter: `year=eq.${year}` },
        () => {
          fetchAndMergeFromCloud();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: `key=eq.leave_records_${year}_${month}` },
        () => {
          fetchAndMergeFromCloud();
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
