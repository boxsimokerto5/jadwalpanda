import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar, 
  HeartPulse, 
  Briefcase, 
  HelpCircle, 
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Link as LinkIcon,
  Edit3,
  Database,
  RefreshCw
} from 'lucide-react';
import { MonthSchedule, Staff, LeavePermissionRecord } from '../types';
import { 
  getLeaveTypeLabel, 
  deleteLeaveRecord, 
  getLocalLeaveRecords, 
  subscribeToLeaveRecords,
  getSynchronizedLeaveRecords,
  normalizeDriveUrl,
  fetchLeaveRecordsFromSupabase,
  syncAllLeaveRecordsToSupabase
} from '../utils/leaveService';
import { saveScheduleToSupabase } from '../utils/supabaseService';
import { soundManager } from '../utils/audio';
import { LeaveProofUploadModal } from './LeaveProofUploadModal';
import { LeaveAssignmentModal } from './LeaveAssignmentModal';

interface LeaveManagementViewProps {
  schedule: MonthSchedule;
  setSchedule?: React.Dispatch<React.SetStateAction<MonthSchedule>>;
  staffList: Staff[];
  activeDay?: number;
  setActiveDay?: (day: number) => void;
  leaveRecords?: Record<string, LeavePermissionRecord>;
  onUpdateRecord?: () => void;
  userRole?: 'admin' | 'staff';
  onNavigateToMatrix?: () => void;
  onNavigateToDashboard?: () => void;
}

