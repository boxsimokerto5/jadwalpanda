import React from 'react';
import { WatermarkType } from '../utils/themeTwoHour';

interface JapaneseBannerWatermarkProps {
  type: WatermarkType;
  kanji: string;
}

export const JapaneseBannerWatermark: React.FC<JapaneseBannerWatermarkProps> = ({ type, kanji }) => {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-72 pointer-events-none select-none overflow-hidden flex items-center justify-end pr-1 sm:pr-4 z-0 opacity-15 sm:opacity-20 transition-opacity duration-1000">
      {/* Large Artistic Japanese Kanji Character */}
      <span className="font-serif font-black text-6xl sm:text-7xl text-white mr-1 sm:mr-3 drop-shadow-md tracking-tighter">
        {kanji}
      </span>

      {/* SVG Silhouette Silhouette based on type */}
      {type === 'panda' && (
        <svg
          viewBox="0 0 100 100"
          className="w-20 h-20 sm:w-24 sm:h-24 fill-white shrink-0 drop-shadow-sm"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Panda Head & Body Silhouette */}
          <path d="M 50 25 C 38 25, 28 35, 28 48 C 28 58, 34 66, 42 70 C 35 73, 26 80, 24 92 C 32 94, 68 94, 76 92 C 74 80, 65 73, 58 70 C 66 66, 72 58, 72 48 C 72 35, 62 25, 50 25 Z" />
          {/* Panda Ears */}
          <circle cx="32" cy="27" r="8" />
          <circle cx="68" cy="27" r="8" />
          {/* Bamboo Stalk held by Panda */}
          <path d="M 72 15 L 75 88 M 75 35 C 85 30, 95 38, 92 48 M 73 55 C 85 52, 92 62, 88 72" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
      )}

      {type === 'sakura' && (
        <svg
          viewBox="0 0 100 100"
          className="w-20 h-20 sm:w-24 sm:h-24 fill-white shrink-0 drop-shadow-sm"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Sakura Blossom Center & 5 Petals */}
          <circle cx="50" cy="50" r="6" />
          <path d="M 50 44 C 44 28, 56 28, 50 14 C 44 28, 56 28, 50 44 Z" />
          <path d="M 56 48 C 72 42, 72 54, 86 48 C 72 42, 72 54, 56 48 Z" />
          <path d="M 54 54 C 64 68, 54 78, 68 88 C 54 78, 64 68, 54 54 Z" />
          <path d="M 46 54 C 36 68, 46 78, 32 88 C 46 78, 36 68, 46 54 Z" />
          <path d="M 44 48 C 28 42, 28 54, 14 48 C 28 42, 28 54, 44 48 Z" />
          {/* Scattered Petals */}
          <circle cx="82" cy="22" r="4" />
          <circle cx="20" cy="25" r="3.5" />
          <circle cx="18" cy="75" r="4.5" />
        </svg>
      )}

      {type === 'fuji' && (
        <svg
          viewBox="0 0 100 100"
          className="w-20 h-20 sm:w-24 sm:h-24 fill-white shrink-0 drop-shadow-sm"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Rising Sun Disc */}
          <circle cx="50" cy="35" r="16" opacity="0.75" />
          {/* Mount Fuji Profile */}
          <path d="M 10 88 C 30 84, 40 65, 45 42 L 55 42 C 60 65, 70 84, 90 88 Z" />
          {/* Snow Cap Accent */}
          <path d="M 45 42 L 55 42 L 58 52 L 54 55 L 50 51 L 46 55 L 42 52 Z" fill="white" />
        </svg>
      )}

      {type === 'bamboo' && (
        <svg
          viewBox="0 0 100 100"
          className="w-20 h-20 sm:w-24 sm:h-24 fill-white shrink-0 drop-shadow-sm"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bamboo Stalk 1 */}
          <rect x="36" y="10" width="8" height="25" rx="1.5" />
          <rect x="36" y="38" width="8" height="25" rx="1.5" />
          <rect x="36" y="66" width="8" height="25" rx="1.5" />
          {/* Bamboo Stalk 2 */}
          <rect x="58" y="5" width="7" height="28" rx="1.5" />
          <rect x="58" y="36" width="7" height="28" rx="1.5" />
          <rect x="58" y="67" width="7" height="24" rx="1.5" />
          {/* Bamboo Leaves */}
          <path d="M 44 38 C 55 30, 68 32, 75 36 C 65 38, 55 42, 44 38 Z" />
          <path d="M 36 66 C 22 58, 14 62, 8 70 C 18 68, 28 72, 36 66 Z" />
          <path d="M 65 67 C 78 58, 88 62, 94 68 C 84 70, 75 74, 65 67 Z" />
        </svg>
      )}

      {type === 'koi' && (
        <svg
          viewBox="0 0 100 100"
          className="w-20 h-20 sm:w-24 sm:h-24 fill-white shrink-0 drop-shadow-sm"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Upper Swimming Koi */}
          <path d="M 50 18 C 65 14, 82 25, 78 44 C 74 36, 68 32, 58 35 C 50 38, 42 32, 50 18 Z" />
          <path d="M 80 44 C 88 42, 94 48, 92 56 C 86 52, 82 48, 80 44 Z" />
          {/* Lower Swimming Koi in Circle */}
          <path d="M 50 82 C 35 86, 18 75, 22 56 C 26 64, 32 68, 42 65 C 50 62, 58 68, 50 82 Z" />
          <path d="M 20 56 C 12 58, 6 52, 8 44 C 14 48, 18 52, 20 56 Z" />
          {/* Water Ripple Circle */}
          <circle cx="50" cy="50" r="32" stroke="white" strokeWidth="1.5" fill="none" opacity="0.4" strokeDasharray="4 4" />
        </svg>
      )}

      {type === 'torii' && (
        <svg
          viewBox="0 0 100 100"
          className="w-20 h-20 sm:w-24 sm:h-24 fill-white shrink-0 drop-shadow-sm"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Upper Curved Kasagi Beam */}
          <path d="M 12 26 C 30 22, 70 22, 88 26 L 86 31 C 70 28, 30 28, 14 31 Z" />
          {/* Lower Straight Nuki Beam */}
          <rect x="20" y="38" width="60" height="5" rx="1" />
          {/* Vertical Pillars (Hashira) */}
          <path d="M 28 31 L 26 88 L 34 88 L 33 31 Z" />
          <path d="M 72 31 L 74 88 L 66 88 L 67 31 Z" />
          {/* Central Tablet (Gakuzuka) */}
          <rect x="47" y="28" width="6" height="10" rx="1" />
        </svg>
      )}

      {type === 'crane' && (
        <svg
          viewBox="0 0 100 100"
          className="w-20 h-20 sm:w-24 sm:h-24 fill-white shrink-0 drop-shadow-sm"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Origami Crane Facets */}
          <polygon points="50,15 62,45 50,75 38,45" />
          <polygon points="50,45 88,30 62,55" />
          <polygon points="50,45 12,30 38,55" />
          <polygon points="50,75 58,92 50,85 42,92" />
          <polygon points="50,15 46,6 42,12" />
        </svg>
      )}

      {type === 'momiji' && (
        <svg
          viewBox="0 0 100 100"
          className="w-20 h-20 sm:w-24 sm:h-24 fill-white shrink-0 drop-shadow-sm"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Japanese 7-lobed Maple Leaf */}
          <path d="M 50 15 C 52 28, 56 34, 66 22 C 64 34, 72 38, 85 36 C 74 46, 76 54, 88 62 C 76 64, 70 70, 72 82 C 62 76, 56 74, 50 82 C 44 74, 38 76, 28 82 C 30 70, 24 64, 12 62 C 24 54, 26 46, 15 36 C 28 38, 36 34, 34 22 C 44 34, 48 28, 50 15 Z" />
          {/* Leaf Stem */}
          <path d="M 50 78 L 50 94" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
};
