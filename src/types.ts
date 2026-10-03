export type ShiftCode = 'P' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'S' | 'S2A' | 'S3A' | 'S4A' | 'M' | 'M1' | 'M2' | 'M3' | 'LP' | 'O' | 'L' | 'C' | 'IZIN';

export interface ShiftInfo {
  code: ShiftCode;
  name: string;
  fullName: string;
  startTime: string; // "07:00"
  endTime: string;   // "16:00"
  hours: number;
  color: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  textColor: string;
  darkTextColor: string;
  badgeClass: string;
  description: string;
}

export interface Staff {
  id: number;
  name: string;
  role: string;
  code?: string; // 'L1', 'L2', ..., 'P1', 'P2', dsb.
  gender?: 'L' | 'P'; // 'L' (Laki-laki) | 'P' (Perempuan)
  jenjang?: string; // 'SD' | 'SMP' | 'SMA' | '-'
  initials?: string; // Inisial huruf kecil untuk kemudahan baca matriks (contoh: 'ew' untuk Eko Wahyudi)
  group?: string; // 'Petugas Laki-laki' | 'Petugas Perempuan'
  nip?: string;
  phone?: string;
  status?: 'active' | 'archived';
}

export interface DailySchedule {
  day: number; // 1 to 31
  dateStr: string; // YYYY-MM-DD
  dayName: string; // "Senin", "Selasa", etc.
  shifts: Record<number, ShiftCode>; // staffId -> ShiftCode
}

export interface MonthSchedule {
  year: number;
  month: number; // 1-12
  monthName: string;
  totalDays: number;
  staffList: Staff[];
  days: Record<number, Record<number, ShiftCode>>; // day (1..31) -> (staffId -> ShiftCode)
  morningPostAssignments?: Record<string, MorningPostAssignment>; // Optional persistence & cloud sync for morning post assignments
  updatedAt?: string; // ISO timestamp of last update
  updatedBy?: string; // Author of last update
}

export interface ShiftSummary {
  staffId: number;
  staffName: string;
  pFull: number; // P + P1 + P2 + P3 + P4 + P5
  p: number;
  p1: number;
  p2: number;
  p3: number;
  p4?: number;
  p5?: number;
  s: number;
  s2a?: number;
  s3a?: number;
  s4a?: number;
  m: number;
  mFull?: number; // M + M1 + M2 + M3
  m1?: number;
  m2?: number;
  m3?: number;
  lp: number;
  off: number;
  cuti: number;
  totalHours: number;
}

export interface DailyTask {
  id: string;
  shiftCode: ShiftCode;
  time: string; // "06:45"
  title: string;
  description: string;
  category: 'presensi' | 'ibadah' | 'makan' | 'belajar' | 'patroli' | 'laporan' | 'kebersihan';
  priority: 'normal' | 'penting' | 'krusial';
}

