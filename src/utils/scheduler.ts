import { ShiftCode, Staff, ShiftSummary, MonthSchedule } from '../types';
import { SHIFT_DEFINITIONS, distributeSoreShiftsFairly, distributeSeptemberMorningShifts, distributeSeptemberNightShifts, OFFICIAL_WEEKLY_PATTERNS } from '../data/initialSchedule';

export const INDONESIAN_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const INDONESIAN_DAY_NAMES = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

// Calculate individual staff stats for a month
export function calculateStaffSummary(
  staff: Staff | undefined | null,
  days: Record<number, Record<number, ShiftCode>>,
  totalDays: number
): ShiftSummary {
  if (!staff) {
    return {
      staffId: 0,
      staffName: '-',
      pFull: 0,
      p: 0,
      p1: 0,
      p2: 0,
      p3: 0,
      p4: 0,
      p5: 0,
      s: 0,
      s2a: 0,
      s3a: 0,
      s4a: 0,
      m: 0,
      mFull: 0,
      m1: 0,
      m2: 0,
      m3: 0,
      lp: 0,
      off: 0,
      cuti: 0,
      totalHours: 0,
    };
  }

  let p = 0;
  let p1 = 0;
  let p2 = 0;
  let p3 = 0;
  let p4 = 0;
  let p5 = 0;
  let s = 0;
  let s2a = 0;
  let s3a = 0;
  let s4a = 0;
  let m = 0;
  let m1 = 0;
  let m2 = 0;
  let m3 = 0;
  let lp = 0;
  let off = 0;
  let cuti = 0;

  for (let d = 1; d <= totalDays; d++) {
    const shift = days[d]?.[staff.id] || 'O';
    switch (shift) {
      case 'P1':
        p1++;
        break;
      case 'P':
        p++;
        break;
      case 'P2':
        p2++;
        break;
      case 'P3':
        p3++;
        break;
      case 'P4':
        p4++;
        break;
      case 'P5':
        p5++;
        break;
      case 'S':
        s++;
        break;
      case 'S2A':
        s++;
        s2a++;
        break;
      case 'S3A':
        s++;
        s3a++;
        break;
      case 'S4A':
        s++;
        s4a++;
        break;
      case 'M1':
        m++;
        m1++;
        break;
      case 'M2':
        m++;
        m2++;
        break;
      case 'M3':
        m++;
        m3++;
        break;
      case 'M':
        m++;
        break;
      case 'LP':
        lp++;
        break;
      case 'O':
      case 'L':
        off++;
        break;
      case 'C':
        cuti++;
        break;
      case 'IZIN':
        cuti++;
        break;
    }
  }

  const pFull = p + p1 + p2 + p3 + p4 + p5;
  // Calculate total working hours according to document hours:
  // P1 = 8h (07:00-15:00), P2 = 8h (08:00-16:00), P = 8h (07:00-15:00), P3 = 9h (07:00-16:00 Upacara Senin),
  // P4 = 13h (07:00-20:00 Acara/Kunjungan Pagi s.d Selesai Makan Malam 20:00),
  // P5 = 8h (07:00-15:00 Pendampingan Keterampilan/Vokasi),
  // S, S2A, S3A, S4A = 8h (15:00-23:00), M, M1, M2 = 16h (15:00-07:00 next day / 16h shift duty),
  // M3 = 8h (23:00-07:00 next day)
  // LP, O, C = 0h
  const totalHours = (p1 * 8) + (p * 8) + (p2 * 8) + (p3 * 9) + (p4 * 13) + (p5 * 8) + (s * 8) + ((m - m3) * 16) + (m3 * 8);

  return {
    staffId: staff.id,
    staffName: staff.name,
    pFull,
    p,
    p1,
    p2,
    p3,
    p4,
    p5,
    s,
    s2a,
    s3a,
    s4a,
    m,
    mFull: m,
    m1,
    m2,
    m3,
    lp,
    off,
    cuti,
    totalHours,
  };
}

