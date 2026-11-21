import { ChevronRight, Layers } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import type { CategoriaColecao, Jogo } from '../types/game';
import { GameCover } from './GameCover';

interface CollectionCardProps {
  categoria: CategoriaColecao;
  games: Jogo[];
  onSelect: (categoriaId: string) => void;
}

function getCollectionCover(categoria: CategoriaColecao, games: Jogo[]): string {
  const ownCover = categoria.capa_url?.trim();
  if (ownCover) return ownCover;
  for (const game of games) {
    if (game.capa_url?.trim()) return game.capa_url.trim();
  }
  return '';
}

function getGamesSummary(
  games: Jogo[],
  singular: string,
  plural: string
): string {
  const count = games.length;
  const countLabel = `${count} ${count === 1 ? singular : plural}`;
  if (count === 0) return countLabel;
  const titles = games
    .slice(0, 3)
    .map((g) => g.titulo)
    .join(' · ');
  return `${countLabel} • ${titles}`;
}

export function ListCollectionCard({
  categoria,
  games,
  onSelect,
}: CollectionCardProps) {
  const { t } = usePreferences();
  const idStr = String(categoria.id);
  const coverSrc = getCollectionCover(categoria, games);
  const subtitle =
    categoria.descricao?.trim() ||
    getGamesSummary(
      games,
      t.collections.gameSingular,
      t.collections.gamePlural
    );
  const countLabel = `${games.length} ${
    games.length === 1 ? t.collections.gameSingular : t.collections.gamePlural
  }`;

  return (
    <article
      onClick={() => onSelect(idStr)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(idStr);
        }
      }}
      className="group flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] cursor-pointer transition-colors duration-150 hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/65 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]"
    >
      <div className="relative w-22 h-22 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden bg-[#F0F1F6] dark:bg-[#14121B] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466]">
        {coverSrc ? (
          <GameCover src={coverSrc} alt={categoria.nome} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#6366F1]/70 purple:text-[#C084FC]/80">
            <Layers className="w-7 h-7" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <h3 className="text-base font-bold text-[#111827] dark:text-white leading-snug line-clamp-1 group-hover:text-[#6366F1] dark:group-hover:text-[#A5B4FC] purple:group-hover:text-[#D8B4FE] transition-colors">
          {categoria.nome}
        </h3>
        <p className="text-xs font-medium text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] font-mono-nums">
          {countLabel}
        </p>
        <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] line-clamp-1">
          {subtitle}
        </p>
      </div>

      <ChevronRight className="w-5 h-5 text-[#9CA3AF] dark:text-[#6B7280] purple:text-[#C4B5FD]/70 group-hover:text-[#6366F1] purple:group-hover:text-[#C084FC] shrink-0 transition-colors" />
    </article>
  );
}

export function GridCollectionCard({
  categoria,
  games,
  onSelect,
}: CollectionCardProps) {
  const { t } = usePreferences();
  const idStr = String(categoria.id);
  const coverSrc = getCollectionCover(categoria, games);
  const countLabel = `${games.length} ${
    games.length === 1 ? t.collections.gameSingular : t.collections.gamePlural
  }`;

  return (
    <article
      onClick={() => onSelect(idStr)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(idStr);
        }
      }}
      className="group flex flex-col rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] overflow-hidden cursor-pointer transition-colors duration-150 hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/65 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]"
    >
      <div className="relative aspect-[4/3] w-full bg-[#F0F1F6] dark:bg-[#14121B] purple:bg-[#170E2B] overflow-hidden">
        {coverSrc ? (
          <GameCover
            src={coverSrc}
            alt={categoria.nome}
            className="w-full h-full transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#6366F1]/70 purple:text-[#C084FC]/80">
            <Layers className="w-8 h-8" />
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1">
        <h3 className="text-sm font-bold text-[#111827] dark:text-white leading-snug line-clamp-1 group-hover:text-[#6366F1] dark:group-hover:text-[#A5B4FC] purple:group-hover:text-[#D8B4FE] transition-colors">
          {categoria.nome}
        </h3>
        <p className="text-[11px] font-medium text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] font-mono-nums">
          {countLabel}
        </p>
        {categoria.descricao?.trim() ? (
          <p className="text-[11px] text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] line-clamp-1">
            {categoria.descricao.trim()}
          </p>
        ) : (
          <p className="text-[11px] text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] line-clamp-1">
            {games.length > 0
              ? games
                  .slice(0, 2)
                  .map((g) => g.titulo)
                  .join(' · ')
              : t.collections.emptyGames}
          </p>
        )}
      </div>
    </article>
  );
}
