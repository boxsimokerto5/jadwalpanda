import { LeavePermissionRecord, LeaveType } from '../types';
import { getSupabaseClient } from './supabaseService';

const LEAVE_STORAGE_PREFIX = 'wali_asuh_leave_records_v1';

export function getLeaveRecordStorageKey(year: number, month: number): string {
  return `${LEAVE_STORAGE_PREFIX}_${year}_${month}`;
}

export function getLeaveRecordId(year: number, month: number, day: number, staffId: number): string {
  return `${year}_${month}_${day}_${staffId}`;
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
 * Save single leave permission record (Admin assigns or updates)
 */
export async function saveLeaveRecord(record: LeavePermissionRecord): Promise<boolean> {
  const { year, month } = record;
  const key = getLeaveRecordStorageKey(year, month);
  const current = getLocalLeaveRecords(year, month);
  current[record.id] = record;

  try {
    localStorage.setItem(key, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('leave_records_updated', { detail: { record } }));
  } catch (err) {
    console.error('Failed to save leave record to localStorage:', err);
  }

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    await client.from('leave_permissions').upsert({
      id: record.id,
      year: record.year,
      month: record.month,
      day: record.day,
      staff_id: record.staffId,
      staff_name: record.staffName,
      leave_type: record.leaveType,
      reason: record.notes || '',
      proof_url: record.proofUrl || null,
      proof_file_name: record.proofFileName || null,
      status: 'approved',
      created_at: record.createdAt || new Date().toISOString(),
    });
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
    await client.from('leave_permissions').delete().eq('id', id);
    return true;
  } catch (err: any) {
    console.warn('[LeaveService] Supabase delete notice:', err);
    return true;
  }
}

/**
 * Upload or attach proof file (JPG/PNG Base64) to existing or new leave record
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
  uploadedBy: string
): Promise<boolean> {
  const id = getLeaveRecordId(year, month, day, staffId);
  const current = getLocalLeaveRecords(year, month);
  const existing = current[id];

  const updatedRecord: LeavePermissionRecord = {
    id,
    staffId,
    staffName: existing?.staffName || staffName,
    day,
    month,
    year,
    leaveType: existing?.leaveType || leaveType,
    notes: existing?.notes || '',
    proofUrl,
    proofFileName,
    proofUploadedAt: new Date().toISOString(),
    proofUploadedBy: uploadedBy,
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

  // Initial fetch from Supabase
  Promise.resolve(
    client
      .from('leave_permissions')
      .select('*')
      .eq('year', year)
      .eq('month', month)
  )
    .then(({ data, error }: any) => {
      if (!error && Array.isArray(data)) {
        const result: Record<string, LeavePermissionRecord> = {};
        data.forEach((r: any) => {
          result[r.id] = {
            id: r.id,
            staffId: r.staff_id,
            staffName: r.staff_name,
            day: r.day,
            month: r.month,
            year: r.year,
            leaveType: r.leave_type as LeaveType,
            notes: r.reason || '',
            proofUrl: r.proof_url || undefined,
            proofFileName: r.proof_file_name || undefined,
            createdAt: r.created_at,
            updatedAt: r.created_at || new Date().toISOString(),
          };
        });
        try {
          localStorage.setItem(getLeaveRecordStorageKey(year, month), JSON.stringify(result));
        } catch {}
        callback(result);
      }
    })
    .catch(() => {});

  // Realtime subscription
  try {
    const channel = client
      .channel(`leave_permissions_${year}_${month}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leave_permissions', filter: `year=eq.${year}` },
        async () => {
          const { data } = await client
            .from('leave_permissions')
            .select('*')
            .eq('year', year)
            .eq('month', month);
          if (Array.isArray(data)) {
            const result: Record<string, LeavePermissionRecord> = {};
            data.forEach((r: any) => {
              result[r.id] = {
                id: r.id,
                staffId: r.staff_id,
                staffName: r.staff_name,
                day: r.day,
                month: r.month,
                year: r.year,
                leaveType: r.leave_type as LeaveType,
                notes: r.reason || '',
                proofUrl: r.proof_url || undefined,
                proofFileName: r.proof_file_name || undefined,
                createdAt: r.created_at,
                updatedAt: r.created_at || new Date().toISOString(),
              };
            });
            try {
              localStorage.setItem(getLeaveRecordStorageKey(year, month), JSON.stringify(result));
            } catch {}
            callback(result);
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
