import { useState } from 'react';
import { Check, HardDrive, HeartOff, Info, Trash2 } from 'lucide-react';

interface SettingsViewProps {
  favoritesCount: number;
  downloadsCount: number;
  onClearCache: () => Promise<void>;
  onClearFavorites: () => void;
}

export function SettingsView({
  favoritesCount,
  downloadsCount,
  onClearCache,
  onClearFavorites,
}: SettingsViewProps) {
  const [cacheCleared, setCacheCleared] = useState(false);
  const [favsCleared, setFavsCleared] = useState(false);

  const handleClearCache = async () => {
    await onClearCache();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  const handleClearFavorites = () => {
    onClearFavorites();
    setFavsCleared(true);
    setTimeout(() => setFavsCleared(false), 2500);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Storage & Cleanup */}
      <section className="rounded-2xl bg-[#1B1924] border border-[#2A2738] divide-y divide-[#2A2738]">
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#0F0E13] border border-[#2A2738] flex items-center justify-center text-[#8B5CF6] shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white">Limpar cache de downloads</h3>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Remove arquivos parciais salvos no IndexedDB e histórico ({downloadsCount}{' '}
                {downloadsCount === 1 ? 'registro' : 'registros'}).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearCache}
            className="min-h-[44px] px-4 rounded-xl bg-[#0F0E13] border border-[#2A2738] hover:border-[#6366F1]/50 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
          >
            {cacheCleared ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Limpo</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 text-[#9CA3AF]" />
                <span>Limpar</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#0F0E13] border border-[#2A2738] flex items-center justify-center text-rose-400 shrink-0">
              <HeartOff className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white">Limpar favoritos</h3>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Remove todos os jogos salvos localmente ({favoritesCount}{' '}
                {favoritesCount === 1 ? 'favorito' : 'favoritos'}).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearFavorites}
            className="min-h-[44px] px-4 rounded-xl bg-[#0F0E13] border border-[#2A2738] hover:border-rose-500/50 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
          >
            {favsCleared ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Limpo</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Limpar</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* App Information */}
      <section className="rounded-2xl bg-[#1B1924] border border-[#2A2738] p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <Info className="w-5 h-5 text-[#6366F1]" />
          <h3 className="text-sm font-bold text-white">Informações sobre o App</h3>
        </div>

        <div className="space-y-2 text-xs text-[#9CA3AF] leading-relaxed">
          <p>
            <strong className="text-white">DroidPort Store</strong> é uma vitrine mobile-first
            dedicada a ports de jogos para Android.
          </p>
          <div className="pt-1 space-y-1 font-mono-nums">
            <p>Versão: 1.0.0</p>
            <p>Motor de Download: Híbrido WebTorrent (P2P + WebSeed) &amp; ReadableStream</p>
            <p>Persistência: localStorage (favoritos) + IndexedDB (retomada de downloads)</p>
          </div>
        </div>
      </section>
    </div>
  );
}