// Calculate daily counts for the bottom table summary
export interface DailyColumnStats {
  p: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
  pagiFull: number;
  s: number;
  s2a: number;
  s3a: number;
  s4a: number;
  m: number;
  mFull: number;
  m1: number;
  m2: number;
  m3: number;
  cuti: number;
  offDanLepas: number;
  total: number;
  pagiWali: Staff[];
  pagi1Wali: Staff[];
  pagi2Wali: Staff[];
  pagi4Wali: Staff[];
  pagi5Wali: Staff[];
  soreWali: Staff[];
  soreKantinSmp: Staff[];
  soreKantinSma: Staff[];
  soreMasjid: Staff[];
  malamWali: Staff[];
  malam1Wali: Staff[];
  malam2Wali: Staff[];
  malam3Wali: Staff[];
  lepasWali: Staff[];
  offWali: Staff[];
  cutiWali: Staff[];
}

export function calculateDailyStats(
  day: number,
  days: Record<number, Record<number, ShiftCode>>,
  staffList: Staff[]
): DailyColumnStats {
  let p = 0;
  let p1 = 0;
  let p2 = 0;
  let p3 = 0;
  let p4 = 0;
  let p5 = 0;
  let s = 0;
  let s2a = 0;
  let s3a = 0;
  let s4a = 0;
  let m = 0;
  let m1 = 0;
  let m2 = 0;
  let m3 = 0;
  let cuti = 0;
  let offDanLepas = 0;

  const pagiWali: Staff[] = [];
  const pagi1Wali: Staff[] = [];
  const pagi2Wali: Staff[] = [];
  const pagi4Wali: Staff[] = [];
  const pagi5Wali: Staff[] = [];
  const soreWali: Staff[] = [];
  const soreKantinSmp: Staff[] = [];
  const soreKantinSma: Staff[] = [];
  const soreMasjid: Staff[] = [];
  const malamWali: Staff[] = [];
  const malam1Wali: Staff[] = [];
  const malam2Wali: Staff[] = [];
  const malam3Wali: Staff[] = [];
  const lepasWali: Staff[] = [];
  const offWali: Staff[] = [];
  const cutiWali: Staff[] = [];

  staffList.forEach((staff) => {
    const shift = days[day]?.[staff.id] || 'O';
    switch (shift) {
      case 'P1':
        p1++;
        pagiWali.push(staff);
        pagi1Wali.push(staff);
        break;
      case 'P':
        p++;
        pagiWali.push(staff);
        pagi1Wali.push(staff);
        break;
      case 'P2':
        p2++;
        pagiWali.push(staff);
        pagi2Wali.push(staff);
        break;
      case 'P3':
        p3++;
        pagiWali.push(staff);
        break;
      case 'P4':
        p4++;
        pagiWali.push(staff);
        pagi4Wali.push(staff);
        break;
      case 'P5':
        p5++;
        pagiWali.push(staff);
        pagi5Wali.push(staff);
        break;
      case 'S':
        s++;
        soreWali.push(staff);
        break;
      case 'S2A':
        s++;
        s2a++;
        soreWali.push(staff);
        soreKantinSmp.push(staff);
        break;
      case 'S3A':
        s++;
        s3a++;
        soreWali.push(staff);
        soreKantinSma.push(staff);
        break;
      case 'S4A':
        s++;
        s4a++;
        soreWali.push(staff);
        soreMasjid.push(staff);
        break;
      case 'M1':
        m++;
        m1++;
        malamWali.push(staff);
        malam1Wali.push(staff);
        break;
      case 'M2':
        m++;
        m2++;
        malamWali.push(staff);
        malam2Wali.push(staff);
        break;
      case 'M3':
        m++;
        m3++;
        malamWali.push(staff);
        malam3Wali.push(staff);
        break;
      case 'M':
        m++;
        malamWali.push(staff);
        break;
      case 'LP':
        offDanLepas++;
        lepasWali.push(staff);
        break;
      case 'O':
      case 'L':
        offDanLepas++;
        offWali.push(staff);
        break;
      case 'C':
      case 'IZIN':
        cuti++;
        cutiWali.push(staff);
        break;
    }
  });

  return {
    p,
    p1,
    p2,
    p3,
    p4,
    p5,
    pagiFull: p + p1 + p2 + p3 + p4 + p5,
    s,
    s2a,
    s3a,
    s4a,
    m,
    mFull: m,
    m1,
    m2,
    m3,
    cuti,
    offDanLepas,
    total: staffList.length,
    pagiWali,
    pagi1Wali,
    pagi2Wali,
    pagi4Wali,
    pagi5Wali,
    soreWali,
    soreKantinSmp,
    soreKantinSma,
    soreMasjid,
    malamWali,
    malam1Wali,
    malam2Wali,
    malam3Wali,
    lepasWali,
    offWali,
    cutiWali,
  };
}

