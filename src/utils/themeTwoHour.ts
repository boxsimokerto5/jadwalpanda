/**
 * Palet Warna Lembut Khas Jepang & Watermark Artistik Tradisional
 * (Rotasi Otomatis Setiap 10 Menit Sekali).
 * 
 * Menghadirkan 12 variasi palet warna lembut, teduh, dan puitis khas Jepang
 * (Wa no Dentō-iro / 和の伝統色: Chikurin Bamboo, Sakura Kasumi, Fuji Twilight,
 * Sencha Green, Momiji Autumn, Asagi Wave, Wisteria Mist, Panda Bamboo, dll.)
 * Dilengkapi dengan tanda air (watermark) samar-samar artistik (Panda, Sakura,
 * Gunung Fuji, Bambu, Koi, Torii, Origami Crane, Momiji).
 */

export type WatermarkType = 'panda' | 'sakura' | 'fuji' | 'bamboo' | 'koi' | 'torii' | 'crane' | 'momiji';

export interface TwoHourTheme {
  timeSlot: string;
  name: string;
  japaneseName: string;
  japaneseKanji: string;
  watermarkType: WatermarkType;
  watermarkTitle: string;
  gradientClass: string;
  borderClass: string;
  titleColor: string;
  subtitleColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconColor: string;
  accentGlow: string;
}

export type VibrantTheme = TwoHourTheme;

