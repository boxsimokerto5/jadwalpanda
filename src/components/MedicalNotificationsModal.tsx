import React from 'react';
import { 
  X, 
  Pill, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Stethoscope,
  Building2,
  CalendarDays,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { StudentMedicalPlan } from '../types';

interface MedicalNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: StudentMedicalPlan[];
  onOpenFullMedicalView: () => void;
  onMarkPlanCompleted?: (planId: string) => void;
  referenceDate?: string;
}

export const MedicalNotificationsModal: React.FC<MedicalNotificationsModalProps> = ({
  isOpen,
  onClose,
  plans,
  onOpenFullMedicalView,
  onMarkPlanCompleted,
  referenceDate,
}) => {
  if (!isOpen) return null;

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const realTodayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const realTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const realTomorrowStr = `${realTomorrow.getFullYear()}-${pad(realTomorrow.getMonth() + 1)}-${pad(realTomorrow.getDate())}`;

  let todayKey = realTodayStr;
  let tomorrowKey = realTomorrowStr;

  if (referenceDate && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
    todayKey = referenceDate;
    const parts = referenceDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const nextD = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    tomorrowKey = `${nextD.getFullYear()}-${pad(nextD.getMonth() + 1)}-${pad(nextD.getDate())}`;
  }

  // Filter plans (matches reference date or real current date)
  const todayPlans = plans.filter(
    (p) => p.status === 'rencana' && (p.date === todayKey || p.date === realTodayStr)
  );
  const tomorrowPlans = plans.filter(
    (p) => p.status === 'rencana' && (p.date === tomorrowKey || (p.date === realTomorrowStr && p.date !== todayKey))
  );
  const urgentIds = new Set([...todayPlans.map((p) => p.id), ...tomorrowPlans.map((p) => p.id)]);
  const upcomingPlans = plans
    .filter((p) => p.status === 'rencana' && !urgentIds.has(p.id))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const urgentTotal = todayPlans.length + tomorrowPlans.length;

  const getFacilityBadge = (facility: string) => {
    switch (facility) {
      case 'UKS':
        return {
          bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: <Stethoscope className="w-3 h-3" />,
          label: 'UKS Asrama',
        };
      case 'Puskesmas':
        return {
          bg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800',
          icon: <Building2 className="w-3 h-3" />,
          label: 'Puskesmas',
        };
      case 'Rumah Sakit':
        return {
          bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          icon: <Building2 className="w-3 h-3" />,
          label: 'Rumah Sakit',
        };
      default:
        return {
          bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          icon: <Pill className="w-3 h-3" />,
          label: facility,
        };
    }
  };

  const formatDisplayDate = (dStr: string) => {
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
      }
    } catch {}
    return dStr;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-medical-title"
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-rose-50 via-rose-50/70 to-amber-50/50 dark:from-rose-950/50 dark:via-slate-900 dark:to-amber-950/40 border-b border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <Pill className="w-4 h-4 animate-bounce" style={{ animationDuration: '2.5s' }} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 id="modal-medical-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Pengingat Rencana Berobat & Kontrol
                </h3>
                {urgentTotal > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                    {urgentTotal} Mendesak
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pemberitahuan rencana rujukan UKS, Puskesmas, dan Rumah Sakit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Tutup Jendela"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Tabs / Summary Badges */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              todayPlans.length > 0 
                ? 'bg-rose-500 text-white animate-pulse' 
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {todayPlans.length}
            </div>
            <div>
              <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 block">Jadwal Hari Ini</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                {todayPlans.length > 0 ? `${todayPlans.length} Siswa Berobat` : 'Nihil Hari Ini'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              tomorrowPlans.length > 0 
                ? 'bg-amber-500 text-white' 
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {tomorrowPlans.length}
            </div>
            <div>
              <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 block">Pengingat Besok (H-1)</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                {tomorrowPlans.length > 0 ? `${tomorrowPlans.length} Siswa Kontrol` : 'Nihil Besok'}
              </span>
            </div>
          </div>
        </div>

        {/* Plans List Scroll Area */}
        <div className="p-3.5 overflow-y-auto space-y-3.5 flex-1 max-h-[55vh]">
          {/* Section: Hari Ini */}
          {todayPlans.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  HARI INI (PELAKSANAAN)
                </span>
                <span className="text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                  {todayPlans.length} Agenda
                </span>
              </div>

              {todayPlans.map((plan) => {
                const badge = getFacilityBadge(plan.facility);
                return (
                  <div
                    key={plan.id}
                    className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 shadow-2xs space-y-2 transition-all hover:shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {plan.studentName}
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          {plan.studentClassOrRoom}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                        {badge.icon}
                        <span>{plan.facilityDetail || badge.label}</span>
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-rose-800 dark:text-rose-400">Keluhan / Alasan: </span>
                      {plan.complaint}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-rose-100 dark:border-rose-950">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-mono font-medium text-slate-700 dark:text-slate-300">
                          <Clock className="w-3 h-3 text-amber-500" />
                          {plan.time || '08:00'} WIB
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-500" />
                          Pendamping: <strong className="text-slate-800 dark:text-slate-200">{plan.accompanyingStaffName}</strong>
                        </span>
                      </div>

                      {onMarkPlanCompleted && (
                        <button
                          type="button"
                          onClick={() => onMarkPlanCompleted(plan.id)}
                          className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Selesai Berobat
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section: Besok (H-1) */}
          {tomorrowPlans.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  PENGINGAT BESOK (H-1)
                </span>
                <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                  {tomorrowPlans.length} Rencana
                </span>
              </div>

              {tomorrowPlans.map((plan) => {
                const badge = getFacilityBadge(plan.facility);
                return (
                  <div
                    key={plan.id}
                    className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 shadow-2xs space-y-2 transition-all hover:shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {plan.studentName}
                          </h4>
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                            H-1
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          {plan.studentClassOrRoom}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                        {badge.icon}
                        <span>{plan.facilityDetail || badge.label}</span>
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/40 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-amber-800 dark:text-amber-400">
                        {plan.planType === 'kontrol_kembali' ? 'Kontrol Ulang: ' : 'Keluhan: '}
                      </span>
                      {plan.complaint}
                    </div>

                    {plan.notes && (
                      <p className="text-[11px] text-amber-900/80 dark:text-amber-300/90 italic bg-amber-50 dark:bg-slate-800 p-1.5 rounded">
                        📝 Catatan/Persiapan: {plan.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-amber-100 dark:border-amber-950">
                      <span className="flex items-center gap-1 font-mono font-medium text-slate-700 dark:text-slate-300">
                        <Clock className="w-3 h-3 text-amber-500" />
                        Besok jam {plan.time || '08:00'} WIB
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-blue-500" />
                        Pendamping: <strong className="text-slate-800 dark:text-slate-200">{plan.accompanyingStaffName}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section: Mendatang (Upcoming next 5) */}
          {upcomingPlans.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Rencana Mendatang (Selanjutnya)</span>
                <span className="text-[10px] text-slate-500">{upcomingPlans.length} Terjadwal</span>
              </div>

              <div className="space-y-1.5">
                {upcomingPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {plan.studentName}
                      </p>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                        {plan.facilityDetail || plan.facility} • {plan.complaint}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 block">
                        {formatDisplayDate(plan.date)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {plan.time || '08:00'} WIB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {urgentTotal === 0 && upcomingPlans.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                Kondisi Siswa Terpantau Sehat
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Tidak ada rencana rujukan ke UKS, Puskesmas, atau Rumah Sakit yang mendesak untuk hari ini atau besok.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullMedicalView();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white transition-all cursor-pointer shadow-xs"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Buka Kalender & Catat Rujukan Baru</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
