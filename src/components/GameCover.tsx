import { useState } from 'react';
import { Gamepad2 } from 'lucide-react';

interface GameCoverProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function GameCover({ src, alt, className = '' }: GameCoverProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#232030] via-[#1B1924] to-[#14121B] text-[#9CA3AF] select-none ${className}`}
        aria-label={alt}
      >
        <Gamepad2 className="w-8 h-8 text-[#6366F1]/70 mb-1.5" />
        <span className="text-[10px] font-medium text-[#9CA3AF]/80 px-2 text-center line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setHasError(true)}
      className={`object-cover ${className}`}
    />
  );
}
