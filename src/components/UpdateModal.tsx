import { Download, Sparkles, X } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';

export interface AppUpdateInfo {
  versaoAtual: string;
  linkApk: string;
  releaseNotes?: string;
}

interface UpdateModalProps {
  update: AppUpdateInfo;
  onUpdateNow: () => void;
  onDismiss: () => void;
}

export function UpdateModal({
  update,
  onUpdateNow,
  onDismiss,
}: UpdateModalProps) {
  const { t } = usePreferences();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-5 sm:p-6 shadow-2xl shadow-black/30 dark:shadow-black/70 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] purple:from-[#7E22CE] purple:to-[#C026D3] flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="update-modal-title"
                className="text-base sm:text-lg font-extrabold text-[#111827] dark:text-white leading-snug"
              >
                {`${t.updateModal.titlePrefix} (${update.versaoAtual})`}
              </h2>
              <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] mt-0.5">
                {t.updateModal.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar aviso de atualização"
            className="min-w-[40px] min-h-[40px] -mt-1 -mr-1 flex items-center justify-center rounded-xl text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white hover:bg-[#F0F1F6] dark:hover:bg-[#2A2738]/60 purple:hover:bg-[#392466]/60 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {update.releaseNotes && (
          <div className="rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-3.5 max-h-36 overflow-y-auto">
            <p className="text-xs text-[#374151] dark:text-[#D1D5DB] purple:text-[#DDD6FE] whitespace-pre-line leading-relaxed">
              {update.releaseNotes}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={onUpdateNow}
            className="flex-1 min-h-[48px] px-5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] purple:from-[#7E22CE] purple:to-[#C026D3] hover:from-[#5558E6] hover:to-[#7C4DFF] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#6366F1]/25 purple:shadow-[#9333EA]/30 active:scale-[0.985] transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{t.updateModal.updateNow}</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[48px] px-5 rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-[#6366F1]/40 purple:hover:border-[#A855F7]/60 text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white text-sm font-medium transition-colors"
          >
            {t.updateModal.later}
          </button>
        </div>
      </div>
    </div>
  );
}