export const JAPANESE_SOFT_THEMES: Omit<TwoHourTheme, 'timeSlot'>[] = [
  // 0. Chikurin Bamboo (Kesejukan Hutan Bambu Arashiyama)
  {
    name: 'Chikurin Bamboo',
    japaneseName: '竹林の清涼',
    japaneseKanji: '竹',
    watermarkType: 'bamboo',
    watermarkTitle: '竹林 • Hutan Bambu',
    gradientClass: 'from-emerald-800 via-teal-800 to-emerald-900',
    borderClass: 'border-emerald-400/40 shadow-emerald-950/30',
    titleColor: 'text-white',
    subtitleColor: 'text-emerald-100/90',
    badgeBg: 'bg-black/25 backdrop-blur-sm',
    badgeText: 'text-white',
    badgeBorder: 'border-white/20',
    iconColor: 'text-emerald-300',
    accentGlow: 'from-emerald-400/20 via-teal-300/15 to-transparent',
  },
  // 1. Sakura Kasumi (Kelopak Bunga Sakura Senja)
  {
    name: 'Sakura Kasumi',
    japaneseName: '桜霞の春',
    japaneseKanji: '桜',
    watermarkType: 'sakura',
    watermarkTitle: '桜花 • Bunga Sakura',
    gradientClass: 'from-rose-800 via-pink-800 to-purple-900',
    borderClass: 'border-pink-400/40 shadow-pink-950/30',
    titleColor: 'text-white',
    subtitleColor: 'text-pink-100/90',
    badgeBg: 'bg-black/25 backdrop-blur-sm',
    badgeText: 'text-white',
    badgeBorder: 'border-white/20',
    iconColor: 'text-pink-300',
    accentGlow: 'from-pink-400/20 via-rose-300/15 to-transparent',
  },
  // 2. Panda & Bamboo (Panda Lucu & Kedamaian Bambu)
  {
    name: 'Panda & Bamboo',
    japaneseName: 'パンダの平和',
    japaneseKanji: '和',
    watermarkType: 'panda',
    watermarkTitle: '平和 • Panda Bambu',
    gradientClass: 'from-teal-800 via-emerald-800 to-slate-900',
    borderClass: 'border-teal-400/40 shadow-teal-950/30',
    titleColor: 'text-white',
    subtitleColor: 'text-teal-100/90',
    badgeBg: 'bg-black/25 backdrop-blur-sm',
    badgeText: 'text-white',
    badgeBorder: 'border-white/20',
    iconColor: 'text-teal-300',
    accentGlow: 'from-teal-400/20 via-emerald-300/15 to-transparent',
  },
  // 3. Fuji Twilight (Senja Lembayung Gunung Fuji)
  {
    name: 'Fuji Twilight',
    japaneseName: '富士の夕暮れ',
    japaneseKanji: '富',
    watermarkType: 'fuji',
    watermarkTitle: '富士山 • Gunung Fuji',
    gradientClass: 'from-indigo-800 via-slate-800 to-blue-900',
    borderClass: 'border-indigo-400/40 shadow-indigo-950/30',
    titleColor: 'text-white',
    subtitleColor: 'text-indigo-100/90',
    badgeBg: 'bg-black/25 backdrop-blur-sm',
    badgeText: 'text-white',
    badgeBorder: 'border-white/20',
    iconColor: 'text-indigo-300',
    accentGlow: 'from-indigo-400/20 via-blue-300/15 to-transparent',
  },
  // 4. Torii Dawn (Fajar di Gerbang Kuil Torii)
  {
    name: 'Torii Dawn',
    japaneseName: '鳥居の曙光',
    japaneseKanji: '道',
    watermarkType: 'torii',
    watermarkTitle: '鳥居 • Gerbang Torii',
    gradientClass: 'from-rose-800 via-red-800 to-amber-900',
    borderClass: 'border-rose-400/40 shadow-rose-950/30',
    titleColor: 'text-white',
    subtitleColor: 'text-rose-100/90',
    badgeBg: 'bg-black/25 backdrop-blur-sm',
    badgeText: 'text-white',
    badgeBorder: 'border-white/20',
    iconColor: 'text-amber-300',
    accentGlow: 'from-rose-400/20 via-amber-300/15 to-transparent',
  },
  // 5. Koi Pond Harmony (Ikan Koi Berenang Harmoni)
  {
    name: 'Koi Harmony',
    japaneseName: '錦鯉の調和',
    japaneseKanji: '鯉',
    watermarkType: 'koi',
    watermarkTitle: '錦鯉 • Ikan Koi',
    gradientClass: 'from-cyan-800 via-teal-800 to-blue-950',
    borderClass: 'border-cyan-400/40 shadow-cyan-950/30',
    titleColor: 'text-white',
    subtitleColor: 'text-cyan-100/90',
    badgeBg: 'bg-black/25 backdrop-blur-sm',
    badgeText: 'text-white',
    badgeBorder: 'border-white/20',
    iconColor: 'text-cyan-300',
    accentGlow: 'from-cyan-400/20 via-teal-300/15 to-transparent',
  },
  // 6. Momiji Autumn (Guguran Daun Maple Musim Gugur)
  {
    name: 'Momiji Autumn',
    japaneseName: '紅葉の秋風',
    japaneseKanji: '紅',
    watermarkType: 'momiji',
    watermarkTitle: '紅葉 • Daun Momiji',
    gradientClass: 'from-amber-800 via-orange-800 to-rose-900',
    borderClass: 'border-amber-400/40 shadow-amber-950/30',
    titleColor: 'text-white',
    subtitleColor: 'text-amber-100/90',
    badgeBg: 'bg-black/25 backdrop-blur-sm',
    badgeText: 'text-white',
    badgeBorder: 'border-white/20',
    iconColor: 'text-orange-300',
    accentGlow: 'from-amber-400/20 via-orange-300/15 to-transparent',
  },
  // 7. Origami Peace Crane (Bangau Origami & Doa Ketulusan)
  {
    name: 'Origami Peace',
    japaneseName: '折り鶴の祈り',
    japaneseKanji: '鶴',
    watermarkType: 'crane',
    watermarkTitle: '折り鶴 • Bangau Kertas',
    gradientClass: 'from-sky-800 via-indigo-800 to-slate-900',
    borderClass: 'border-sky-400/40 shadow-sky-950/30',
    titleColor: 'text-white',
    subtitleColor: 'text-sky-100/90',
    badgeBg: 'bg-black/25 backdrop-blur-sm',
    badgeText: 'text-white',
    badgeBorder: 'border-white/20',
    iconColor: 'text-sky-300',
    accentGlow: 'from-sky-400/20 via-indigo-300/15 to-transparent',
  },
  // 8. Sencha Green (Keheningan Teh Hijau Zen)
  {
    name: 'Sencha Green',
    japaneseName: '煎茶の静寂',
    japaneseKanji: '茶',
    watermarkType: 'bamboo',
    watermarkTitle: '煎茶 • Teh Hijau Zen',
    gradientClass: 'from-lime-800 via-emerald-800 to-stone-900',
    borderClass: 'border-lime-400/40 shadow-lime-950/30',
    titleColor: 'text-white',
    subtitleColor: 'text-lime-100/90',
    badgeBg: 'bg-black/25 backdrop-blur-sm',
    badgeText: 'text-white',
    badgeBorder: 'border-white/20',
    iconColor: 'text-lime-300',
    accentGlow: 'from-lime-400/20 via-emerald-300/15 to-transparent',
  },
  // 9. Fuji Lavender (Keanggunan Bunga Wisteria)
  {
    name: 'Fuji Lavender',
    japaneseName: '藤紫の優雅',
    japaneseKanji: '藤',
    watermarkType: 'sakura',
    watermarkTitle: '藤花 • Bunga Wisteria',
    gradientClass: 'from-purple-800 via-violet-800 to-slate-900',
    borderClass: 'border-purple-400/40 shadow-purple-950/30',
    titleColor: 'text-white',
    subtitleColor: 'text-purple-100/90',
    badgeBg: 'bg-black/25 backdrop-blur-sm',
    badgeText: 'text-white',
    badgeBorder: 'border-white/20',
    iconColor: 'text-purple-300',
    accentGlow: 'from-purple-400/20 via-violet-300/15 to-transparent',
  },
  // 10. Asagi Coast Wave (Ombak Pesisir Biru Pirus)
  {
    name: 'Asagi Wave',
    japaneseName: '浅葱の波紋',
    japaneseKanji: '波',
    watermarkType: 'koi',
    watermarkTitle: '波紋 • Ombak Asagi',
    gradientClass: 'from-teal-800 via-cyan-800 to-indigo-950',
    borderClass: 'border-teal-400/40 shadow-teal-950/30',
    titleColor: 'text-white',
    subtitleColor: 'text-teal-100/90',
    badgeBg: 'bg-black/25 backdrop-blur-sm',
    badgeText: 'text-white',
    badgeBorder: 'border-white/20',
    iconColor: 'text-teal-300',
    accentGlow: 'from-teal-400/20 via-cyan-300/15 to-transparent',
  },
  // 11. Komorebi Golden (Sinar Matahari Menerobos Rindang)
  {
    name: 'Komorebi Gold',
    japaneseName: '木漏れ日の光',
    japaneseKanji: '光',
    watermarkType: 'fuji',
    watermarkTitle: '木漏れ日 • Sinar Harapan',
    gradientClass: 'from-amber-800 via-yellow-800 to-emerald-950',
    borderClass: 'border-amber-400/40 shadow-amber-950/30',
    titleColor: 'text-white',
    subtitleColor: 'text-amber-100/90',
    badgeBg: 'bg-black/25 backdrop-blur-sm',
    badgeText: 'text-white',
    badgeBorder: 'border-white/20',
    iconColor: 'text-yellow-300',
    accentGlow: 'from-amber-400/20 via-yellow-300/15 to-transparent',
  },
];

