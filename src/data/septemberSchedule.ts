import { Staff, ShiftCode } from '../types';

export const SEPTEMBER_2026_STAFF_LIST: Staff[] = [
  // 17 Petugas Laki-laki (L1 - L17)
  { id: 1, code: 'L1', name: "Aris Mahmud Syafi'i", gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ams', phone: '0812-3456-7801' },
  { id: 2, code: 'L2', name: 'Muji Santoso', gender: 'L', jenjang: 'SD', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ms', phone: '0812-3456-7802' },
  { id: 3, code: 'L3', name: 'Moch. Chabib', gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'mc', phone: '0812-3456-7803' },
  { id: 4, code: 'L4', name: 'Moh Asrofi', gender: 'L', jenjang: 'SD', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ma', phone: '0812-3456-7804' },
  { id: 5, code: 'L5', name: 'Hariadi', gender: 'L', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'hrd', phone: '0812-3456-7805' },
  { id: 6, code: 'L6', name: 'Dwi Chusnul Mufid', gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'dcm', phone: '0812-3456-7806' },
  { id: 7, code: 'L7', name: 'Suhariyono', gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'shy', phone: '0812-3456-7807' },
  { id: 8, code: 'L8', name: 'A. Zainudin Sholeh', gender: 'L', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'zs', phone: '0812-3456-7808' },
  { id: 9, code: 'L9', name: 'Abisarwan Rafif', gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ar', phone: '0812-3456-7809' },
  { id: 10, code: 'L10', name: 'Hiras Mando Rajagukguk', gender: 'L', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'hmr', phone: '0812-3456-7810' },
  { id: 11, code: 'L11', name: 'Nanang Arifin', gender: 'L', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'na', phone: '0812-3456-7811' },
  { id: 12, code: 'L12', name: 'Yusak Wasis Pratonggo', gender: 'L', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ywp', phone: '0812-3456-7812' },
  { id: 13, code: 'L13', name: 'Akhmad Fadkhurriza I', gender: 'L', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'afi', phone: '0812-3456-7813' },
  { id: 14, code: 'L14', name: "Amirul Mu'minin Rofico P.K.", gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'amr', phone: '0812-3456-7814' },
  { id: 15, code: 'L15', name: 'Teguh Cahyono', gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'tc', phone: '0812-3456-7815' },
  { id: 16, code: 'L16', name: 'Eko Wahyudi', gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ew', phone: '0812-3456-7816' },
  { id: 17, code: 'L17', name: 'Adityo Rizky Winarno', gender: 'L', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'arw', phone: '0812-3456-7817' },

  // 14 Petugas Perempuan (P1 - P14)
  { id: 18, code: 'P1', name: 'Dewi Askinu', gender: 'P', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'da', phone: '0812-3456-7818' },
  { id: 19, code: 'P2', name: 'Ambika Widya Asmara', gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'awa', phone: '0812-3456-7819' },
  { id: 20, code: 'P3', name: 'Rindani', gender: 'P', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'rin', phone: '0812-3456-7820' },
  { id: 21, code: 'P4', name: 'Eky Venty Pricilia', gender: 'P', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'evp', phone: '0812-3456-7821' },
  { id: 22, code: 'P5', name: 'Retnowati', gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'rn', phone: '0812-3456-7822' },
  { id: 23, code: 'P6', name: 'Deni Furitrinofi', gender: 'P', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'df', phone: '0812-3456-7823' },
  { id: 24, code: 'P7', name: 'Chusfia Hanik Wihayati', gender: 'P', jenjang: 'SD', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'chw', phone: '0812-3456-7824' },
  { id: 25, code: 'P8', name: 'Theresa Inganta Ginting', gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'tig', phone: '0812-3456-7825' },
  { id: 26, code: 'P9', name: 'Siti Maslukah', gender: 'P', jenjang: 'SD', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'sm', phone: '0812-3456-7826' },
  { id: 27, code: 'P10', name: 'Alifia Senja', gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'asj', phone: '0812-3456-7827' },
  { id: 28, code: 'P11', name: 'Erna Rizkiani', gender: 'P', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'er', phone: '0812-3456-7828' },
  { id: 29, code: 'P12', name: 'Afida Saidatul Fuadia', gender: 'P', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'asf', phone: '0812-3456-7829' },
  { id: 30, code: 'P13', name: 'Anita Kurniawati', gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'ak', phone: '0812-3456-7830' },
  { id: 31, code: 'P14', name: 'Herlina Ratu Belia', gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'hrb', phone: '0812-3456-7831' },
];

/**
 * Official September 2026 Shift Schedule (Days 1 to 30)
 * 100% Identical to Official Kementerian Sosial RI / SRT 1 Kabupaten Kediri Document
 */
export const OFFICIAL_SEPTEMBER_2026_SCHEDULE: Record<number, ShiftCode[]> = {
  1:  ['P1',  'P2',  'S3A', 'M1',  'LP',  'L',   'P3',  'S4A', 'S3A', 'P3',  'LP',  'L',   'S4A', 'S3A', 'P3',  'M1',  'LP',  'L',   'P5',  'S3A', 'P3',  'M1',  'LP',  'L',   'P2',  'P5',  'S4A', 'M1',  'LP',  'L'],
  2:  ['P1',  'P2',  'M1',  'LP',  'L',   'P3',  'P3',  'S2A', 'S4A', 'M1',  'LP',  'L',   'P3',  'S2A', 'S2A', 'M1',  'LP',  'L',   'P5',  'S2A', 'S2A', 'M1',  'LP',  'L',   'P2',  'S2A', 'S4A', 'M1',  'LP',  'L'],
  3:  ['L',   'P1',  'S2A', 'S4A', 'S3A', 'LP',  'L',   'P1',  'S4A', 'S3A', 'M1',  'LP',  'L',   'P3',  'S4A', 'S4A', 'M1',  'LP',  'L',   'P3',  'S2A', 'S4A', 'M1',  'LP',  'L',   'P5',  'S3A', 'S4A', 'M1',  'LP'],
  4:  ['L',   'P1',  'S4A', 'S4A', 'P3',  'LP',  'L',   'P2',  'S4A', 'P2',  'M1',  'LP',  'L',   'P3',  'S4A', 'S4A', 'M1',  'LP',  'L',   'S2A', 'S4A', 'S4A', 'M1',  'LP',  'L',   'S3A', 'S4A', 'S2A', 'M1',  'LP'],
  5:  ['LP',  'L',   'P1',  'S2A', 'S4A', 'M1',  'LP',  'L',   'P2',  'S2A', 'S4A', 'M1',  'LP',  'L',   'P1',  'S4A', 'S4A', 'M1',  'LP',  'L',   'S2A', 'S2A', 'S4A', 'M1',  'LP',  'L',   'P2',  'S4A', 'S4A', 'M1'],
  6:  ['LP',  'L',   'P2',  'S3A', 'M1',  'M1',  'L',   'P1',  'P1',  'S4A', 'S4A', 'M1',  'LP',  'L',   'P2',  'S3A', 'S3A', 'M1',  'LP',  'L',   'S4A', 'S3A', 'S2A', 'M1',  'LP',  'L',   'P5',  'S3A', 'S4A', 'M1'],
  7:  ['M1',  'LP',  'L',   'P1',  'S3A', 'S3A', 'M1',  'LP',  'L',   'P1',  'S3A', 'S4A', 'P4',  'LP',  'L',   'P1',  'S3A', 'S3A', 'M1',  'LP',  'L',   'P2',  'S4A', 'S4A', 'M1',  'LP',  'L',   'P3',  'S3A', 'S4A'],
  8:  ['M1',  'LP',  'L',   'P1',  'S4A', 'S4A', 'M1',  'LP',  'L',   'S4A', 'S4A', 'S4A', 'M1',  'LP',  'L',   'P1',  'P2',  'S4A', 'M1',  'LP',  'L',   'L',   'L',   'L',   'L',   'L',   'L',   'P3',  'S2A', 'S4A'],
  9:  ['S3A', 'S3A', 'LP',  'L',   'P3',  'S3A', 'S4A', 'M1',  'LP',  'L',   'P2',  'S4A', 'S4A', 'S4A', 'M1',  'LP',  'L',   'S4A', 'S4A', 'P4',  'LP',  'L',   'P2',  'S4A', 'S4A', 'M1',  'LP',  'L',   'P1',  'S3A'],
  10: ['S2A', 'S2A', 'LP',  'L',   'S2A', 'S2A', 'S2A', 'M1',  'LP',  'M1',  'L',   'P3',  'S4A', 'M1',  'LP',  'L',   'S2A', 'S3A', 'S3A', 'P3',  'L',   'L',   'L',   'L',   'L',   'L',   'L',   'L',   'L',   'L'],
  11: ['P1',  'P2',  'M1',  'LP',  'L',   'P2',  'S4A', 'S2A', 'M1',  'LP',  'L',   'P3',  'S2A', 'M1',  'LP',  'L',   'P2',  'P2',  'S4A', 'S4A', 'M1',  'LP',  'L',   'P1',  'S4A', 'S4A', 'M1',  'LP',  'L',   'P2'],
  12: ['S2A', 'S2A', 'M1',  'LP',  'L',   'P1',  'S2A', 'S4A', 'M1',  'LP',  'L',   'LP',  'L',   'S2A', 'M1',  'S3A', 'P2',  'P1',  'S2A', 'P3',  'M1',  'LP',  'L',   'P2',  'S3A', 'S4A', 'M1',  'LP',  'L',   'P1'],
  13: ['P2',  'S4A', 'S4A', 'M1',  'LP',  'L',   'L',   'L',   'L',   'L',   'L',   'L',   'P3',  'S4A', 'S2A', 'M1',  'LP',  'L',   'P5',  'S4A', 'S4A', 'M1',  'LP',  'L',   'P1',  'P5',  'S4A', 'M1',  'LP',  'L'],
  14: ['L',   'P1',  'S4A', 'S2A', 'M1',  'LP',  'L',   'P2',  'S4A', 'S4A', 'M1',  'LP',  'L',   'P3',  'S4A', 'S4A', 'M1',  'LP',  'L',   'P3',  'P3',  'L',   'L',   'L',   'L',   'L',   'S3A', 'S4A', 'M1',  'LP'],
  15: ['LP',  'L',   'P2',  'S4A', 'S3A', 'M1',  'LP',  'L',   'P2',  'S3A', 'S3A', 'M1',  'LP',  'L',   'P2',  'S3A', 'S4A', 'M1',  'LP',  'L',   'P3',  'L',   'L',   'L',   'L',   'L',   'P1',  'S3A', 'S4A', 'M1'],
  16: ['M1',  'LP',  'L',   'P1',  'P3',  'S4A', 'M1',  'LP',  'L',   'P2',  'S2A', 'S2A', 'P3',  'LP',  'L',   'P2',  'S2A', 'S2A', 'M1',  'LP',  'L',   'L',   'L',   'L',   'L',   'L',   'L',   'P3',  'S2A', 'IZIN'],
  17: ['S4A', 'S4A', 'LP',  'L',   'M1',  'S2A', 'S4A', 'M1',  'LP',  'L',   'P2',  'S2A', 'S4A', 'M1',  'LP',  'L',   'P1',  'S2A', 'S2A', 'P4',  'LP',  'L',   'P3',  'S4A', 'P2',  'M1',  'LP',  'L',   'P2',  'S3A'],
  18: ['P2',  'S4A', 'S4A', 'M2',  'LP',  'L',   'P3',  'S3A', 'S3A', 'M2',  'LP',  'L',   'P3',  'S3A', 'S3A', 'M2',  'LP',  'L',   'P3',  'S3A', 'S4A', 'M2',  'LP',  'L',   'P1',  'S2A', 'S4A', 'M2',  'LP',  'L'],
  19: ['P2',  'S4A', 'S4A', 'M2',  'LP',  'L',   'P3',  'S3A', 'S2A', 'M2',  'LP',  'L',   'P3',  'P3',  'S4A', 'M2',  'LP',  'L',   'P5',  'S4A', 'S4A', 'S3A', 'M2',  'LP',  'L',   'P5',  'S2A', 'M2',  'LP',  'L'],
  20: ['L',   'P1',  'S3A', 'S3A', 'M2',  'LP',  'L',   'P2',  'S2A', 'S2A', 'M2',  'LP',  'L',   'P3',  'S2A', 'S2A', 'M2',  'LP',  'L',   'P3',  'S3A', 'M2',  'LP',  'L',   'P1',  'S3A', 'S4A', 'S2A', 'M2',  'LP'],
  21: ['L',   'P2',  'S4A', 'S4A', 'M2',  'LP',  'L',   'P1',  'S2A', 'S4A', 'M2',  'LP',  'L',   'P3',  'S3A', 'S3A', 'M2',  'LP',  'L',   'P3',  'S3A', 'S4A', 'M2',  'LP',  'L',   'S4A', 'S2A', 'S3A', 'M2',  'LP'],
  22: ['LP',  'L',   'P2',  'S4A', 'S2A', 'P2',  'S3A', 'L',   'P1',  'S3A', 'S2A', 'M2',  'LP',  'L',   'P2',  'S2A', 'S4A', 'M2',  'LP',  'L',   'S3A', 'S2A', 'S3A', 'M2',  'LP',  'L',   'P1',  'P3',  'S3A', 'M2'],
  23: ['LP',  'P2',  'P1',  'S4A', 'P3',  'M2',  'LP',  'L',   'P2',  'P3',  'S3A', 'M2',  'LP',  'L',   'P1',  'P1',  'S2A', 'M2',  'LP',  'L',   'P3',  'L',   'L',   'L',   'L',   'L',   'P2',  'S4A', 'S2A', 'M2'],
  24: ['M2',  'LP',  'L',   'P2',  'S4A', 'S2A', 'M2',  'LP',  'L',   'P1',  'P3',  'P3',  'P4',  'LP',  'L',   'L',   'S4A', 'S4A', 'M2',  'LP',  'P2',  'P1',  'S4A', 'S2A', 'M2',  'LP',  'L',   'P3',  'S4A', 'S2A'],
  25: ['M2',  'LP',  'L',   'P2',  'S2A', 'S2A', 'M2',  'LP',  'L',   'S2A', 'S2A', 'S3A', 'P4',  'LP',  'L',   'P2',  'S3A', 'S2A', 'M2',  'LP',  'L',   'L',   'L',   'L',   'L',   'L',   'L',   'L',   'L',   'L'],
  26: ['S4A', 'S4A', 'LP',  'L',   'S2A', 'P2',  'S4A', 'M2',  'LP',  'L',   'P1',  'P3',  'S4A', 'M2',  'LP',  'L',   'P1',  'S4A', 'S4A', 'S2A', 'LP',  'L',   'P1',  'S4A', 'S2A', 'M2',  'LP',  'L',   'P2',  'S2A'],
  27: ['S4A', 'S4A', 'LP',  'L',   'P3',  'S3A', 'S3A', 'M2',  'LP',  'L',   'P1',  'S3A', 'S4A', 'M2',  'LP',  'L',   'P1',  'S3A', 'S4A', 'L',   'L',   'L',   'L',   'L',   'L',   'L',   'L',   'L',   'L',   'L'],
  28: ['S4A', 'S4A', 'S4A', 'M2',  'LP',  'L',   'S4A', 'S4A', 'M2',  'LP',  'L',   'S4A', 'S2A', 'S4A', 'M2',  'LP',  'L',   'P1',  'S2A', 'P4',  'M2',  'LP',  'L',   'P2',  'S4A', 'S4A', 'M2',  'LP',  'L',   'P1'],
  29: ['S4A', 'S4A', 'M2',  'LP',  'L',   'P1',  'S3A', 'S4A', 'M2',  'LP',  'L',   'P3',  'S3A', 'S4A', 'M2',  'LP',  'L',   'P1',  'S3A', 'S4A', 'M2',  'LP',  'L',   'P2',  'S4A', 'S4A', 'M2',  'LP',  'L',   'P2'],
  30: ['S3A', 'S3A', 'M2',  'LP',  'L',   'M2',  'LP',  'S3A', 'M2',  'LP',  'L',   'S3A', 'P3',  'S3A', 'M2',  'LP',  'L',   'P2',  'S3A', 'S3A', 'M2',  'LP',  'L',   'P1',  'S3A', 'S4A', 'M2',  'LP',  'L',   'P2'],
  31: ['P2',  'P1',  'L',   'P2',  'P3',  'S4A', 'P3',  'P1',  'P2',  'L',   'P2',  'P3',  'S3A', 'S2A', 'P1',  'S2A', 'L',   'P2',  'P5',  'P3',  'P1',  'P2',  'P1',  'L',   'S2A', 'P5',  'P2',  'S2A', 'P1',  'P1'],
};

// Backward-compatible alias
export const RAW_SEPTEMBER_2026_SCHEDULE: Record<number, ShiftCode[]> = OFFICIAL_SEPTEMBER_2026_SCHEDULE;

export function getStaffCanteenPreference(staffId: number, staffName: string): { canteen: 'SMP' | 'SMA'; area: 'MASJID' | 'KANTIN' } {
  const n = (staffName || '').toLowerCase();
  if (n.includes('sma') || n.includes('chabib') || n.includes('dewi') || n.includes('mufid')) {
    return { canteen: 'SMA', area: 'KANTIN' };
  }
  return { canteen: 'SMP', area: 'KANTIN' };
}

/**
 * Return September 2026 schedule days matching the official PDF document exactly.
 * Zero binding rules: each cell is returned exactly as published in the official document.
 */
export function getInitialSeptember2026Days(): Record<number, Record<number, ShiftCode>> {
  const baseDays: Record<number, Record<number, ShiftCode>> = {};
  for (let d = 1; d <= 30; d++) {
    baseDays[d] = {};
    for (let staffId = 1; staffId <= 31; staffId++) {
      const staffShifts = OFFICIAL_SEPTEMBER_2026_SCHEDULE[staffId];
      if (staffShifts && staffShifts[d - 1]) {
        baseDays[d][staffId] = staffShifts[d - 1];
      } else {
        baseDays[d][staffId] = 'L';
      }
    }
  }
  return baseDays;
}

// Neutral pass-through functions to release all binding rules and preserve existing assignments
export function distributeSeptemberMorningShifts(
  rawDays: Record<number, Record<number, ShiftCode>>,
  _year?: number,
  _month?: number,
  _staffList?: Staff[]
): Record<number, Record<number, ShiftCode>> {
  return rawDays;
}

export function distributeSeptemberNightShifts(
  rawDays: Record<number, Record<number, ShiftCode>>,
  _year?: number,
  _month?: number,
  _staffList?: Staff[]
): Record<number, Record<number, ShiftCode>> {
  return rawDays;
}

export function distributeSeptemberSoreShifts(
  rawDays: Record<number, Record<number, ShiftCode>>,
  _year?: number,
  _month?: number,
  _staffList?: Staff[],
  _sourceSchedule?: any
): Record<number, Record<number, ShiftCode>> {
  return rawDays;
}

export function distributeAllScheduleShifts(
  rawDays: Record<number, Record<number, ShiftCode>>,
  _year?: number,
  _month?: number,
  _staffList?: Staff[]
): Record<number, Record<number, ShiftCode>> {
  return rawDays;
}
