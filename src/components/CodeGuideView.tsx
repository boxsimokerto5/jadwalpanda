import React, { useState } from 'react';
import { 
  BookOpen, 
  Clock, 
  Search, 
  Sun, 
  Sunset, 
  Moon, 
  Coffee, 
  CalendarDays, 
  Send, 
  FileText, 
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { SHIFT_DEFINITIONS } from '../data/initialSchedule';
import { ShiftCode } from '../types';

interface CodeGuideViewProps {
  onNavigateToTab: (tab: 'dashboard' | 'matrix' | 'assignment' | 'handover' | 'personal') => void;
}

interface ShiftGuideDetail {
  code: ShiftCode;
  category: 'pagi' | 'sore' | 'malam' | 'libur';
  categoryLabel: string;
  categoryIcon: React.ReactNode;
  categoryColor: string;
  dutyTime: string;
  workHours: number;
  badgeBg: string;
  tagline: string;
  description: string;
  responsibilities: string[];
  rulesAndNotes: string[];
  colorBorder: string;
  cardBg: string;
}

const SHIFT_GUIDE_DATA: ShiftGuideDetail[] = [
  // --- SHIF PAGI ---
  {
    code: 'P1',
    category: 'pagi',
    categoryLabel: 'Shif Pagi',
    categoryIcon: <Sun className="w-4 h-4 text-sky-500" />,
    categoryColor: 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800',
    dutyTime: '07:00 – 15:00 WIB',
    workHours: 8,
    badgeBg: 'bg-sky-600 text-white',
    tagline: 'Piket Pagi Reguler Sesi 1',
    description: 'Petugas dinas pagi yang bertanggung jawab atas pendampingan bangun pagi anak asuh, ibadah shubuh, sarapan pagi bersama di ruang makan/kantin, apel pagi, dan mengawal ketertiban keberangkatan siswa ke sekolah.',
    responsibilities: [
      'Pukul 07:00: Siaga di asrama, mendampingi sarapan pagi santri dan apel kedisiplinan pagi',
      'Pukul 07:30 – 11:30: Pengawasan lingkungan asrama dan pendampingan kegiatan belajar mengajar siswa',
      'Pukul 11:30 – 13:30: Mengawal kepulangan sekolah, persiapan ibadah shalat Dzuhur berjamaah, dan makan siang bersama',
      'Pukul 13:30 – 15:00: Pemantauan jam istirahat santri dan persiapan serah terima piket ke shif Sore (15:00)'
    ],
    rulesAndNotes: [
      'Wajib hadir di pos asrama tepat sebelum pukul 07:00 WIB',
      'Mengisi buku absensi makan pagi dan siang anak asuh',
      'Melaporkan siswa yang sakit ke ruang UKS'
    ],
    colorBorder: 'border-sky-400 dark:border-sky-600',
    cardBg: 'bg-gradient-to-br from-sky-50/50 via-white to-sky-50/30 dark:from-sky-950/20 dark:via-slate-900 dark:to-slate-900'
  },
  {
    code: 'P2',
    category: 'pagi',
    categoryLabel: 'Shif Pagi',
    categoryIcon: <Sun className="w-4 h-4 text-teal-500" />,
    categoryColor: 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800',
    dutyTime: '08:00 – 16:00 WIB',
    workHours: 8,
    badgeBg: 'bg-teal-600 text-white',
    tagline: 'Piket Pagi Reguler Sesi 2 (Dukungan Operasional)',
    description: 'Petugas pagi sesi 2 yang memberikan penguatan pengawasan operasional sekolah, penanganan kebutuhan santri di asrama, koordinasi logistik/kesehatan, hingga pendampingan kepulangan santri sore hari.',
    responsibilities: [
      'Pukul 08:00 – 12:00: Patroli berkala kamar dan sanitasi asrama, koordinasi administrasi anak asuh',
      'Pukul 12:00 – 14:00: Pendampingan makan siang dan koordinasi penanganan santri di UKS',
      'Pukul 14:00 – 16:00: Mengawal transisi kegiatan ekstrakurikuler sore anak asuh dan koordinasi serah terima'
    ],
    rulesAndNotes: [
      'Jam kerja berjalan pukul 08:00 hingga 16:00 WIB',
      'Mendampingi santri yang memerlukan izin khusus atau pemeriksaan medis lanjutan'
    ],
    colorBorder: 'border-teal-400 dark:border-teal-600',
    cardBg: 'bg-gradient-to-br from-teal-50/50 via-white to-teal-50/30 dark:from-teal-950/20 dark:via-slate-900 dark:to-slate-900'
  },
  {
    code: 'P3',
    category: 'pagi',
    categoryLabel: 'Shif Pagi',
    categoryIcon: <Sun className="w-4 h-4 text-amber-500" />,
    categoryColor: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
    dutyTime: '07:00 – 16:00 WIB',
    workHours: 9,
    badgeBg: 'bg-amber-500 text-slate-950 font-black',
    tagline: 'Pagi Khusus Upacara Bendera Senin & Pendampingan',
    description: 'Petugas khusus hari Senin (atau agenda resmi upacara/sabtu) yang memimpin ketertiban seragam upacara, barisan upacara bendera, dan pendampingan penuh anak asuh selama 9 jam kerja.',
    responsibilities: [
      'Pukul 06:45 – 07:45: Pengecekan atribut seragam lengkap, kerapian dasi/topi, dan mobilisasi santri ke lapangan upacara',
      'Pukul 07:45 – 09:00: Menjaga ketertiban, kedisiplinan, dan penanganan santri yang pusing/sakit saat upacara bendera',
      'Pukul 09:00 – 14:00: Pengawasan kegiatan akademik dan pembinaan karakter santri di asrama & sekolah',
      'Pukul 14:00 – 16:00: Monitoring ketertiban shalat Ashar dan penuntasan jurnal kegiatan harian'
    ],
    rulesAndNotes: [
      'Hanya berlaku pada hari Senin (atau hari dengan jadwal upacara kenegaraan/hari besar)',
      'Total durasi dinas dihitung 9 jam kerja resmi',
      'Dapat ditentukan pos penugasan pagi: UKS SD, UKS SMP, UKS SMA, atau Mobile / Keliling'
    ],
    colorBorder: 'border-amber-400 dark:border-amber-600',
    cardBg: 'bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900'
  },
  {
    code: 'P4',
    category: 'pagi',
    categoryLabel: 'Shif Pagi',
    categoryIcon: <Sun className="w-4 h-4 text-cyan-500" />,
    categoryColor: 'text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800',
    dutyTime: '07:00 – 20:00 WIB',
    workHours: 13,
    badgeBg: 'bg-cyan-600 text-white font-black',
    tagline: 'Pagi Kunjungan, Patroli Luar Belakang & Pendamping Makan Malam',
    description: 'Pengalihan dinas dari jadwal Malam (M) ke Pagi (P) saat ada kunjungan tamu/agenda besar yang memerlukan banyak personil. Bertugas mulai pagi, siaga patroli luar belakang sore hari, mendampingi makan malam santri, dan pulang setelah makan malam.',
    responsibilities: [
      'Pukul 07:00 – 15:00: Wajib aktif mendampingi kunjungan tamu/wali santri, pengamanan rute acara, dan protokoler kegiatan',
      'Pukul 15:00 – 20:00: Membantu shif Sore dengan menjalankan tugas pokok M: patroli dan pengamanan area luar belakang (lapangan upacara, lapangan sepak bola, jogging track, lapangan voli, dan lapangan basket)',
      'Pukul 18:45 – 19:45: Membantu personil S2A (Kantin SMP) dan S3A (Kantin SMA) sebagai pendamping teknis makan malam anak asuh (bukan evaluator)',
      'Pukul 19:50 – 20:00: Melaporkan log dinas P4 dan personil diperkenankan pulang dinas tepat setelah rangkaian makan malam selesai'
    ],
    rulesAndNotes: [
      'Jam kerja: 07:00 – 20:00 WIB (Total dihitung 13 Jam Kerja)',
      'PULANG SETELAH MAKAN MALAM: Personil P4 tidak bertugas sampai jam 23:00, melainkan purna dinas pukul 20:00 WIB',
      'Saat mendampingi makan malam santri bersama S2A/S3A, status personil murni sebagai pendamping ketertiban (bukan pemberi evaluasi/penilai)'
    ],
    colorBorder: 'border-cyan-400 dark:border-cyan-600',
    cardBg: 'bg-gradient-to-br from-cyan-50/50 via-white to-cyan-50/30 dark:from-cyan-950/20 dark:via-slate-900 dark:to-slate-900'
  },
  {
    code: 'P5',
    category: 'pagi',
    categoryLabel: 'Shif Pagi',
    categoryIcon: <Sun className="w-4 h-4 text-emerald-500" />,
    categoryColor: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
    dutyTime: '07:00 – 15:00 WIB',
    workHours: 8,
    badgeBg: 'bg-emerald-600 text-white font-black',
    tagline: 'Pagi Pendampingan Keterampilan / Vokasi Santri (Tugas Fleksibel & Kustom)',
    description: 'Petugas dinas pagi khusus pendampingan program keterampilan dan vokasi santri. Pilihan tugas dapat dipilih langsung dari daftar tugas (Mendampingi Perhotelan, Tata Boga, Peternakan, Pertanian, Tata Rias) maupun kustom yang dapat diatur oleh Admin.',
    responsibilities: [
      'Pukul 07:00 – 07:30: Siaga di asrama, pengarahan santri menuju lokasi praktik kejuruan/vokasi',
      'Pukul 07:30 – 11:45: Mendampingi praktik keterampilan (Perhotelan / Tata Boga / Peternakan / Pertanian / Tata Rias / Tugas Kustom)',
      'Pukul 11:45 – 13:00: Pengawalan sholat Dzuhur berjamaah dan makan siang bersama siswa vokasi',
      'Pukul 13:00 – 14:30: Monitoring evaluasi hasil karya praktik dan pembinaan kedisiplinan kerja',
      'Pukul 14:30 – 15:00: Pengisian jurnal vokasi P5 di dashboard dan serah terima dinas ke shif Sore'
    ],
    rulesAndNotes: [
      'Jam kerja: 07:00 – 15:00 WIB (Total dihitung 8 Jam Kerja)',
      'Pilihan bidang tugas dapat dipilih melalui dropdown di Dashboard atau diatur tugas kustom oleh Admin',
      'Fokus utama adalah pendampingan karakter, kedisiplinan, keselamatan kerja (K3), dan keaktifan anak asuh'
    ],
    colorBorder: 'border-emerald-400 dark:border-emerald-600',
    cardBg: 'bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900'
  },

  // --- SHIF SORE ---
  {
    code: 'S2A',
    category: 'sore',
    categoryLabel: 'Shif Sore',
    categoryIcon: <Sunset className="w-4 h-4 text-purple-500" />,
    categoryColor: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
    dutyTime: '15:00 – 23:00 WIB',
    workHours: 8,
    badgeBg: 'bg-purple-600 text-white font-black',
    tagline: 'Piket Sore Kantin, Asrama & Evaluasi Jenjang SMP',
    description: 'Menjaga asrama SMP, merawat anak asuh sakit di jenjang SMP, mengarahkan santri ke kantin, memimpin sesi makan malam santri SMP, serta memimpin evaluasi kedisiplinan dan pembinaan malam.',
    responsibilities: [
      'Pukul 15:00 – 17:30: Apel shif sore, pemantauan kegiatan mandi sore anak asuh SMP, dan penertiban kamar',
      'Pukul 17:30 – 18:30: Mengawal anak asuh SMP ke masjid untuk Shalat Maghrib berjamaah dan tadarus Al-Quran',
      'Pukul 18:45 – 19:45: Memimpin dan mengawal kegiatan makan malam anak asuh di Kantin SMP',
      'Pukul 19:45 – 21:00: Shalat Isya berjamaah dan memimpin evaluasi malam santri jenjang SMP',
      'Pukul 21:00 – 23:00: Pendampingan belajar malam/tahfidz mandiri, pengecekan absensi tidur, dan serah terima ke petugas Malam (M)'
    ],
    rulesAndNotes: [
      'Formasi standar: 2 Petugas Wali Asuh',
      'Bertanggung jawab penuh atas evaluasi malam santri SMP',
      'Mengisi rekapitulasi absensi santri yang makan malam dan santri sakit di asrama'
    ],
    colorBorder: 'border-purple-400 dark:border-purple-600',
    cardBg: 'bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900'
  },
  {
    code: 'S3A',
    category: 'sore',
    categoryLabel: 'Shif Sore',
    categoryIcon: <Sunset className="w-4 h-4 text-orange-500" />,
    categoryColor: 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800',
    dutyTime: '15:00 – 23:00 WIB',
    workHours: 8,
    badgeBg: 'bg-orange-500 text-white font-black',
    tagline: 'Piket Sore Kantin, Asrama & Evaluasi Jenjang SMA',
    description: 'Menjaga asrama SMA, merawat anak asuh sakit di jenjang SMA, mengarahkan santri ke kantin, memimpin sesi makan malam santri SMA, serta memimpin evaluasi kedisiplinan dan pembinaan malam santri SMA.',
    responsibilities: [
      'Pukul 15:00 – 17:30: Apel shif sore, pengecekan kebersihan asrama SMA, dan pemantauan olahraga sore',
      'Pukul 17:30 – 18:30: Mengawal anak asuh SMA ke masjid untuk Shalat Maghrib berjamaah dan kajian maghrib',
      'Pukul 18:45 – 19:45: Memimpin dan mengawal kegiatan makan malam santri di Kantin SMA',
      'Pukul 19:45 – 21:00: Shalat Isya berjamaah dan memimpin evaluasi malam santri jenjang SMA',
      'Pukul 21:00 – 23:00: Mengawasi jam belajar mandiri santri SMA, memastikan gerbang asrama terkunci, dan serah terima ke petugas M'
    ],
    rulesAndNotes: [
      'Formasi standar: 2 Petugas Wali Asuh',
      'Bertindak sebagai evaluator dan pembina langsung bagi anak asuh SMA',
      'Memastikan seluruh kamar asrama SMA tertib dan lampu dipadamkan pada jam tidur'
    ],
    colorBorder: 'border-orange-400 dark:border-orange-600',
    cardBg: 'bg-gradient-to-br from-orange-50/50 via-white to-orange-50/30 dark:from-orange-950/20 dark:via-slate-900 dark:to-slate-900'
  },
  {
    code: 'S4A',
    category: 'sore',
    categoryLabel: 'Shif Sore',
    categoryIcon: <Sunset className="w-4 h-4 text-emerald-500" />,
    categoryColor: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
    dutyTime: '15:00 – 23:00 WIB',
    workHours: 8,
    badgeBg: 'bg-emerald-600 text-white font-black',
    tagline: 'Piket Sore Pengarahan, Jaga Masjid & Lingkungan Luar',
    description: 'Bertanggung jawab atas pengarahan dan mobilisasi anak asuh ke masjid untuk shalat berjamaah, pengawasan ketertiban di masjid, serta patroli area lingkungan luar asrama dan kantin.',
    responsibilities: [
      'Pukul 15:00 – 17:00: Patroli lingkungan luar asrama, masjid, lapangan, dan pos depan',
      'Pukul 17:15 – 18:45: Siaga di area gerbang masjid, mengarahkan santri masuk masjid tepat waktu, penertiban shaf shalat Maghrib',
      'Pukul 19:00 – 20:30: Pengawasan shalat Isya berjamaah di masjid dan ketertiban santri saat bubar menuju asrama',
      'Pukul 20:30 – 23:00: Patroli perimeter luar, mengecek pintu gerbang luar dan fasilitas bersama, serta koordinasi serah terima shif'
    ],
    rulesAndNotes: [
      'Fokus utama di lingkungan Masjid dan area luar (bukan di dalam kantin/ruang makan)',
      'Memastikan tidak ada santri yang tertinggal di asrama saat waktu shalat berjamaah'
    ],
    colorBorder: 'border-emerald-400 dark:border-emerald-600',
    cardBg: 'bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900'
  },
  {
    code: 'S',
    category: 'sore',
    categoryLabel: 'Shif Sore',
    categoryIcon: <Sunset className="w-4 h-4 text-amber-500" />,
    categoryColor: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
    dutyTime: '15:00 – 23:00 WIB',
    workHours: 8,
    badgeBg: 'bg-amber-600 text-white font-bold',
    tagline: 'Piket Jaga Sore Umum (Standar)',
    description: 'Kode umum jaga sore yang mendampingi aktivitas santri sore hari, ibadah Maghrib & Isya di masjid, pendampingan makan malam, jam belajar, hingga jam tidur malam (15:00 - 23:00).',
    responsibilities: [
      'Pukul 15:00: Datang dan apel koordinasi tugas shif sore bersama seluruh personil',
      'Pukul 15:30 – 18:00: Pendampingan aktivitas sore, ekstra kurikuler santri, dan kebersihan diri',
      'Pukul 18:00 – 20:00: Pendampingan ibadah shalat berjamaah dan makan malam',
      'Pukul 20:00 – 23:00: Pengawasan belajar malam, penertiban tidur anak asuh, dan serah terima malam'
    ],
    rulesAndNotes: [
      'Merupakan kode shif sore fleksibel sebelum pembagian tugas spesifik (S2A, S3A, S4A)',
      'Wajib siaga penuh di lingkungan sekolah/asrama'
    ],
    colorBorder: 'border-amber-400 dark:border-amber-600',
    cardBg: 'bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900'
  },

  // --- SHIF MALAM ---
  {
    code: 'M1',
    category: 'malam',
    categoryLabel: 'Shif Malam',
    categoryIcon: <Moon className="w-4 h-4 text-indigo-400" />,
    categoryColor: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
    dutyTime: '15:00 – 07:00 WIB',
    workHours: 16,
    badgeBg: 'bg-indigo-600 text-white font-black',
    tagline: 'Jaga Malam Utama Sesi 1 (Putra / Asrama SMP s.d 00:00 & Subuh)',
    description: 'Piket malam siaga asrama sesi 1 dengan rentang dinas 16 jam. Fokus utama pada pengawasan keamanan perimeter, gerbang utama, dan patroli asrama putra/SMP hingga tengah malam (pukul 00:00) serta berlanjut pada waktu Subuh hingga pagi (07:00).',
    responsibilities: [
      'Pukul 15:00 – 23:00: Mendukung pengamanan sore, pintu gerbang, dan pemantauan jam belajar santri',
      'Pukul 23:00 – 00:00: Koordinasi kedatangan M3, penguncian seluruh akses gerbang luar, dan patroli perimeter malam',
      'Pukul 00:00 – 03:00: Pengawasan bergilir sesuai jadwal istirahat siaga malam',
      'Pukul 03:30 – 07:00: Bangun subuh, mobilisasi santri ke masjid, pembinaan shubuh, sarapan, dan apel pagi sampai serah terima ke shif P (07:00)'
    ],
    rulesAndNotes: [
      'Dinas total 16 Jam Kerja (15:00 – 07:00 WIB)',
      'DILARANG MENINGGALKAN AREA DINAS tanpa izin resmi dari pimpinan/koordinator',
      'Mendapatkan hak Lepas Piket (LP) keesokan harinya'
    ],
    colorBorder: 'border-indigo-400 dark:border-indigo-600',
    cardBg: 'bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/30 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900'
  },
  {
    code: 'M2',
    category: 'malam',
    categoryLabel: 'Shif Malam',
    categoryIcon: <Moon className="w-4 h-4 text-blue-400" />,
    categoryColor: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
    dutyTime: '15:00 – 07:00 WIB',
    workHours: 16,
    badgeBg: 'bg-blue-700 text-white font-black',
    tagline: 'Jaga Malam Utama Sesi 2 (Putri / Asrama SMA & Dini Hari)',
    description: 'Piket malam siaga asrama sesi 2 dengan rentang dinas 16 jam. Bertanggung jawab atas pengawasan asrama putri/SMA, penertiban jam tidur anak asuh, dan pelaksanaan tugas dini hari setelah Subuh hingga pagi.',
    responsibilities: [
      'Pukul 15:00 – 23:00: Siaga pengawasan santri putri/SMA dan monitoring aktivitas malam',
      'Pukul 23:00 – 03:00: Pemeriksaan keamanan kamar santri putri, lampu asrama, dan fasilitas santri',
      'Pukul 03:00 – 05:00: Persiapan santri untuk shalat Qiyamul Lail dan shalat Shubuh berjamaah',
      'Pukul 05:00 – 07:00: Pendampingan kebersihan kamar putri, sarapan pagi bersama, dan handover dinas pagi'
    ],
    rulesAndNotes: [
      'Dinas total 16 Jam Kerja (15:00 – 07:00 WIB)',
      'Petugas perempuan fokus pada pengawasan asrama putri setelah subuh sampai jam 07:00 WIB',
      'Mendapatkan hak Lepas Piket (LP) pada hari berikutnya'
    ],
    colorBorder: 'border-blue-400 dark:border-blue-600',
    cardBg: 'bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900'
  },
  {
    code: 'M3',
    category: 'malam',
    categoryLabel: 'Shif Malam',
    categoryIcon: <Moon className="w-4 h-4 text-fuchsia-400" />,
    categoryColor: 'text-fuchsia-700 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/60 border-fuchsia-200 dark:border-fuchsia-800',
    dutyTime: '23:00 – 07:00 WIB',
    workHours: 8,
    badgeBg: 'bg-fuchsia-600 text-white font-black ring-1 ring-fuchsia-300',
    tagline: 'Jaga Malam Pendamping (Keliling 23:00, Foto Grup, Lanjut M2 Pukul 03:00)',
    description: 'Petugas malam pendamping full semua shif malam. Datang dinas tepat pukul 23:00 WIB, wajib langsung keliling memeriksa asrama dan lingkungan sekitar, mengirimkan bukti foto ke grup koordinasi, dan mulai pukul 03:00 menjalankan tugas kode M2.',
    responsibilities: [
      'Pukul 23:00: DATANG TEPAT WAKTU, absen dinas, dan langsung keliling patroli seluruh asrama dan lingkungan',
      'Pukul 23:15: Wajib mengirimkan DOKUMENTASI FOTO PATROLI keliling ke grup WhatsApp dinas sebagai bukti kesiapsiagaan',
      'Pukul 23:30 – 03:00: Siaga aktif menjaga pos, memantau keamanan perimeter asrama dan ketertiban santri tidur',
      'Pukul 03:00 – 07:00: Otomatis menjalankan tugas kode M2 (membangunkan anak asuh, shalat tahajjud, shalat shubuh, sarapan pagi, dan apel)'
    ],
    rulesAndNotes: [
      'Jam dinas: 23:00 – 07:00 WIB (8 Jam Kerja)',
      'WAJIB KIRIM FOTO: Setiap personil M3 wajib mengirimkan foto bukti keliling asrama saat tiba pukul 23:00',
      'DILARANG TIDUR: Merupakan shif siaga dini hari yang sangat krusial bagi keselamatan santri'
    ],
    colorBorder: 'border-fuchsia-400 dark:border-fuchsia-600',
    cardBg: 'bg-gradient-to-br from-fuchsia-50/50 via-white to-fuchsia-50/30 dark:from-fuchsia-950/20 dark:via-slate-900 dark:to-slate-900'
  },
  {
    code: 'M',
    category: 'malam',
    categoryLabel: 'Shif Malam',
    categoryIcon: <Moon className="w-4 h-4 text-indigo-400" />,
    categoryColor: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
    dutyTime: '15:00 – 07:00 WIB',
    workHours: 16,
    badgeBg: 'bg-indigo-600 text-white font-bold',
    tagline: 'Jaga Malam & Dini Hari Standar (16 Jam)',
    description: 'Kode dasar jaga malam yang mencakup seluruh rangkaian tugas siaga malam, pengawasan asrama putra/putri, patroli keamanan perimeter, pengawalan ibadah malam/subuh, hingga persiapan sarapan pagi (15:00 - 07:00).',
    responsibilities: [
      'Pukul 15:00 – 23:00: Pengamanan sore, apel malam, dan penertiban anak asuh',
      'Pukul 23:00 – 04:00: Patroli keamanan lingkungan dan pengawasan jam tidur santri',
      'Pukul 04:00 – 07:00: Membangunkan santri shubuh, ibadah bersama, sarapan, dan serah terima shif pagi'
    ],
    rulesAndNotes: [
      'Dinas penuh 16 jam kerja',
      'Petugas laki-laki siaga s.d 00:00, petugas perempuan aktif setelah subuh s.d 07:00'
    ],
    colorBorder: 'border-indigo-400 dark:border-indigo-600',
    cardBg: 'bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/30 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900'
  },

  // --- NON-DINAS ---
  {
    code: 'LP',
    category: 'libur',
    categoryLabel: 'Bebas Tugas',
    categoryIcon: <Coffee className="w-4 h-4 text-slate-500" />,
    categoryColor: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
    dutyTime: '07:00 – 24:00 WIB',
    workHours: 0,
    badgeBg: 'bg-white text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 font-bold',
    tagline: 'Lepas Piket Pasca Jaga Malam (Hak Istirahat)',
    description: 'Hak istirahat dan pemulihan stamina yang diberikan secara otomatis kepada personil setelah menyelesaikan tugas dinas shif malam (M / M1 / M2 / M3) dari pukul 15:00/23:00 hingga pagi pukul 07:00.',
    responsibilities: [
      'Melakukan serah terima kelengkapan dinas kepada petugas shif Pagi pukul 07:00 WIB',
      'Memastikan seluruh buku jurnal jaga malam telah diisi dengan lengkap dan tertib',
      'Meninggalkan pos dinas untuk beristirahat dan pemulihan kondisi fisik'
    ],
    rulesAndNotes: [
      'Bebas dari segala kewajiban kedinasan sepanjang sisa hari tersebut',
      'Dilarang diberikan beban tugas piket ganda pada hari yang sama'
    ],
    colorBorder: 'border-slate-300 dark:border-slate-700',
    cardBg: 'bg-gradient-to-br from-slate-50/60 via-white to-slate-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950'
  },
  {
    code: 'O',
    category: 'libur',
    categoryLabel: 'Bebas Tugas',
    categoryIcon: <Coffee className="w-4 h-4 text-red-500" />,
    categoryColor: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800',
    dutyTime: '00:00 – 24:00 WIB',
    workHours: 0,
    badgeBg: 'bg-red-600 text-white font-black',
    tagline: 'Off / Libur Terjadwal (Bebas Dinas)',
    description: 'Hari libur rutin yang telah dijadwalkan secara resmi dalam roster bulanan. Petugas bebas tugas dinas dan tidak memiliki kewajiban menjaga pos atau asrama pada hari tersebut.',
    responsibilities: [
      'Memanfaatkan waktu untuk istirahat keluarga dan pemulihan stamina',
      'Tetap menjaga kesiapsiagaan komunikasi darurat jika sewaktu-waktu dibutuhkan instruksi kedinasan mendesak'
    ],
    rulesAndNotes: [
      'Dapat diajukan permohonan tukar shif resmi melalui panel admin jika terdapat keperluan penting',
      'Tidak mengurangi jatah cuti tahunan pegawai'
    ],
    colorBorder: 'border-red-300 dark:border-red-800',
    cardBg: 'bg-gradient-to-br from-red-50/40 via-white to-red-50/20 dark:from-red-950/20 dark:via-slate-900 dark:to-slate-900'
  },
  {
    code: 'C',
    category: 'libur',
    categoryLabel: 'Bebas Tugas',
    categoryIcon: <Coffee className="w-4 h-4 text-rose-500" />,
    categoryColor: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
    dutyTime: '00:00 – 24:00 WIB',
    workHours: 0,
    badgeBg: 'bg-rose-600 text-white font-black',
    tagline: 'Cuti Resmi / Izin Kedinasan Disetujui',
    description: 'Status cuti resmi (cuti tahunan, cuti sakit, cuti melahirkan, atau izin khusus kedinasan) yang telah disetujui secara tertulis oleh pimpinan Sekolah Rakyat / Kemensos RI.',
    responsibilities: [
      'Menyerahkan mandat tugas kepada personil pengganti sebelum masa cuti dimulai',
      'Melapor kembali ke bagian kepegawaian/admin jadwal setelah masa cuti berakhir'
    ],
    rulesAndNotes: [
      'Telah mendapatkan persetujuan tertulis dari pimpinan/koordinator',
      'Tercatat resmi dalam rekapitulasi presensi bulanan'
    ],
    colorBorder: 'border-rose-300 dark:border-rose-800',
    cardBg: 'bg-gradient-to-br from-rose-50/40 via-white to-rose-50/20 dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900'
  },
  {
    code: 'IZIN',
    category: 'libur',
    categoryLabel: 'Perizinan Petugas',
    categoryIcon: <FileText className="w-4 h-4 text-rose-500" />,
    categoryColor: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
    dutyTime: '00:00 – 24:00 WIB',
    workHours: 0,
    badgeBg: 'bg-rose-600 text-white font-black ring-1 ring-rose-400',
    tagline: 'Perizinan Petugas: Sakit, Dinas Luar & Keperluan Lain (Tautan Bukti Google Drive)',
    description: 'Status perizinan resmi bagi wali asuh yang berhalangan dinas dengan kategori: Sakit (dengan surat dokter), Dinas Luar (surat tugas resmi pimpinan), atau Keperluan Lain. Tersinkronisasi otomatis dengan halaman Rekapitulasi Izin, dan petugas maupun admin dapat mencantumkan Link Google Drive bukti surat resmi agar rekan lainnya dapat langsung melihatnya.',
    responsibilities: [
      'Melaporkan permohonan izin kepada pimpinan / koordinator dinas sebelum jam dinas dimulai',
      'Mencantumkan Link Google Drive surat dokter / surat tugas dinas melalui Dashboard Hari Ini, Matriks, atau Menu Perizinan (IZIN)',
      'Memastikan akses berbagi (Share) link Google Drive diatur ke "Siapa saja yang memiliki link" agar rekan lainnya dapat membuka dokumen'
    ],
    rulesAndNotes: [
      'Seluruh kode IZIN di matriks jadwal otomatis masuk ke Rekapitulasi Izin, Sakit & Dinas',
      'Saat rekan lainnya mengklik tombol bukti izin, sistem langsung mengarahkan ke Link Google Drive tersebut',
      'Dihitung 0 jam kerja dinas pada hari izin berlangsung'
    ],
    colorBorder: 'border-rose-400 dark:border-rose-600',
    cardBg: 'bg-gradient-to-br from-rose-50/60 via-white to-rose-50/30 dark:from-rose-950/30 dark:via-slate-900 dark:to-slate-900'
  }
];

export const CodeGuideView: React.FC<CodeGuideViewProps> = ({ onNavigateToTab }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'pagi' | 'sore' | 'malam' | 'libur'>('all');

  const filteredData = SHIFT_GUIDE_DATA.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesQuery = 
      item.code.toLowerCase().includes(query) ||
      item.tagline.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.dutyTime.toLowerCase().includes(query) ||
      item.responsibilities.some(r => r.toLowerCase().includes(query)) ||
      item.rulesAndNotes.some(rn => rn.toLowerCase().includes(query));

    return matchesCategory && matchesQuery;
  });

  return (
    <div className="space-y-2.5 pb-8 animate-in fade-in duration-300">
      {/* Top Banner / Header (Dibuat Lebih Rapat & Ringkas) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                <BookOpen className="w-3 h-3" />
                <span>Kamus & Petunjuk Resmi</span>
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold">
                <ShieldCheck className="w-2.5 h-2.5" />
                SRT 1 Kab Kediri • Kemensos RI
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 pt-0.5">
              <span>Petunjuk & Keterangan Semua Kode Penugasan</span>
            </h1>
            <p className="text-[11.5px] sm:text-xs text-slate-600 dark:text-slate-300 max-w-3xl leading-snug">
              Panduan lengkap definisi, jam kerja resmi, uraian tugas pokok & fungsi (tupoksi), tata tertib, serta alur kepulangan untuk setiap kode shif wali asuh.
            </p>
          </div>

          {/* Quick Action Navigation Links */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 self-start md:self-center shrink-0 pt-1 md:pt-0">
            <button
              onClick={() => onNavigateToTab('dashboard')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => onNavigateToTab('matrix')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <CalendarDays className="w-3 h-3" />
              <span>Matriks Roster</span>
            </button>
            <button
              onClick={() => onNavigateToTab('assignment')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Send className="w-3 h-3" />
              <span>Pengingat Penugasan</span>
            </button>
          </div>
        </div>

        {/* Quick Summary Counter Bar (Rapat & Hemat Ruang) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60">
            <div className="px-2 py-1 rounded-md bg-sky-600 text-white font-black text-xs leading-none">P</div>
            <div className="min-w-0">
              <div className="text-[10.5px] font-bold text-sky-900 dark:text-sky-300 leading-tight">Shif Pagi (P1-P4)</div>
              <div className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">07:00 – 16:00/20:00</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60">
            <div className="px-2 py-1 rounded-md bg-purple-600 text-white font-black text-xs leading-none">S</div>
            <div className="min-w-0">
              <div className="text-[10.5px] font-bold text-purple-900 dark:text-purple-300 leading-tight">Shif Sore (S2A-S4A)</div>
              <div className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">15:00 – 23:00 (8 Jam)</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60">
            <div className="px-2 py-1 rounded-md bg-indigo-600 text-white font-black text-xs leading-none">M</div>
            <div className="min-w-0">
              <div className="text-[10.5px] font-bold text-indigo-900 dark:text-indigo-300 leading-tight">Shif Malam (M1-M3)</div>
              <div className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">15:00/23:00 – 07:00</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
            <div className="px-1.5 py-1 rounded-md bg-slate-700 text-white font-black text-xs leading-none">OFF</div>
            <div className="min-w-0">
              <div className="text-[10.5px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Non-Dinas (LP, O, C)</div>
              <div className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">Lepas Piket, Libur, Cuti</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar (Rapat) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white dark:bg-slate-800 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Semua ({SHIFT_GUIDE_DATA.length})
          </button>
          <button
            onClick={() => setSelectedCategory('pagi')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'pagi'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50'
            }`}
          >
            <Sun className="w-3 h-3 text-sky-500" />
            <span>Pagi (4)</span>
          </button>
          <button
            onClick={() => setSelectedCategory('sore')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'sore'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50'
            }`}
          >
            <Sunset className="w-3 h-3 text-purple-500" />
            <span>Sore (4)</span>
          </button>
          <button
            onClick={() => setSelectedCategory('malam')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'malam'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
            }`}
          >
            <Moon className="w-3 h-3 text-indigo-400" />
            <span>Malam (4)</span>
          </button>
          <button
            onClick={() => setSelectedCategory('libur')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'libur'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50'
            }`}
          >
            <Coffee className="w-3 h-3 text-red-500" />
            <span>Libur (3)</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:min-w-[240px]">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode, tugas, jam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1.5 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Hapus
            </button>
          )}
        </div>
      </div>

      {/* Grid of Shift Code Cards (Layout Padat & Rapat) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {filteredData.map((item) => (
          <div
            key={item.code}
            id={`shift-guide-card-${item.code}`}
            className={`rounded-xl border ${item.colorBorder} ${item.cardBg} p-3 sm:p-3.5 shadow-2xs transition-all hover:shadow-xs relative overflow-hidden flex flex-col justify-between`}
          >
            <div>
              {/* Header Card: Badge Code, Name & Category */}
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-slate-700/70">
                <div className="flex items-center gap-2">
                  <div className={`px-2.5 py-1 rounded-lg font-black text-sm sm:text-base shadow-2xs tracking-wider flex items-center justify-center leading-none ${item.badgeBg}`}>
                    {item.code}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                      {item.tagline}
                    </h3>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${item.categoryColor}`}>
                        {item.categoryIcon}
                        <span>{item.categoryLabel}</span>
                      </span>
                      {item.code === 'P4' && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white font-black text-[9px] shadow-2xs">
                          Pulang Setelah Makan Malam
                        </span>
                      )}
                      {item.code === 'M3' && (
                        <span className="px-1.5 py-0.2 rounded bg-fuchsia-600 text-white font-black text-[9px] shadow-2xs animate-pulse">
                          Wajib Foto Keliling 23:00
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Working Hours Pill */}
                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-slate-950 text-[11px] font-bold shadow-2xs">
                    <Clock className="w-2.5 h-2.5 text-amber-300" />
                    <span>{item.dutyTime}</span>
                  </div>
                  <div className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.workHours > 0 ? `${item.workHours} Jam Kerja (JK)` : 'Bebas JK'}
                  </div>
                </div>
              </div>

              {/* Description Statement */}
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed pt-2">
                {item.description}
              </p>

              {/* Responsibilities List */}
              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Rincian Tugas Pokok & Alur Waktu (SOP)</span>
                </h4>
                <ul className="space-y-1 text-[10.5px] text-slate-700 dark:text-slate-300">
                  {item.responsibilities.map((resp, idx) => (
                    <li key={idx} className="flex items-start gap-1 leading-snug">
                      <span className="text-blue-600 dark:text-blue-400 font-bold shrink-0 mt-0.5">•</span>
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Rules and Mandatory Notes */}
              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 flex items-center gap-1 mb-1">
                  <Info className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Aturan & Ketentuan Khusus</span>
                </h4>
                <ul className="space-y-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                  {item.rulesAndNotes.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-1 leading-tight">
                      <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">✓</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Card Footer with Direct Links */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2 text-[10px]">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Kode Roster: <strong>{item.code}</strong>
              </span>
              <button
                onClick={() => onNavigateToTab('matrix')}
                className="inline-flex items-center gap-0.5 font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <span>Lihat di Matriks</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak ada kode yang cocok</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Coba gunakan kata kunci pencarian lain atau pilih kategori Semua.</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="mt-2.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer"
          >
            Reset Pencarian
          </button>
        </div>
      )}

      {/* General Institutional Guidelines Card (Rapat) */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border border-blue-500/30 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <h3 className="font-black text-xs sm:text-sm text-amber-200">
                Prinsip Kedisiplinan & Integritas Penugasan Wali Asuh
              </h3>
            </div>
            <p className="text-[10.5px] text-blue-100/90 leading-snug max-w-4xl">
              1. Setiap petugas wajib hadir 10 menit sebelum jam dinas dimulai untuk koordinasi serah terima.<br />
              2. Seluruh kejadian penting, kendala santri, dan santri berobat wajib dicatat dalam Jurnal Serah Terima.<br />
              3. Penukaran jadwal shif hanya sah bila diajukan melalui persetujuan resmi admin/pimpinan.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            <button
              onClick={() => onNavigateToTab('handover')}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
            >
              Serah Terima
            </button>
            <button
              onClick={() => onNavigateToTab('matrix')}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs border border-white/30 transition-colors cursor-pointer"
            >
              Matriks Roster
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