export interface TaskStatus {
  taskId: string;
  dateStr: string;
  staffId: number;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface NotificationRule {
  id: string;
  type: 'shift_start' | 'shift_end' | 'task_reminder' | 'handover';
  title: string;
  offsetMinutes: number; // e.g. 30 means 30 minutes before
  enabled: boolean;
  sound: 'bell' | 'chime' | 'digital' | 'gong' | 'none';
}

export interface Student {
  no: number;
  name: string;
  class: string;
  gender: 'Laki-laki' | 'Perempuan';
  nik: string;
  birthPlace: string;
  birthDate: string;
  motherName: string;
  address: string;
  // Custom edited fields
  phone?: string;
  room?: string;
  bloodType?: string;
  guardianName?: string;
  emergencyContact?: string;
  notes?: string;
}

export interface StudentPortfolioNote {
  id: string;
  studentNo: number;
  studentName: string;
  date: string; // YYYY-MM-DD
  category: 'Ibadah' | 'Akademik' | 'Perilaku' | 'Kesehatan' | 'Minat Bakat' | 'Kedisiplinan' | 'Lainnya';
  content: string;
  authorName: string;
  authorRole?: string;
  createdAt: string;
}

export interface SickStudent {
  id: string;
  name: string;
  roomOrClass: string;
  symptoms: string;
  actionTaken: string;
}

export interface FastingStudent {
  id: string;
  name: string;
  roomOrClass?: string;
  fastingType?: string;
}

export interface StudentPermit {
  id: string;
  name: string;
  reason: string;
  outTime: string;
  returnTime: string;
  status: 'Keluar' | 'Kembali' | 'Dispensasi';
}

export type HandoverShiftMode = 'PAGI_KE_SORE' | 'SORE_KE_MALAM' | 'MALAM_KE_PAGI' | 'PAGI' | 'SORE' | 'MALAM';

export interface HandoverReport {
  id: string;
  dateStr: string; // YYYY-MM-DD
  day: number;
  month: number;
  year: number;
  shiftType: HandoverShiftMode;
  handoverTime: string;
  outgoingStaffIds: number[];
  outgoingStaffNames: string[];
  incomingStaffIds: number[];
  incomingStaffNames: string[];
  studentCountTotal: number;
  studentCountPresent: number;
  studentCountPermit: number;
  studentCountSick: number;
  studentCountFasting?: number;
  sickStudents: SickStudent[];
  fastingStudents?: FastingStudent[];
  permits: StudentPermit[];
  cleanlinessStatus: 'Sangat Bersih' | 'Cukup Bersih' | 'Perlu Perhatian';
  disciplineStatus: 'Kondusif & Tertib' | 'Ada Catatan Khusus';
  specialIncidents: string;
  completedActivities?: string[];
  inventoryNotes: string; // misal: HT lengkap, Kunci gerbang di pos
  notesForNextShift: string; // pesan atensi untuk shif selanjutnya
  submittedBy: string;
  submittedAt: string;
}

export interface ShiftSwapRecord {
  id: string;
  timestamp: string;
  year: number;
  month: number;
  type: 'swap' | 'override' | 'cross_day';
  day1: number;
  staff1Id: number;
  staff1Name: string;
  staff1OldShift: ShiftCode;
  staff1NewShift: ShiftCode;
  day2?: number;
  staff2Id?: number;
  staff2Name?: string;
  staff2OldShift?: ShiftCode;
  staff2NewShift?: ShiftCode;
  reason: string;
  autoLpApplied?: boolean;
  undone?: boolean;
}

export interface AnnouncementData {
  text: string;
  enabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export type MedicalFacility = 'UKS' | 'Puskesmas' | 'Rumah Sakit' | 'Klinik' | 'Lainnya';
export type MedicalPlanType = 'berobat' | 'kontrol_kembali' | 'rujukan' | 'perawatan_rutin';
export type MedicalStatus = 'rencana' | 'selesai' | 'dibatalkan';

export interface StudentMedicalPlan {
  id: string;
  studentName: string;
  studentClassOrRoom: string;
  facility: MedicalFacility;
  facilityDetail?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  planType: MedicalPlanType;
  complaint: string;
  accompanyingStaffName: string;
  accompanyingStaffId?: number;
  notes?: string;
  status: MedicalStatus;
  actionResult?: string;
  nextControlDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// ==================== P5 VOCATIONAL / SKILL ACCOMPANYING TYPES ====================
export interface P5TaskAssignment {
  staffId: number;
  day: number;
  month: number;
  year: number;
  taskTitle: string; // e.g. "Mendampingi Tata Boga"
  customDetail?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface P5CustomTaskOption {
  id: string;
  label: string; // e.g. "Mendampingi Perhotelan"
  isDefault?: boolean;
}

// ==================== P1-P5 MORNING POST & QURAN ASSISTANCE TASK TYPES ====================
export type QuranAssistanceLevel = 'Mengaji SD' | 'Mengaji SMP' | 'Mengaji SMA';

export interface MorningPostAssignment {
  staffId: number;
  staffName?: string;
  day: number;
  month: number;
  year: number;
  shiftCode: ShiftCode | string;
  postTitle?: string; // e.g. "UKS SD", "UKS SMP", "UKS SMA", "Mobile / Keliling"
  quranAssistance?: QuranAssistanceLevel; // "Mengaji SD" | "Mengaji SMP" | "Mengaji SMA"
  customDetail?: string;
  optionId?: string;
  assignedBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MorningPostCustomOption {
  id: string;
  label: string; // e.g. "UKS SD", "UKS SMP", "UKS SMA", "Mobile / Keliling"
  isDefault?: boolean;
}

// ==================== IZIN (PERIZINAN PETUGAS / SAKIT / DINAS) TYPES ====================
export type LeaveType = 'sakit' | 'dinas' | 'keperluan_lain';

export interface LeavePermissionRecord {
  id: string; // e.g. "2026_9_15_12" (year_month_day_staffId)
  staffId: number;
  staffName: string;
  day: number;
  month: number;
  year: number;
  leaveType: LeaveType; // 'sakit' | 'dinas' | 'keperluan_lain'
  notes?: string; // Keterangan tambahan dari admin
  proofUrl?: string; // Data URL Base64 image (JPG/PNG) surat bukti sakit/surat tugas dinas
  proofFileName?: string;
  proofUploadedAt?: string;
  proofUploadedBy?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
}


