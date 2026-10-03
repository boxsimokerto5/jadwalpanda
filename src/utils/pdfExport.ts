import jsPDF from 'jspdf';
import { MonthSchedule, Staff } from '../types';
import { calculateStaffSummary, calculateDailyStats } from './scheduler';
import { INSTITUTION_INFO, SHIFT_DEFINITIONS, getStaffInitials } from '../data/initialSchedule';

export function generateOfficialSchedulePDF(schedule: MonthSchedule, staffList: Staff[]): string {
  const staffSummaries = staffList.map((st) =>
    calculateStaffSummary(st, schedule.days, schedule.totalDays)
  );
  const dailyStatsList = Array.from({ length: schedule.totalDays }, (_, i) =>
    calculateDailyStats(i + 1, schedule.days, staffList)
  );

  // Initialize A4 Landscape PDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 7;

  // Header / Kop Surat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(INSTITUTION_INFO.kementerian.toUpperCase(), pageWidth / 2, 8.5, { align: 'center' });
  doc.text(INSTITUTION_INFO.pusat.toUpperCase(), pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(9.5);
  doc.text(INSTITUTION_INFO.sekolah.toUpperCase(), pageWidth / 2, 15.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(
    `${INSTITUTION_INFO.gedung} - ${INSTITUTION_INFO.alamat} • Pos-el: ${INSTITUTION_INFO.email} Kode Pos: ${INSTITUTION_INFO.kodepos}`,
    pageWidth / 2,
    18.5,
    { align: 'center' }
  );

  // Line separator
  doc.setLineWidth(0.5);
  doc.line(margin, 20, pageWidth - margin, 20);
  doc.setLineWidth(0.2);
  doc.line(margin, 20.6, pageWidth - margin, 20.6);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(INSTITUTION_INFO.judulJadwal.toUpperCase(), pageWidth / 2, 24.5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text(`BULAN ${schedule.monthName.toUpperCase()} ${schedule.year}`, pageWidth / 2, 28, {
    align: 'center',
  });

  // Table Configuration
  const startY = 30;
  const noColWidth = 6;
  const nameColWidth = 30;
  const daysCount = schedule.totalDays;
  const summaryColWidth = 4.8; // 10 summary cols = 48mm
  const totalSummaryWidth = summaryColWidth * 10;
  const dayColWidth = (pageWidth - margin * 2 - noColWidth - nameColWidth - totalSummaryWidth) / daysCount;

  let currentY = startY;
  const isCompact = staffList.length > 20;
  const rowHeight = staffList.length > 25 ? 2.5 : isCompact ? 3.0 : 3.6;
  const textOffsetY = staffList.length > 25 ? 1.85 : isCompact ? 2.2 : 2.6;
  const headerRowHeight = isCompact ? 5.2 : 5.8; // 2-tier header: Tanggal + Nama Hari

  // Draw Base Header Row Box
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, currentY, pageWidth - margin * 2, headerRowHeight, 'F');
  doc.rect(margin, currentY, pageWidth - margin * 2, headerRowHeight, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompact ? 4.6 : 5.4);

  let currentX = margin;
  // No
  doc.setTextColor(0, 0, 0);
  doc.text('No', currentX + noColWidth / 2, currentY + headerRowHeight / 2 + 1.0, { align: 'center' });
  doc.line(currentX + noColWidth, currentY, currentX + noColWidth, currentY + headerRowHeight);
  currentX += noColWidth;

  // Nama
  doc.text('Nama Wali Asuh', currentX + 1.5, currentY + headerRowHeight / 2 + 1.0);
  doc.line(currentX + nameColWidth, currentY, currentX + nameColWidth, currentY + headerRowHeight);
  currentX += nameColWidth;

  // Days 1..31 (Row 1: Angka Tanggal, Row 2: Nama Hari)
  const dayNamesShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  for (let d = 1; d <= daysCount; d++) {
    const dateObj = new Date(schedule.year, schedule.month - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 = Minggu
    const dayName = dayNamesShort[dayOfWeek];
    const isSunday = dayOfWeek === 0;

    // Highlight Sunday in red in header
    if (isSunday) {
      doc.setFillColor(220, 38, 38); // Red
      doc.rect(currentX, currentY, dayColWidth, headerRowHeight, 'FD');
    }

    // Tanggal (Date Number)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isCompact ? 4.2 : 4.8);
    doc.setTextColor(isSunday ? 255 : 0, isSunday ? 255 : 0, isSunday ? 255 : 0);
    doc.text(String(d), currentX + dayColWidth / 2, currentY + (isCompact ? 2.4 : 2.7), { align: 'center' });

    // Dividing line between date number & day name
    doc.setDrawColor(isSunday ? 180 : 200, isSunday ? 30 : 200, isSunday ? 30 : 200);
    doc.line(currentX, currentY + (isCompact ? 2.9 : 3.2), currentX + dayColWidth, currentY + (isCompact ? 2.9 : 3.2));

    // Nama Hari (Day Name: Sel, Rab, Kam, Jum, Sab, Min, Sen)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isCompact ? 2.8 : 3.2);
    if (isSunday) {
      doc.setTextColor(255, 255, 255);
    } else if (dayOfWeek === 5) {
      doc.setTextColor(22, 101, 52); // Dark Green for Friday
    } else {
      doc.setTextColor(51, 65, 85); // Slate Dark
    }
    doc.text(dayName, currentX + dayColWidth / 2, currentY + (isCompact ? 4.6 : 5.1), { align: 'center' });

    doc.setDrawColor(0, 0, 0);
    doc.line(currentX + dayColWidth, currentY, currentX + dayColWidth, currentY + headerRowHeight);
    currentX += dayColWidth;
  }

  // Header row summary column fills
  const sumColsConfig: { label: string; bg?: number[]; textBold?: boolean }[] = [
    { label: 'P FUL', bg: [253, 224, 71] },
    { label: 'S', bg: [251, 146, 60] },
    { label: 'M', bg: [147, 197, 253] },
    { label: 'LP', bg: [186, 230, 253] },
    { label: 'OFF', bg: [254, 205, 211] },
    { label: 'P1', bg: [254, 249, 195] },
    { label: 'P2', bg: [254, 249, 195] },
    { label: 'P3', bg: [254, 249, 195] },
    { label: 'P4', bg: [207, 250, 254] },
    { label: 'JK', bg: [203, 213, 225] },
  ];

  sumColsConfig.forEach((col, idx) => {
    if (col.bg) {
      doc.setFillColor(col.bg[0], col.bg[1], col.bg[2]);
      doc.rect(currentX, currentY, summaryColWidth, headerRowHeight, 'F');
      doc.rect(currentX, currentY, summaryColWidth, headerRowHeight, 'S');
    }
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isCompact ? 4.2 : 5.0);
    doc.text(col.label, currentX + summaryColWidth / 2, currentY + headerRowHeight / 2 + 1.0, { align: 'center' });
    if (idx < sumColsConfig.length - 1) {
      doc.line(currentX + summaryColWidth, currentY, currentX + summaryColWidth, currentY + headerRowHeight);
    }
    currentX += summaryColWidth;
  });

  currentY += headerRowHeight;

  // Rows for Staff (1..20)
  staffList.forEach((staff, staffIdx) => {
    currentX = margin;
    const summary = staffSummaries.find((s) => s.staffId === staff.id);

    // Alternate background for row base
    if (staffIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
    }
    doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'S');

    // No
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isCompact ? 4.6 : 5.5);
    doc.setTextColor(0, 0, 0);
    doc.text(String(staff.id), currentX + noColWidth / 2, currentY + textOffsetY, { align: 'center' });
    doc.line(currentX + noColWidth, currentY, currentX + noColWidth, currentY + rowHeight);
    currentX += noColWidth;

    // Nama + Inisial / Kode
    const initials = getStaffInitials(staff);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isCompact ? 4.5 : 5.2);
    const maxChars = isCompact ? 13 : 16;
    const prefix = staff.code ? `[${staff.code}] ` : '';
    const displayName = staff.name.length > maxChars ? staff.name.substring(0, maxChars - 1) + '.' : staff.name;
    doc.text(`${prefix}${displayName} (${initials})`, currentX + 0.8, currentY + textOffsetY);
    doc.line(currentX + nameColWidth, currentY, currentX + nameColWidth, currentY + rowHeight);
    currentX += nameColWidth;

    // Days 1..31
    for (let d = 1; d <= daysCount; d++) {
      const shift = schedule.days[d]?.[staff.id] || 'O';

      // Solid, Strong and Distinct background colors for shift cells
      let cellBg: number[] | null = null;
      let textCol: number[] = [0, 0, 0];

      if (shift === 'P1' || shift === 'P') {
        cellBg = [186, 230, 253]; // Solid Sky Blue (#BAE6FD)
        textCol = [12, 74, 110];
      } else if (shift === 'P2') {
        cellBg = [153, 246, 228]; // Solid Teal (#99F6E4)
        textCol = [19, 78, 74];
      } else if (shift === 'P3') {
        cellBg = [254, 240, 138]; // Solid Light Yellow (#FEF08A)
        textCol = [113, 63, 18];
      } else if (shift === 'P4') {
        cellBg = [165, 243, 252]; // Solid Cyan (#A5F3FC)
        textCol = [14, 116, 144];
      } else if (shift === 'P5') {
        cellBg = [167, 243, 208]; // Solid Emerald Mint (#A7F3D0)
        textCol = [6, 95, 70];
      } else if (shift === 'S2A') {
        cellBg = [216, 180, 254]; // Solid Vibrant Light Purple (#D8B4FE)
        textCol = [88, 28, 135];
      } else if (shift === 'S3A') {
        cellBg = [251, 146, 60]; // Solid Deep Orange (#FB923C)
        textCol = [67, 20, 7];
      } else if (shift === 'S4A') {
        cellBg = [110, 231, 183]; // Solid Emerald Green (#6EE7B7)
        textCol = [6, 78, 59];
      } else if (shift === 'M1') {
        cellBg = [165, 180, 252]; // Solid Indigo (#A5B4FC)
        textCol = [30, 27, 75];
      } else if (shift === 'M2') {
        cellBg = [147, 197, 253]; // Solid Cobalt Blue (#93C5FD)
        textCol = [15, 23, 42];
      } else if (shift === 'M3') {
        cellBg = [240, 171, 252]; // Solid Magenta/Fuchsia (#F0ABFC)
        textCol = [112, 26, 117];
      } else if (shift === 'S') {
        cellBg = [253, 186, 116]; // Solid Orange (#FDBA74)
        textCol = [67, 20, 7];
      } else if (shift === 'M') {
        cellBg = [147, 197, 253]; // Solid Cobalt Blue (#93C5FD)
        textCol = [15, 23, 42];
      } else if (shift === 'LP') {
        cellBg = [255, 255, 255]; // Solid Pure White (#FFFFFF)
        textCol = [15, 23, 42];
      } else if (shift === 'O' || shift === 'L') {
        cellBg = [220, 38, 38]; // Solid Red (#DC2626)
        textCol = [255, 255, 255];
      } else if (shift === 'C') {
        cellBg = [167, 243, 208]; // Solid Mint Green (#A7F3D0)
        textCol = [6, 78, 59];
      }

      if (cellBg) {
        doc.setFillColor(cellBg[0], cellBg[1], cellBg[2]);
        doc.rect(currentX, currentY, dayColWidth, rowHeight, 'F');
      }

      doc.setTextColor(textCol[0], textCol[1], textCol[2]);

      // Tampilkan Shift Code & Nama Lengkap Petugas + Strip Tanggal (misal 'Hariadi-1', 'Eko Wahyudi-2')
      const cellStaffLabel = `${staff.name}-${d}`;
      const maxTextWidth = dayColWidth - 0.3;

      if (staffList.length > 25) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(3.5);
        doc.text(shift, currentX + dayColWidth / 2, currentY + 1.4, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        let fontSize = 2.0;
        if (cellStaffLabel.length > 15) fontSize = 1.6;
        else if (cellStaffLabel.length > 10) fontSize = 1.8;
        doc.setFontSize(fontSize);

        let displayLabel = cellStaffLabel;
        if (doc.getTextWidth(displayLabel) > maxTextWidth) {
          const suffix = `-${d}`;
          const availableChars = Math.max(3, Math.floor(maxTextWidth / (fontSize * 0.26)) - suffix.length);
          displayLabel = `${staff.name.substring(0, availableChars)}${suffix}`;
        }
        doc.text(displayLabel, currentX + dayColWidth / 2, currentY + 2.3, { align: 'center' });
      } else if (isCompact) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(3.8);
        doc.text(shift, currentX + dayColWidth / 2, currentY + 1.6, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        let fontSize = 2.3;
        if (cellStaffLabel.length > 15) fontSize = 1.8;
        else if (cellStaffLabel.length > 10) fontSize = 2.0;
        doc.setFontSize(fontSize);

        let displayLabel = cellStaffLabel;
        if (doc.getTextWidth(displayLabel) > maxTextWidth) {
          const suffix = `-${d}`;
          const availableChars = Math.max(3, Math.floor(maxTextWidth / (fontSize * 0.26)) - suffix.length);
          displayLabel = `${staff.name.substring(0, availableChars)}${suffix}`;
        }
        doc.text(displayLabel, currentX + dayColWidth / 2, currentY + 2.65, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(4.3);
        doc.text(shift, currentX + dayColWidth / 2, currentY + 1.9, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        let fontSize = 2.6;
        if (cellStaffLabel.length > 15) fontSize = 2.1;
        else if (cellStaffLabel.length > 10) fontSize = 2.3;
        doc.setFontSize(fontSize);

        let displayLabel = cellStaffLabel;
        if (doc.getTextWidth(displayLabel) > maxTextWidth) {
          const suffix = `-${d}`;
          const availableChars = Math.max(3, Math.floor(maxTextWidth / (fontSize * 0.26)) - suffix.length);
          displayLabel = `${staff.name.substring(0, availableChars)}${suffix}`;
        }
        doc.text(displayLabel, currentX + dayColWidth / 2, currentY + 3.15, { align: 'center' });
      }

      doc.line(currentX + dayColWidth, currentY, currentX + dayColWidth, currentY + rowHeight);
      currentX += dayColWidth;
    }

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Summary numbers
    doc.setFontSize(isCompact ? 4.4 : 5.5);
    const sumValues = [
      { val: summary?.pFull || 0, bg: [254, 240, 138], bold: true },
      { val: summary?.s || 0, bg: [254, 215, 170], bold: true },
      { val: summary?.m || 0, bg: [191, 219, 254], bold: true },
      { val: summary?.lp || 0, bg: [224, 242, 254], bold: true },
      { val: summary?.off || 0, bg: [255, 228, 230], bold: true },
      { val: summary?.p1 || 0, bg: [254, 249, 195], bold: false },
      { val: summary?.p2 || 0, bg: [254, 249, 195], bold: false },
      { val: summary?.p3 || 0, bg: [254, 249, 195], bold: false },
      { val: summary?.p4 || 0, bg: [207, 250, 254], bold: false },
      { val: summary?.totalHours || 0, bg: [203, 213, 225], bold: true },
    ];

    sumValues.forEach((item, idx) => {
      if (item.bg) {
        doc.setFillColor(item.bg[0], item.bg[1], item.bg[2]);
        doc.rect(currentX, currentY, summaryColWidth, rowHeight, 'F');
      }
      doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
      doc.text(String(item.val), currentX + summaryColWidth / 2, currentY + textOffsetY, { align: 'center' });
      if (idx < sumValues.length - 1) {
        doc.line(currentX + summaryColWidth, currentY, currentX + summaryColWidth, currentY + rowHeight);
      }
      currentX += summaryColWidth;
    });

    currentY += rowHeight;
  });

  // Table Footer (Daily Totals) with solid and vibrant colors
  const footerRowHeight = staffList.length > 25 ? 2.3 : isCompact ? 2.8 : rowHeight;
  const footerOffsetY = staffList.length > 25 ? 1.7 : isCompact ? 2.1 : 2.5;
  const footerRows = [
    { label: '(P1) 07:00 - 15:00', key: 'p1', bg: [224, 242, 254], textCol: [12, 74, 110] },
    { label: '(P2) 08:00 - 16:00', key: 'p2', bg: [204, 251, 241], textCol: [19, 78, 74] },
    { label: '(P3) 07:00 - 16:00 (Upacara)', key: 'p3', bg: [254, 249, 195], textCol: [113, 63, 18] },
    { label: '(P4) 07:00 - 20:00 (Kunjungan)', key: 'p4', bg: [207, 250, 254], textCol: [14, 116, 144] },
    { label: '(PAGI FULL)', key: 'pagiFull', bold: true, bg: [186, 230, 253], textCol: [12, 74, 110] },
    { label: '(S) TOTAL SORE (15:00-23:00)', key: 's', bold: true, bg: [251, 146, 60], textCol: [67, 20, 7] },
    { label: '- S2A (Kantin SMP)', key: 's2a', bg: [216, 180, 254], bold: true, textCol: [88, 28, 135] },
    { label: '- S3A (Kantin SMA)', key: 's3a', bg: [253, 186, 116], bold: true, textCol: [67, 20, 7] },
    { label: '- S4A (Jaga Masjid)', key: 's4a', bg: [167, 243, 208], bold: true, textCol: [6, 78, 59] },
    { label: '(M) TOTAL MALAM (15:00-07:00)', key: 'm', bold: true, bg: [147, 197, 253], textCol: [15, 23, 42] },
    { label: '- M1 (Malam s.d 00:00)', key: 'm1', bg: [199, 210, 254], bold: true, textCol: [30, 27, 75] },
    { label: '- M2 (Malam Subuh-07:00)', key: 'm2', bg: [191, 219, 254], bold: true, textCol: [15, 23, 42] },
    { label: '- M3 (Malam Pendamping 23-07)', key: 'm3', bg: [240, 171, 252], bold: true, textCol: [112, 26, 117] },
    { label: 'CUTI', key: 'cuti', bg: [167, 243, 208], textCol: [6, 78, 59] },
    { label: 'OFF / LIBUR + LEPAS', key: 'offDanLepas', bg: [254, 202, 202], bold: true, textCol: [153, 27, 27] },
    { label: 'JUMLAH', key: 'total', bold: true, bg: [203, 213, 225], textCol: [15, 23, 42] },
  ];

  footerRows.forEach((fr) => {
    currentX = margin;
    const labelWidth = noColWidth + nameColWidth;

    if (fr.bg) {
      doc.setFillColor(fr.bg[0], fr.bg[1], fr.bg[2]);
      doc.rect(margin, currentY, pageWidth - margin * 2, footerRowHeight, 'F');
    }
    doc.rect(margin, currentY, pageWidth - margin * 2, footerRowHeight, 'S');

    doc.setFont('helvetica', fr.bold ? 'bold' : 'normal');
    doc.setFontSize(isCompact ? 3.7 : 4.1);
    if (fr.textCol) {
      doc.setTextColor(fr.textCol[0], fr.textCol[1], fr.textCol[2]);
    } else {
      doc.setTextColor(0, 0, 0);
    }
    doc.text(fr.label, currentX + labelWidth - 2, currentY + footerOffsetY, { align: 'right' });
    doc.line(currentX + labelWidth, currentY, currentX + labelWidth, currentY + footerRowHeight);
    currentX += labelWidth;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(isCompact ? 4.2 : 4.8);
    for (let d = 1; d <= daysCount; d++) {
      const stats = dailyStatsList[d - 1];
      const val = (stats as any)[fr.key] || 0;
      doc.text(String(val), currentX + dayColWidth / 2, currentY + footerOffsetY, { align: 'center' });
      doc.line(currentX + dayColWidth, currentY, currentX + dayColWidth, currentY + footerRowHeight);
      currentX += dayColWidth;
    }

    currentY += footerRowHeight;
  });

  // Footer Legend, Catatan Khusus & Signature
  doc.setTextColor(0, 0, 0);
  currentY += 2.0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.0);
  doc.text('PETUNJUK KODE:', margin, currentY + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.4);
  doc.text('P1: 07-15 | P2: 08-16 | P3: Upacara 07-16 | P4: Kunjungan (07-20 / Pulang Makan Malam) | P5: Pendampingan Vokasi (07-15) | S2A/S3A/S4A: Jaga Sore (15-23) | M/M1/M2/M3: Jaga Malam | LP: Lepas Piket | O: Off | C: Cuti', margin, currentY + 4.6);

  // Catatan Khusus Tugas Shif P4 (Kunjungan)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.4);
  doc.text('CATATAN KHUSUS PENUGASAN PAGI & KUNJUNGAN (P4):', margin, currentY + 7.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.7);
  doc.text('1. P4 (07:00-20:00 / 13 Jam): Pengalihan M ke P saat ada kunjungan/acara. 07:00-15:00 wajib bantu kunjungan. Pulang setelah makan malam.', margin, currentY + 9.2);
  doc.text('2. Pukul 15:00-20:00: Bantu shif Sore (tugas pokok M: patroli luar belakang lapangan/jogging track) & bantu makan malam S2A/S3A (bukan evaluator). Selesai makan malam pulang.', margin, currentY + 11.2);

  // Catatan Khusus Tugas Shif Sore S2A, S3A, S4A
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.4);
  doc.text('CATATAN KHUSUS PENUGASAN SORE:', margin, currentY + 13.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.7);
  doc.text('1. S2A: Menjaga asrama, merawat anak asuh sakit, kantin SMP dan memimpin makan malam di SMP.', margin, currentY + 15.8);
  doc.text('2. S3A: Menjaga asrama, merawat anak asuh sakit, kantin SMA dan memimpin makan malam di SMA.', margin, currentY + 17.8);
  doc.text('3. S4A: Pengarahan dan pendampingan ibadah di masjid, monitoring luar kantin dan asrama.', margin, currentY + 19.8);

  // Catatan Khusus Penugasan Malam
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.4);
  doc.text('CATATAN KHUSUS PENUGASAN MALAM :', margin, currentY + 22.4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.7);
  doc.text('1. M1: Bertugas sampai jam 00:00 (Sesi 1 malam - Laki-laki).', margin, currentY + 24.4);
  doc.text('2. M2: Bertugas setelah subuh sampai jam 07:00 (Sesi 2 pagi - Perempuan).', margin, currentY + 26.4);
  doc.text('3. M3: Bertugas 23:00-07:00 (Mendampingi full malam, keliling & foto ke grup, 03:00 jalankan SOP M2).', margin, currentY + 28.4);

  // Signature Block
  const sigX = pageWidth - margin - 52;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.text(`${INSTITUTION_INFO.kepalaSekolah.kota}, ${INSTITUTION_INFO.kepalaSekolah.tanggal}`, sigX, currentY + 2);
  doc.setFont('helvetica', 'bold');
  doc.text('KEPALA', sigX, currentY + 4.5);
  doc.text(INSTITUTION_INFO.kepalaSekolah.jabatan.toUpperCase(), sigX, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.text(INSTITUTION_INFO.kepalaSekolah.nama, sigX, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.9);
  doc.text(`NIP. ${INSTITUTION_INFO.kepalaSekolah.nip}`, sigX, currentY + 18.5);

  const filename = `Jadwal_Resmi_Wali_Asuh_${schedule.monthName}_${schedule.year}.pdf`;

  // Trigger Universal Mobile & Desktop PDF Download
  try {
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 2000);
  } catch {
    doc.save(filename);
  }

  return filename;
}