// Fallback compatibility alias
export const VIBRANT_THEMES = JAPANESE_SOFT_THEMES;

export const TWO_HOUR_THEMES: TwoHourTheme[] = JAPANESE_SOFT_THEMES.map((t, idx) => ({
  ...t,
  timeSlot: `${String(idx * 2).padStart(2, '0')}:00 - ${String((idx * 2 + 2) % 24).padStart(2, '0')}:00`,
}));

/**
 * Menghitung indeks slot 10 menit saat ini dalam 24 jam (0 s.d 143)
 */
export function getTenMinuteSlotIndex(date = new Date()): number {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return Math.floor((hours * 60 + minutes) / 10);
}

/**
 * Format string rentang 10 menit (misal: "14:00 - 14:10", "14:10 - 14:20")
 */
export function formatTenMinuteSlot(date = new Date()): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const startMin = Math.floor(minutes / 10) * 10;
  const startH = hours;
  let endMin = startMin + 10;
  let endH = startH;
  if (endMin === 60) {
    endMin = 0;
    endH = (startH + 1) % 24;
  }
  const sH = String(startH).padStart(2, '0');
  const sM = String(startMin).padStart(2, '0');
  const eH = String(endH).padStart(2, '0');
  const eM = String(endMin).padStart(2, '0');
  return `${sH}:${sM} - ${eH}:${eM}`;
}

/**
 * Mendapatkan indeks tema berdasarkan rotasi 10 menit sekali
 */
export function getTwoHourThemeIndex(date = new Date()): number {
  const slot = getTenMinuteSlotIndex(date);
  return slot % JAPANESE_SOFT_THEMES.length;
}

/**
 * Mendapatkan tema khas Jepang aktif saat ini (berganti otomatis setiap 10 menit)
 */
export function getCurrentTwoHourTheme(date = new Date()): TwoHourTheme {
  const idx = getTwoHourThemeIndex(date);
  const base = JAPANESE_SOFT_THEMES[idx] || JAPANESE_SOFT_THEMES[0];
  return {
    ...base,
    timeSlot: formatTenMinuteSlot(date),
  };
}