// Get active shift based on current time
export function getActiveShiftsAtTime(timeStr: string): ShiftCode[] {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const currentMinutes = hours * 60 + minutes;

  const active: ShiftCode[] = [];

  // P1, P, P3, P5 (07:00 - 15:00 => 420 to 900)
  if (currentMinutes >= 7 * 60 && currentMinutes < 15 * 60) {
    active.push('P1');
    active.push('P');
    active.push('P3');
    active.push('P5');
  }
  // P2 (08:00 - 16:00 => 480 to 960)
  if (currentMinutes >= 8 * 60 && currentMinutes < 16 * 60) {
    active.push('P2');
  }
  // P4 (07:00 - 20:00 => 420 to 1200, pulang setelah makan malam)
  if (currentMinutes >= 7 * 60 && currentMinutes < 20 * 60) {
    active.push('P4');
  }
  // S / S2A / S3A / S4A (15:00 - 23:00 => 900 to 1380)
  if (currentMinutes >= 15 * 60 && currentMinutes < 23 * 60) {
    active.push('S');
    active.push('S2A');
    active.push('S3A');
    active.push('S4A');
  }
  // M / M1 / M2 (15:00 - 07:00 next day => >= 900 OR < 420)
  if (currentMinutes >= 15 * 60 || currentMinutes < 7 * 60) {
    active.push('M');
    active.push('M1');
    active.push('M2');
  }
  // M3 (23:00 - 07:00 next day => >= 1380 OR < 420)
  if (currentMinutes >= 23 * 60 || currentMinutes < 7 * 60) {
    active.push('M3');
  }

  return active;
}

export interface ShiftValidationResult {
  isValid: boolean;
  code: ShiftCode;
  staffId: number;
  staffName: string;
  day: number;
  hasSpecialReminder: boolean;
  specialReminder?: {
    title: string;
    message: string;
    dutyTime: string;
    taskTitle: string;
    actionInstruction: string;
    requiredActions: string[];
    sound: 'bell' | 'chime';
  };
  notes?: string;
  warning?: string;
}

/**
 * Logika Validasi Penjadwalan:
 * Memeriksa validitas penugasan shif staf.
 * Khusus saat staf ditugaskan pada kode M3 (Jaga Malam Pendamping),
 * sistem secara otomatis menghasilkan pengingat khusus untuk tugas keliling asrama di jam 23:00 WIB,
 * pelaporan foto ke grup dinas, serta menjalankan SOP M2 mulai pukul 03:00.
 */
