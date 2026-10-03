import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, Megaphone, Sparkles, Heart } from 'lucide-react';
import { AnnouncementData } from '../types';

// Reappear interval: 3 hours in milliseconds
const REAPPEAR_INTERVAL_MS = 3 * 60 * 60 * 1000;

interface AnnouncementPopupProps {
  announcement: AnnouncementData;
  onOpenManagement?: () => void;
  userRole?: 'admin' | 'staff';
  forceOpen?: boolean;
  onCloseForceOpen?: () => void;
}

export const AnnouncementPopup: React.FC<AnnouncementPopupProps> = ({
  announcement,
  onOpenManagement,
  userRole = 'staff',
  forceOpen,
  onCloseForceOpen,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  
  // Touch / Swipe state tracking
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Sync forceOpen prop (for example when clicking ticker/detail)
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setIsDismissing(false);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [forceOpen]);

  // Check if this announcement should show on this device (new or >= 3 hours since last seen)
  useEffect(() => {
    if (!announcement || !announcement.enabled || !announcement.text?.trim()) {
      setIsOpen(false);
      return;
    }

    try {
      const lastDismissedKey = `announcement_seen_${encodeURIComponent(announcement.text.trim())}`;
      const lastSeenVal = localStorage.getItem(lastDismissedKey);

      let shouldShow = false;

      if (!lastSeenVal) {
        shouldShow = true;
      } else {
        const lastSeenTime = !isNaN(Number(lastSeenVal))
          ? Number(lastSeenVal)
          : new Date(lastSeenVal).getTime();

        const elapsedMs = Date.now() - lastSeenTime;

        if (isNaN(lastSeenTime) || elapsedMs >= REAPPEAR_INTERVAL_MS) {
          shouldShow = true;
        }
      }

      if (shouldShow) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {
      setIsOpen(true);
    }
  }, [announcement?.text, announcement?.enabled]);

  // Handle dismiss and mark timestamp for this device (reappears after 3 hours)
  const handleDismiss = () => {
    setIsDismissing(true);
    try {
      if (announcement?.text) {
        const lastDismissedKey = `announcement_seen_${encodeURIComponent(announcement.text.trim())}`;
        localStorage.setItem(lastDismissedKey, Date.now().toString());
      }
    } catch {
      // Ignore localStorage error
    }

    setTimeout(() => {
      setIsOpen(false);
      setIsDismissing(false);
      setDragOffset({ x: 0, y: 0 });
      if (onCloseForceOpen) {
        onCloseForceOpen();
      }
    }, 280);
  };

  // Touch gesture handlers for mobile swipe dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    touchCurrentY.current = e.touches[0].clientY;
    touchCurrentX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    touchCurrentY.current = e.touches[0].clientY;
    touchCurrentX.current = e.touches[0].clientX;
    const dy = touchCurrentY.current - touchStartY.current;
    const dx = touchCurrentX.current - touchStartX.current;
    setDragOffset({ x: dx * 0.45, y: dy * 0.7 });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (touchStartY.current === null || touchCurrentY.current === null) return;
    const dy = touchCurrentY.current - touchStartY.current;
    const dx = (touchCurrentX.current || 0) - (touchStartX.current || 0);

    // If dragged sufficiently up, down, or sideways -> dismiss
    if (Math.abs(dy) > 75 || Math.abs(dx) > 100) {
      handleDismiss();
    } else {
      setDragOffset({ x: 0, y: 0 });
    }

    touchStartY.current = null;
    touchStartX.current = null;
    touchCurrentY.current = null;
    touchCurrentX.current = null;
  };

  if (!isOpen || !announcement?.enabled || !announcement?.text?.trim()) {
    return null;
  }

  // Calculate drag opacity and transform
  const dragDistance = Math.hypot(dragOffset.x, dragOffset.y);
  const dragOpacity = Math.max(0.2, 1 - dragDistance / 240);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-title"
      onClick={handleDismiss}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/65 backdrop-blur-sm transition-all duration-300 select-none cursor-pointer ${
        isDismissing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Pop-up Card Wrapper */}
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(${
            isDismissing ? 0.92 : 1
          })`,
          opacity: isDismissing ? 0 : dragOpacity,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
        }}
        className="relative w-full max-w-md cursor-default transition-all animate-in fade-in zoom-in-95 duration-300 pt-16 sm:pt-20"
      >
        {/* ========================================================================= */}
        {/* CHIBI PANDA ILLUSTRATION (Panda Peeking & Clutched Hands on Notice Board) */}
        {/* ========================================================================= */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-48 sm:w-56 h-28 sm:h-32 flex justify-center">
          <svg
            viewBox="0 0 200 120"
            className="w-full h-full drop-shadow-xl"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="pandaFurGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f3f4f6" />
              </linearGradient>
              <linearGradient id="pandaEarGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2c3038" />
                <stop offset="100%" stopColor="#111827" />
              </linearGradient>
              <linearGradient id="bambooLeafGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="100%" stopColor="#15803d" />
              </linearGradient>
            </defs>

            {/* Left Ear */}
            <circle cx="56" cy="38" r="22" fill="url(#pandaEarGrad)" />
            <circle cx="57" cy="38" r="14" fill="#374151" opacity="0.6" />

            {/* Right Ear */}
            <circle cx="144" cy="38" r="22" fill="url(#pandaEarGrad)" />
            <circle cx="143" cy="38" r="14" fill="#374151" opacity="0.6" />

            {/* Bamboo Leaf tucked beside Right Ear */}
            <g transform="translate(142, 14) rotate(22)">
              <path
                d="M0,0 C12,-16 28,-14 36,-10 C24,2 14,8 0,0 Z"
                fill="url(#bambooLeafGrad)"
              />
              <path d="M0,0 L30,-8" stroke="#166534" strokeWidth="1" opacity="0.7" />
            </g>

            {/* Panda Head (Round, Fluffy, Chubby Cheeks) */}
            <ellipse cx="100" cy="65" rx="55" ry="46" fill="url(#pandaFurGrad)" />

            {/* Soft Pink Blushing Cheeks */}
            <ellipse cx="64" cy="74" rx="10" ry="6" fill="#f472b6" opacity="0.55" />
            <ellipse cx="136" cy="74" rx="10" ry="6" fill="#f472b6" opacity="0.55" />

            {/* Left Black Eye Patch (Tilted Angled Oval) */}
            <ellipse cx="76" cy="60" rx="14" ry="17" fill="url(#pandaEarGrad)" transform="rotate(-15 76 60)" />
            {/* Left Eye Sparkle */}
            <circle cx="77" cy="57" r="6" fill="#ffffff" />
            <circle cx="79" cy="55" r="2.2" fill="#111827" />
            <circle cx="75" cy="61" r="2" fill="#ffffff" />

            {/* Right Black Eye Patch */}
            <ellipse cx="124" cy="60" rx="14" ry="17" fill="url(#pandaEarGrad)" transform="rotate(15 124 60)" />
            {/* Right Eye Sparkle */}
            <circle cx="123" cy="57" r="6" fill="#ffffff" />
            <circle cx="121" cy="55" r="2.2" fill="#111827" />
            <circle cx="125" cy="61" r="2" fill="#ffffff" />

            {/* Cute Black Triangle Button Nose */}
            <path
              d="M95,68 C95,66 105,66 105,68 C105,73 95,73 95,68 Z"
              fill="#1f2937"
            />
            {/* Smiling Mouth line (3 shape) */}
            <path
              d="M93,73 C97,76 100,74 100,72 C100,74 103,76 107,73"
              stroke="#374151"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Cute Left Paw clutching the Board edge */}
            <g transform="translate(42, 94)">
              <ellipse cx="16" cy="14" rx="16" ry="13" fill="url(#pandaEarGrad)" />
              {/* Paw Pads */}
              <circle cx="8" cy="9" r="3" fill="#4b5563" />
              <circle cx="14" cy="6" r="3.2" fill="#4b5563" />
              <circle cx="21" cy="7" r="3" fill="#4b5563" />
              <ellipse cx="16" cy="16" rx="6" ry="4.5" fill="#4b5563" />
            </g>

            {/* Cute Right Paw clutching the Board edge */}
            <g transform="translate(126, 94)">
              <ellipse cx="16" cy="14" rx="16" ry="13" fill="url(#pandaEarGrad)" />
              {/* Paw Pads */}
              <circle cx="11" cy="7" r="3" fill="#4b5563" />
              <circle cx="18" cy="6" r="3.2" fill="#4b5563" />
              <circle cx="24" cy="9" r="3" fill="#4b5563" />
              <ellipse cx="16" cy="16" rx="6" ry="4.5" fill="#4b5563" />
            </g>
          </svg>
        </div>

        {/* ========================================================================= */}
        {/* JAPANESE WOODEN NOTICE BOARD (掲示板 - Keijiban)                          */}
        {/* ========================================================================= */}
        <div className="relative z-10 bg-[#fdfbf7] dark:bg-slate-900 border-4 border-[#b58351] dark:border-[#5a432e] rounded-3xl shadow-2xl overflow-hidden ring-2 ring-[#d4a373]/50">
          {/* Wooden Notice Board Roof Plaque */}
          <div className="relative bg-gradient-to-r from-[#9c6638] via-[#bd824d] to-[#8d582c] px-4 py-3 text-white border-b-2 border-[#7c4921] shadow-inner">
            {/* Wooden corner decorative pins */}
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#fde047] border border-amber-900/60 shadow-xs" />
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#fde047] border border-amber-900/60 shadow-xs" />

            {/* Swipe indicator pill on mobile */}
            <div className="w-10 h-1 rounded-full bg-white/40 mx-auto -mt-1 mb-2 sm:hidden" />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-950/40 border border-amber-300/30 flex items-center justify-center text-amber-200 shrink-0 shadow-inner">
                  <Megaphone className="w-4 h-4 text-amber-300 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-950/70 text-amber-200 px-2 py-0.5 rounded-full border border-amber-400/40 shadow-2xs">
                      🎋 掲示板 • PENGUMUMAN
                    </span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                  </div>
                  <h3 id="announcement-title" className="text-sm font-extrabold tracking-tight mt-0.5 text-white flex items-center gap-1 drop-shadow-xs">
                    <span>Informasi Penting Wali Asuh</span>
                    <span className="text-xs">🐾</span>
                  </h3>
                </div>
              </div>

              {/* Quick Close Button */}
              <button
                type="button"
                onClick={handleDismiss}
                title="Tutup pengumuman"
                className="w-7 h-7 rounded-lg bg-black/25 hover:bg-black/50 text-white flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Wooden Board Surface (Parchment Paper Content) */}
          <div className="p-4 sm:p-5 space-y-3.5 bg-gradient-to-b from-[#fdfbf7] to-[#f7f2e7] dark:from-slate-900 dark:to-[#171e28]">
            {/* Announcement Parchment Box held by Panda */}
            <div className="relative p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border-2 border-dashed border-[#c99a68] dark:border-amber-700/60 shadow-inner">
              {/* Corner bamboo seal */}
              <span className="absolute -top-2.5 right-3 text-xs bg-amber-100 dark:bg-amber-900/80 border border-amber-300 dark:border-amber-700 px-1.5 py-0.2 rounded text-amber-800 dark:text-amber-200 font-bold select-none">
                🐼 Pesan Dinas
              </span>

              <p className="text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-100 leading-relaxed whitespace-pre-wrap">
                {announcement.text}
              </p>
            </div>

            {/* Author & Timestamp Info */}
            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 px-1 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-2xs" />
                <span>{announcement.updatedBy ? `Diterbitkan: ${announcement.updatedBy}` : 'Dinas Wali Asuh SRT 1'}</span>
              </span>
              {announcement.updatedAt && (
                <span className="font-mono text-[10.5px] bg-amber-100/70 dark:bg-slate-800 px-2 py-0.5 rounded border border-amber-200/60 dark:border-slate-700">
                  {new Date(announcement.updatedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>

            {/* Touch Gesture Hint & Periodic reminder notice */}
            <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-slate-500 dark:text-slate-400 py-1 border-t border-[#eeddc8] dark:border-slate-800 text-center">
              <span>🎋</span>
              <span>Ketuk di luar atau usap untuk menutup • Pengingat otomatis tiap 3 jam</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              {userRole === 'admin' && onOpenManagement && (
                <button
                  type="button"
                  onClick={() => {
                    handleDismiss();
                    onOpenManagement();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-amber-100/80 dark:bg-slate-800 hover:bg-amber-200/80 dark:hover:bg-slate-700 text-amber-950 dark:text-slate-200 text-xs font-bold transition-all border border-amber-300 dark:border-slate-700 cursor-pointer shadow-2xs"
                >
                  <span>Ubah Teks</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#9c6638] via-[#bd824d] to-[#8d582c] hover:from-[#8d582c] hover:to-[#7c4921] text-white text-xs font-black shadow-lg shadow-amber-950/20 active:scale-98 transition-all cursor-pointer border border-[#fde047]/30"
              >
                <span>Saya Mengerti</span>
                <span className="text-xs">🐾</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
