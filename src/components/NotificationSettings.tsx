import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  Volume2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles, 
  Play, 
  Sliders,
  Smartphone,
  Radio,
  RefreshCw,
  Send,
  Zap,
  Info,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  XCircle,
  Key
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { notificationService } from '../utils/notification';
import { 
  webPushService, 
  getDeviceInfo, 
  ScheduledPushAlarm, 
  VAPID_PUBLIC_KEY 
} from '../utils/webPushService';
import { MonthSchedule, Staff } from '../types';
import { SHIFT_DEFINITIONS } from '../data/initialSchedule';

interface NotificationSettingsProps {
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  onShowSplash?: () => void;
  selectedStaffId?: number;
  staffList?: Staff[];
  schedule?: MonthSchedule | null;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  soundEnabled,
  setSoundEnabled,
  onShowSplash,
  selectedStaffId,
  staffList = [],
  schedule,
}) => {
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [selectedSound, setSelectedSound] = useState<'bell' | 'chime' | 'digital' | 'gong'>('bell');
  const [shiftStartOffset, setShiftStartOffset] = useState<number>(30); // 30 minutes before
  const [handoverReminder, setHandoverReminder] = useState<boolean>(true);
  const [taskAlarmsEnabled, setTaskAlarmsEnabled] = useState<boolean>(true);
  const [m3PatrolAlert, setM3PatrolAlert] = useState<boolean>(true);
  const [p4DinnerAlert, setP4DinnerAlert] = useState<boolean>(true);
  const [testSentToast, setTestSentToast] = useState<string | null>(null);

  // Web Push API states
  const [isPushSupported, setIsPushSupported] = useState<boolean>(true);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; isMobile: boolean; isStandalone: boolean }>({
    name: 'Mendeteksi perangkat...',
    isMobile: false,
    isStandalone: false,
  });
  const [scheduledAlarms, setScheduledAlarms] = useState<ScheduledPushAlarm[]>([]);
  const [isSyncingAlarms, setIsSyncingAlarms] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);

  // Detect current staff info & shift today
  const activeStaff = staffList.find((s) => s.id === selectedStaffId) || staffList[0];
  const todayDay = new Date().getDate();
  const todayShiftCode = schedule?.days[todayDay]?.shifts[activeStaff?.id ?? 0] || 'P1';
  const shiftInfo = (SHIFT_DEFINITIONS as any)[todayShiftCode];

  // Initial load
  useEffect(() => {
    setIsPushSupported(webPushService.isSupported());
    setPermissionStatus(notificationService.getPermissionStatus());
    setDeviceInfo(getDeviceInfo());

    // Check existing subscription
    webPushService.getSubscription().then((sub) => {
      setIsSubscribed(!!sub || webPushService.hasLocalSubscription());
    });

    // Load locally saved scheduled alarms
    if (activeStaff?.id) {
      const saved = localStorage.getItem(`scheduled_alarms_${activeStaff.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setScheduledAlarms(parsed);
        } catch {
          // Ignore
        }
      }
    }
  }, [activeStaff?.id]);

  // Request browser permission
  const handleRequestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setPermissionStatus(notificationService.getPermissionStatus());
    if (granted) {
      soundManager.playChime();
      notificationService.triggerNotification('Izin Notifikasi Aktif!', {
        body: 'Sistem pengingat tugas & shif wali asuh siap mengirimkan alarm ke perangkat Anda.',
        sound: selectedSound,
      });
      showToast('Izin notifikasi peramban berhasil diaktifkan!');
    }
  };

  // Subscribe to Web Push
  const handleSubscribePush = async () => {
    setIsSubscribing(true);
    const result = await webPushService.subscribeUser(activeStaff?.id, activeStaff?.name);
    setIsSubscribing(false);

    if (result.success) {
      setIsSubscribed(true);
      setPermissionStatus('granted');
      soundManager.playChime();
      showToast('Perangkat berhasil didaftarkan ke Web Push API!');
      // Auto sync shift alarms for today
      handleSyncShiftAlarms();
    } else {
      showToast(result.error || 'Gagal mengaktifkan Web Push.');
    }
  };

  // Unsubscribe from Web Push
  const handleUnsubscribePush = async () => {
    const result = await webPushService.unsubscribeUser();
    if (result.success) {
      setIsSubscribed(false);
      setScheduledAlarms([]);
      showToast('Pendaftaran Web Push berhasil dinonaktifkan.');
    } else {
      showToast(result.error || 'Gagal membatalkan langganan Web Push.');
    }
  };

  // Sync Shift Alarms for Today
  const handleSyncShiftAlarms = async () => {
    if (!activeStaff) return;
    setIsSyncingAlarms(true);
    try {
      const result = await webPushService.scheduleShiftAlarms(
        activeStaff.id,
        activeStaff.name,
        todayShiftCode
      );
      setScheduledAlarms(result.alarms);
      soundManager.playChime();
      showToast(`Berhasil menyinkronkan ${result.alarms.length} jadwal pengingat tugas shif ${todayShiftCode} ke latar belakang!`);
    } catch (e: any) {
      showToast('Gagal menyinkronkan pengingat ke Service Worker.');
    } finally {
      setIsSyncingAlarms(false);
    }
  };

  // Test Web Push with 5s countdown
  const handleTestBackgroundPush = async () => {
    setCountdownSeconds(5);
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    const res = await webPushService.triggerTestBackgroundPush(5);
    if (!res.success) {
      clearInterval(interval);
      setCountdownSeconds(null);
      showToast(res.message);
    }
  };

  const handlePreviewSound = (sound: 'bell' | 'chime' | 'digital' | 'gong') => {
    setSelectedSound(sound);
    soundManager.playSound(sound);
  };

  const handleTestNotification = () => {
    notificationService.triggerNotification('⏰ Pengingat Tugas Wali Asuh', {
      body: `[Uji Coba] Petugas: ${activeStaff?.name || 'Wali Asuh'} | Shif: ${todayShiftCode}. Persiapan apel & monitoring santri.`,
      sound: selectedSound,
    });
    showToast('Notifikasi uji coba dan nada dering berhasil dibunyikan!');
  };

  const showToast = (msg: string) => {
    setTestSentToast(msg);
    setTimeout(() => setTestSentToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-sm">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Pusat Integrasi Web Push & Notifikasi Shif
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  W3C Push API
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kirim pengingat tugas harian dan alarm shif langsung ke layar perangkat Anda bahkan saat aplikasi ditutup
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleTestNotification}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold text-xs transition-colors cursor-pointer"
            title="Uji coba notifikasi lokal langsung"
          >
            <Bell className="w-3.5 h-3.5 text-blue-600" />
            <span>Tes Notifikasi Tab</span>
          </button>

          <button
            onClick={handleTestBackgroundPush}
            disabled={countdownSeconds !== null}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            title="Uji notifikasi latar belakang dengan jeda 5 detik untuk mencoba menutup browser"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>{countdownSeconds !== null ? `Memicu (${countdownSeconds}s)...` : 'Tes Web Push Latar Belakang'}</span>
          </button>
        </div>
      </div>

      {/* Floating Alert / Toast */}
      {testSentToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-2 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{testSentToast}</span>
          </div>
          <button onClick={() => setTestSentToast(null)} className="text-emerald-600 hover:text-emerald-800 text-xs font-bold">
            Tutup
          </button>
        </div>
      )}

      {/* Countdown Progress Banner for Background Push Testing */}
      {countdownSeconds !== null && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border-2 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-bold text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <span>Percobaan Web Push Background Sedang Berjalan: {countdownSeconds} detik tersisa</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 font-bold">
              Hitung Mundur {countdownSeconds}s
            </span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 mb-3 leading-relaxed">
            👉 <strong>Langkah Pengujian:</strong> Segera <strong>minimalkan</strong> atau <strong>tutup sementara tab browser</strong> ini sekarang. Service Worker di perangkat Anda akan membunyikan alarm dan memunculkan pop-up notifikasi sistem di HP / Laptop Anda tepat saat hitungan habis.
          </p>
          <div className="w-full bg-amber-200 dark:bg-amber-900/80 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-500 h-2 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${((5 - countdownSeconds) / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* SECTION 1: Dedicated Web Push Notification API Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>Status Sambungan Web Push Perangkat</span>
                <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                  (Push Service Daemon)
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Perangkat: <span className="font-semibold text-slate-700 dark:text-slate-300">{deviceInfo.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSubscribed ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Web Push Aktif</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Belum Terhubung</span>
              </span>
            )}
          </div>
        </div>

        {/* Status Explanation & Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Tetap Berjalan Offline</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Menerima alarm penugasan bahkan saat aplikasi sedang tidak dibuka di browser atau handphone dalam mode terkunci.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-blue-500" />
              <span>Sinkron Jadwal Shif</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Otomatis menyesuaikan jam alarm berdasarkan kode shif Anda ({todayShiftCode}) termasuk shif khusus P4 dan M3.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Aksi Cepat Tray Notifikasi</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Tombol pintas &ldquo;Buka Jadwal&rdquo; langsung mengarahkan Anda ke dashboard tugas saat notifikasi diklik.
            </p>
          </div>
        </div>

        {/* Action Controls for Web Push */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {!isSubscribed ? (
            <button
              onClick={handleSubscribePush}
              disabled={isSubscribing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubscribing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mendaftarkan ke Push Service...</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4" />
                  <span>Daftarkan Perangkat Ini ke Web Push API</span>
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleSyncShiftAlarms}
                disabled={isSyncingAlarms}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingAlarms ? 'animate-spin' : ''}`} />
                <span>Sinkronkan Pengingat Shif ({todayShiftCode}) ke Latar Belakang</span>
              </button>

              <button
                onClick={handleUnsubscribePush}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/60 dark:hover:text-rose-300 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Batalkan Pendaftaran Web Push</span>
              </button>
            </>
          )}

          <button
            onClick={() => setShowTechDetails(!showTechDetails)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 ml-auto font-medium"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Info Teknis VAPID &amp; Push API</span>
            {showTechDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Technical VAPID & Diagnostic Panel (Collapsible) */}
        {showTechDetails && (
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs space-y-2 font-mono overflow-x-auto">
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 font-bold font-sans">
              <span>Rincian Enkripsi Web Push (VAPID RFC 8292):</span>
              <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 font-mono">P-256 NIST Curve Valid</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">VAPID Public Key:</span>
              <p className="break-all text-[10px] text-slate-500 bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 mt-1">
                {VAPID_PUBLIC_KEY}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Service Worker File:</span>{' '}
                <code className="text-blue-600 dark:text-blue-400 font-mono">/sw-push.js</code>
              </div>
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Tabel Supabase:</span>{' '}
                <code className="text-indigo-600 dark:text-indigo-400 font-mono">push_subscriptions</code>
              </div>
            </div>
          </div>
        )}

        {/* Scheduled Alarms Queue Section */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                Daftar Alarm Tugas Shif Terjadwal di Perangkat Anda:
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {scheduledAlarms.length > 0 ? `${scheduledAlarms.length} alarm aktif` : 'Belum ada alarm tersinkron'}
            </span>
          </div>

          {scheduledAlarms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {scheduledAlarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 flex items-start gap-2.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <BellRing className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {alarm.title}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                        {alarm.targetTimeStr}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {alarm.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pengingat tugas shif {activeStaff?.name} ({todayShiftCode}) belum disinkronkan ke Service Worker perangkat ini.
              </p>
              <button
                onClick={handleSyncShiftAlarms}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 text-xs font-bold transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Sinkronkan Agenda Tugas Hari Ini ({todayShiftCode})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Browser Notification Permissions & Sound Chime Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 1: Browser Notification & Sound Setting */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Izin Notifikasi Web &amp; Desktop
              </h3>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                permissionStatus === 'granted'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {permissionStatus === 'granted' ? 'Izin Aktif' : 'Perlu Izin'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Dengan mengaktifkan izin notifikasi, Anda akan menerima pemberitahuan otomatis di layar sebelum shif dimulai dan saat waktu tugas tiba.
            </p>

            {permissionStatus !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span>Aktifkan Izin Notifikasi Browser Sekarang</span>
              </button>
            )}

            {/* Sound Selector */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                  <span>Pilihan Nada Alarm / Chime:</span>
                </label>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold cursor-pointer"
                >
                  {soundEnabled ? 'Matikan Suara' : 'Hidupkan Suara'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'bell', label: 'Harmonic Bell', desc: 'Lonceng melodi' },
                  { id: 'chime', label: 'Gentle Chime', desc: 'Arpeggio lembut' },
                  { id: 'digital', label: 'Digital Beep', desc: 'Nada bip modern' },
                  { id: 'gong', label: 'Warm Gong', desc: 'Gong tenang' },
                ].map((s) => {
                  const isSelected = selectedSound === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handlePreviewSound(s.id as any)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/50 ring-2 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-900/50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{s.label}</div>
                        <div className="text-[10px] text-slate-500">{s.desc}</div>
                      </div>
                      <Play className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Module 2: Offset Waktu & Konfigurasi Tugas */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Waktu Pengingat Shif &amp; Tugas
              </h3>
            </div>
            <Sliders className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-4 text-xs">
            {/* Shift Start Offset */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                Ingatkan Sebelum Shif Dimulai:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      setShiftStartOffset(mins);
                      soundManager.playChime();
                    }}
                    className={`py-2 px-1 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      shiftStartOffset === mins
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {mins} Menit
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    Pengingat Serah Terima (Handover)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Notifikasi 15-30 menit sebelum pergantian shif untuk menyiapkan buku jaga
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={handoverReminder}
                  onChange={(e) => setHandoverReminder(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    Pengingat Tugas Harian (Checklist Alarms)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Membunyikan alarm saat waktu agenda tiba (Apel, Sholat, Makan, Belajar)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={taskAlarmsEnabled}
                  onChange={(e) => setTaskAlarmsEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    Pengingat Khusus Shif M3 (Foto Keliling Asrama 23:00)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Alarm darurat khusus petugas M3 untuk patroli foto barak &amp; lapor WA
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={m3PatrolAlert}
                  onChange={(e) => setM3PatrolAlert(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>
            </div>

            {/* Android APK Splash Screen & Icon Showcase */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img 
                  src="/logo.svg" 
                  alt="Logo Sekolah Rakyat" 
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white object-contain p-0.5 shadow-xs" 
                />
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Splash Screen &amp; Logo APK
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Animasi pembuka aplikasi resmi Wali Asuh
                  </div>
                </div>
              </div>
              {onShowSplash && (
                <button
                  type="button"
                  onClick={onShowSplash}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Uji Splash Screen</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
