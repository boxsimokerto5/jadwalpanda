/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MonthSchedule, Staff, ShiftCode, DailyTask, StudentMedicalPlan } from './types';
import { 
  INITIAL_STAFF_LIST, 
  getInitialAugust2026Days, 
  SEPTEMBER_2026_STAFF_LIST,
  getInitialSeptember2026Days,
  distributeSeptemberMorningShifts,
  distributeSeptemberSoreShifts,
  distributeAllScheduleShifts,
  SHIFT_DEFINITIONS,
  SHIFT_TASKS_TEMPLATE
} from './data/initialSchedule';
import {
  OCTOBER_2026_STAFF_LIST,
  getInitialOctober2026Days,
} from './data/octoberSchedule';
import { getActiveShiftsAtTime, INDONESIAN_MONTH_NAMES, generateNextMonthScheduleFromPrior } from './utils/scheduler';
import { soundManager } from './utils/audio';
import { Navbar } from './components/Navbar';
import { TodayDashboard } from './components/TodayDashboard';
import { ScheduleMatrix } from './components/ScheduleMatrix';
import { PersonalSchedule } from './components/PersonalSchedule';
import { AutoSchedulerView } from './components/AutoSchedulerView';
import { NotificationSettings } from './components/NotificationSettings';
import { PrintReportModal } from './components/PrintReportModal';
import { HandoverReportView } from './components/HandoverReportView';
import { AdminShiftSwapView } from './components/AdminShiftSwapView';
import { AdminChecklistConfigView } from './components/AdminChecklistConfigView';
import { LeaveManagementView } from './components/LeaveManagementView';
import { StudentMedicalView } from './components/StudentMedicalView';
import { AssignmentReminderView } from './components/AssignmentReminderView';
import { StaffManagementView } from './components/StaffManagementView';
import { MedicalNotificationsModal } from './components/MedicalNotificationsModal';
import { 
  ActiveShiftModal, 
  shouldShowTwoHourShiftPopup, 
  recordTwoHourShiftPopupShown 
} from './components/ActiveShiftModal';
import { StudentPortfolioView } from './components/StudentPortfolioView';
import { CodeGuideView } from './components/CodeGuideView';
import { LoginPage } from './components/LoginPage';
import { SplashScreen } from './components/SplashScreen';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { 
  getLocalStaffList, 
  subscribeToStaffList, 
  saveStaffListToSupabase,
  fetchStaffListFromSupabase,
  unmarkStaffDeletedPermanently
} from './utils/staffService';
import { 
  isSupabaseConfigured, 
  saveScheduleToSupabase, 
  fetchScheduleFromSupabase,
  subscribeToSupabaseSchedule,
  initSupabaseGlobalSync,
  isScheduleSaveInProgress,
  getLatestLocalScheduleTimestamp
} from './utils/supabaseService';
import { AnimatePresence } from 'motion/react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { 
  subscribeToSopTasks,
  saveSopTasksToSupabase,
  fetchSopTasksFromSupabase,
  subscribeToStudentMedicalPlans,
  fetchStudentMedicalPlansFromSupabase,
  saveStudentMedicalPlanToSupabase,
  deleteStudentMedicalPlanFromSupabase,
  saveAllStudentMedicalPlansToSupabase,
  getLocalStudentMedicalPlans,
  fetchHandoverReportsFromSupabase,
  saveHandoverReportsToSupabase,
  getLocalHandoverReports
} from './utils/supabaseBackend';
import { 
  fetchMorningPostAssignmentsFromSupabase,
  saveAllMorningPostAssignmentsToSupabase
} from './utils/morningPostService';
import { fetchP5TaskOptionsFromSupabase } from './utils/p5TaskService';
import { SupabaseMigrationModal } from './components/SupabaseMigrationModal';

function resolveScheduleDays(
  rawDays: Record<number, Record<number, ShiftCode>>,
  _year: number,
  _month: number,
  _staffList: Staff[]
): Record<number, Record<number, ShiftCode>> {
  // KEBEBASAN PENUH ADMIN:
  // - Shif P3 bebas di hari apa pun (tidak harus hari Senin).
  // - Petugas laki-laki bebas ditugaskan M2, M1, atau shif apa pun.
  // - Petugas perempuan bebas ditugaskan M1, M2, atau shif apa pun.
  // - Semua shif yang sudah dipilih admin (P1, P2, P3, P4, P5, S2A, S3A, S4A, M1, M2, M3, LP, O, L, C, IZIN)
  //   dipertahankan 100% persis tanpa logika atau konversi yang membatasi.
  if (!rawDays) return {};
  let modified = false;
  const result: Record<number, Record<number, ShiftCode>> = {};

  for (const dayStr in rawDays) {
    const day = Number(dayStr);
    result[day] = { ...rawDays[day] };

    for (const staffIdStr in result[day]) {
      const staffId = Number(staffIdStr);
      const val = result[day][staffId];
      // Hanya petakan kode lama bersurat tunggal tanpa batasan hari atau gender
      if (val === 'P') {
        result[day][staffId] = 'P1';
        modified = true;
      } else if (val === 'S' || (val as unknown as string) === 'S2B') {
        result[day][staffId] = 'S2A';
        modified = true;
      } else if ((val as unknown as string) === 'S3B') {
        result[day][staffId] = 'S3A';
        modified = true;
      } else if (val === 'M') {
        result[day][staffId] = 'M1';
        modified = true;
      }
    }
  }
  return modified ? result : rawDays;
}

