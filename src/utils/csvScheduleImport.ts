import { ShiftCode, Staff } from '../types';

export interface CSVMatchedStaff {
  staff: Staff;
  matchedNameInCSV: string;
  shiftCount: number;
  rowIdx: number;
  shifts: Record<number, ShiftCode>;
}

export interface CSVParseResult {
  success: boolean;
  totalDays: number;
  matchedStaffList: CSVMatchedStaff[];
  finalStaffList?: Staff[];
  unmatchedRows: { name: string; rowIdx: number }[];
  days: Record<number, Record<number, ShiftCode>>;
  errors: string[];
  warnings: string[];
  detectedHeaders: { day: number; colIdx: number }[];
}

/**
 * Clean and normalize a string for tolerant matching
 */
function cleanString(str: string): string {
  return str
    .toLowerCase()
    .replace(/['’`".,\-_\/\\()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse standard CSV lines taking quotes into account
 */
export function parseCSVLines(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  // Normalize line breaks
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentCell += '"';
          i++;
        } else {
          // End of quotes
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',' || char === ';' || char === '\t') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  // Push last row if exists
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Normalize raw shift strings into standard ShiftCode
 */
export function normalizeShiftCode(raw: string): ShiftCode {
  if (!raw) return 'L';
  const clean = raw.toUpperCase().replace(/\s+/g, '').replace(/[-_]/g, '');

  if (['P1', 'PAGI1', 'JAGAPAGI1'].includes(clean)) return 'P1';
  if (['P2', 'PAGI2', 'JAGAPAGI2'].includes(clean)) return 'P2';
  if (['P3', 'PAGI3', 'JAGAPAGI3', 'UPACARA'].includes(clean)) return 'P3';
  if (['P4', 'PAGI4', 'JAGAPAGI4'].includes(clean)) return 'P4';
  if (['P5', 'PAGI5', 'JAGAPAGI5'].includes(clean)) return 'P5';
  if (['P', 'PAGI'].includes(clean)) return 'P1';

  if (['S2A', 'S2', 'KANTINSMP'].includes(clean)) return 'S2A';
  if (['S3A', 'S3', 'KANTINSMA'].includes(clean)) return 'S3A';
  if (['S4A', 'S4', 'JAGAMASJID', 'MASJID'].includes(clean)) return 'S4A';
  if (['S', 'SORE', 'SIANG'].includes(clean)) return 'S2A';

  if (['M1', 'MALAM1', 'JAGAMALAM1'].includes(clean)) return 'M1';
  if (['M2', 'MALAM2', 'JAGAMALAM2'].includes(clean)) return 'M2';
  if (['M3', 'MALAM3', 'JAGAMALAM3', 'PENDAMPING'].includes(clean)) return 'M3';
  if (['M', 'MALAM'].includes(clean)) return 'M1';

  if (['LP', 'LEPAS', 'LEPASPIKET'].includes(clean)) return 'LP';

  if (['O', 'OFF'].includes(clean)) return 'O';
  if (['C', 'CUTI'].includes(clean)) return 'C';
  if (clean === 'IZIN') return 'IZIN';
  if (['L', 'LIBUR', '-', ''].includes(clean)) return 'L';

  // Fallback pattern matching
  if (clean.startsWith('P1')) return 'P1';
  if (clean.startsWith('P2')) return 'P2';
  if (clean.startsWith('P3')) return 'P3';
  if (clean.startsWith('P4')) return 'P4';
  if (clean.startsWith('P')) return 'P1';
  if (clean.startsWith('S2')) return 'S2A';
  if (clean.startsWith('S3')) return 'S3A';
  if (clean.startsWith('S4')) return 'S4A';
  if (clean.startsWith('S')) return 'S2A';
  if (clean.startsWith('M1')) return 'M1';
  if (clean.startsWith('M2')) return 'M2';
  if (clean.startsWith('M3')) return 'M3';
  if (clean.startsWith('M')) return 'M1';
  if (clean.startsWith('LP')) return 'LP';

  return 'L';
}

/**
 * Main parser: Parses CSV content and maps it to target staff list and days
 */
export function parseScheduleCSV(
  csvContent: string,
  staffList: Staff[],
  targetDaysCount: number = 31,
  existingDays?: Record<number, Record<number, ShiftCode>>
): CSVParseResult {
  const result: CSVParseResult = {
    success: false,
    totalDays: targetDaysCount,
    matchedStaffList: [],
    unmatchedRows: [],
    days: {},
    errors: [],
    warnings: [],
    detectedHeaders: [],
  };

  const rows = parseCSVLines(csvContent);
  if (rows.length === 0) {
    result.errors.push('File CSV kosong atau tidak memiliki data.');
    return result;
  }

  // 1. Locate the header row containing day numbers (1, 2, 3... 30/31)
  let headerRowIdx = -1;
  const dayColMap: { day: number; colIdx: number }[] = [];

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r];
    const candidateDays: { day: number; colIdx: number }[] = [];

    row.forEach((cell, colIdx) => {
      const trimmed = cell.trim();
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= 31 && String(num) === trimmed) {
        candidateDays.push({ day: num, colIdx });
      }
    });

    // Check if this row contains a sequential series of at least 15 day numbers
    if (candidateDays.length >= 15) {
      headerRowIdx = r;
      // Sort by day number
      candidateDays.sort((a, b) => a.day - b.day);
      dayColMap.push(...candidateDays);
      break;
    }
  }

  if (headerRowIdx === -1 || dayColMap.length === 0) {
    result.errors.push(
      'Garis header nomor tanggal (1 s.d. 30/31) tidak ditemukan pada 10 baris pertama file CSV.'
    );
    return result;
  }

  result.detectedHeaders = dayColMap;
  const detectedMaxDay = Math.max(...dayColMap.map((d) => d.day));
  result.totalDays = Math.max(detectedMaxDay, targetDaysCount);

  // Initialize days structure
  for (let d = 1; d <= result.totalDays; d++) {
    result.days[d] = {};
  }

  // 2. Identify the Name column (usually index 1, or looking for "nama" / "petugas")
  const headerRow = rows[headerRowIdx];
  let nameColIdx = 1; // default to second column

  const foundNameCol = headerRow.findIndex((cell) => {
    const c = cleanString(cell);
    return c.includes('nama') || c.includes('petugas') || c.includes('wali');
  });

  if (foundNameCol !== -1) {
    nameColIdx = foundNameCol;
  } else if (dayColMap[0].colIdx > 1) {
    nameColIdx = 1;
  } else {
    nameColIdx = 0;
  }

  // Build searchable staff dictionary
  const staffCleanMap = staffList.map((s) => ({
    staff: s,
    cleanedName: cleanString(s.name),
    code: s.code ? cleanString(s.code) : '',
    id: s.id,
  }));

  // 3. Process each data row below headerRowIdx
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length <= 1) continue;

    const rawName = row[nameColIdx]?.trim() || '';
    if (!rawName) continue;

    // Check if this row is a summary or total row
    const cleanRowName = cleanString(rawName);
    if (
      cleanRowName.includes('total') ||
      cleanRowName.includes('rekap') ||
      cleanRowName.includes('jumlah') ||
      cleanRowName.includes('keterangan')
    ) {
      continue;
    }

    // Try matching staff
    let matched = staffCleanMap.find((s) => s.cleanedName === cleanRowName);

    // Fuzzy matching fallback
    if (!matched) {
      matched = staffCleanMap.find((s) => {
        return (
          s.cleanedName.includes(cleanRowName) ||
          cleanRowName.includes(s.cleanedName)
        );
      });
    }

    // Secondary match by Code if column 0 has 'L1', 'P1', etc.
    if (!matched && row[0]) {
      const codeCandidate = cleanString(row[0]);
      matched = staffCleanMap.find((s) => s.code === codeCandidate);
    }

    // Secondary match by Row Number if order matches (1 to staffList.length)
    if (!matched && row[0]) {
      const numCandidate = parseInt(row[0].trim(), 10);
      if (!isNaN(numCandidate) && numCandidate >= 1 && numCandidate <= staffList.length) {
        matched = staffCleanMap[numCandidate - 1];
      }
    }

    if (!matched) {
      // Otomatis daftarkan petugas baru jika belum ada di database
      const cleanRaw = rawName.trim();
      const existingIds = staffCleanMap.map((s) => s.id);
      const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      const lower = cleanRaw.toLowerCase();
      const isFemale = lower.includes('dewi') || lower.includes('putri') || lower.includes('ayu') || lower.includes('siti') || lower.includes('rina') || lower.includes('wati') || lower.includes('nur') || lower.includes('anita') || lower.includes('erna') || lower.includes('qobsoh') || lower.includes('fani') || lower.includes('maisun') || lower.includes('laili');
      
      const newStaff: Staff = {
        id: nextId,
        name: cleanRaw,
        role: 'Wali Asuh',
        gender: isFemale ? 'P' : 'L',
        group: isFemale ? 'Petugas Perempuan' : 'Petugas Laki-laki',
        jenjang: '-',
        phone: '',
      };
      
      staffCleanMap.push({
        staff: newStaff,
        cleanedName: cleanRowName,
        code: '',
        id: nextId,
      });
      matched = staffCleanMap[staffCleanMap.length - 1];
    }

    // Collect shifts for this staff
    const staffShifts: Record<number, ShiftCode> = {};
    let count = 0;

    dayColMap.forEach(({ day, colIdx }) => {
      const rawShift = row[colIdx] || '';
      const shiftCode = normalizeShiftCode(rawShift);
      staffShifts[day] = shiftCode;
      result.days[day][matched!.id] = shiftCode;
      if (shiftCode !== 'L') {
        count++;
      }
    });

    result.matchedStaffList.push({
      staff: matched.staff,
      matchedNameInCSV: rawName,
      shiftCount: count,
      rowIdx: r + 1,
      shifts: staffShifts,
    });
  }

  // Populate final staff list including any newly added staff
  result.finalStaffList = staffCleanMap.map((s) => s.staff);

  // Fill in any days/staff that might be missing with existing schedule or default 'L'
  for (let d = 1; d <= result.totalDays; d++) {
    result.finalStaffList.forEach((st) => {
      if (!result.days[d][st.id]) {
        result.days[d][st.id] = existingDays?.[d]?.[st.id] || 'L';
      }
    });
  }

  if (result.matchedStaffList.length === 0) {
    result.errors.push('Tidak ada nama petugas yang cocok dengan database wali asuh.');
    return result;
  }

  result.success = true;

  if (result.matchedStaffList.length < staffList.length) {
    result.warnings.push(
      `Berhasil mencocokkan ${result.matchedStaffList.length} dari ${staffList.length} petugas. Petugas lain otomatis diisi shif Libur (L).`
    );
  }

  return result;
}
