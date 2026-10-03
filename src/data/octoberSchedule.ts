import { Staff, ShiftCode } from '../types';

export const OCTOBER_2026_STAFF_LIST: Staff[] = [
  { id: 1, code: 'L1', name: "Aris Mahmud Syafi'i", gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ams', phone: '0812-3456-7801' },
  { id: 2, code: 'L2', name: "Muji Santoso", gender: 'L', jenjang: 'SD', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ms', phone: '0812-3456-7802' },
  { id: 3, code: 'L3', name: "Moch. Chabib", gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'mc', phone: '0812-3456-7803' },
  { id: 4, code: 'L4', name: "Moh Asrofi", gender: 'L', jenjang: 'SD', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ma', phone: '0812-3456-7804' },
  { id: 5, code: 'L5', name: "Hariadi", gender: 'L', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'hrd', phone: '0812-3456-7805' },
  { id: 6, code: 'L6', name: "Dwi Chusnul Mufid", gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'dcm', phone: '0812-3456-7806' },
  { id: 7, code: 'L7', name: "Suhariyono", gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'shy', phone: '0812-3456-7807' },
  { id: 8, code: 'L8', name: "A. Zainudin Sholeh", gender: 'L', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'zs', phone: '0812-3456-7808' },
  { id: 9, code: 'L9', name: "Abisarwan Rafif", gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ar', phone: '0812-3456-7809' },
  { id: 10, code: 'L10', name: "Nanang Arifin", gender: 'L', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'na', phone: '0812-3456-7810' },
  { id: 11, code: 'L11', name: "Yusak Wasis Pratonggo", gender: 'L', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ywp', phone: '0812-3456-7811' },
  { id: 12, code: 'L12', name: "Akhmad Fadkhurriza I", gender: 'L', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'afi', phone: '0812-3456-7812' },
  { id: 13, code: 'L13', name: "Amirul Mu'minin Rofico P.K.", gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'amr', phone: '0812-3456-7813' },
  { id: 14, code: 'L14', name: "Teguh Cahyono", gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'tc', phone: '0812-3456-7814' },
  { id: 15, code: 'L15', name: "Eko Wahyudi", gender: 'L', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ew', phone: '0812-3456-7815' },
  { id: 16, code: 'P1', name: "Dewi Askinu", gender: 'P', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'da', phone: '0812-3456-7816' },
  { id: 17, code: 'P2', name: "Ambika Widya Asmara", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'awa', phone: '0812-3456-7817' },
  { id: 18, code: 'P3', name: "Rindani", gender: 'P', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'rin', phone: '0812-3456-7818' },
  { id: 19, code: 'P4', name: "Eky Venty Pricilia", gender: 'P', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'evp', phone: '0812-3456-7819' },
  { id: 20, code: 'P5', name: "Retnowati", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'rn', phone: '0812-3456-7820' },
  { id: 21, code: 'P6', name: "Deni Furitrinofi", gender: 'P', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'df', phone: '0812-3456-7821' },
  { id: 22, code: 'P7', name: "Chusfia Hanik Wihayati", gender: 'P', jenjang: 'SD', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'chw', phone: '0812-3456-7822' },
  { id: 23, code: 'P8', name: "Siti Maslukah", gender: 'P', jenjang: 'SD', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'sm', phone: '0812-3456-7823' },
  { id: 24, code: 'P9', name: "Erna Rizkiani", gender: 'P', jenjang: 'SMP', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'er', phone: '0812-3456-7824' },
  { id: 25, code: 'P10', name: "Afida Saidatul Fuadia", gender: 'P', jenjang: 'SMA', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'asf', phone: '0812-3456-7825' },
  { id: 26, code: 'P11', name: "Anita Kurniawati", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'ak', phone: '0812-3456-7826' },
  { id: 27, code: 'P12', name: "Herlina Ratu Belia", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'hrb', phone: '0812-3456-7827' },
  { id: 28, code: 'P13', name: "Priscillia Dwi Isnawati", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'pdi', phone: '0812-3456-7828' },
  { id: 29, code: 'L16', name: "Muh.Sahrul Falahy", gender: 'L', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'mfa', phone: '0812-3456-7829' },
  { id: 30, code: 'P14', name: "Nabella Viodora Wiyudha P", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'nvw', phone: '0812-3456-7830' },
  { id: 31, code: 'P15', name: "Sanya Carina Qobsoh", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'scq', phone: '0812-3456-7831' },
  { id: 32, code: 'L17', name: "Sauca Arsa Dewanta", gender: 'L', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'sad', phone: '0812-3456-7832' },
  { id: 33, code: 'L18', name: "Awaluddin Nur Alfiyan", gender: 'L', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ana', phone: '0812-3456-7833' },
  { id: 34, code: 'P16', name: "Ilma Warta Fani", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'iwf', phone: '0812-3456-7834' },
  { id: 35, code: 'P17', name: "Almas Mirna Faradilla", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'amf', phone: '0812-3456-7835' },
  { id: 36, code: 'L19', name: "Triyono Widiyantoro", gender: 'L', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'twi', phone: '0812-3456-7836' },
  { id: 37, code: 'L20', name: "Aziz Fajar Yusniza", gender: 'L', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'afy', phone: '0812-3456-7837' },
  { id: 38, code: 'P18', name: "Annisa Ayu Hamidah", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'aah', phone: '0812-3456-7838' },
  { id: 39, code: 'P19', name: "Ingrid Ardelia Fiddina", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'iaf', phone: '0812-3456-7839' },
  { id: 40, code: 'L21', name: "Rahmad Faizal Akbar", gender: 'L', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'rfa', phone: '0812-3456-7840' },
  { id: 41, code: 'P20', name: "Ratna Benita", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'rbe', phone: '0812-3456-7841' },
  { id: 42, code: 'P21', name: "Putri Amelia", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'pam', phone: '0812-3456-7842' },
  { id: 43, code: 'P22', name: "Ayusti Rizkiana", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'ari', phone: '0812-3456-7843' },
  { id: 44, code: 'L22', name: "Mochamad Khirzudin Yusuf", gender: 'L', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'mky', phone: '0812-3456-7844' },
  { id: 45, code: 'P23', name: "Aprilia Nur Cahya", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'anc', phone: '0812-3456-7845' },
  { id: 46, code: 'P24', name: "Aufa Zakia Noza", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'azn', phone: '0812-3456-7846' },
  { id: 47, code: 'P25', name: "Rahma Habsari Maisun", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'rhm', phone: '0812-3456-7847' },
  { id: 48, code: 'L23', name: "Adi Yusuf", gender: 'L', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ayu', phone: '0812-3456-7848' },
  { id: 49, code: 'P26', name: "Septi Nirmala Sari", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'sns', phone: '0812-3456-7849' },
  { id: 50, code: 'P27', name: "Nisfatul Laili", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'nla', phone: '0812-3456-7850' },
  { id: 51, code: 'P28', name: "Dhesy Noer Laily", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'dnl', phone: '0812-3456-7851' },
  { id: 52, code: 'L24', name: "Adin Maqbadudin", gender: 'L', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Laki-laki', initials: 'ama', phone: '0812-3456-7852' },
  { id: 53, code: 'P29', name: "Erisa Dwi Nur Aini", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'edn', phone: '0812-3456-7853' },
  { id: 54, code: 'P30', name: "Riris Dwi Puji Rahayu", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'rdp', phone: '0812-3456-7854' },
  { id: 55, code: 'P31', name: "Agistina Sindi Pratiwi", gender: 'P', jenjang: '-', role: 'Wali Asuh', group: 'Petugas Perempuan', initials: 'asp', phone: '0812-3456-7855' },
];

/**
 * Official October 2026 Shift Schedule (Days 1 to 31)
 * Complete official roster for all 55 Wali Asuh
 */
export const OFFICIAL_OCTOBER_2026_SCHEDULE: Record<number, ShiftCode[]> = {
  // 1: [L1] Aris Mahmud Syafi'i
  1: ['P1', 'S4A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1'],

  // 2: [L2] Muji Santoso
  2: ['P1', 'S2A', 'S2A', 'IZIN', 'LP', 'L', 'IZIN', 'IZIN', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1'],

  // 3: [L3] Moch. Chabib
  3: ['L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M1', 'LP', 'L'],

  // 4: [L4] Moh Asrofi
  4: ['L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M1', 'LP', 'L'],

  // 5: [L5] Hariadi
  5: ['LP', 'L', 'P5', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M1', 'LP'],

  // 6: [L6] Dwi Chusnul Mufid
  6: ['LP', 'L', 'P5', 'IZIN', 'IZIN', 'IZIN', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M1', 'LP'],

  // 7: [L7] Suhariyono
  7: ['M2', 'LP', 'L', 'P1', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A'],

  // 8: [L8] A. Zainudin Sholeh
  8: ['M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M1'],

  // 9: [L9] Abisarwan Rafif
  9: ['S3A', 'M1', 'LP', 'L', 'IZIN', 'IZIN', 'IZIN', 'IZIN', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A'],

  // 10: [L10] Nanang Arifin
  10: ['S4A', 'S4A', 'M1', 'LP', 'L', 'IZIN', 'IZIN', 'IZIN', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A'],

  // 11: [L11] Yusak Wasis Pratonggo
  11: ['S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A'],

  // 12: [L12] Akhmad Fadkhurriza I
  12: ['P1', 'P1', 'P5', 'IZIN', 'LP', 'L', 'IZIN', 'IZIN', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1'],

  // 13: [L13] Amirul Mu'minin Rofico P.K.
  13: ['L', 'S3A', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M1', 'LP', 'L'],

  // 14: [L14] Teguh Cahyono
  14: ['LP', 'L', 'P5', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M1', 'LP'],

  // 15: [L15] Eko Wahyudi
  15: ['IZIN', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M1'],

  // 16: [P1] Dewi Askinu
  16: ['P1', 'S3A', 'S3A', 'M2', 'LP', 'L', 'P1', 'P1', 'P1', 'P1', 'S2A', 'S2A', 'L', 'L', 'P1', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M2'],

  // 17: [P2] Ambika Widya Asmara
  17: ['P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1'],

  // 18: [P3] Rindani
  18: ['L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M2', 'LP', 'L'],

  // 19: [P4] Eky Venty Pricilia
  19: ['L', 'IZIN', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M2', 'LP', 'L'],

  // 20: [P5] Retnowati
  20: ['LP', 'L', 'S2A', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M2', 'LP'],

  // 21: [P6] Deni Furitrinofi
  21: ['LP', 'L', 'P5', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M2', 'LP'],

  // 22: [P7] Chusfia Hanik Wihayati
  22: ['M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M2'],

  // 23: [P8] Siti Maslukah
  23: ['S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P3', 'S2A', 'S2A'],

  // 24: [P9] Erna Rizkiani
  24: ['S4A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P3', 'S2A', 'S2A'],

  // 25: [P10] Afida Saidatul Fuadia
  25: ['S3A', 'S4A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A'],

  // 26: [P11] Anita Kurniawati
  26: ['S3A', 'S3A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A'],

  // 27: [P12] Herlina Ratu Belia
  27: ['L', 'P1', 'P1', 'P1', 'P1', 'P1', 'P1', 'L', 'P1', 'P1', 'P1', 'P1', 'P1', 'P1', 'L', 'P1', 'P1', 'P1', 'P1', 'P1', 'P1', 'L', 'P1', 'P1', 'P1', 'P1', 'P1', 'P1', 'L', 'P1', 'P1'],

  // 28: [P13] Priscillia Dwi Isnawati
  28: ['C', 'C', 'C', 'C', 'C', 'P1', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P3', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1', 'S2A', 'S2A', 'M2', 'LP', 'L', 'P1'],

  // 29: [L16] Muh.Sahrul Falahy
  29: ['L', 'P1', 'P1', 'P1', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A'],

  // 30: [P14] Nabella Viodora Wiyudha P
  30: ['L', 'P1', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A'],

  // 31: [P15] Sanya Carina Qobsoh
  31: ['L', 'P1', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M'],

  // 32: [L17] Sauca Arsa Dewanta
  32: ['L', 'P1', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP'],

  // 33: [L18] Awaluddin Nur Alfiyan
  33: ['L', 'P1', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L'],

  // 34: [P16] Ilma Warta Fani
  34: ['L', 'P1', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2'],

  // 35: [P17] Almas Mirna Faradilla
  35: ['L', 'P1', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A'],

  // 36: [L19] Triyono Widiyantoro
  36: ['L', 'P1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A'],

  // 37: [L20] Aziz Fajar Yusniza
  37: ['L', 'P1', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A'],

  // 38: [P18] Annisa Ayu Hamidah
  38: ['L', 'P1', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A'],

  // 39: [P19] Ingrid Ardelia Fiddina
  39: ['L', 'P1', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M'],

  // 40: [L21] Rahmad Faizal Akbar
  40: ['L', 'P1', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP'],

  // 41: [P20] Ratna Benita
  41: ['L', 'P1', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L'],

  // 42: [P21] Putri Amelia
  42: ['L', 'P1', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2'],

  // 43: [P22] Ayusti Rizkiana
  43: ['L', 'P1', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A'],

  // 44: [L22] Mochamad Khirzudin Yusuf
  44: ['L', 'P1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A'],

  // 45: [P23] Aprilia Nur Cahya
  45: ['L', 'P1', 'L', 'P', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A'],

  // 46: [P24] Aufa Zakia Noza
  46: ['L', 'P1', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A'],

  // 47: [P25] Rahma Habsari Maisun
  47: ['L', 'P1', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M'],

  // 48: [L23] Adi Yusuf
  48: ['L', 'P1', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP'],

  // 49: [P26] Septi Nirmala Sari
  49: ['L', 'P1', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L'],

  // 50: [P27] Nisfatul Laili
  50: ['L', 'P1', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2'],

  // 51: [P28] Dhesy Noer Laily
  51: ['L', 'P1', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A'],

  // 52: [L24] Adin Maqbadudin
  52: ['L', 'P1', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A'],

  // 53: [P29] Erisa Dwi Nur Aini
  53: ['L', 'P1', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M'],

  // 54: [P30] Riris Dwi Puji Rahayu
  54: ['L', 'P1', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P3', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L'],

  // 55: [P31] Agistina Sindi Pratiwi
  55: ['L', 'P1', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A', 'S2A', 'S2A', 'S2A', 'M', 'LP', 'L', 'P2', 'S2A'],

};

/**
 * Return October 2026 schedule days matching the official document exactly.
 * Zero binding rules: each cell is returned exactly as published in the official document.
 */
export function getInitialOctober2026Days(): Record<number, Record<number, ShiftCode>> {
  const baseDays: Record<number, Record<number, ShiftCode>> = {};
  for (let d = 1; d <= 31; d++) {
    baseDays[d] = {};
    for (const staff of OCTOBER_2026_STAFF_LIST) {
      const staffShifts = OFFICIAL_OCTOBER_2026_SCHEDULE[staff.id];
      if (staffShifts && staffShifts[d - 1]) {
        baseDays[d][staff.id] = staffShifts[d - 1];
      } else {
        baseDays[d][staff.id] = 'L';
      }
    }
  }
  return baseDays;
}