export function validateShiftAssignment(
  staff: Staff | { id: number; name: string },
  shift: ShiftCode,
  day: number,
  scheduleContext?: Record<number, Record<number, ShiftCode>>
): ShiftValidationResult {
  const staffId = staff.id;
  const staffName = staff.name || `Petugas #${staffId}`;

  // Logika khusus validasi dan pengingat untuk penugasan M3
  if (shift === 'M3') {
    return {
      isValid: true,
      code: 'M3',
      staffId,
      staffName,
      day,
      hasSpecialReminder: true,
      specialReminder: {
        title: `⏰ Pengingat Khusus Shif M3 (${staffName} - Tgl ${day})`,
        message: `Petugas ${staffName} ditugaskan pada kode M3 (Malam Pendamping) tanggal ${day}. Wajib hadir pukul 23:00 WIB untuk tugas keliling asrama & lingkungan sekitar, kirim foto ke grup dinas, serta menjalankan SOP M2 mulai pukul 03:00.`,
        dutyTime: '23:00 WIB',
        taskTitle: 'Tugas Keliling Asrama & Lingkungan Sekitar',
        actionInstruction: 'Datang tepat pukul 23:00 WIB, wajib keliling asrama & lingkungan sekitar, serta kirim foto dokumentasi ke grup dinas. Pukul 03:00 s.d 07:00 menjalankan SOP M2.',
        requiredActions: [
          'Hadir tepat waktu pukul 23:00 WIB di pos asrama',
          'Wajib patroli/keliling asrama dan lingkungan sekitar',
          'Ambil foto dokumentasi dan kirim ke grup WhatsApp dinas',
          'Mendampingi penuh seluruh shif malam hingga pukul 07:00 WIB',
          'Mulai pukul 03:00 dan seterusnya menjalankan tugas kode M2 (bangun subuh santri & sholat)'
        ],
        sound: 'bell',
      },
      notes: 'M3 (23:00 - 07:00): Wajib patroli keliling asrama jam 23:00 & kirim foto dokumentasi ke grup dinas.',
    };
  }

  // Logika khusus validasi dan pengingat untuk penugasan P4 (Pagi Acara/Kunjungan)
  if (shift === 'P4') {
    return {
      isValid: true,
      code: 'P4',
      staffId,
      staffName,
      day,
      hasSpecialReminder: true,
      specialReminder: {
        title: `🏛️ Pengingat Khusus Shif P4 (${staffName} - Tgl ${day})`,
        message: `Petugas ${staffName} ditugaskan pada kode P4 tanggal ${day}. Jam dinas 07:00 - 20:00 WIB (13 Jam Kerja). Pengganti shif M karena ada acara/kunjungan. Pagi wajib bantu kunjungan (07-15), sore bantu patroli luar belakang (15-20), dan mendampingi makan malam S2A/S3A non-evaluasi. Pulang setelah sesi makan malam selesai.`,
        dutyTime: '07:00 - 20:00 WIB (Pulang Selesai Makan Malam)',
        taskTitle: 'Bantu Acara/Kunjungan Pagi, Patroli Luar Belakang Sore & Pendamping Makan Malam',
        actionInstruction: 'Datang 07:00, Pulang setelah makan malam jam 20:00 WIB (13 Jam Kerja). Pukul 07:00-15:00 wajib bantu kunjungan/acara. Pukul 15:00-20:00 membantu shif sore dengan fokus tugas pokok M (patroli luar belakang: lapangan upacara, bola, jogging track, voli, basket). Saat makan malam bantu S2A & S3A non-evaluasi, selesai makan malam pulang.',
        requiredActions: [
          'Datang dinas tepat jam 07:00 WIB, Pulang jam 20:00 WIB (13 Jam Kerja / Pulang setelah makan malam)',
          'Digunakan saat seharusnya jadwal M dialihkan ke P karena ada kunjungan/acara pagi yang butuh banyak personil',
          'Saat diterapkan menjadi petugas kunjungan, wajib bantu kunjungan (07:00 - 15:00)',
          'Dari jam 15:00 s.d 20:00 membantu shif Sore tetapi tetap tugas pokok M: patroli area luar belakang (lapangan upacara, sepak bola, jogging track, voli, basket)',
          'Saat acara makan malam santri, membantu petugas S2A dan S3A sebagai pendamping teknis (bukan sebagai evaluator)',
          'Setelah seluruh rangkaian makan malam santri tuntas (pukul 20:00 WIB), personil P4 diperkenankan pulang dinas',
        ],
        sound: 'bell',
      },
      notes: 'P4 (07:00 - 20:00 / 13 Jam): Pengganti M untuk bantu kunjungan pagi, patroli luar belakang sore, pendamping makan malam S2A/S3A, pulang setelah makan malam.',
    };
  }

  // Logika khusus validasi dan pengingat untuk penugasan P5 (Pagi Keterampilan/Vokasi)
  if (shift === 'P5') {
    return {
      isValid: true,
      code: 'P5',
      staffId,
      staffName,
      day,
      hasSpecialReminder: true,
      specialReminder: {
        title: `🛠️ Pengingat Shif P5 Keterampilan/Vokasi (${staffName} - Tgl ${day})`,
        message: `Petugas ${staffName} ditugaskan pada kode P5 tanggal ${day}. Jam dinas 07:00 - 15:00 WIB (8 Jam Kerja). Tugas: Pendampingan vokasi/keterampilan (Perhotelan, Tata Boga, Peternakan, Pertanian, Tata Rias, atau kustom).`,
        dutyTime: '07:00 - 15:00 WIB',
        taskTitle: 'Pendampingan Keterampilan & Vokasi Santri',
        actionInstruction: 'Hadir pukul 07:00, laksanakan pendampingan keterampilan siswa sesuai bidang vokasi yang ditugaskan hingga pukul 15:00 WIB.',
        requiredActions: [
          'Hadir tepat waktu di lokasi/pos keterampilan santri pukul 07:00 WIB',
          'Mendampingi instruktur/guru kejuruan dalam pengawasan kedisiplinan dan keselamatan kerja santri',
          'Pengawasan saat praktik kerja/vokasi (Perhotelan, Tata Boga, Peternakan, Pertanian, Tata Rias, atau kustom)',
          'Mengawal ibadah sholat Dzuhur dan makan siang santri vokasi',
          'Pencatatan jurnal/log pendampingan vokasi dan serah terima dinas ke shif sore pukul 15:00 WIB'
        ],
        sound: 'chime',
      },
      notes: 'P5 (07:00 - 15:00 / 8 Jam): Pendampingan keterampilan/vokasi santri (Perhotelan, Tata Boga, Peternakan, Pertanian, Tata Rias, atau Kustom).',
    };
  }

  return {
    isValid: true,
    code: shift,
    staffId,
    staffName,
    day,
    hasSpecialReminder: false,
  };
}