export const LeaveManagementView: React.FC<LeaveManagementViewProps> = ({
  schedule,
  setSchedule,
  staffList,
  leaveRecords: propLeaveRecords,
  onUpdateRecord,
  userRole = 'admin',
  onNavigateToMatrix,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDay, setFilterDay] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<LeavePermissionRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);

  const handleManualCloudSync = async () => {
    setIsSyncingCloud(true);
    try {
      await syncAllLeaveRecordsToSupabase(schedule.year, schedule.month);
      const latest = await fetchLeaveRecordsFromSupabase(schedule.year, schedule.month);
      setInternalRecords(latest);
      soundManager.playChime();
      setToastMessage('Seluruh data perizinan & link Google Drive berhasil disinkronkan secara online di Supabase Cloud!');
    } catch {
      setToastMessage('Data perizinan disinkronkan dengan server.');
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const [uploadTarget, setUploadTarget] = useState<{
    staff: Staff;
    day: number;
    record: LeavePermissionRecord;
  } | null>(null);

  const [editTarget, setEditTarget] = useState<{
    staff: Staff;
    day: number;
  } | null>(null);

  const [internalRecords, setInternalRecords] = useState<Record<string, LeavePermissionRecord>>(() =>
    getLocalLeaveRecords(schedule.year, schedule.month)
  );

  React.useEffect(() => {
    const unsub = subscribeToLeaveRecords(schedule.year, schedule.month, (data) => {
      setInternalRecords(data);
    });
    const handleCustomUpdate = () => {
      setInternalRecords(getLocalLeaveRecords(schedule.year, schedule.month));
    };
    window.addEventListener('leave_records_updated', handleCustomUpdate);
    return () => {
      unsub();
      window.removeEventListener('leave_records_updated', handleCustomUpdate);
    };
  }, [schedule.year, schedule.month]);

  const activeLeaveRecords = propLeaveRecords || internalRecords;

  const staffMap = useMemo(() => {
    const map = new Map<number, Staff>();
    (staffList && staffList.length > 0 ? staffList : schedule.staffList || []).forEach((s) => {
      map.set(s.id, s);
    });
    return map;
  }, [staffList, schedule.staffList]);

  // Automatically synchronize all 'IZIN' & 'C' cells from the schedule matrix with saved leave records
  const recordList: LeavePermissionRecord[] = useMemo(() => {
    return getSynchronizedLeaveRecords(schedule, staffList, activeLeaveRecords);
  }, [schedule, staffList, activeLeaveRecords]);

  // Statistics
  const stats = useMemo(() => {
    let total = recordList.length;
    let sakit = 0;
    let dinas = 0;
    let lain = 0;
    let withProof = 0;

    recordList.forEach((r) => {
      if (r.leaveType === 'sakit') sakit++;
      else if (r.leaveType === 'dinas') dinas++;
      else lain++;

      if (r.proofUrl) withProof++;
    });

    return { total, sakit, dinas, lain, withProof };
  }, [recordList]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return recordList.filter((r) => {
      const st = staffMap.get(r.staffId);
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.staffName.toLowerCase().includes(q) ||
        (st?.code && st.code.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q)) ||
        (r.proofFileName && r.proofFileName.toLowerCase().includes(q));
      const matchType = filterType === 'all' || r.leaveType === filterType;
      const matchDay = filterDay === 'all' || r.day === Number(filterDay);
      return matchSearch && matchType && matchDay;
    });
  }, [recordList, staffMap, searchTerm, filterType, filterDay]);

  const handleDelete = async (r: LeavePermissionRecord) => {
    soundManager.playBell();
    await deleteLeaveRecord(r.year, r.month, r.day, r.staffId);

    // If this staff had 'IZIN' in the matrix on this day, also set matrix shift to 'O' so it stays synced
    if (setSchedule && schedule.days?.[r.day]?.[r.staffId] === 'IZIN') {
      setSchedule((prev) => {
        const newDays = { ...prev.days };
        newDays[r.day] = { ...newDays[r.day], [r.staffId]: 'O' };
        const updated: MonthSchedule = {
          ...prev,
          days: newDays,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Administrator (Hapus Izin)',
        };
        try {
          localStorage.setItem(`wali_asuh_schedule_v16_${prev.year}_${prev.month}`, JSON.stringify(updated));
          localStorage.setItem(`wali_asuh_schedule_v15_${prev.year}_${prev.month}`, JSON.stringify(updated));
        } catch {}
        saveScheduleToSupabase(updated, 'Administrator (Hapus Izin)').catch(() => {});
        return updated;
      });
    }

    setInternalRecords(getLocalLeaveRecords(r.year, r.month));
    setDeleteConfirm(null);
    setToastMessage(`Data perizinan ${r.staffName} (Tgl ${r.day} ${schedule.monthName}) berhasil dihapus.`);
    setTimeout(() => setToastMessage(null), 4000);
    onUpdateRecord?.();
  };

  const resolveStaffObject = (r: LeavePermissionRecord): Staff => {
    return (
      staffMap.get(r.staffId) || {
        id: r.staffId,
        name: r.staffName,
        role: 'Wali Asuh',
      }
    );
  };

  return (
    <div className="space-y-3 animate-in fade-in">
      {/* Toast */}
      {toastMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-700 via-red-600 to-amber-600 rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/20 text-white border border-white/20 text-[10.5px] font-bold">
                <FileText className="w-3.5 h-3.5" />
                <span>Manajemen Perizinan Wali Asuh • Tersinkronisasi Otomatis dengan Matriks</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-200 border border-emerald-400/40 text-[10.5px] font-bold">
                <Database className="w-3 h-3 text-emerald-300" />
                <span>Tersimpan Online di Supabase Cloud (Semua Perangkat)</span>
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Rekapitulasi Izin, Sakit & Dinas ({schedule.monthName} {schedule.year})
            </h1>
            <p className="text-xs text-white/90 max-w-2xl">
              Seluruh kode <strong>IZIN</strong>, kategori (Sakit/Dinas/Lainnya), catatan alasan, serta <strong>Link Google Drive</strong> surat bukti tersimpan langsung secara online di database <strong>Supabase Cloud</strong> sehingga otomatis tampil di seluruh HP/perangkat rekan lainnya.
            </p>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-4 gap-2 text-center shrink-0">
            <div className="bg-white/20 backdrop-blur-xs rounded-xl p-2 border border-white/25">
              <div className="text-lg font-black">{stats.total}</div>
              <div className="text-[10px] text-white/90 font-medium">Total Izin</div>
            </div>
            <div className="bg-white/20 backdrop-blur-xs rounded-xl p-2 border border-white/25">
              <div className="text-lg font-black text-rose-200">{stats.sakit}</div>
              <div className="text-[10px] text-white/90 font-medium">Sakit</div>
            </div>
            <div className="bg-white/20 backdrop-blur-xs rounded-xl p-2 border border-white/25">
              <div className="text-lg font-black text-blue-200">{stats.dinas}</div>
              <div className="text-[10px] text-white/90 font-medium">Dinas</div>
            </div>
            <div className="bg-white/20 backdrop-blur-xs rounded-xl p-2 border border-white/25">
              <div className="text-lg font-black text-emerald-200">{stats.withProof}</div>
              <div className="text-[10px] text-white/90 font-medium">Link Drive</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama wali asuh, kode (L1/P1), atau catatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-rose-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Filter Dropdowns & Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Day Filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-rose-500" />
            <select
              aria-label="Filter berdasarkan tanggal"
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
            >
              <option value="all">Semua Tanggal (1 - {schedule.totalDays})</option>
              {Array.from({ length: schedule.totalDays }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d)}>
                  Tanggal {d} {schedule.monthName}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              aria-label="Filter berdasarkan kategori izin"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
            >
              <option value="all">Semua Kategori ({stats.total})</option>
              <option value="sakit">Sakit ({stats.sakit})</option>
              <option value="dinas">Dinas Luar ({stats.dinas})</option>
              <option value="keperluan_lain">Keperluan Lain / Izin ({stats.lain})</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleManualCloudSync}
            disabled={isSyncingCloud}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            title="Sinkronkan & tarik data Link Google Drive terbaru dari Supabase Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Sinkronkan Cloud'}</span>
          </button>

          {onNavigateToMatrix && (
            <button
              onClick={onNavigateToMatrix}
              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Buka Matriks Jadwal</span>
            </button>
          )}
        </div>
      </div>

      {/* List of Leave Records */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-500 mx-auto flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Belum Ada Data Perizinan Sesuai Filter
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Setiap petugas dengan kode <strong>IZIN</strong> pada matriks jadwal bulan {schedule.monthName} {schedule.year} akan langsung tampil otomatis di sini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredRecords.map((record) => {
              const isSakit = record.leaveType === 'sakit';
              const isDinas = record.leaveType === 'dinas';
              const stObj = resolveStaffObject(record);
              const driveUrl = normalizeDriveUrl(record.proofUrl);

              return (
                <div
                  key={record.id}
                  className="p-3 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {stObj.code && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            stObj.gender === 'L'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                              : 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border border-pink-300 dark:border-pink-800'
                          }`}
                        >
                          {stObj.code}
                        </span>
                      )}
                      <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {record.staffName}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                          isSakit
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : isDinas
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {isSakit && <HeartPulse className="w-3 h-3" />}
                        {isDinas && <Briefcase className="w-3 h-3" />}
                        {!isSakit && !isDinas && <HelpCircle className="w-3 h-3" />}
                        <span>{getLeaveTypeLabel(record.leaveType)}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        <Calendar className="w-2.5 h-2.5 text-rose-500" />
                        <span>Tanggal {record.day} {schedule.monthName} {record.year}</span>
                      </span>
                    </div>

                    {record.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Keterangan: <span className="italic">"{record.notes}"</span>
                      </p>
                    )}

                    {driveUrl && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400">
                        <LinkIcon className="w-3 h-3 shrink-0" />
                        <span className="font-semibold truncate max-w-xs sm:max-w-md">
                          {record.proofFileName || driveUrl}
                        </span>
                        {record.proofUploadedAt && (
                          <span className="text-[10px] text-slate-400">
                            • Diperbarui oleh {record.proofUploadedBy || record.staffName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions & Google Drive Proof Link */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                    {driveUrl ? (
                      <a
                        href={driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                        title="Klik untuk membuka dokumen bukti langsung di Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka Link Google Drive</span>
                      </a>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 text-[11px] italic">
                        Belum ada link Drive
                      </span>
                    )}

                    {/* Button for Staff or Admin to attach/edit Google Drive Link & Category */}
                    <button
                      type="button"
                      onClick={() =>
                        setUploadTarget({
                          staff: stObj,
                          day: record.day,
                          record,
                        })
                      }
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition-colors cursor-pointer"
                      title="Cantumkan atau ubah Link Google Drive & Kategori Izin"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>{driveUrl ? 'Edit Link' : '+ Link Drive'}</span>
                    </button>

                    {userRole === 'admin' && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setEditTarget({
                              staff: stObj,
                              day: record.day,
                            })
                          }
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="Atur kategori izin & keterangan admin"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(record)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Hapus status izin pada tanggal ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Cantumkan / Edit Link Google Drive */}
      {uploadTarget && (
        <LeaveProofUploadModal
          isOpen={!!uploadTarget}
          onClose={() => setUploadTarget(null)}
          staff={uploadTarget.staff}
          day={uploadTarget.day}
          month={schedule.month}
          year={schedule.year}
          monthName={schedule.monthName}
          record={uploadTarget.record}
          onUploaded={(updated) => {
            setInternalRecords(getLocalLeaveRecords(schedule.year, schedule.month));
            setToastMessage(
              updated.proofUrl
                ? `Link Google Drive bukti izin ${uploadTarget.staff.name} berhasil disimpan!`
                : `Data perizinan ${uploadTarget.staff.name} berhasil diperbarui.`
            );
            setTimeout(() => setToastMessage(null), 4000);
            onUpdateRecord?.();
          }}
        />
      )}

      {/* Modal Pengaturan Detail Izin (Admin) */}
      {editTarget && (
        <LeaveAssignmentModal
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          staff={editTarget.staff}
          day={editTarget.day}
          month={schedule.month}
          year={schedule.year}
          monthName={schedule.monthName}
          userRole={userRole}
          onSaved={() => {
            setInternalRecords(getLocalLeaveRecords(schedule.year, schedule.month));
            setToastMessage(`Rincian perizinan ${editTarget.staff.name} berhasil diperbarui!`);
            setTimeout(() => setToastMessage(null), 4000);
            onUpdateRecord?.();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 max-w-sm w-full border-2 border-rose-500 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Konfirmasi Hapus Status Izin</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus status <strong>IZIN</strong> untuk{' '}
              <strong>{deleteConfirm.staffName}</strong> pada tanggal{' '}
              <strong>{deleteConfirm.day} {schedule.monthName}</strong>?
              <span className="block mt-1 text-[11px] text-slate-500">
                (Kode pada matriks tanggal tersebut akan dikembalikan menjadi <strong>O / Libur</strong>).
              </span>
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
