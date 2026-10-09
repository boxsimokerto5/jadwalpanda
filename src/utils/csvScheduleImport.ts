import { ShiftCode, Staff } from '../types';
import { OCTOBER_2026_STAFF_LIST } from '../data/octoberSchedule';
import { SEPTEMBER_2026_STAFF_LIST } from '../data/septemberSchedule';
import { INITIAL_STAFF_LIST } from '../data/initialSchedule';
import { generateStaffInitials, suggestNextStaffCode } from './staffService';

export interface CSVMatchedStaff {
  staff: Staff;
  matchedNameInCSV: string;
  shiftCount: number;
  rowIdx: number;
  shifts: Record<number, ShiftCode>;
  isNewStaff?: boolean;
}

export interface CSVParseResult {
  success: boolean;
  totalDays: number;
  matchedStaffList: CSVMatchedStaff[];
  finalStaffList?: Staff[];
  newStaffList: Staff[];
  removedStaffList: Staff[];
  unmatchedRows: { name: string; rowIdx: number }[];
  days: Record<number, Record<number, ShiftCode>>;
  errors: string[];
  warnings: string[];
  detectedHeaders: { day: number; colIdx: number }[];
}

/**
 * Clean and normalize a string for tolerant name matching
 */
function cleanString(str: string): string {
  return str
    .toLowerCase()
    .replace(/['’`".,\-_\/\\()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compact alphanumeric representation (no spaces) for matching e.g. "Aziz Fajar" vs "Azizfajar"
 */
function compactString(str: string): string {
  return cleanString(str).replace(/\s+/g, '');
}

/**
 * Detect whether an Indonesian name is likely female when gender is not explicitly provided
 */
function inferFemaleGenderFromName(name: string): boolean {
  const lower = ` ${cleanString(name)} `;
  const femaleKeywords = [
    'dewi', 'putri', 'ayu', 'siti', 'rina', 'wati', 'nurul', 'anita', 'erna',
    'qobsoh', 'fani', 'maisun', 'laili', 'fitri', 'indah', 'sri', 'eka', 'dwi',
    'nisa', 'annisa', 'anisa', 'zahra', 'fatimah', 'aisyah', 'khadijah', 'ulfa',
    'rohmah', 'hikmah', 'nabila', 'nadia', 'amelia', 'intan', 'mega', 'ratna',
    'maya', 'dian', 'eni', 'umi', 'ibu', 'ny', 'hj', 'binti', 'ning', 'retno',
    'wahyuni', 'lestari', 'handayani', 'kartika', 'permata', 'safitri',
    'anggraini', 'puspita', 'rahmawati', 'setiawati', 'susanti', 'yuli', 'yuni',
    'novi', 'desi', 'vina', 'vita', 'ika', 'lia', 'nia', 'ria', 'tia', 'mia',
    'eva', 'evi', 'elsa', 'winda', 'widya', 'siska', 'citra', 'bella', 'dina',
    'fira', 'gita', 'hana', 'hani', 'ira', 'ika', 'kartini', 'lina', 'linda',
    'mira', 'nina', 'nur', 'puji', 'rani', 'ratih', 'risa', 'risti', 'rosa',
    'sari', 'septi', 'silvi', 'suci', 'tari', 'tika', 'titik', 'tri', 'ulan',
    'vera', 'vivi', 'wanda', 'wulan', 'yanti', 'yulia', 'zulfa', 'shofia',
    'farida', 'halimah', 'hasanah', 'jannah', 'karimah', 'latifah', 'maharani',
    'maulida', 'mutiara', 'nadira', 'novita', 'nuraini', 'nurhayati', 'オク',
  ];
  // Avoid matching male names with 'nur' + male word like 'nur hidayat', 'nur aziz', 'nur rohman', 'm nur'
  const maleOverrides = [
    'muhammad', 'mohammad', 'moh', 'achmad', 'ahmad', 'abdul', 'agus', 'ali',
    'amin', 'andi', 'anto', 'anwar', 'arif', 'aris', 'aziz', 'bagus', 'bambang',
    'budi', 'cahyo', 'dani', 'dedi', 'deni', 'didik', 'dimas', 'doni', 'edi',
    'eko', 'fajar', 'farhan', 'fauzi', 'ferry', 'firman', 'hadi', 'hamid',
    'handoko', 'hari', 'haris', 'hasan', 'hendra', 'hendro', 'heri', 'heru',
    'hidayat', 'ihsan', 'ilham', 'imam', 'indra', 'irfan', 'irwan', 'ivan',
    'joko', 'khoirul', 'kurniawan', 'lukman', 'mahmud', 'miftah', 'muh',
    'mulyono', 'munir', 'mustofa', 'nanang', 'nugroho', 'prabowo', 'pratama',
    'putra', 'rahmat', 'reza', 'ridwan', 'riki', 'riko', 'rizal', 'rizki',
    'rizky', 'rohman', 'roni', 'rudi', 'ryan', 'saiful', 'salim', 'santoso',
    'saputra', 'setiawan', 'sigit', 'slam', 'sugeng', 'suharto', 'sujono',
    'sulaiman', 'sunarto', 'supri', 'surya', 'sutrisno', 'syafii', 'syah',
    'taufik', 'teguh', 'tono', 'wahyu', 'wahyudi', 'wawan', 'wijaya', 'yanto',
    'yoga', 'yogi', 'yudi', 'yusuf', 'zainal', 'zaki',
  ];
  const words = cleanString(name).split(/\s+/).filter(Boolean);
  if (words.some((w) => maleOverrides.includes(w))) {
    return false;
  }
  return words.some((w) => femaleKeywords.includes(w)) || femaleKeywords.some((kw) => lower.includes(` ${kw} `));
}

/**
 * Parse standard CSV lines taking quotes into account
 */
export function parseCSVLines(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  // Strip BOM if present and normalize line breaks
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

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
  if (clean.startsWith('P5')) return 'P5';
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
 * Main parser: Parses CSV content strictly by Wali Asuh Name.
 * - Automatically registers new staff if their name is not yet in the database.
 * - Automatically updates the month's roster to match the exact staff list in the CSV
 *   (any staff not present in the CSV is removed from that month's schedule).
 */
export function parseScheduleCSV(
  csvContent: string,
  staffList: Staff[],
  targetDaysCount: number = 31,
  _existingDays?: Record<number, Record<number, ShiftCode>>,
  masterStaffList?: Staff[]
): CSVParseResult {
  const result: CSVParseResult = {
    success: false,
    totalDays: targetDaysCount,
    matchedStaffList: [],
    newStaffList: [],
    removedStaffList: [],
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

  // 1. Locate the header row containing day numbers (1, 2, 3... 28/29/30/31)
  let headerRowIdx = -1;
  const dayColMap: { day: number; colIdx: number }[] = [];

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r];
    const candidateDays: { day: number; colIdx: number }[] = [];

    row.forEach((cell, colIdx) => {
      const trimmed = cell.trim();
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= 31 && String(num) === trimmed) {
        candidateDays.push({ day: num, colIdx });
      }
    });

    // Check if this row contains a sequential series of at least 14 day numbers
    if (candidateDays.length >= 14) {
      headerRowIdx = r;
      candidateDays.sort((a, b) => a.day - b.day);
      dayColMap.push(...candidateDays);
      break;
    }
  }

  if (headerRowIdx === -1 || dayColMap.length === 0) {
    result.errors.push(
      'Baris header nomor tanggal (1 s.d. 30/31) tidak ditemukan pada file CSV.'
    );
    return result;
  }

  result.detectedHeaders = dayColMap;
  const detectedMaxDay = Math.max(...dayColMap.map((d) => d.day));
  result.totalDays = Math.min(31, Math.max(detectedMaxDay, targetDaysCount));

  // Initialize days structure
  for (let d = 1; d <= result.totalDays; d++) {
    result.days[d] = {};
  }

  // 2. Identify the Name column & optional metadata columns before the first day column
  const headerRow = rows[headerRowIdx];
  const firstDayColIdx = dayColMap[0].colIdx;

  let nameColIdx = -1;
  let codeColIdx = -1;
  let genderColIdx = -1;
  let jenjangColIdx = -1;
  let phoneColIdx = -1;

  for (let c = 0; c < firstDayColIdx; c++) {
    const h = cleanString(headerRow[c] || '');
    if (
      nameColIdx === -1 &&
      (h.includes('nama') || h.includes('petugas') || h.includes('wali') || h.includes('personel') || h.includes('pegawai'))
    ) {
      nameColIdx = c;
    } else if (codeColIdx === -1 && (h === 'kode' || h.includes('kode petugas') || h === 'id')) {
      codeColIdx = c;
    } else if (genderColIdx === -1 && (h === 'jk' || h === 'lp' || h === 'l p' || h.includes('gender') || h.includes('kelamin') || h.includes('kategori'))) {
      genderColIdx = c;
    } else if (jenjangColIdx === -1 && (h.includes('jenjang') || h.includes('unit'))) {
      jenjangColIdx = c;
    } else if (phoneColIdx === -1 && (h.includes('wa') || h.includes('whatsapp') || h.includes('hp') || h.includes('telp') || h.includes('telepon'))) {
      phoneColIdx = c;
    }
  }

  // Fallback heuristic if Name header wasn't explicitly labeled "Nama"
  if (nameColIdx === -1) {
    if (firstDayColIdx <= 1) {
      nameColIdx = 0;
    } else {
      let bestCol = 1;
      let bestScore = -1;
      const sampleRows = rows.slice(headerRowIdx + 1, Math.min(rows.length, headerRowIdx + 8));
      for (let c = 0; c < firstDayColIdx; c++) {
        let score = 0;
        sampleRows.forEach((r) => {
          const val = (r[c] || '').trim();
          // Ignore pure numbers or short codes like L1, P12
          if (val && !/^\d+$/.test(val) && !/^[LP]\d+$/i.test(val) && val.length > 2) {
            score += val.length;
          }
        });
        if (score > bestScore) {
          bestScore = score;
          bestCol = c;
        }
      }
      nameColIdx = bestCol;
    }
  }

  // Build comprehensive known staff directory (prioritizing currentMonthStaff, then masterStaffList, then baselines)
  const knownStaffMap = new Map<number, Staff>();
  const registerKnownList = (list?: Staff[]) => {
    if (!Array.isArray(list)) return;
    list.forEach((s) => {
      if (s && s.id && s.name && !knownStaffMap.has(s.id)) {
        knownStaffMap.set(s.id, s);
      }
    });
  };
  registerKnownList(staffList);
  registerKnownList(masterStaffList);
  registerKnownList(OCTOBER_2026_STAFF_LIST);
  registerKnownList(SEPTEMBER_2026_STAFF_LIST);
  registerKnownList(INITIAL_STAFF_LIST);

  const allKnownStaff: Staff[] = Array.from(knownStaffMap.values());
  const currentMonthIds = new Set(staffList.map((s) => s.id));

  const staffCleanMap = allKnownStaff.map((s) => ({
    staff: s,
    cleanedName: cleanString(s.name),
    compactName: compactString(s.name),
    id: s.id,
  }));

  // Pre-collect all compact names in CSV so fuzzy matching never steals an exact match from a later row
  const csvCompactNamesSet = new Set<string>();
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const raw = rows[r]?.[nameColIdx]?.trim() || '';
    if (raw) {
      csvCompactNamesSet.add(compactString(raw));
    }
  }

  const matchedStaffIdsInCSV = new Set<number>();

  // 3. Process each data row below headerRowIdx strictly by Wali Asuh Name
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length <= 1) continue;

    const rawName = row[nameColIdx]?.trim() || '';
    if (!rawName) continue;

    // Ignore pure numbers in name column or summary/footer rows
    const cleanRowName = cleanString(rawName);
    const compactRowName = compactString(rawName);
    if (!cleanRowName || /^\d+$/.test(cleanRowName)) continue;

    if (
      cleanRowName.startsWith('total') ||
      cleanRowName.startsWith('rekap') ||
      cleanRowName.startsWith('jumlah') ||
      cleanRowName.startsWith('keterangan') ||
      cleanRowName.startsWith('catatan') ||
      cleanRowName === 'nama' ||
      cleanRowName === 'nama petugas' ||
      cleanRowName === 'nama wali asuh' ||
      cleanRowName.includes('total shif') ||
      cleanRowName.includes('jumlah petugas')
    ) {
      continue;
    }

    // PASS 1: Exact normalized name match (prioritize staff already in current month if duplicate names exist)
    let matched =
      staffCleanMap.find(
        (s) => !matchedStaffIdsInCSV.has(s.id) && currentMonthIds.has(s.id) && s.cleanedName === cleanRowName
      ) ||
      staffCleanMap.find(
        (s) => !matchedStaffIdsInCSV.has(s.id) && s.cleanedName === cleanRowName
      );

    // PASS 2: Compact name match (ignores space/apostrophe variations, e.g. "Aziz Fajar Yusniza" vs "Azizfajar Yusniza")
    if (!matched) {
      matched =
        staffCleanMap.find(
          (s) => !matchedStaffIdsInCSV.has(s.id) && currentMonthIds.has(s.id) && s.compactName === compactRowName
        ) ||
        staffCleanMap.find(
          (s) => !matchedStaffIdsInCSV.has(s.id) && s.compactName === compactRowName
        );
    }

    // PASS 3: Safe multi-word token match (only if at least 2 significant words match and candidate isn't matched elsewhere in CSV)
    if (!matched) {
      const rowWords = cleanRowName.split(' ').filter((w) => w.length > 1);
      if (rowWords.length >= 2) {
        matched = staffCleanMap.find((s) => {
          if (matchedStaffIdsInCSV.has(s.id)) return false;
          // Do not steal a candidate whose exact compact name appears on another row of the CSV
          if (csvCompactNamesSet.has(s.compactName)) return false;

          const staffWords = s.cleanedName.split(' ').filter((w) => w.length > 1);
          if (staffWords.length < 2) return false;

          const shorter = rowWords.length <= staffWords.length ? rowWords : staffWords;
          const longer = rowWords.length <= staffWords.length ? staffWords : rowWords;
          const allShorterInLonger = shorter.every((w) => longer.includes(w));
          return allShorterInLonger && shorter.length >= 2;
        });
      }
    }

    let isNewForMonth = false;

    if (!matched) {
      // Automatically create a brand-new Wali Asuh entry from the CSV row
      const cleanRaw = rawName.trim();
      const existingIds = staffCleanMap.map((s) => s.id);
      const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

      // Determine gender from CSV gender/code columns if available, else infer from name
      let gender: 'L' | 'P' = inferFemaleGenderFromName(cleanRaw) ? 'P' : 'L';
      if (genderColIdx !== -1 && row[genderColIdx]) {
        const gRaw = row[genderColIdx].trim().toUpperCase();
        if (gRaw === 'P' || gRaw.startsWith('PEREMPUAN') || gRaw.startsWith('AKHWAT') || gRaw.startsWith('WANITA')) {
          gender = 'P';
        } else if (gRaw === 'L' || gRaw.startsWith('LAKI') || gRaw.startsWith('IKHWAN') || gRaw.startsWith('PRIA')) {
          gender = 'L';
        }
      } else if (codeColIdx !== -1 && row[codeColIdx]) {
        const cRaw = row[codeColIdx].trim().toUpperCase();
        if (/^P\d+$/.test(cRaw)) gender = 'P';
        else if (/^L\d+$/.test(cRaw)) gender = 'L';
      }

      // Determine staff code
      let staffCode = suggestNextStaffCode(gender, staffCleanMap.map((s) => s.staff));
      if (codeColIdx !== -1 && row[codeColIdx]) {
        const cRaw = row[codeColIdx].trim().toUpperCase();
        if (/^[LP]\d+$/.test(cRaw)) {
          staffCode = cRaw;
        }
      }

      const jenjangVal =
        jenjangColIdx !== -1 && row[jenjangColIdx]?.trim()
          ? row[jenjangColIdx].trim()
          : 'SMA';
      const phoneVal =
        phoneColIdx !== -1 && row[phoneColIdx]?.trim()
          ? row[phoneColIdx].trim()
          : '';

      const newStaff: Staff = {
        id: nextId,
        name: cleanRaw,
        role: 'Wali Asuh',
        gender,
        code: staffCode,
        initials: generateStaffInitials(cleanRaw),
        group: gender === 'P' ? 'Petugas Perempuan' : 'Petugas Laki-laki',
        jenjang: jenjangVal,
        phone: phoneVal,
        status: 'active',
      };

      const newEntry = {
        staff: newStaff,
        cleanedName: cleanRowName,
        compactName: compactRowName,
        id: nextId,
      };
      staffCleanMap.push(newEntry);
      matched = newEntry;
      isNewForMonth = true;
    } else if (!currentMonthIds.has(matched.id)) {
      isNewForMonth = true;
    }

    matchedStaffIdsInCSV.add(matched.id);
    if (isNewForMonth) {
      result.newStaffList.push(matched.staff);
    }

    // Collect shifts for this staff across all detected days
    const staffShifts: Record<number, ShiftCode> = {};
    let count = 0;

    dayColMap.forEach(({ day, colIdx }) => {
      const rawShift = row[colIdx] || '';
      const shiftCode = normalizeShiftCode(rawShift);
      staffShifts[day] = shiftCode;
      result.days[day][matched!.id] = shiftCode;
      if (shiftCode !== 'L' && shiftCode !== 'O') {
        count++;
      }
    });

    // Ensure all days 1..totalDays are initialized for this staff
    for (let d = 1; d <= result.totalDays; d++) {
      if (!result.days[d][matched.id]) {
        result.days[d][matched.id] = 'L';
        staffShifts[d] = 'L';
      }
    }

    result.matchedStaffList.push({
      staff: matched.staff,
      matchedNameInCSV: rawName,
      shiftCount: count,
      rowIdx: r + 1,
      shifts: staffShifts,
      isNewStaff: isNewForMonth,
    });
  }

  if (result.matchedStaffList.length === 0) {
    result.errors.push('Tidak ditemukan baris nama Wali Asuh yang valid di dalam file CSV.');
    return result;
  }

  // Strictly set finalStaffList for this month to ONLY the staff present in the CSV (in CSV order)
  result.finalStaffList = result.matchedStaffList.map((m) => m.staff);

  // Identify staff who were previously in this month's roster but are NOT in the CSV (to be removed from this month)
  result.removedStaffList = staffList.filter((s) => !matchedStaffIdsInCSV.has(s.id));

  result.success = true;

  if (result.newStaffList.length > 0) {
    result.warnings.push(
      `+${result.newStaffList.length} Wali Asuh baru terdeteksi dari CSV dan otomatis ditambahkan ke jadwal & Kelola Wali Asuh.`
    );
  }

  if (result.removedStaffList.length > 0) {
    result.warnings.push(
      `-${result.removedStaffList.length} Wali Asuh yang tidak ada di CSV otomatis dikeluarkan dari jadwal bulan ini (${result.removedStaffList.slice(0, 4).map((s) => s.name).join(', ')}${result.removedStaffList.length > 4 ? ', dll.' : ''}).`
    );
  }

  return result;
}