function getInitialScheduleForMonth(year: number, month: number): MonthSchedule {
  const canonicalMonthName = INDONESIAN_MONTH_NAMES[month - 1] || 'Oktober';
  const canonicalTotalDays = new Date(year, month, 0).getDate() || 31;
  try {
    const savedV16 = localStorage.getItem(`wali_asuh_schedule_v16_${year}_${month}`);
    const savedV15 = localStorage.getItem(`wali_asuh_schedule_v15_${year}_${month}`);
    const savedV14 = localStorage.getItem(`wali_asuh_schedule_v14_${year}_${month}`);
    const saved = savedV16 || savedV15 || savedV14;
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.staffList && parsed.staffList.length > 0 && parsed.days) {
        if (
          !savedV16 &&
          !parsed.updatedAt &&
          year === 2026 &&
          month === 10 &&
          parsed.staffList.length === SEPTEMBER_2026_STAFF_LIST.length
        ) {
          // Unmodified legacy cache without timestamp detected, continue to official baseline below
        } else {
          parsed.year = year;
          parsed.month = month;
          parsed.monthName = canonicalMonthName;
          parsed.totalDays = canonicalTotalDays;
          parsed.days = resolveScheduleDays(parsed.days, year, month, parsed.staffList);
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved schedule:', e);
  }

  if (year === 2026 && month === 8) {
    return {
      year: 2026,
      month: 8,
      monthName: 'Agustus',
      totalDays: 31,
      staffList: INITIAL_STAFF_LIST,
      days: getInitialAugust2026Days(),
    };
  }

  // Official Baseline September 2026
  const septSchedule: MonthSchedule = {
    year: 2026,
    month: 9,
    monthName: 'September',
    totalDays: 30,
    staffList: SEPTEMBER_2026_STAFF_LIST,
    days: getInitialSeptember2026Days(),
  };

  if (year === 2026 && month === 9) {
    return septSchedule;
  }

  // Official Baseline October 2026 (31 Days)
  if (year === 2026 && month === 10) {
    return {
      year: 2026,
      month: 10,
      monthName: 'Oktober',
      totalDays: 31,
      staffList: OCTOBER_2026_STAFF_LIST,
      days: getInitialOctober2026Days(),
    };
  }

  // If another month is requested (e.g. November 2026) and not yet stored, generate dynamically
  return generateNextMonthScheduleFromPrior(septSchedule, year, month, 'continuation');
}

export default function App() {
  // Splash screen state (shown on initial launch, or manually triggered via logo / button)
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Authentication state (User: waliasuh/admin)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const local = localStorage.getItem('sr_auth_session');
      const session = sessionStorage.getItem('sr_auth_session');
      return Boolean(local || session);
    } catch {
      return false;
    }
  });

  // User role state ('admin' or 'staff')
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'staff'>(() => {
    try {
      const local = localStorage.getItem('sr_auth_session');
      const session = sessionStorage.getItem('sr_auth_session');
      const raw = local || session;
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.role === 'admin' ? 'admin' : 'staff';
      }
    } catch {}
    return 'staff';
  });

  // Dark mode state with localStorage persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme_dark');
      if (saved !== null) return JSON.parse(saved);
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Sound enabled state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sound_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Active view tab (defaults to admin swap view if admin, or dashboard if staff)
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'matrix' | 'codeguide' | 'personal' | 'admin' | 'leave' | 'auto' | 'notifications' | 'print' | 'handover' | 'sop' | 'medical' | 'assignment' | 'portfolio' | 'staff-management'
  >(() => {
    try {
      const local = localStorage.getItem('sr_auth_session');
      const session = sessionStorage.getItem('sr_auth_session');
      const raw = local || session;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.role === 'admin') return 'admin';
      }
    } catch {}
    return 'dashboard';
  });

  // Safeguard: redirect regular staff away from admin-only tabs
  useEffect(() => {
    if (currentUserRole !== 'admin' && (currentTab === 'admin' || currentTab === 'leave' || currentTab === 'auto' || currentTab === 'sop' || currentTab === 'staff-management')) {
      setCurrentTab('dashboard');
    }
  }, [currentUserRole, currentTab]);

  // Student medical plans state (persisted in Supabase & localStorage)
  const [medicalPlans, setMedicalPlans] = useState<StudentMedicalPlan[]>(() => {
    return getLocalStudentMedicalPlans();
  });
  const [isMedicalNotificationsOpen, setIsMedicalNotificationsOpen] = useState(false);

  // Pop-up Shif Aktif Otomatis Setiap 2 Jam Sekali (Pagi / Sore / Malam)
  const [isActiveShiftModalOpen, setIsActiveShiftModalOpen] = useState(false);

  useEffect(() => {
    // Jalankan pengecekan interval 2 jam ketika user membuka aplikasi & terautentikasi
    if (isAuthenticated && !showSplash) {
      const timer = setTimeout(() => {
        if (shouldShowTwoHourShiftPopup()) {
          setIsActiveShiftModalOpen(true);
          recordTwoHourShiftPopupShown();
          soundManager.playChime();
        }
      }, 1200); // Beri jeda halus setelah splash/load selesai
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, showSplash]);

  // Cross-device sync: fetch directly and subscribe in realtime
  useEffect(() => {
    // 1. One-time direct fetch to guarantee latest cloud plans immediately
    fetchStudentMedicalPlansFromSupabase().then((remotePlans) => {
      if (remotePlans && remotePlans.length > 0) {
        setMedicalPlans(remotePlans);
      }
    }).catch(() => {});

    // 2. Realtime listener for live updates across all devices
    const unsubscribe = subscribeToStudentMedicalPlans(
      (remotePlans) => {
        if (remotePlans && remotePlans.length > 0) {
          setMedicalPlans(remotePlans);
          try {
            localStorage.setItem('wali_asuh_student_medical_plans_v1', JSON.stringify(remotePlans));
          } catch {}
        }
      },
      (err) => {
        console.warn('Medical plans subscription fallback to local cache:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSaveMedicalPlan = useCallback(async (plan: StudentMedicalPlan): Promise<boolean> => {
    // Optimistic local state update
    setMedicalPlans((prev) => {
      const idx = prev.findIndex((p) => p.id === plan.id);
      const updated = idx >= 0 ? prev.map((p) => (p.id === plan.id ? plan : p)) : [plan, ...prev];
      try {
        localStorage.setItem('wali_asuh_student_medical_plans_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const ok = await saveStudentMedicalPlanToSupabase(plan);
      if (ok) {
        soundManager.playChime();
      }
      return ok;
    } catch (e) {
      console.warn('Failed to sync saved plan to Supabase:', e);
      return false;
    }
  }, []);

  const handleDeleteMedicalPlan = useCallback(async (planId: string): Promise<boolean> => {
    // Optimistic local state update
    setMedicalPlans((prev) => {
      const updated = prev.filter((p) => p.id !== planId);
      try {
        localStorage.setItem('wali_asuh_student_medical_plans_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const ok = await deleteStudentMedicalPlanFromSupabase(planId);
      if (ok) {
        soundManager.playChime();
      }
      return ok;
    } catch (e) {
      console.warn('Failed to sync deleted plan to Supabase:', e);
      return false;
    }
  }, []);

  const handleMarkMedicalPlanCompleted = useCallback(async (planId: string) => {
    let planToSave: StudentMedicalPlan | null = null;
    setMedicalPlans((prev) => {
      const updated = prev.map((p) => {
        if (p.id === planId) {
          planToSave = { ...p, status: 'selesai' as const };
          return planToSave;
        }
        return p;
      });
      try {
        localStorage.setItem('wali_asuh_student_medical_plans_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (planToSave) {
      saveStudentMedicalPlanToSupabase(planToSave).catch(console.error);
    }
  }, []);

  const handleRefreshMedicalPlansFromServer = useCallback(async (): Promise<{ success: boolean; count: number; plans: StudentMedicalPlan[] }> => {
    try {
      const latest = await fetchStudentMedicalPlansFromSupabase();
      if (latest !== null) {
        setMedicalPlans(latest);
        try {
          localStorage.setItem('wali_asuh_student_medical_plans_v1', JSON.stringify(latest));
        } catch {}
        soundManager.playChime();
        return { success: true, count: latest.length, plans: latest };
      }
      return { success: false, count: 0, plans: [] };
    } catch (err) {
      console.warn('Failed to manually sync medical plans:', err);
      throw err;
    }
  }, []);

  // Customizable SOP checklist tasks state (persisted in Supabase & localStorage)
  const [sopTasks, setSopTasks] = useState<DailyTask[]>(() => {
    try {
      const saved = localStorage.getItem('wali_asuh_sop_tasks_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return SHIFT_TASKS_TEMPLATE;
  });

  // Realtime subscription to SOP checklist tasks from Supabase
  useEffect(() => {
    const unsubscribe = subscribeToSopTasks(
      (remoteTasks) => {
        if (remoteTasks && remoteTasks.length > 0) {
          setSopTasks(remoteTasks);
          try {
            localStorage.setItem('wali_asuh_sop_tasks_v1', JSON.stringify(remoteTasks));
          } catch {}
        }
      },
      (err) => {
        console.warn('SOP tasks subscription fallback to local cache:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  // Handler to save SOP tasks to Supabase
  const handleSaveSopTasks = useCallback(async (updatedTasks: DailyTask[]) => {
    setSopTasks(updatedTasks);
    try {
      localStorage.setItem('wali_asuh_sop_tasks_v1', JSON.stringify(updatedTasks));
    } catch {}
    await saveSopTasksToSupabase(updatedTasks, 'Admin');
  }, []);

  // Handler to reset SOP tasks to default template
  const handleResetSopTasks = useCallback(async () => {
    setSopTasks(SHIFT_TASKS_TEMPLATE);
    try {
      localStorage.setItem('wali_asuh_sop_tasks_v1', JSON.stringify(SHIFT_TASKS_TEMPLATE));
    } catch {}
    await saveSopTasksToSupabase(SHIFT_TASKS_TEMPLATE, 'Admin Reset');
  }, []);

  // Selected month state (defaults to October 2026 or saved active month)
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number; monthName: string }>(() => {
    try {
      const saved = localStorage.getItem('active_schedule_month');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.year && parsed.month) {
          const m = Number(parsed.month);
          const y = Number(parsed.year);
          return {
            year: y,
            month: m,
            monthName: INDONESIAN_MONTH_NAMES[m - 1] || parsed.monthName || 'Oktober',
          };
        }
      }
    } catch {}
    return { year: 2026, month: 10, monthName: 'Oktober' };
  });

  // Cloud database status
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'syncing' | 'offline' | 'error'>('syncing');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [refreshToast, setRefreshToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const isCloudSyncedRef = React.useRef<boolean>(false);
  const isIncomingRemoteUpdateRef = React.useRef<boolean>(false);
  const lastSyncedScheduleHashRef = React.useRef<string>('');
  const currentUserRoleRef = React.useRef<string>(currentUserRole);

  useEffect(() => {
    currentUserRoleRef.current = currentUserRole;
  }, [currentUserRole]);

  // Schedule state
  const [schedule, setSchedule] = useState<MonthSchedule>(() => {
    return getInitialScheduleForMonth(selectedMonth.year, selectedMonth.month);
  });

  // Master staff directory state (persisted in localStorage & Supabase, respecting permanent deletions)
  const [masterStaffList, setMasterStaffList] = useState<Staff[]>(() => {
    return getLocalStaffList();
  });

  // Real-time listener and initial cloud sync for master staff directory changes in Supabase
  useEffect(() => {
    fetchStaffListFromSupabase()
      .then((remoteList) => {
        if (Array.isArray(remoteList) && remoteList.length > 0) {
          setMasterStaffList(remoteList);
        }
      })
      .catch(() => {});

    const unsubStaff = subscribeToStaffList((remoteList) => {
      if (Array.isArray(remoteList) && remoteList.length > 0) {
        setMasterStaffList(remoteList);
      }
    });
    return () => unsubStaff();
  }, []);

  // Active month's staff roster derived from schedule.staffList, falling back to month baseline or master
  const staffList = React.useMemo(() => {
    if (schedule.staffList && schedule.staffList.length > 0) {
      return schedule.staffList;
    }
    if (schedule.month === 9) return SEPTEMBER_2026_STAFF_LIST;
    if (schedule.month === 10) return OCTOBER_2026_STAFF_LIST;
    return masterStaffList;
  }, [schedule.staffList, schedule.month, masterStaffList]);

  // Selected staff profile
  const [selectedStaffId, setSelectedStaffId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('active_staff_id');
      return saved ? Number(saved) : 1;
    } catch {
      return 1;
    }
  });

  // Active selected day in schedule
  const [activeDay, setActiveDay] = useState<number>(() => {
    const now = new Date();
    const day = now.getDate();
    return day >= 1 && day <= 31 ? day : 1;
  });

  // Auto-sync Supabase configuration across all devices
  useEffect(() => {
    const unsub = initSupabaseGlobalSync(() => {
      setCloudStatus('connected');
    });
    return () => unsub();
  }, []);

  // Real-time Supabase subscription for the active month (Always Online Direct)
  useEffect(() => {
    setCloudStatus('syncing');
    const unsubscribe = subscribeToSupabaseSchedule(
      selectedMonth.year,
      selectedMonth.month,
      (cloudData) => {
        if (cloudData && cloudData.days && Object.keys(cloudData.days).length > 0) {
          setSchedule((prev) => {
            // Never overwrite a newer local schedule edit with an older cloud snapshot
            const localSavedMs = getLatestLocalScheduleTimestamp(selectedMonth.year, selectedMonth.month);
            const prevMs = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
            const effectiveLocalMs = Math.max(localSavedMs, isNaN(prevMs) ? 0 : prevMs);

            if (effectiveLocalMs > 0 && cloudData.updatedAt) {
              const cloudTime = new Date(cloudData.updatedAt).getTime();
              if (!isNaN(cloudTime) && effectiveLocalMs > cloudTime) {
                return prev;
              }
            }

            isIncomingRemoteUpdateRef.current = true;
            const currentStaff =
              cloudData.staffList && cloudData.staffList.length > 0
                ? cloudData.staffList
                : prev.staffList && prev.staffList.length > 0
                ? prev.staffList
                : staffList;

            lastSyncedScheduleHashRef.current = JSON.stringify({
              days: cloudData.days,
              staffList: currentStaff.map((s) => s.id)
            });

            const resolvedDays = resolveScheduleDays(
              cloudData.days,
              selectedMonth.year,
              selectedMonth.month,
              currentStaff
            );

            const canonicalMonthName = INDONESIAN_MONTH_NAMES[selectedMonth.month - 1] || 'Oktober';
            const canonicalTotalDays = new Date(selectedMonth.year, selectedMonth.month, 0).getDate() || prev.totalDays || 31;

            const updatedSchedule: MonthSchedule = {
              ...prev,
              year: selectedMonth.year,
              month: selectedMonth.month,
              monthName: canonicalMonthName,
              totalDays: canonicalTotalDays,
              staffList: currentStaff,
              days: resolvedDays,
              updatedAt: cloudData.updatedAt || new Date().toISOString(),
              updatedBy: cloudData.updatedBy || 'Supabase Server',
            };

            try {
              const serialized = JSON.stringify(updatedSchedule);
              localStorage.setItem(`wali_asuh_schedule_v16_${selectedMonth.year}_${selectedMonth.month}`, serialized);
              localStorage.setItem(`wali_asuh_schedule_v15_${selectedMonth.year}_${selectedMonth.month}`, serialized);
              localStorage.setItem(`wali_asuh_schedule_v14_${selectedMonth.year}_${selectedMonth.month}`, serialized);
              localStorage.setItem(`wali_asuh_schedule_v13_${selectedMonth.year}_${selectedMonth.month}`, serialized);
            } catch {}

            return updatedSchedule;
          });
          setCloudStatus('connected');
          isCloudSyncedRef.current = true;
        } else {
          setCloudStatus('connected');
        }
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedMonth.year, selectedMonth.month]);

  // Real-time Auto-Refresh on Phone Resume / Screen Wake / Tab Switch
  useEffect(() => {
    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === 'visible') {
        if (isScheduleSaveInProgress()) {
          return;
        }
        try {
          fetchMorningPostAssignmentsFromSupabase(selectedMonth.year, selectedMonth.month).catch(() => {});
          const freshSupabase = await fetchScheduleFromSupabase(selectedMonth.year, selectedMonth.month);
          if (isScheduleSaveInProgress()) {
            return;
          }
          if (freshSupabase && freshSupabase.days && Object.keys(freshSupabase.days).length > 0) {
            setSchedule((prev) => {
              const localSavedMs = getLatestLocalScheduleTimestamp(selectedMonth.year, selectedMonth.month);
              const prevMs = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
              const effectiveLocalMs = Math.max(localSavedMs, isNaN(prevMs) ? 0 : prevMs);

              if (effectiveLocalMs > 0 && freshSupabase.updatedAt) {
                const cloudTime = new Date(freshSupabase.updatedAt).getTime();
                if (!isNaN(cloudTime) && effectiveLocalMs > cloudTime) {
                  return prev;
                }
              }

              isIncomingRemoteUpdateRef.current = true;
              const currentStaff =
                freshSupabase.staffList && freshSupabase.staffList.length > 0
                  ? freshSupabase.staffList
                  : prev.staffList || staffList;
              const resolvedDays = resolveScheduleDays(
                freshSupabase.days,
                freshSupabase.year,
                freshSupabase.month,
                currentStaff
              );
              const targetYear = freshSupabase.year || selectedMonth.year;
              const targetMonth = freshSupabase.month || selectedMonth.month;
              const canonicalMonthName = INDONESIAN_MONTH_NAMES[targetMonth - 1] || 'Oktober';
              const canonicalTotalDays = new Date(targetYear, targetMonth, 0).getDate() || prev.totalDays || 31;

              lastSyncedScheduleHashRef.current = JSON.stringify({
                days: resolvedDays,
                staffList: currentStaff.map((s) => s.id)
              });

              const updatedSchedule: MonthSchedule = {
                ...prev,
                year: targetYear,
                month: targetMonth,
                monthName: canonicalMonthName,
                totalDays: freshSupabase.totalDays || canonicalTotalDays,
                staffList: currentStaff,
                days: resolvedDays,
                updatedAt: freshSupabase.updatedAt || new Date().toISOString(),
                updatedBy: freshSupabase.updatedBy || 'Supabase Server',
              };

              try {
                const serialized = JSON.stringify(updatedSchedule);
                localStorage.setItem(`wali_asuh_schedule_v16_${targetYear}_${targetMonth}`, serialized);
                localStorage.setItem(`wali_asuh_schedule_v15_${targetYear}_${targetMonth}`, serialized);
                localStorage.setItem(`wali_asuh_schedule_v14_${targetYear}_${targetMonth}`, serialized);
                localStorage.setItem(`wali_asuh_schedule_v13_${targetYear}_${targetMonth}`, serialized);
              } catch {}

              return updatedSchedule;
            });
            setCloudStatus('connected');
          }
        } catch {}
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [selectedMonth.year, selectedMonth.month]);

  // Self-heal schedule.monthName and totalDays if any stale cache had a mismatched monthName
  useEffect(() => {
    const expectedMonthName = INDONESIAN_MONTH_NAMES[(schedule.month || 10) - 1];
    const expectedTotalDays = new Date(schedule.year || 2026, schedule.month || 10, 0).getDate();
    if (
      (expectedMonthName && schedule.monthName !== expectedMonthName) ||
      (expectedTotalDays > 0 && schedule.totalDays !== expectedTotalDays)
    ) {
      setSchedule((prev) => ({
        ...prev,
        monthName: expectedMonthName || prev.monthName,
        totalDays: expectedTotalDays || prev.totalDays,
      }));
    }
  }, [schedule.year, schedule.month, schedule.monthName, schedule.totalDays]);

  // Handler to switch month without losing data
  const handleSelectMonth = useCallback((year: number, month: number) => {
    const monthName = INDONESIAN_MONTH_NAMES[month - 1] || 'Bulan';
    const newMonthObj = { year, month, monthName };
    setSelectedMonth(newMonthObj);
    localStorage.setItem('active_schedule_month', JSON.stringify(newMonthObj));

    const newSchedule = getInitialScheduleForMonth(year, month);
    if (!newSchedule.staffList || newSchedule.staffList.length === 0) {
      newSchedule.staffList =
        month === 9
          ? SEPTEMBER_2026_STAFF_LIST
          : month === 10
          ? OCTOBER_2026_STAFF_LIST
          : masterStaffList;
    }
    setSchedule(newSchedule);

    // Adjust active day if it exceeds total days of new month
    setActiveDay((prev) => Math.min(prev, newSchedule.totalDays));

    // Ensure selected staff exists in new month's staff list
    const currentRoster = newSchedule.staffList;
    setSelectedStaffId((prevId) => {
      const exists = currentRoster.some((s) => s.id === prevId);
      return exists ? prevId : currentRoster[0]?.id || 1;
    });

    soundManager.playChime();
  }, [masterStaffList]);

  // Handlers to restore official September / October PDF baseline schedule (Admin Only)
  const handleRestoreSeptemberPdf = useCallback(async () => {
    if (currentUserRoleRef.current !== 'admin') return;
    SEPTEMBER_2026_STAFF_LIST.forEach((s) => unmarkStaffDeletedPermanently(s.id));
    setMasterStaffList((prev) => {
      const map = new Map<number, Staff>();
      prev.forEach((s) => map.set(s.id, s));
      SEPTEMBER_2026_STAFF_LIST.forEach((s) => map.set(s.id, s));
      const merged = Array.from(map.values()).sort((a, b) => a.id - b.id);
      saveStaffListToSupabase(merged, 'Restore PDF Resmi September 2026').catch(() => {});
      return merged;
    });
    const septBaseline: MonthSchedule = {
      year: 2026,
      month: 9,
      monthName: 'September',
      totalDays: 30,
      staffList: SEPTEMBER_2026_STAFF_LIST,
      days: getInitialSeptember2026Days(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'Restore PDF Resmi September 2026',
    };
    setSelectedMonth({ year: 2026, month: 9, monthName: 'September' });
    localStorage.setItem('active_schedule_month', JSON.stringify({ year: 2026, month: 9, monthName: 'September' }));
    setSchedule(septBaseline);
    try {
      localStorage.setItem('wali_asuh_schedule_v16_2026_9', JSON.stringify(septBaseline));
      localStorage.setItem('wali_asuh_schedule_v15_2026_9', JSON.stringify(septBaseline));
    } catch {}
    await saveScheduleToSupabase(septBaseline, 'Restore PDF Resmi September 2026');
    soundManager.playChime();
    setRefreshToast({ message: 'Jadwal September 2026 berhasil dikembalikan ke PDF Resmi & disinkronkan!', type: 'success' });
    setTimeout(() => setRefreshToast(null), 4000);
  }, []);

  const handleRestoreOctoberPdf = useCallback(async () => {
    if (currentUserRoleRef.current !== 'admin') return;
    OCTOBER_2026_STAFF_LIST.forEach((s) => unmarkStaffDeletedPermanently(s.id));
    setMasterStaffList((prev) => {
      const map = new Map<number, Staff>();
      prev.forEach((s) => map.set(s.id, s));
      OCTOBER_2026_STAFF_LIST.forEach((s) => map.set(s.id, s));
      const merged = Array.from(map.values()).sort((a, b) => a.id - b.id);
      saveStaffListToSupabase(merged, 'Restore PDF Resmi Oktober 2026').catch(() => {});
      return merged;
    });
    const octBaseline: MonthSchedule = {
      year: 2026,
      month: 10,
      monthName: 'Oktober',
      totalDays: 31,
      staffList: OCTOBER_2026_STAFF_LIST,
      days: getInitialOctober2026Days(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'Restore PDF Resmi Oktober 2026',
    };
    setSelectedMonth({ year: 2026, month: 10, monthName: 'Oktober' });
    localStorage.setItem('active_schedule_month', JSON.stringify({ year: 2026, month: 10, monthName: 'Oktober' }));
    setSchedule(octBaseline);
    try {
      localStorage.setItem('wali_asuh_schedule_v16_2026_10', JSON.stringify(octBaseline));
      localStorage.setItem('wali_asuh_schedule_v15_2026_10', JSON.stringify(octBaseline));
    } catch {}
    await saveScheduleToSupabase(octBaseline, 'Restore PDF Resmi Oktober 2026');
    soundManager.playChime();
    setRefreshToast({ message: 'Jadwal Oktober 2026 (55 Personel) berhasil dikembalikan ke PDF Resmi & disinkronkan!', type: 'success' });
    setTimeout(() => setRefreshToast(null), 4000);
  }, []);

  // Handler to import schedule from CSV and sync to state + localStorage + Supabase + Master Staff List
  const handleImportSchedule = useCallback((newSched: MonthSchedule) => {
    const stampedSched: MonthSchedule = {
      ...newSched,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Admin CSV Import',
    };
    if (stampedSched.year !== selectedMonth.year || stampedSched.month !== selectedMonth.month) {
      const monthName = INDONESIAN_MONTH_NAMES[stampedSched.month - 1] || 'Bulan';
      const newMonthObj = { year: stampedSched.year, month: stampedSched.month, monthName };
      setSelectedMonth(newMonthObj);
      localStorage.setItem('active_schedule_month', JSON.stringify(newMonthObj));
    }

    // Update Master Staff List with any newly added staff from the CSV
    if (stampedSched.staffList && stampedSched.staffList.length > 0) {
      stampedSched.staffList.forEach((s) => unmarkStaffDeletedPermanently(s.id));
      setMasterStaffList((prevMaster) => {
        const map = new Map<number, Staff>();
        prevMaster.forEach((s) => map.set(s.id, s));
        stampedSched.staffList!.forEach((s) => map.set(s.id, s));
        const merged = Array.from(map.values()).sort((a, b) => a.id - b.id);
        saveStaffListToSupabase(merged, 'Admin CSV Import').catch(() => {});
        return merged;
      });

      // Ensure selectedStaffId remains valid if previous staff was removed in this month's CSV
      setSelectedStaffId((prevId) => {
        const stillExists = stampedSched.staffList!.some((s) => s.id === prevId);
        return stillExists ? prevId : stampedSched.staffList![0].id;
      });
    }

    lastSyncedScheduleHashRef.current = JSON.stringify({
      days: stampedSched.days,
      staffList: (stampedSched.staffList || []).map((s) => s.id),
    });

    setSchedule(stampedSched);
    try {
      localStorage.setItem(`wali_asuh_schedule_v16_${stampedSched.year}_${stampedSched.month}`, JSON.stringify(stampedSched));
      localStorage.setItem(`wali_asuh_schedule_v15_${stampedSched.year}_${stampedSched.month}`, JSON.stringify(stampedSched));
      localStorage.setItem(`wali_asuh_schedule_v14_${stampedSched.year}_${stampedSched.month}`, JSON.stringify(stampedSched));
      localStorage.setItem(`wali_asuh_schedule_v13_${stampedSched.year}_${stampedSched.month}`, JSON.stringify(stampedSched));
    } catch (e) {
      console.warn('Failed to save imported schedule:', e);
    }
    saveScheduleToSupabase(stampedSched, 'Admin CSV Import').catch(console.error);
    setRefreshToast({
      message: `Jadwal ${stampedSched.monthName} ${stampedSched.year} (${stampedSched.staffList?.length || 0} Wali Asuh) berhasil diimpor & disinkronkan!`,
      type: 'success',
    });
    setTimeout(() => setRefreshToast(null), 4500);
  }, [selectedMonth]);

  // Save schedule to localStorage and Supabase on change
  useEffect(() => {
    try {
      localStorage.setItem(`wali_asuh_schedule_v16_${schedule.year}_${schedule.month}`, JSON.stringify(schedule));
      localStorage.setItem(`wali_asuh_schedule_v15_${schedule.year}_${schedule.month}`, JSON.stringify(schedule));
      localStorage.setItem(`wali_asuh_schedule_v14_${schedule.year}_${schedule.month}`, JSON.stringify(schedule));
      localStorage.setItem(`wali_asuh_schedule_v13_${schedule.year}_${schedule.month}`, JSON.stringify(schedule));
    } catch (e) {
      console.warn('Failed to save schedule:', e);
    }

    if (isIncomingRemoteUpdateRef.current) {
      // Incoming update arrived from Supabase real-time listener; do not echo back to cloud!
      isIncomingRemoteUpdateRef.current = false;
      return;
    }

    // Strict Role Enforcement: Only Administrator is authorized to push schedule changes to Supabase!
    // Wali Asuh is strictly read-only and must never push local state to Supabase.
    if (currentUserRoleRef.current !== 'admin') {
      return;
    }

    const currentHash = JSON.stringify({
      days: schedule.days,
      staffList: (schedule.staffList || []).map((s) => s.id)
    });
    // Only upload to Supabase if the schedule data actually changed
    if (currentHash === lastSyncedScheduleHashRef.current) {
      return;
    }

    setCloudStatus('syncing');
    const updaterName = currentUserRoleRef.current === 'admin' ? 'Administrator SRT 1' : 'Wali Asuh';
    
    // Fast debounce of 300ms so updates persist quickly
    const timer = setTimeout(() => {
      saveScheduleToSupabase(schedule, updaterName)
        .then((ok) => {
          if (ok) {
            lastSyncedScheduleHashRef.current = currentHash;
            isCloudSyncedRef.current = true;
          }
          setCloudStatus('connected');
        })
        .catch((err) => {
          console.error('Failed to sync schedule to Supabase:', err);
          setCloudStatus('connected');
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [schedule]);

  // Ensure schedule is always flushed to localStorage on window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        localStorage.setItem(`wali_asuh_schedule_v16_${schedule.year}_${schedule.month}`, JSON.stringify(schedule));
        localStorage.setItem(`wali_asuh_schedule_v15_${schedule.year}_${schedule.month}`, JSON.stringify(schedule));
      } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [schedule]);

  // Manual Force Sync handler (Push to server & open Supabase Cloud Sync Center if Admin)
  const handleForceSyncToCloud = useCallback(async () => {
    if (currentUserRoleRef.current === 'admin') {
      setIsSupabaseModalOpen(true);
    }
    try {
      setCloudStatus('syncing');
      const ok = await saveScheduleToSupabase(schedule, 'Sinkronisasi Manual');
      await saveStaffListToSupabase(masterStaffList).catch(() => {});
      await saveSopTasksToSupabase(sopTasks, 'Sinkronisasi Manual').catch(() => {});
      await saveAllStudentMedicalPlansToSupabase(medicalPlans).catch(() => {});
      await saveHandoverReportsToSupabase(getLocalHandoverReports()).catch(() => {});
      await saveAllMorningPostAssignmentsToSupabase(schedule.year, schedule.month).catch(() => {});
      setCloudStatus('connected');
      if (ok) {
        soundManager.playChime();
        setRefreshToast({ message: 'Seluruh data jadwal, personel, SOP, medis & serah terima berhasil disinkronkan ke Supabase Cloud!', type: 'success' });
      } else {
        setRefreshToast({ message: 'Jadwal tersimpan di sistem lokal & cloud.', type: 'info' });
      }
    } catch {
      setCloudStatus('connected');
      setRefreshToast({ message: 'Jadwal diperbarui di sistem.', type: 'info' });
    } finally {
      setTimeout(() => setRefreshToast(null), 3500);
    }
  }, [schedule, masterStaffList, sopTasks, medicalPlans]);

  // Direct Fetch handler (Pull latest data from server - Always Online)
  const handleRefreshDataFromServer = useCallback(async () => {
    setIsRefreshing(true);
    setCloudStatus('syncing');
    try {
      const [supabaseData, latestStaffList] = await Promise.all([
        fetchScheduleFromSupabase(selectedMonth.year, selectedMonth.month),
        fetchStaffListFromSupabase().catch(() => null),
        fetchMorningPostAssignmentsFromSupabase(selectedMonth.year, selectedMonth.month).catch(() => null),
        fetchP5TaskOptionsFromSupabase().catch(() => null),
        fetchHandoverReportsFromSupabase().catch(() => null),
      ]);

      if (latestStaffList && Array.isArray(latestStaffList) && latestStaffList.length > 0) {
        setMasterStaffList(latestStaffList);
      }

      if (supabaseData && supabaseData.days && Object.keys(supabaseData.days).length > 0) {
        isIncomingRemoteUpdateRef.current = true;
        const currentStaff =
          supabaseData.staffList && supabaseData.staffList.length > 0
            ? supabaseData.staffList
            : schedule.staffList;
        const resolvedDays = resolveScheduleDays(
          supabaseData.days,
          supabaseData.year,
          supabaseData.month,
          currentStaff
        );
        const canonicalRefreshMonthName =
          INDONESIAN_MONTH_NAMES[(supabaseData.month || selectedMonth.month) - 1] ||
          supabaseData.monthName ||
          schedule.monthName;
        const canonicalRefreshTotalDays =
          new Date(supabaseData.year || selectedMonth.year, supabaseData.month || selectedMonth.month, 0).getDate() ||
          supabaseData.totalDays ||
          schedule.totalDays;
        const updatedSched: MonthSchedule = {
          ...schedule,
          year: supabaseData.year,
          month: supabaseData.month,
          monthName: canonicalRefreshMonthName,
          totalDays: canonicalRefreshTotalDays,
          staffList: currentStaff,
          days: resolvedDays,
          updatedAt: supabaseData.updatedAt || new Date().toISOString(),
          updatedBy: supabaseData.updatedBy || 'Supabase Server',
        };
        setSchedule(updatedSched);
        try {
          const serialized = JSON.stringify(updatedSched);
          localStorage.setItem(`wali_asuh_schedule_v16_${supabaseData.year}_${supabaseData.month}`, serialized);
          localStorage.setItem(`wali_asuh_schedule_v15_${supabaseData.year}_${supabaseData.month}`, serialized);
          localStorage.setItem(`wali_asuh_schedule_v14_${supabaseData.year}_${supabaseData.month}`, serialized);
          localStorage.setItem(`wali_asuh_schedule_v13_${supabaseData.year}_${supabaseData.month}`, serialized);
        } catch {}
        setCloudStatus('connected');
        soundManager.playChime();
        setRefreshToast({ message: 'Data terbaru berhasil disinkronkan dari Supabase Cloud!', type: 'success' });
      } else {
        setCloudStatus('connected');
        soundManager.playChime();
        setRefreshToast({ message: 'Jadwal terbaru perangkat aktif dan siap digunakan.', type: 'info' });
      }

      // Also refresh SOP checklist tasks from Supabase
      try {
        const latestSop = await fetchSopTasksFromSupabase();
        if (latestSop && latestSop.length > 0) {
          setSopTasks(latestSop);
          try {
            localStorage.setItem('wali_asuh_sop_tasks_v1', JSON.stringify(latestSop));
          } catch {}
        }
      } catch (sopErr) {
        console.warn('Could not refresh SOP tasks during manual fetch:', sopErr);
      }

      // Also refresh Student Medical Plans from Supabase
      try {
        const latestPlans = await fetchStudentMedicalPlansFromSupabase();
        if (latestPlans && latestPlans.length > 0) {
          setMedicalPlans(latestPlans);
        }
      } catch (medErr) {
        console.warn('Could not refresh medical plans during manual fetch:', medErr);
      }
    } catch (err) {
      console.error('Error fetching schedule from server:', err);
      setCloudStatus('offline');
      setRefreshToast({ message: 'Data dimuat dari penyimpanan lokal perangkat.', type: 'info' });
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
      setTimeout(() => setRefreshToast(null), 3500);
    }
  }, [selectedMonth.year, selectedMonth.month, schedule]);

  // Ensure any legacy single letters 'P', 'S', 'M' are mapped 1-to-1 without touching explicit codes
  useEffect(() => {
    let hasLegacy = false;
    for (const day in schedule.days) {
      for (const staffId in schedule.days[day]) {
        const val = schedule.days[day][staffId];
        if (
          val === 'P' ||
          val === 'S' ||
          val === 'M' ||
          (val as unknown as string) === 'S2B' ||
          (val as unknown as string) === 'S3B'
        ) {
          hasLegacy = true;
          break;
        }
      }
      if (hasLegacy) break;
    }

    if (hasLegacy) {
      const updatedDays = resolveScheduleDays(
        schedule.days,
        schedule.year,
        schedule.month,
        schedule.staffList
      );
      setSchedule((prev) => ({
        ...prev,
        days: updatedDays,
      }));
    }
  }, [schedule.days, schedule.year, schedule.month, schedule.staffList]);

  // Sync dark mode class with HTML element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme_dark', JSON.stringify(darkMode));
    } catch {}
  }, [darkMode]);

  // Sync active staff to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('active_staff_id', String(selectedStaffId));
    } catch {}
  }, [selectedStaffId]);

  // Sync sound setting
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
    try {
      localStorage.setItem('sound_enabled', JSON.stringify(soundEnabled));
    } catch {}
  }, [soundEnabled]);

  // Compute active shift text for the navbar
  const [activeShiftTitle, setActiveShiftTitle] = useState<string>('Shif Aktif');
  useEffect(() => {
    const updateActiveShift = () => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const activeCodes = getActiveShiftsAtTime(timeStr);
      if (activeCodes.includes('M')) {
        setActiveShiftTitle('🌙 Shif Malam Aktif');
      } else if (activeCodes.includes('S')) {
        setActiveShiftTitle('🌅 Shif Sore Aktif');
      } else if (activeCodes.includes('P') || activeCodes.includes('P2') || activeCodes.includes('P3')) {
        setActiveShiftTitle('☀️ Shif Pagi Aktif');
      } else {
        setActiveShiftTitle('Standby Operasional');
      }
    };
    updateActiveShift();
    const interval = setInterval(updateActiveShift, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle Login Success
  const handleLoginSuccess = (role: 'admin' | 'staff') => {
    setIsAuthenticated(true);
    setCurrentUserRole(role);
    if (role === 'admin') {
      setCurrentTab('admin');
    } else {
      setCurrentTab('dashboard');
    }
  };

  // Handle Logout
  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem('sr_auth_session');
      sessionStorage.removeItem('sr_auth_session');
    } catch {}
    setIsAuthenticated(false);
    setCurrentUserRole('staff');
    setCurrentTab('dashboard');
  }, []);

  return (
    <>
      {/* Native-style Mobile & Web Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen 
            onFinish={() => setShowSplash(false)} 
            minDuration={2400}
          />
        )}
      </AnimatePresence>

      {/* Gated: Show Login Page if not authenticated */}
      {!isAuthenticated ? (
        <LoginPage 
          onLoginSuccess={handleLoginSuccess} 
          onShowSplash={() => setShowSplash(true)}
        />
      ) : (
        <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans selection:bg-blue-500 selection:text-white">
          {/* Header & Main Navigation */}
          <Navbar
            userRole={currentUserRole}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            staffList={staffList}
            selectedStaffId={selectedStaffId}
            setSelectedStaffId={setSelectedStaffId}
            selectedMonth={selectedMonth}
            onSelectMonth={handleSelectMonth}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            activeShiftTitle={activeShiftTitle}
            onLogout={handleLogout}
            cloudStatus={cloudStatus}
            onForceSyncToCloud={handleForceSyncToCloud}
            onShowSplash={() => setShowSplash(true)}
            isRefreshing={isRefreshing}
            onRefreshServer={handleRefreshDataFromServer}
            onRestoreSeptemberPdf={currentUserRole === 'admin' ? handleRestoreSeptemberPdf : undefined}
            onRestoreOctoberPdf={currentUserRole === 'admin' ? handleRestoreOctoberPdf : undefined}
            medicalNotificationCount={(() => {
              const padTwo = (n: number) => String(n).padStart(2, '0');
              const activeTodayKey = `${schedule.year}-${padTwo(schedule.month)}-${padTwo(activeDay)}`;
              const nextDayNum = activeDay < schedule.totalDays ? activeDay + 1 : 1;
              const activeTomorrowKey = `${schedule.year}-${padTwo(schedule.month)}-${padTwo(nextDayNum)}`;
              
              const now = new Date();
              const realTodayStr = `${now.getFullYear()}-${padTwo(now.getMonth() + 1)}-${padTwo(now.getDate())}`;
              const realTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
              const realTomorrowStr = `${realTomorrow.getFullYear()}-${padTwo(realTomorrow.getMonth() + 1)}-${padTwo(realTomorrow.getDate())}`;

              return medicalPlans.filter(
                (p) => p.status === 'rencana' && (
                  p.date === activeTodayKey || 
                  p.date === activeTomorrowKey ||
                  p.date === realTodayStr ||
                  p.date === realTomorrowStr
                )
              ).length;
            })()}
            onOpenMedicalNotifications={() => setIsMedicalNotificationsOpen(true)}
            onOpenActiveShiftModal={() => {
              setIsActiveShiftModalOpen(true);
              recordTwoHourShiftPopupShown();
              soundManager.playChime();
            }}
          />

          {/* Floating Cloud Refresh Toast Notification */}
          {refreshToast && (
            <div 
              role="status"
              aria-live="polite"
              className="fixed top-12 sm:top-14 right-3 sm:right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-none"
            >
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-xl border text-xs font-semibold backdrop-blur-md ${
                refreshToast.type === 'success'
                  ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700 shadow-emerald-950/40'
                  : refreshToast.type === 'error'
                  ? 'bg-rose-950/90 text-rose-200 border-rose-700 shadow-rose-950/40'
                  : 'bg-blue-950/90 text-blue-200 border-blue-700 shadow-blue-950/40'
              }`}>
                {refreshToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {refreshToast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                {refreshToast.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-400 shrink-0" />}
                <span>{refreshToast.message}</span>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 w-full max-w-[1680px] mx-auto px-2 sm:px-4 py-2 sm:py-3 space-y-2.5">
            {currentTab === 'dashboard' && (
              <TodayDashboard
                schedule={schedule}
                staffList={staffList}
                selectedStaffId={selectedStaffId}
                activeDay={activeDay}
                setActiveDay={setActiveDay}
                onNavigateToTab={(tab) => setCurrentTab(tab as any)}
                sopTasks={sopTasks}
                userRole={currentUserRole}
                medicalPlans={medicalPlans}
                onOpenMedicalModal={() => setIsMedicalNotificationsOpen(true)}
                onOpenActiveShiftModal={() => {
                  setIsActiveShiftModalOpen(true);
                  recordTwoHourShiftPopupShown();
                  soundManager.playChime();
                }}
              />
            )}

            {currentTab === 'matrix' && (
              <ScheduleMatrix
                userRole={currentUserRole}
                schedule={schedule}
                setSchedule={setSchedule}
                staffList={staffList}
                masterStaffList={masterStaffList}
                selectedStaffId={selectedStaffId}
                setSelectedStaffId={setSelectedStaffId}
                activeDay={activeDay}
                setActiveDay={setActiveDay}
                onOpenPrint={() => setCurrentTab('print')}
                onOpenAuto={() => setCurrentTab('auto')}
                onOpenAdminSwap={() => setCurrentTab('admin')}
                onImportSchedule={handleImportSchedule}
                onOpenStaffManagement={() => setCurrentTab('staff-management')}
              />
            )}

            {currentTab === 'codeguide' && (
              <CodeGuideView
                onNavigateToTab={(tab) => setCurrentTab(tab as any)}
              />
            )}

            {currentTab === 'personal' && (
              <PersonalSchedule
                schedule={schedule}
                staffList={staffList}
                selectedStaffId={selectedStaffId}
                setSelectedStaffId={setSelectedStaffId}
                activeDay={activeDay}
                setActiveDay={setActiveDay}
                onNavigateToTab={(tab) => setCurrentTab(tab as any)}
                sopTasks={sopTasks}
              />
            )}

            {currentTab === 'medical' && (
              <StudentMedicalView
                plans={medicalPlans}
                onSavePlan={handleSaveMedicalPlan}
                onDeletePlan={handleDeleteMedicalPlan}
                staffList={staffList}
                selectedStaffId={selectedStaffId}
                cloudStatus={cloudStatus}
                onRefreshFromServer={handleRefreshMedicalPlansFromServer}
                scheduleYear={schedule.year}
                scheduleMonth={schedule.month}
                activeScheduleDay={activeDay}
              />
            )}

            {currentTab === 'admin' && currentUserRole === 'admin' && (
              <AdminShiftSwapView
                schedule={schedule}
                setSchedule={setSchedule}
                staffList={staffList}
                activeDay={activeDay}
                setActiveDay={setActiveDay}
                onNavigateToMatrix={() => setCurrentTab('matrix')}
                onNavigateToDashboard={() => setCurrentTab('dashboard')}
              />
            )}

            {currentTab === 'leave' && currentUserRole === 'admin' && (
              <LeaveManagementView
                schedule={schedule}
                setSchedule={setSchedule}
                staffList={staffList}
                activeDay={activeDay}
                setActiveDay={setActiveDay}
                userRole={currentUserRole}
                onNavigateToMatrix={() => setCurrentTab('matrix')}
                onNavigateToDashboard={() => setCurrentTab('dashboard')}
              />
            )}

            {currentTab === 'staff-management' && currentUserRole === 'admin' && (
              <StaffManagementView
                schedule={schedule}
                setSchedule={setSchedule}
                masterStaffList={masterStaffList}
                setMasterStaffList={setMasterStaffList}
                selectedMonth={selectedMonth}
                onSelectMonth={handleSelectMonth}
                onNavigateToMatrix={() => setCurrentTab('matrix')}
                onNavigateToDashboard={() => setCurrentTab('dashboard')}
                selectedStaffId={selectedStaffId}
                setSelectedStaffId={setSelectedStaffId}
                onImportSchedule={handleImportSchedule}
              />
            )}

            {currentTab === 'sop' && currentUserRole === 'admin' && (
              <AdminChecklistConfigView
                tasks={sopTasks}
                onSaveTasks={handleSaveSopTasks}
                onResetToDefault={handleResetSopTasks}
                onNavigateToDashboard={() => setCurrentTab('dashboard')}
                cloudStatus={cloudStatus}
              />
            )}

            {currentTab === 'auto' && (
              <AutoSchedulerView
                schedule={schedule}
                setSchedule={setSchedule}
                staffList={staffList}
                onNavigateToMatrix={() => setCurrentTab('matrix')}
                onSelectMonth={handleSelectMonth}
              />
            )}

            {currentTab === 'notifications' && (
              <NotificationSettings
                soundEnabled={soundEnabled}
                setSoundEnabled={setSoundEnabled}
                onShowSplash={() => setShowSplash(true)}
                selectedStaffId={selectedStaffId}
                staffList={staffList}
                schedule={schedule}
              />
            )}

            {currentTab === 'print' && (
              <PrintReportModal
                schedule={schedule}
                staffList={staffList}
                onClose={() => setCurrentTab('matrix')}
              />
            )}

            {currentTab === 'handover' && (
              <HandoverReportView
                schedule={schedule}
                staffList={staffList}
                selectedStaffId={selectedStaffId}
                activeDay={activeDay}
                setActiveDay={setActiveDay}
                userRole={currentUserRole}
              />
            )}

            {currentTab === 'assignment' && (
              <AssignmentReminderView
                schedule={schedule}
                staffList={staffList}
                selectedStaffId={selectedStaffId}
                activeDay={activeDay}
                setActiveDay={setActiveDay}
                onNavigateToTab={(tab) => setCurrentTab(tab as any)}
              />
            )}

            {currentTab === 'portfolio' && (
              <StudentPortfolioView
                medicalPlans={medicalPlans}
                staffList={staffList}
                selectedStaffId={selectedStaffId}
                onNavigateToTab={(tab) => setCurrentTab(tab as any)}
                onOpenNewMedicalPlanForStudent={(name, cls) => {
                  setCurrentTab('medical');
                }}
              />
            )}
          </main>

          {/* Footer */}
          <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-4 text-center text-[11px] text-slate-500 dark:text-slate-400 print:hidden">
            <div className="max-w-[1680px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
              <span>
                © 2026 <strong>SRT 1 Kab Kediri</strong> • Kementerian Sosial RI
              </span>
              <span className="text-[10px] text-slate-400">
                Sistem Otomasi Shif & Notifikasi Tugas Wali Asuh
              </span>
            </div>
          </footer>

          {/* PWA Floating Install Banner at the bottom */}
          <PWAInstallBanner />

          {/* Modal Pop-up Notifikasi Rencana Berobat Siswa (UKS, Puskesmas, RS) */}
          <MedicalNotificationsModal
            isOpen={isMedicalNotificationsOpen}
            onClose={() => setIsMedicalNotificationsOpen(false)}
            plans={medicalPlans}
            referenceDate={`${schedule.year}-${String(schedule.month).padStart(2, '0')}-${String(activeDay).padStart(2, '0')}`}
            onOpenFullMedicalView={() => {
              setIsMedicalNotificationsOpen(false);
              setCurrentTab('medical');
            }}
            onMarkPlanCompleted={handleMarkMedicalPlanCompleted}
          />

          {/* Modal Pop-up Shif Aktif Setiap 2 Jam Sekali (Pagi / Sore / Malam) */}
          <ActiveShiftModal
            isOpen={isActiveShiftModalOpen}
            onClose={() => setIsActiveShiftModalOpen(false)}
            schedule={schedule}
            staffList={staffList}
            selectedStaffId={selectedStaffId}
            onNavigateToTab={(tab) => setCurrentTab(tab as any)}
          />

          {/* Modal Sinkronisasi & Migrasi Database Supabase Cloud */}
          {isSupabaseModalOpen && (
            <SupabaseMigrationModal
              schedule={schedule}
              staffList={masterStaffList}
              onClose={() => setIsSupabaseModalOpen(false)}
              onSuccessSync={(syncedSchedule) => {
                if (syncedSchedule && syncedSchedule.days && Object.keys(syncedSchedule.days).length > 0) {
                  setSchedule(syncedSchedule);
                }
                setCloudStatus('connected');
                setRefreshToast({ message: 'Sinkronisasi penuh dengan Supabase Cloud selesai!', type: 'success' });
                setTimeout(() => setRefreshToast(null), 3500);
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