/**
 * Generate Daily Roster PDF (Jadwal Dinas Harian / Hari Ini)
 */
export function generateDailySchedulePDF(
  schedule: MonthSchedule,
  activeDay: number,
  staffList: Staff[],
  logBookText?: string
): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  // Header / Kop Surat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(INSTITUTION_INFO.kementerian.toUpperCase(), pageWidth / 2, 10, { align: 'center' });
  doc.text(INSTITUTION_INFO.pusat.toUpperCase(), pageWidth / 2, 14, { align: 'center' });

  doc.setFontSize(11);
  doc.text(INSTITUTION_INFO.sekolah.toUpperCase(), pageWidth / 2, 18.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    `${INSTITUTION_INFO.gedung} - ${INSTITUTION_INFO.alamat} • Pos-el: ${INSTITUTION_INFO.email}`,
    pageWidth / 2,
    22,
    { align: 'center' }
  );

  // Line separator
  doc.setLineWidth(0.6);
  doc.line(margin, 24, pageWidth - margin, 24);
  doc.setLineWidth(0.2);
  doc.line(margin, 24.8, pageWidth - margin, 24.8);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('LEMBAR PENUGASAN DINAS HARIAN WALI ASUH', pageWidth / 2, 31, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Tanggal: ${activeDay} ${schedule.monthName} ${schedule.year}`, pageWidth / 2, 35.5, { align: 'center' });

  let currentY = 40;

  // Table of 20 Staff assignments today
  const dailyStaffAssignments = staffList.map((staff) => ({
    staff,
    shift: schedule.days[activeDay]?.[staff.id] || 'O',
  }));

  // Table Headers
  const colNo = 8;
  const colName = 55;
  const colShift = 16;
  const colShiftName = 42;
  const colHours = 28;
  const colPost = pageWidth - margin * 2 - (colNo + colName + colShift + colShiftName + colHours);

  doc.setFillColor(235, 235, 235);
  doc.rect(margin, currentY, pageWidth - margin * 2, 6, 'F');
  doc.rect(margin, currentY, pageWidth - margin * 2, 6, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);

  let curX = margin;
  doc.text('No', curX + colNo / 2, currentY + 4.2, { align: 'center' });
  curX += colNo;
  doc.text('Nama Petugas', curX + 2, currentY + 4.2);
  curX += colName;
  doc.text('Kode', curX + colShift / 2, currentY + 4.2, { align: 'center' });
  curX += colShift;
  doc.text('Nama Shif', curX + 2, currentY + 4.2);
  curX += colShiftName;
  doc.text('Jam Dinas', curX + 2, currentY + 4.2);
  curX += colHours;
  doc.text('Pos Penugasan / Lokasi', curX + 2, currentY + 4.2);

  currentY += 6;
  const rowH = 4.8;

  // Render 20 Staff
  dailyStaffAssignments.forEach(({ staff, shift }, idx) => {
    const sMeta = SHIFT_DEFINITIONS[shift] || SHIFT_DEFINITIONS['O'];

    if (idx % 2 === 1) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, currentY, pageWidth - margin * 2, rowH, 'F');
    }
    doc.rect(margin, currentY, pageWidth - margin * 2, rowH, 'S');

    // Highlight active shifts with solid, distinct colors
    let shiftBadgeBg: number[] | null = null;
    let badgeTextCol: number[] = [0, 0, 0];

    if (shift === 'P5') {
      shiftBadgeBg = [167, 243, 208]; // Solid Emerald
      badgeTextCol = [6, 95, 70];
    } else if (shift.startsWith('P')) {
      shiftBadgeBg = [254, 224, 71]; // Solid Yellow
      badgeTextCol = [30, 41, 59];
    } else if (shift === 'S2A') {
      shiftBadgeBg = [251, 191, 36]; // Solid Amber
      badgeTextCol = [69, 26, 3];
    } else if (shift === 'S3A') {
      shiftBadgeBg = [251, 146, 60]; // Solid Deep Orange
      badgeTextCol = [67, 20, 7];
    } else if (shift === 'S4A') {
      shiftBadgeBg = [110, 231, 183]; // Solid Emerald Green
      badgeTextCol = [6, 78, 59];
    } else if (shift === 'M1') {
      shiftBadgeBg = [165, 180, 252]; // Solid Indigo
      badgeTextCol = [30, 27, 75];
    } else if (shift === 'M2') {
      shiftBadgeBg = [147, 197, 253]; // Solid Blue
      badgeTextCol = [15, 23, 42];
    } else if (shift === 'M3') {
      shiftBadgeBg = [240, 171, 252]; // Solid Magenta/Fuchsia
      badgeTextCol = [112, 26, 117];
    } else if (shift.startsWith('S')) {
      shiftBadgeBg = [253, 186, 116]; // Solid Orange
      badgeTextCol = [67, 20, 7];
    } else if (shift === 'M') {
      shiftBadgeBg = [147, 197, 253]; // Solid Blue
      badgeTextCol = [15, 23, 42];
    } else if (shift === 'LP') {
      shiftBadgeBg = [186, 230, 253]; // Solid Sky
      badgeTextCol = [12, 74, 110];
    } else if (shift === 'O') {
      shiftBadgeBg = [254, 205, 211]; // Solid Rose
      badgeTextCol = [136, 19, 55];
    }

    if (shiftBadgeBg) {
      doc.setFillColor(shiftBadgeBg[0], shiftBadgeBg[1], shiftBadgeBg[2]);
      doc.rect(margin + colNo + colName, currentY, colShift, rowH, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(0, 0, 0);

    curX = margin;
    doc.text(String(staff.id), curX + colNo / 2, currentY + 3.4, { align: 'center' });
    curX += colNo;

    doc.setFont('helvetica', 'bold');
    doc.text(staff.name, curX + 2, currentY + 3.4);
    curX += colName;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(badgeTextCol[0], badgeTextCol[1], badgeTextCol[2]);
    doc.text(shift, curX + colShift / 2, currentY + 3.4, { align: 'center' });
    curX += colShift;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(sMeta.name, curX + 2, currentY + 3.4);
    curX += colShiftName;

    doc.text(`${sMeta.startTime} - ${sMeta.endTime}`, curX + 2, currentY + 3.4);
    curX += colHours;

    let posDesc = sMeta.description;
    if (shift === 'P3') posDesc = 'Jaga Pagi Upacara Senin (07:00 - 16:00)';
    if (shift === 'P4') posDesc = 'Bantu Kunjungan & Shif Sore Luar Belakang (07:00 - 20:00 / Pulang Makan Malam)';
    if (shift === 'S2A') posDesc = 'Kantin SMP (2 Petugas)';
    if (shift === 'S3A') posDesc = 'Kantin SMA (2 Petugas)';
    if (shift === 'S4A') posDesc = 'Jaga Masjid & Lingkungan';
    if (shift === 'M1') posDesc = 'Piket Malam - Sesi 1 (15:00 - 00:00)';
    if (shift === 'M2') posDesc = 'Piket Malam - Sesi 2 (Subuh - 07:00)';
    if (shift === 'M3') posDesc = 'Piket Malam - Pendamping (23:00 - 07:00)';

    doc.text(posDesc, curX + 2, currentY + 3.4);

    currentY += rowH;
  });

  // Logbook Notes if present
  if (logBookText && logBookText.trim().length > 0) {
    currentY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('CATATAN MUTASI & BUKU JAGA:', margin, currentY);
    currentY += 3.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    const splitNotes = doc.splitTextToSize(logBookText, pageWidth - margin * 2 - 4);
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, currentY, pageWidth - margin * 2, Math.min(22, splitNotes.length * 3.5 + 4), 'FD');
    doc.text(splitNotes.slice(0, 5), margin + 2, currentY + 3.5);
    currentY += Math.min(22, splitNotes.length * 3.5 + 4) + 2;
  } else {
    currentY += 4;
  }

  // Signature Block
  const sigX = pageWidth - margin - 55;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${INSTITUTION_INFO.kepalaSekolah.kota}, ${activeDay} ${schedule.monthName} ${schedule.year}`, sigX, currentY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text('KEPALA', sigX, currentY + 8);
  doc.text(INSTITUTION_INFO.kepalaSekolah.jabatan.toUpperCase(), sigX, currentY + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.text(INSTITUTION_INFO.kepalaSekolah.nama, sigX, currentY + 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`NIP. ${INSTITUTION_INFO.kepalaSekolah.nip}`, sigX, currentY + 26.5);

  const filename = `Jadwal_Dinas_Harian_Tgl_${activeDay}_${schedule.monthName}_${schedule.year}.pdf`;

  // Trigger Universal Mobile & Desktop PDF Download
  try {
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 2000);
  } catch {
    doc.save(filename);
  }

  return filename;
}
