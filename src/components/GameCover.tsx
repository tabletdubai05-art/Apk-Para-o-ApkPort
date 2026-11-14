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
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#E9EBF4] via-[#F4F5F9] to-[#E2E4EC] dark:from-[#232030] dark:via-[#1B1924] dark:to-[#14121B] purple:from-[#2C1A52] purple:via-[#20143A] purple:to-[#140C24] text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] select-none ${className}`}
        aria-label={alt}
      >
        <Gamepad2 className="w-8 h-8 text-[#6366F1]/70 purple:text-[#C084FC]/80 mb-1.5" />
        <span className="text-[10px] font-medium text-[#525866] dark:text-[#9CA3AF]/80 purple:text-[#C4B5FD]/85 px-2 text-center line-clamp-2">
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
