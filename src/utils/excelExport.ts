import * as XLSX from 'xlsx';
import { MonthSchedule, ShiftSummary } from '../types';
import { SHIFT_DEFINITIONS } from '../data/initialSchedule';
import { calculateDailyStats, INDONESIAN_MONTH_NAMES, INDONESIAN_DAY_NAMES } from './scheduler';

export function exportScheduleToExcel(
  schedule: MonthSchedule,
  summaries: ShiftSummary[],
  filename?: string
): void {
  const wb = XLSX.utils.book_new();
  const monthName = schedule.monthName || INDONESIAN_MONTH_NAMES[schedule.month - 1] || `Bulan ${schedule.month}`;
  const totalDays = schedule.totalDays;

  // -------------------------------------------------------------
  // SHEET 1: MATRIKS JADWAL UTAMA
  // -------------------------------------------------------------
  const matrixData: (string | number)[][] = [];

  // Title Headers
  matrixData.push(['JADWAL DINAS WALI ASUH / PETUGAS ASRAMA']);
  matrixData.push([`Periode: ${monthName} ${schedule.year} (Total: ${totalDays} Hari, ${schedule.staffList.length} Personel)`]);
  matrixData.push([]); // Empty row

  // Day of Week Header Row (Minggu, Senin, ...)
  const dayNamesRow: (string | number)[] = ['No', 'Nama Personel'];
  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(schedule.year, schedule.month - 1, d);
    const dayOfWeek = dateObj.getDay();
    const shortDay = INDONESIAN_DAY_NAMES[dayOfWeek].substring(0, 3); // Min, Sen, Sel, ...
    dayNamesRow.push(shortDay);
  }
  // Rekap headers
  dayNamesRow.push(
    'P FULL',
    'S',
    'S2A (Kantin SMP)',
    'S3A (Kantin SMA)',
    'S4A (Jaga Masjid)',
    'M (Total)',
    'M1 (s.d 00:00)',
    'M2 (Subuh-07:00)',
    'LP',
    'OFF',
    'P1 (07:00-15:00)',
    'P2 (08:00-16:00)',
    'P3',
    'JK (Jam Kerja)'
  );
  matrixData.push(dayNamesRow);

  // Date Numbers Header Row (1, 2, 3, ... 30/31)
  const dateNumsRow: (string | number)[] = ['#', 'Tanggal ->'];
  for (let d = 1; d <= totalDays; d++) {
    dateNumsRow.push(d);
  }
  dateNumsRow.push(
    'P-Tot',
    'S-Tot',
    'S2A',
    'S3A',
    'S4A',
    'M-Tot',
    'M1',
    'M2',
    'LP',
    'OFF',
    'P1',
    'P2',
    'P3',
    'Jam'
  );
  matrixData.push(dateNumsRow);

  // Staff Rows
  schedule.staffList.forEach((staff, idx) => {
    const summary = summaries.find((s) => s.staffId === staff.id);
    const row: (string | number)[] = [idx + 1, staff.name];

    for (let d = 1; d <= totalDays; d++) {
      const shift = schedule.days[d]?.[staff.id] || 'O';
      row.push(shift);
    }

    const p1Count = (summary?.p1 || 0) + (summary?.p || 0);
    row.push(
      summary?.pFull || 0,
      summary?.s || 0,
      summary?.s2a || 0,
      summary?.s3a || 0,
      summary?.s4a || 0,
      summary?.m || 0,
      summary?.m1 || 0,
      summary?.m2 || 0,
      summary?.lp || 0,
      summary?.off || 0,
      p1Count,
      summary?.p2 || 0,
      summary?.p3 || 0,
      summary?.totalHours || 0
    );

    matrixData.push(row);
  });

  // Footer Stats / Rekap Harian
  const dailyStatsList = Array.from({ length: totalDays }, (_, i) =>
    calculateDailyStats(i + 1, schedule.days, schedule.staffList)
  );

  matrixData.push([]); // Spacer row
  matrixData.push(['--- REKAPITULASI KEBUTUHAN PETUGAS HARIAN ---']);

  // P1 Row
  const p1Row: (string | number)[] = ['', '(P1) 07:00 - 15:00'];
  dailyStatsList.forEach((st) => p1Row.push((st.p1 || 0) + (st.p || 0)));
  matrixData.push(p1Row);

  // P2 Row
  const p2Row: (string | number)[] = ['', '(P2) 08:00 - 16:00'];
  dailyStatsList.forEach((st) => p2Row.push(st.p2 || 0));
  matrixData.push(p2Row);

  // P3 Row
  const p3Row: (string | number)[] = ['', '(P3) 07:00 - 16:00 (Upacara)'];
  dailyStatsList.forEach((st) => p3Row.push(st.p3 || 0));
  matrixData.push(p3Row);

  // PAGI FULL Row
  const pagiFullRow: (string | number)[] = ['', '(PAGI FULL)'];
  dailyStatsList.forEach((st) => pagiFullRow.push(st.pagiFull || 0));
  matrixData.push(pagiFullRow);

  // TOTAL SORE Row
  const soreTotalRow: (string | number)[] = ['', '(S) TOTAL SORE (15:00-23:00)'];
  dailyStatsList.forEach((st) => soreTotalRow.push(st.s || 0));
  matrixData.push(soreTotalRow);

  // SORE WALI ASUH Row
  const soreWaliRow: (string | number)[] = ['', 'SORE WALI ASUH'];
  dailyStatsList.forEach((st) => soreWaliRow.push(st.soreWali?.length || 0));
  matrixData.push(soreWaliRow);

  // S2A Kantin SMP
  const s2aRow: (string | number)[] = ['', 'S2A KANTIN SMP'];
  dailyStatsList.forEach((st) => s2aRow.push(st.s2a || 0));
  matrixData.push(s2aRow);

  // S3A Kantin SMA
  const s3aRow: (string | number)[] = ['', 'S3A KANTIN SMA'];
  dailyStatsList.forEach((st) => s3aRow.push(st.s3a || 0));
  matrixData.push(s3aRow);

  // S4A Jaga Masjid
  const s4aRow: (string | number)[] = ['', 'S4A JAGA MASJID'];
  dailyStatsList.forEach((st) => s4aRow.push(st.s4a || 0));
  matrixData.push(s4aRow);

  // M Malam
  const mRow: (string | number)[] = ['', '(M) TOTAL MALAM (15:00-07:00)'];
  dailyStatsList.forEach((st) => mRow.push(st.m || 0));
  matrixData.push(mRow);

  // M1 Malam Sesi 1
  const m1Row: (string | number)[] = ['', 'M1 MALAM (s.d 00:00)'];
  dailyStatsList.forEach((st) => m1Row.push(st.m1 || 0));
  matrixData.push(m1Row);

  // M2 Malam Sesi 2
  const m2Row: (string | number)[] = ['', 'M2 MALAM (Subuh-07:00)'];
  dailyStatsList.forEach((st) => m2Row.push(st.m2 || 0));
  matrixData.push(m2Row);

  // M3 Malam Pendamping
  const m3Row: (string | number)[] = ['', 'M3 MALAM (Pendamping 23:00-07:00)'];
  dailyStatsList.forEach((st) => m3Row.push(st.m3 || 0));
  matrixData.push(m3Row);

  // LP Lepas Piket
  const lpRow: (string | number)[] = ['', '(LP) LEPAS PIKET'];
  dailyStatsList.forEach((st) => lpRow.push(st.lepasWali?.length || 0));
  matrixData.push(lpRow);

  // OFF Libur
  const offRow: (string | number)[] = ['', '(OFF) LIBUR'];
  dailyStatsList.forEach((st) => offRow.push(st.offWali?.length || 0));
  matrixData.push(offRow);

  // TOTAL PERSONEL
  const totalRow: (string | number)[] = ['', 'TOTAL PERSONEL'];
  dailyStatsList.forEach((st) => totalRow.push(st.total || schedule.staffList.length));
  matrixData.push(totalRow);

  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);

  // Column widths formatting for sheet 1
  const colWidths: { wch: number }[] = [
    { wch: 5 },  // No
    { wch: 32 }, // Nama
  ];
  for (let d = 1; d <= totalDays; d++) {
    colWidths.push({ wch: 6 }); // Day columns
  }
  // Rekap summary columns
  colWidths.push(
    { wch: 9 },  // P Full
    { wch: 8 },  // S
    { wch: 10 }, // S2A
    { wch: 10 }, // S3A
    { wch: 10 }, // S4A
    { wch: 8 },  // M
    { wch: 8 },  // M1
    { wch: 8 },  // M2
    { wch: 6 },  // LP
    { wch: 6 },  // OFF
    { wch: 8 },  // P1
    { wch: 8 },  // P2
    { wch: 8 },  // P3
    { wch: 10 }  // JK
  );
  wsMatrix['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Jadwal Matriks');

  // -------------------------------------------------------------
  // SHEET 2: REKAPITULASI & JAM KERJA
  // -------------------------------------------------------------
  const summaryData: (string | number)[][] = [
    ['REKAPITULASI PENUGASAN & JAM KERJA WALI ASUH'],
    [`Periode: ${monthName} ${schedule.year}`],
    [],
    [
      'No',
      'Nama Personel',
      'P1 (07:00-15:00)',
      'P2 (08:00-16:00)',
      'P3 (07:00-16:00 Upacara)',
      'Total Pagi',
      'Sore Standar (S)',
      'S2A (Kantin SMP)',
      'S3A (Kantin SMA)',
      'S4A (Jaga Masjid)',
      'Total Sore',
      'Malam Total (M)',
      'M1 (s.d 00:00)',
      'M2 (Subuh-07:00)',
      'Lepas Piket (LP)',
      'Libur (OFF)',
      'Total Jam Kerja (JK)',
      'Rata-rata Jam/Hari',
    ],
  ];

  summaries.forEach((s, idx) => {
    const p1Val = (s.p1 || 0) + (s.p || 0);
    const totalSore = s.s + s.s2a + s.s3a + s.s4a;
    const avgHours = (s.totalHours / totalDays).toFixed(1);

    summaryData.push([
      idx + 1,
      s.staffName,
      p1Val,
      s.p2 || 0,
      s.p3 || 0,
      s.pFull,
      s.s,
      s.s2a,
      s.s3a,
      s.s4a,
      totalSore,
      s.m,
      s.m1 || 0,
      s.m2 || 0,
      s.lp,
      s.off,
      s.totalHours,
      `${avgHours} jam/hari`,
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [
    { wch: 5 },  // No
    { wch: 32 }, // Nama
    { wch: 16 }, // P1
    { wch: 16 }, // P2
    { wch: 8 },  // P3
    { wch: 12 }, // Total Pagi
    { wch: 16 }, // S
    { wch: 16 }, // S2A
    { wch: 16 }, // S3A
    { wch: 16 }, // S4A
    { wch: 12 }, // Total Sore
    { wch: 12 }, // M
    { wch: 12 }, // M1
    { wch: 12 }, // M2
    { wch: 15 }, // LP
    { wch: 12 }, // OFF
    { wch: 20 }, // Total Jam
    { wch: 18 }, // Rata-rata
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Rekapitulasi Jam Kerja');

  // -------------------------------------------------------------
  // SHEET 3: KETERANGAN KODE SHIF & ATURAN
  // -------------------------------------------------------------
  const legendData: (string | number)[][] = [
    ['KETERANGAN KODE SHIF & ATURAN OPERASIONAL'],
    [],
    ['Kode Shif', 'Nama Lengkap', 'Jam Tugas', 'Durasi (Jam)', 'Uraian Tugas & Tanggung Jawab'],
    [
      'P1',
      SHIFT_DEFINITIONS['P1']?.fullName || 'Jaga Pagi Sesi 1',
      '07:00 - 15:00',
      8,
      'Piket pagi sesi 1 mendampingi sarapan, apel pagi, dan kegiatan belajar siswa (Khusus hari Senin semua piket pagi = P1)',
    ],
    [
      'P2',
      SHIFT_DEFINITIONS['P2']?.fullName || 'Jaga Pagi Sesi 2',
      '08:00 - 16:00',
      8,
      'Piket pagi sesi 2 mendampingi operasional harian asrama & kepulangan sekolah siswa',
    ],
    [
      'P3',
      SHIFT_DEFINITIONS['P3']?.fullName || 'Jaga Pagi Upacara Hari Senin',
      '07:00 - 16:00',
      9,
      'Piket pagi khusus hari Senin: pendampingan upacara bendera, apel pagi, ketertiban seragam, dan pengawasan santri',
    ],
    [
      'S',
      SHIFT_DEFINITIONS['S']?.fullName || 'Jaga Sore Standar',
      '15:00 - 23:00',
      8,
      'Piket sore mendampingi kegiatan makan malam, belajar malam, dan ibadah asrama',
    ],
    [
      'S2A',
      SHIFT_DEFINITIONS['S2A']?.fullName || 'Jaga Sore Kantin SMP',
      '15:00 - 23:00',
      8,
      'Piket sore pengawasan operasional dan ketertiban area Kantin/Makan SMP',
    ],
    [
      'S3A',
      SHIFT_DEFINITIONS['S3A']?.fullName || 'Jaga Sore Kantin SMA',
      '15:00 - 23:00',
      8,
      'Piket sore pengawasan operasional dan ketertiban area Kantin/Makan SMA',
    ],
    [
      'S4A',
      SHIFT_DEFINITIONS['S4A']?.fullName || 'Jaga Sore Masjid & Lingkungan',
      '15:00 - 23:00',
      8,
      'Piket sore pendampingan ibadah masjid, pengawasan ketertiban luar kantin dan asrama',
    ],
    [
      'M1',
      SHIFT_DEFINITIONS['M1']?.fullName || 'Jaga Malam Sesi 1',
      '15:00 - 00:00',
      9,
      'Piket malam sesi 1 untuk laki-laki bertugas sampai jam 00:00 (apel malam & istirahat santri)',
    ],
    [
      'M2',
      SHIFT_DEFINITIONS['M2']?.fullName || 'Jaga Malam Sesi 2',
      '04:00 - 07:00',
      7,
      'Piket malam sesi 2 untuk perempuan bertugas setelah subuh sampai jam 07:00 (bangun subuh & persiapan pagi)',
    ],
    [
      'M3',
      SHIFT_DEFINITIONS['M3']?.fullName || 'Jaga Malam Pendamping',
      '23:00 - 07:00',
      8,
      'Mendampingi full semua shif malam. Datang jam 23:00 wajib keliling asrama & lingkungan sekitar, kirim foto ke grup, jam 03:00 jalankan SOP M2',
    ],
    [
      'M',
      SHIFT_DEFINITIONS['M']?.fullName || 'Jaga Malam / Piket Malam (Total)',
      '15:00 - 07:00 (Besok)',
      16,
      'Piket malam siaga penuh keamanan barak, patroli istirahat santri, dan darurat malam',
    ],
    [
      'LP',
      SHIFT_DEFINITIONS['LP']?.fullName || 'Lepas Piket',
      'Bebas Tugas',
      0,
      'Istirahat pasca dinas malam (wajib istirahat setelah shif M)',
    ],
    [
      'OFF',
      SHIFT_DEFINITIONS['O']?.fullName || 'Libur Resmi',
      'Libur',
      0,
      'Hari libur dinas rutin staf',
    ],
    [],
    ['ATURAN UTAMA PENUGASAN:'],
    ['1. Jam Kerja: P1 (07:00-15:00), P2 (08:00-16:00), P3 (07:00-16:00 Upacara Senin), S/S2A/S3A/S4A (15:00-23:00), M1 (15:00-00:00), M2 (Subuh-07:00), M3 (23:00-07:00), M (15:00-07:00 Besok).'],
    ['2. Penugasan Malam: M1 untuk petugas laki-laki (s.d 00:00), M2 untuk petugas perempuan (subuh s.d 07:00), M3 mendampingi full semua shif malam (23:00-07:00, keliling & foto ke grup, 03:00 SOP M2).'],
    ['3. Khusus hari Senin: Seluruh penugasan shif pagi ditetapkan sebagai P3 (07:00-16:00 WIB) dikarenakan ada upacara bendera.'],
    ['4. Hari selain Senin: Shif pagi dibagi rata dan adil antara P1 (07:00-15:00) dan P2 (08:00-16:00).'],
    ['5. Pola Rotasi: 1P -> 4S -> 1M -> 1LP secara berkesinambungan.'],
  ];

  const wsLegend = XLSX.utils.aoa_to_sheet(legendData);
  wsLegend['!cols'] = [
    { wch: 12 }, // Kode Shif
    { wch: 28 }, // Nama Lengkap
    { wch: 22 }, // Jam Tugas
    { wch: 14 }, // Durasi
    { wch: 80 }, // Uraian
  ];
  XLSX.utils.book_append_sheet(wb, wsLegend, 'Keterangan Kode Shif');

  // Save / Trigger Download
  const defaultFilename = `Jadwal_Dinas_Wali_Asuh_${monthName}_${schedule.year}.xlsx`;
  XLSX.writeFile(wb, filename || defaultFilename);
}