/**
 * Validasi seluruh jadwal bulan untuk mendeteksi penugasan kode M3
 * dan mengumpulkan seluruh pengingat khusus tugas keliling asrama 23:00.
 */
export function validateScheduleM3Assignments(
  schedule: MonthSchedule,
  targetDay?: number
): ShiftValidationResult[] {
  const results: ShiftValidationResult[] = [];
  const daysToCheck = targetDay ? [targetDay] : Array.from({ length: schedule.totalDays }, (_, i) => i + 1);

  daysToCheck.forEach((d) => {
    schedule.staffList.forEach((staff) => {
      const shift = schedule.days[d]?.[staff.id];
      if (shift === 'M3') {
        results.push(validateShiftAssignment(staff, 'M3', d, schedule.days));
      }
    });
  });

  return results;
}

// Generate new month automatic shift rotation based on the official Kemensos rotation cycle pattern:
// Pola: 1P - 4S - 1M - 1LP (Tanpa Off, hanya Lepas Piket setelah M)
export function generateAutoSchedule(
  year: number,
  month: number,
  staffList: Staff[],
  options?: {
    staggerDays?: number;
    priorMonthEndShifts?: Record<number, ShiftCode>;
  }
): MonthSchedule {
  const daysInMonth = new Date(year, month, 0).getDate();
  const rawDays: Record<number, Record<number, ShiftCode>> = {};

  for (let d = 1; d <= daysInMonth; d++) {
    rawDays[d] = {};
    const dObj = new Date(year, month - 1, d);
    const jsDay = dObj.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    // Convert to index: 0=Senin, 1=Selasa, 2=Rabu, 3=Kamis, 4=Jumat, 5=Sabtu, 6=Minggu
    const patternIdx = (jsDay + 6) % 7;

    staffList.forEach((staff, index) => {
      // If staff has official weekly pattern registered by ID (either 1..18 or 21..38), use it
      const officialPattern = OFFICIAL_WEEKLY_PATTERNS[staff.id] || OFFICIAL_WEEKLY_PATTERNS[staff.id - 20];
      if (officialPattern) {
        rawDays[d][staff.id] = officialPattern[patternIdx];
      } else {
        // Fallback to rotation cycle based on index
        const fallbackPattern: ShiftCode[] = ['M', 'LP', 'S', 'S', 'S', 'S', 'P'];
        const shiftedIdx = (patternIdx + index) % 7;
        rawDays[d][staff.id] = fallbackPattern[shiftedIdx];
      }
    });
  }

  const soreDays = distributeSoreShiftsFairly(rawDays, staffList, year, month);
  const morningDays = distributeSeptemberMorningShifts(soreDays, year, month, staffList);
  const days = distributeSeptemberNightShifts(morningDays, year, month, staffList);

  return {
    year,
    month,
    monthName: INDONESIAN_MONTH_NAMES[month - 1],
    totalDays: daysInMonth,
    staffList,
    days,
  };
}

