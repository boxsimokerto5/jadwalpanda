import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  HeartPulse, 
  Briefcase, 
  HelpCircle, 
  Image as ImageIcon, 
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  X,
  Download,
  AlertCircle
} from 'lucide-react';
import { MonthSchedule, Staff, LeavePermissionRecord, LeaveType } from '../types';
import { getLeaveTypeLabel, deleteLeaveRecord, getLocalLeaveRecords, subscribeToLeaveRecords } from '../utils/leaveService';
import { soundManager } from '../utils/audio';

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
  activeDay,
  setActiveDay,
  leaveRecords: propLeaveRecords,
  onUpdateRecord,
  userRole = 'admin',
  onNavigateToMatrix,
  onNavigateToDashboard,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [previewProof, setPreviewProof] = useState<LeavePermissionRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<LeavePermissionRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Convert leaveRecords object to array
  const recordList: LeavePermissionRecord[] = useMemo(() => {
    const list = Object.values(activeLeaveRecords) as LeavePermissionRecord[];
    return list.filter(
      (r) => r.year === schedule.year && r.month === schedule.month
    ).sort((a, b) => a.day - b.day);
  }, [activeLeaveRecords, schedule.year, schedule.month]);

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
      const matchSearch =
        r.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchType = filterType === 'all' || r.leaveType === filterType;
      return matchSearch && matchType;
    });
  }, [recordList, searchTerm, filterType]);

  const handleDelete = async (r: LeavePermissionRecord) => {
    soundManager.playBell();
    await deleteLeaveRecord(r.year, r.month, r.day, r.staffId);
    setDeleteConfirm(null);
    setToastMessage(`Data perizinan ${r.staffName} berhasil dihapus.`);
    setTimeout(() => setToastMessage(null), 4000);
    onUpdateRecord?.();
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
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/20 text-white border border-white/20 text-[10.5px] font-bold">
              <FileText className="w-3.5 h-3.5" />
              <span>Manajemen Perizinan Wali Asuh</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Rekapitulasi Izin, Sakit & Dinas
            </h1>
            <p className="text-xs text-white/90 max-w-2xl">
              Daftar izin petugas (Kode <strong>IZIN</strong>) dengan rincian kategori sakit, dinas luar, atau keperluan lain beserta lampiran bukti surat resmi format JPG/PNG.
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
              <div className="text-[10px] text-white/90 font-medium">Ada Bukti</div>
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
              placeholder="Cari nama wali asuh atau catatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-rose-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Filter Dropdown & Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
            >
              <option value="all">Semua Kategori ({stats.total})</option>
              <option value="sakit">Sakit ({stats.sakit})</option>
              <option value="dinas">Dinas Luar ({stats.dinas})</option>
              <option value="keperluan_lain">Keperluan Lain ({stats.lain})</option>
            </select>
          </div>

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
              Belum Ada Data Perizinan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Untuk menambahkan izin, pilih kode "IZIN" pada matriks jadwal atau atur perizinan wali asuh.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredRecords.map((record) => {
              const isSakit = record.leaveType === 'sakit';
              const isDinas = record.leaveType === 'dinas';

              return (
                <div
                  key={record.id}
                  className="p-3 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
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

                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        <Calendar className="w-2.5 h-2.5 text-rose-500" />
                        <span>Tanggal {record.day} {schedule.monthName} {record.year}</span>
                      </span>
                    </div>

                    {record.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Keterangan Admin: <span className="italic">"{record.notes}"</span>
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-slate-500 dark:text-slate-400">
                      {record.proofUploadedAt && (
                        <span>
                          Bukti diunggah oleh <strong>{record.proofUploadedBy || record.staffName}</strong> pada{' '}
                          {new Date(record.proofUploadedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })} WIB
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Proof Status */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    {record.proofUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewProof(record)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                        title="Lihat foto bukti surat (JPG/PNG)"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Lihat Bukti Foto</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs italic">
                        Belum ada bukti foto
                      </span>
                    )}

                    {userRole === 'admin' && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(record)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        title="Hapus data perizinan ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Proof Lightbox Modal */}
      {previewProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 max-w-lg w-full border-2 border-emerald-500 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Dokumen Bukti {getLeaveTypeLabel(previewProof.leaveType)}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {previewProof.staffName} (Tgl {previewProof.day} {schedule.monthName})
                </h3>
              </div>
              <button
                onClick={() => setPreviewProof(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center max-h-[65vh]">
              <img
                src={previewProof.proofUrl}
                alt="Dokumen Bukti"
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                {previewProof.proofFileName || 'Bukti Dokumen'}
              </span>
              <a
                href={previewProof.proofUrl}
                download={previewProof.proofFileName || `bukti_${previewProof.staffName}.jpg`}
                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh File</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 max-w-sm w-full border-2 border-rose-500 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Konfirmasi Hapus Data Izin</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus data perizinan <strong>{deleteConfirm.staffName}</strong> pada tanggal{' '}
              <strong>{deleteConfirm.day} {schedule.monthName}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
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
