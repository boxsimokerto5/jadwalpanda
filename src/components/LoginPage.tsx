import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, LogIn, AlertCircle, Sparkles, Heart } from 'lucide-react';
import { INSTITUTION_INFO } from '../data/initialSchedule';

interface LoginPageProps {
  onLoginSuccess: (role: 'admin' | 'staff') => void;
  onShowSplash?: () => void;
}

// Gentle Floating Bamboo Leaves & Sakura Petals
const FLOATING_ELEMENTS = [
  { id: 1, type: 'leaf', left: '7%', delay: '0s', duration: '11s', size: 18, rotate: '25deg', opacity: 0.65 },
  { id: 2, type: 'sakura', left: '18%', delay: '2.5s', duration: '13s', size: 14, rotate: '-20deg', opacity: 0.7 },
  { id: 3, type: 'leaf', left: '29%', delay: '5s', duration: '10s', size: 20, rotate: '40deg', opacity: 0.6 },
  { id: 4, type: 'leaf', left: '42%', delay: '1s', duration: '14s', size: 16, rotate: '-15deg', opacity: 0.7 },
  { id: 5, type: 'sakura', left: '55%', delay: '4s', duration: '12s', size: 15, rotate: '30deg', opacity: 0.65 },
  { id: 6, type: 'leaf', left: '67%', delay: '2s', duration: '15s', size: 22, rotate: '-35deg', opacity: 0.7 },
  { id: 7, type: 'leaf', left: '79%', delay: '6.5s', duration: '11.5s', size: 17, rotate: '20deg', opacity: 0.6 },
  { id: 8, type: 'sakura', left: '88%', delay: '3.5s', duration: '13.5s', size: 16, rotate: '-10deg', opacity: 0.75 },
  { id: 9, type: 'leaf', left: '94%', delay: '1.5s', duration: '12s', size: 19, rotate: '45deg', opacity: 0.65 },
  { id: 10, type: 'leaf', left: '14%', delay: '7s', duration: '14s', size: 16, rotate: '-25deg', opacity: 0.6 },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onShowSplash }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    setTimeout(() => {
      // 1. Akun Khusus Admin: user "admin", password "selamanya"
      if (trimmedUser === 'admin' && trimmedPass === 'selamanya') {
        const sessionData = {
          user: 'admin',
          role: 'admin' as const,
          name: 'Administrator SRT 1',
          loggedInAt: new Date().toISOString(),
        };
        if (rememberMe) {
          localStorage.setItem('sr_auth_session', JSON.stringify(sessionData));
        } else {
          sessionStorage.setItem('sr_auth_session', JSON.stringify(sessionData));
        }
        setIsLoading(false);
        onLoginSuccess('admin');
        return;
      }

      // 2. Akun Reguler Wali Asuh: user "waliasuh", password "simalakama"
      if (trimmedUser === 'waliasuh' && trimmedPass === 'simalakama') {
        const sessionData = {
          user: 'waliasuh',
          role: 'staff' as const,
          name: 'Wali Asuh',
          loggedInAt: new Date().toISOString(),
        };
        if (rememberMe) {
          localStorage.setItem('sr_auth_session', JSON.stringify(sessionData));
        } else {
          sessionStorage.setItem('sr_auth_session', JSON.stringify(sessionData));
        }
        setIsLoading(false);
        onLoginSuccess('staff');
        return;
      }

      // Validasi gagal
      setIsLoading(false);
      setErrorMessage('ユーザー名またはパスワードが一致しません (Nama pengguna atau kata sandi tidak cocok). Silakan periksa kembali.');
    }, 400);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f8faf6] via-[#f1f6ef] to-[#e4ede1] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800 selection:bg-emerald-600 selection:text-white">
      {/* Keyframe animations for gentle bamboo leaf drift */}
      <style>{`
        @keyframes floatBambooLeaf {
          0% {
            transform: translateY(-40px) translateX(0) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 0.85;
          }
          50% {
            transform: translateY(50vh) translateX(30px) rotate(160deg);
          }
          85% {
            opacity: 0.75;
          }
          100% {
            transform: translateY(105vh) translateX(-25px) rotate(320deg);
            opacity: 0;
          }
        }
        .bamboo-float {
          position: absolute;
          top: -30px;
          pointer-events: none;
          z-index: 5;
          animation-name: floatBambooLeaf;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
        }
      `}</style>

      {/* Subtle Artistic Bamboo Stalks in Background (Zen Japanese Watercolor Effect) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-25 select-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
      >
        {/* Left Bamboo Cluster */}
        <path d="M 90 0 L 96 260 M 96 270 L 98 520 M 98 530 L 102 800" stroke="#7da680" strokeWidth="8" strokeLinecap="round" />
        <path d="M 130 0 L 134 240 M 134 250 L 137 500 M 137 510 L 140 800" stroke="#90b894" strokeWidth="6" strokeLinecap="round" />
        <path d="M 60 120 C 30 110, 10 130, 0 145 M 60 120 C 30 135, 10 160, 5 180" stroke="#84ab87" strokeWidth="3" fill="none" />
        <path d="M 96 265 C 130 250, 160 270, 180 295 M 96 265 C 140 280, 170 310, 175 335" stroke="#84ab87" strokeWidth="3" fill="none" />
        <path d="M 134 430 C 90 410, 70 435, 50 460 M 134 430 C 100 450, 80 480, 75 510" stroke="#84ab87" strokeWidth="3" fill="none" />

        {/* Right Bamboo Cluster */}
        <path d="M 1110 0 L 1105 270 M 1105 280 L 1102 530 M 1102 540 L 1098 800" stroke="#7da680" strokeWidth="8" strokeLinecap="round" />
        <path d="M 1070 0 L 1066 230 M 1066 240 L 1063 490 M 1063 500 L 1058 800" stroke="#90b894" strokeWidth="6" strokeLinecap="round" />
        <path d="M 1105 275 C 1060 260, 1030 285, 1010 310 M 1105 275 C 1050 290, 1020 325, 1015 350" stroke="#84ab87" strokeWidth="3" fill="none" />
        <path d="M 1066 450 C 1110 430, 1140 455, 1160 480 M 1066 450 C 1120 470, 1150 500, 1155 525" stroke="#84ab87" strokeWidth="3" fill="none" />
      </svg>

      {/* Floating Bamboo Leaves and Soft Sakura Petals */}
      {FLOATING_ELEMENTS.map((elem) => (
        <div
          key={elem.id}
          className="bamboo-float"
          style={{
            left: elem.left,
            animationDelay: elem.delay,
            animationDuration: elem.duration,
          }}
        >
          {elem.type === 'leaf' ? (
            /* Bamboo Leaf SVG */
            <svg
              width={elem.size}
              height={elem.size * 1.5}
              viewBox="0 0 24 36"
              fill="none"
              style={{
                transform: `rotate(${elem.rotate})`,
                opacity: elem.opacity,
                filter: 'drop-shadow(0 2px 4px rgba(45, 90, 55, 0.15))',
              }}
            >
              <path
                d="M12 2 C18 10, 22 22, 12 34 C2 22, 6 10, 12 2 Z"
                fill="url(#bambooLeafGrad)"
              />
              <path d="M12 4 L12 32" stroke="#487352" strokeWidth="0.8" opacity="0.6" />
              <defs>
                <linearGradient id="bambooLeafGrad" x1="2" y1="2" x2="22" y2="34" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a3cf9e" />
                  <stop offset="0.6" stopColor="#679b6d" />
                  <stop offset="1" stopColor="#46734d" />
                </linearGradient>
              </defs>
            </svg>
          ) : (
            /* Soft Pink Sakura Petal SVG */
            <svg
              width={elem.size}
              height={elem.size}
              viewBox="0 0 24 24"
              fill="none"
              style={{
                transform: `rotate(${elem.rotate})`,
                opacity: elem.opacity,
                filter: 'drop-shadow(0 2px 4px rgba(236, 72, 153, 0.2))',
              }}
            >
              <path
                d="M12 2C13.5 6 17 8 20.5 8C19 11.5 19 15.5 17 19C13.5 18 10.5 19 7 22C6.5 18.5 4.5 16 2 15C4.5 12 5.5 8.5 7 5C10 6 11 3.5 12 2Z"
                fill="url(#sakuraSoftGrad)"
              />
              <defs>
                <linearGradient id="sakuraSoftGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fce7f3" />
                  <stop offset="0.7" stopColor="#f472b6" />
                  <stop offset="1" stopColor="#db2777" />
                </linearGradient>
              </defs>
            </svg>
          )}
        </div>
      ))}

      {/* Atmospheric Soft Light Sunbeam / Bamboo Forest Glow Orbs */}
      <div className="absolute top-1/6 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[550px] h-96 sm:h-[550px] bg-emerald-200/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 sm:w-[480px] h-80 sm:h-[480px] bg-lime-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-2/3 left-1/5 w-72 h-72 bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Box */}
      <div className="w-full max-w-md relative z-10">
        {/* Japanese Bamboo Themed Header Branding */}
        <div className="text-center mb-6 space-y-2">
          {/* Bamboo Pill: Chikurin no Seijaku • Okaerinasai */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-800/10 border border-emerald-600/30 text-emerald-900 text-xs font-semibold tracking-wide shadow-2xs backdrop-blur-md">
            <span>🎋</span>
            <span className="font-bold">おかえりなさい</span>
            <span className="text-emerald-700/80">• Selamat Datang</span>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 pt-1">
            <div className="relative group">
              <img 
                src="/logo.svg" 
                alt="Logo Resmi Sekolah Rakyat" 
                onClick={onShowSplash}
                title={onShowSplash ? "Klik untuk melihat animasi Splash Screen" : undefined}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-xl shadow-emerald-900/15 bg-white border-2 border-emerald-200 p-1.5 object-contain ${onShowSplash ? 'cursor-pointer hover:scale-105 transition-transform duration-300' : ''}`} 
              />
              <span className="absolute -bottom-1 -right-1 text-sm select-none">🍃</span>
            </div>

            <div className="space-y-0.5">
              <h1 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight flex items-center justify-center gap-1.5">
                <span>Sistem Informasi Wali Asuh</span>
              </h1>
              {/* Japanese Subtitle: Take no Seiryo to Kizuna (Kesejukan Bambu & Ikatan Kasih) */}
              <p className="text-[11.5px] sm:text-xs text-emerald-800 font-semibold tracking-wide">
                竹の清涼と絆 • SRT 1 Kabupaten Kediri
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-800/90 font-medium">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/70 border border-emerald-200 text-emerald-900 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>{INSTITUTION_INFO.kementerian}</span>
            </span>
            <span className="text-emerald-500">•</span>
            <span className="text-emerald-900 font-semibold">{INSTITUTION_INFO.gedung}</span>
          </div>
        </div>

        {/* Luminous Japanese Shoji / Bamboo Glass Card (Soft & Bright) */}
        <div className="relative overflow-hidden bg-white/88 backdrop-blur-2xl border border-emerald-200/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/10 ring-1 ring-emerald-600/15">
          {/* Bamboo Gradient Top Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-lime-500" />

          {/* Header Card */}
          <div className="mb-6 border-b border-emerald-100 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                <span className="text-emerald-700 text-lg">🎋</span>
                <span>Masuk ke Sistem</span>
              </h2>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                ログイン
              </span>
            </div>
            <p className="text-xs text-emerald-800/85 mt-1 leading-relaxed">
              Masukkan nama pengguna dan kata sandi otorisasi untuk memulai penugasan hari ini.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn shadow-2xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-emerald-950" htmlFor="login-username">
                  Nama Pengguna (User)
                </label>
                <span className="text-[10.5px] text-emerald-700 font-semibold">ユーザー名</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin atau waliasuh..."
                  className="w-full pl-10 pr-3.5 py-2.5 bg-emerald-50/50 border border-emerald-300/80 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-emerald-950" htmlFor="login-password">
                  Kata Sandi (Password)
                </label>
                <span className="text-[10.5px] text-emerald-700 font-semibold">パスワード</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full pl-10 pr-10 py-2.5 bg-emerald-50/50 border border-emerald-300/80 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-white cursor-pointer"
                />
                <span className="text-xs text-emerald-900 font-medium">Ingat sesi di perangkat ini</span>
              </label>
              <span className="text-[10.5px] text-emerald-800/80 font-medium flex items-center gap-1">
                <Heart className="w-3 h-3 text-emerald-600 fill-emerald-600/20" />
                <span>安心安全</span>
              </span>
            </div>

            {/* Submit Button with Bamboo Green Gradient */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.99] text-white text-sm font-bold rounded-2xl shadow-lg shadow-emerald-800/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-emerald-500/30"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-emerald-100" />
                  <span>ログイン • Buka Aplikasi</span>
                  <span className="text-xs">🎋</span>
                </>
              )}
            </button>
          </form>

          {/* Bottom helper & Splash Preview */}
          {onShowSplash && (
            <div className="mt-5 pt-4 border-t border-emerald-100 flex items-center justify-center text-[11px] text-emerald-800">
              <button
                type="button"
                onClick={onShowSplash}
                className="text-emerald-700 hover:text-emerald-900 font-semibold hover:underline flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Lihat animasi intro aplikasi"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>スプラッシュ (Lihat Splash Screen)</span>
              </button>
            </div>
          )}
        </div>

        {/* Japanese Bamboo Wisdom Quote & Footer Info */}
        <div className="mt-6 text-center space-y-1.5">
          <p className="text-xs text-emerald-900 font-semibold italic drop-shadow-2xs">
            「 竹のようにしなやかに、温かな愛で寄り添う。」
          </p>
          <p className="text-[10.5px] text-emerald-700/90 font-medium">
            (Lentur dan kokoh bagaikan bambu, mendampingi santri dengan penuh kasih sayang)
          </p>
          <p className="text-[10.5px] text-slate-500 pt-1">
            © 2026 SRT 1 Kab Kediri • Sistem Penjadwalan Shif & Notifikasi Pengingat Tugas
          </p>
        </div>
      </div>
    </div>
  );
};