// Convert Schedule to CSV
export function exportScheduleToCSV(
  schedule: MonthSchedule,
  summaries: ShiftSummary[]
): string {
  const headerDays = Array.from({ length: schedule.totalDays }, (_, i) => i + 1).join(',');
  let csv = `No,Nama,${headerDays},P FUL,S,S2A (Kantin SMP),S3A (Kantin SMA),S4A (Jaga Masjid),M (Total),M1 (s.d 00:00),M2 (Subuh-07:00),M3 (Pendamping 23-07),LP,OFF,P1,P2,P3,P4,JK (Jam)\n`;

  schedule.staffList.forEach((staff, idx) => {
    const summary = summaries.find((s) => s.staffId === staff.id);
    const rowShifts = Array.from({ length: schedule.totalDays }, (_, i) => {
      return schedule.days[i + 1]?.[staff.id] || 'O';
    }).join(',');

    const p1Val = (summary?.p1 || 0) + (summary?.p || 0);
    const statsStr = `${summary?.pFull || 0},${summary?.s || 0},${summary?.s2a || 0},${summary?.s3a || 0},${summary?.s4a || 0},${summary?.m || 0},${summary?.m1 || 0},${summary?.m2 || 0},${summary?.m3 || 0},${summary?.lp || 0},${summary?.off || 0},${p1Val},${summary?.p2 || 0},${summary?.p3 || 0},${summary?.p4 || 0},${summary?.totalHours || 0}`;

    csv += `${idx + 1},"${staff.name}",${rowShifts},${statsStr}\n`;
  });

  return csv;
}

/**
 * Generate Next Month Schedule derived from a Source Month Schedule.
 * Retains exact shift definitions, roles, staff list, and distribution rules,
 * while automatically adapting days, dates, calendar alignment, and Monday P3 ceremonies.
 */
