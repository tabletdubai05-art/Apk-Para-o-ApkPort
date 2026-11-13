import { Heart } from 'lucide-react';
import type { Jogo } from '../types/game';
import { formatCategoriesDot } from '../utils/formatters';
import { GameCover } from './GameCover';

interface CardProps {
  jogo: Jogo;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelect: (jogo: Jogo) => void;
}

export function FeaturedCard({
  jogo,
  isFavorite,
  onToggleFavorite,
  onSelect,
}: CardProps) {
  const gameId = String(jogo.id);
  const categoriesDot = formatCategoriesDot(jogo.categoria);
  const subtitle = `${categoriesDot} • ${jogo.versao} • ${jogo.tamanho}`;

  return (
    <article
      onClick={() => onSelect(jogo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(jogo);
        }
      }}
      className="group relative shrink-0 w-[82vw] max-w-[330px] sm:w-[340px] h-[210px] rounded-2xl overflow-hidden bg-[#1B1924] border border-[#2A2738] cursor-pointer transition-transform duration-200 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]"
    >
      <GameCover
        src={jogo.capa_url}
        alt={jogo.titulo}
        className="w-full h-full transition-transform duration-300 group-hover:scale-[1.03]"
      />

      {/* Measured contrast scrim at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E13] via-[#0F0E13]/55 to-transparent pointer-events-none" />

      {/* Favorite button top-right */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(gameId);
        }}
        aria-label={isFavorite ? `Remover ${jogo.titulo} dos favoritos` : `Favoritar ${jogo.titulo}`}
        className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#0F0E13]/65 backdrop-blur-md border border-[#2A2738]/80 text-white transition-colors hover:bg-[#1B1924]"
      >
        <Heart
          className={`w-5 h-5 transition-colors ${
            isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white/85'
          }`}
        />
      </button>

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col items-start gap-1.5">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-amber-400 text-[#0F0E13] text-[11px] font-bold tracking-wide">
          ★ DESTAQUE
        </span>
        <h3 className="text-lg font-bold text-white leading-tight line-clamp-1">
          {jogo.titulo}
        </h3>
        <p className="text-xs text-[#D1D5DB] line-clamp-1 font-mono-nums">
          {subtitle}
        </p>
      </div>
    </article>
  );
}

export function ListGameCard({
  jogo,
  isFavorite,
  onToggleFavorite,
  onSelect,
}: CardProps) {
  const gameId = String(jogo.id);
  const categoriesDot = formatCategoriesDot(jogo.categoria);

  return (
    <article
      onClick={() => onSelect(jogo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(jogo);
        }
      }}
      className="group flex items-center gap-3.5 p-3 rounded-2xl bg-[#1B1924] border border-[#2A2738] cursor-pointer transition-colors duration-150 hover:border-[#6366F1]/50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]"
    >
      {/* Square cover thumbnail on the left with heart icon in top-right corner */}
      <div className="relative w-22 h-22 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden bg-[#14121B] border border-[#2A2738]">
        <GameCover src={jogo.capa_url} alt={jogo.titulo} className="w-full h-full" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(gameId);
          }}
          aria-label={isFavorite ? `Remover ${jogo.titulo} dos favoritos` : `Favoritar ${jogo.titulo}`}
          className="absolute top-1 right-1 min-w-[32px] min-h-[32px] p-1.5 flex items-center justify-center rounded-lg bg-[#0F0E13]/75 backdrop-blur-sm border border-[#2A2738]/70 transition-transform active:scale-90"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white/90'
            }`}
          />
        </button>
      </div>

      {/* Details to the right */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <h3 className="text-base font-bold text-white leading-snug line-clamp-1 group-hover:text-[#A5B4FC] transition-colors">
          {jogo.titulo}
        </h3>
        <p className="text-xs font-medium text-[#8B5CF6] line-clamp-1">
          {categoriesDot}
        </p>
        <p className="text-xs text-[#9CA3AF] font-mono-nums">
          {jogo.versao} • {jogo.tamanho}
        </p>
      </div>
    </article>
  );
}

export function GridGameCard({
  jogo,
  isFavorite,
  onToggleFavorite,
  onSelect,
}: CardProps) {
  const gameId = String(jogo.id);
  const categoriesDot = formatCategoriesDot(jogo.categoria);

  return (
    <article
      onClick={() => onSelect(jogo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(jogo);
        }
      }}
      className="group flex flex-col rounded-2xl bg-[#1B1924] border border-[#2A2738] overflow-hidden cursor-pointer transition-colors duration-150 hover:border-[#6366F1]/50 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]"
    >
      <div className="relative aspect-[4/3] w-full bg-[#14121B] overflow-hidden">
        <GameCover
          src={jogo.capa_url}
          alt={jogo.titulo}
          className="w-full h-full transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(gameId);
          }}
          aria-label={isFavorite ? `Remover ${jogo.titulo} dos favoritos` : `Favoritar ${jogo.titulo}`}
          className="absolute top-2 right-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl bg-[#0F0E13]/70 backdrop-blur-md border border-[#2A2738]/70 transition-transform active:scale-90"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white/90'
            }`}
          />
        </button>
      </div>

      <div className="p-3 flex flex-col gap-1">
        <h3 className="text-sm font-bold text-white leading-snug line-clamp-1 group-hover:text-[#A5B4FC] transition-colors">
          {jogo.titulo}
        </h3>
        <p className="text-[11px] font-medium text-[#8B5CF6] line-clamp-1">
          {categoriesDot}
        </p>
        <p className="text-[11px] text-[#9CA3AF] font-mono-nums">
          {jogo.versao} • {jogo.tamanho}
        </p>
      </div>
    </article>
  );
}