export function generateNextMonthScheduleFromPrior(
  sourceSchedule: MonthSchedule,
  targetYear: number,
  targetMonth: number,
  mode: 'continuation' | 'day_matching' = 'continuation'
): MonthSchedule {
  const targetDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const staffList = sourceSchedule.staffList;
  const rawDays: Record<number, Record<number, ShiftCode>> = {};

  // Cycle sequence for standard rotation: M -> LP -> O -> P -> S -> S -> S (7 steps)
  const ROTATION_CYCLE: ShiftCode[] = ['M', 'LP', 'O', 'P', 'S', 'S', 'S'];

  // Build a map of staff's last known shift category in the source schedule
  const lastKnownShift: Record<number, ShiftCode> = {};
  const sourceLastDay = sourceSchedule.totalDays;

  staffList.forEach((st) => {
    const rawShift = sourceSchedule.days[sourceLastDay]?.[st.id] || 'O';
    if (rawShift.startsWith('P')) lastKnownShift[st.id] = 'P';
    else if (rawShift.startsWith('S')) lastKnownShift[st.id] = 'S';
    else if (rawShift.startsWith('M')) lastKnownShift[st.id] = 'M';
    else if (rawShift === 'LP') lastKnownShift[st.id] = 'LP';
    else lastKnownShift[st.id] = 'O';
  });

  if (mode === 'continuation') {
    // Determine starting step for each staff on day 1
    const staffCurrentStep: Record<number, number> = {};

    staffList.forEach((st, idx) => {
      const lastShift = lastKnownShift[st.id];
      let nextStepIndex = 0;

      if (lastShift === 'M') nextStepIndex = 1; // M -> LP
      else if (lastShift === 'LP') nextStepIndex = 2; // LP -> O
      else if (lastShift === 'O') nextStepIndex = 3; // O -> P
      else if (lastShift === 'P') nextStepIndex = 4; // P -> S
      else if (lastShift === 'S') nextStepIndex = 5; // S -> S
      else nextStepIndex = (idx * 2) % ROTATION_CYCLE.length;

      staffCurrentStep[st.id] = nextStepIndex;
    });

    for (let d = 1; d <= targetDaysInMonth; d++) {
      rawDays[d] = {};
      staffList.forEach((st) => {
        const step = (staffCurrentStep[st.id] + (d - 1)) % ROTATION_CYCLE.length;
        rawDays[d][st.id] = ROTATION_CYCLE[step];
      });
    }
  } else {
    // Mode: Day-of-week matching
    for (let d = 1; d <= targetDaysInMonth; d++) {
      rawDays[d] = {};
      const targetDate = new Date(targetYear, targetMonth - 1, d);
      const jsDay = targetDate.getDay(); // 0=Minggu, 1=Senin...

      // Find days in source month with same jsDay
      const matchingSourceDays: number[] = [];
      for (let sd = 1; sd <= sourceSchedule.totalDays; sd++) {
        const sDate = new Date(sourceSchedule.year, sourceSchedule.month - 1, sd);
        if (sDate.getDay() === jsDay) {
          matchingSourceDays.push(sd);
        }
      }

      const sourceDayToCopy = matchingSourceDays.length > 0
        ? matchingSourceDays[(Math.floor((d - 1) / 7)) % matchingSourceDays.length]
        : ((d - 1) % sourceSchedule.totalDays) + 1;

      staffList.forEach((st) => {
        rawDays[d][st.id] = sourceSchedule.days[sourceDayToCopy]?.[st.id] || 'O';
      });
    }
  }

  // Refine through fair shift distribution pipelines:
  // Preserves staff's characteristic specialization (e.g. Ust. Aris Mahmud dominant in S4A Masjid, Kantin SMP in S2A, Kantin SMA in S3A)
  const soreDays = distributeSoreShiftsFairly(rawDays, staffList, targetYear, targetMonth, sourceSchedule);
  const morningDays = distributeSeptemberMorningShifts(soreDays, targetYear, targetMonth, staffList);
  const finalDays = distributeSeptemberNightShifts(morningDays, targetYear, targetMonth, staffList);

  return {
    year: targetYear,
    month: targetMonth,
    monthName: INDONESIAN_MONTH_NAMES[targetMonth - 1],
    totalDays: targetDaysInMonth,
    staffList,
    days: finalDays,
  };
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
