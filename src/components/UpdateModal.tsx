import { Download, Sparkles, X } from 'lucide-react';

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
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[#1B1924] border border-[#2A2738] p-5 sm:p-6 shadow-2xl shadow-black/70 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="update-modal-title"
                className="text-base sm:text-lg font-extrabold text-white leading-snug"
              >
                {`Nova versão disponível (${update.versaoAtual})`}
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Uma nova versão do DroidPort Store está pronta para instalar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar aviso de atualização"
            className="min-w-[40px] min-h-[40px] -mt-1 -mr-1 flex items-center justify-center rounded-xl text-[#9CA3AF] hover:text-white hover:bg-[#2A2738]/60 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {update.releaseNotes && (
          <div className="rounded-2xl bg-[#0F0E13] border border-[#2A2738] p-3.5 max-h-36 overflow-y-auto">
            <p className="text-xs text-[#D1D5DB] whitespace-pre-line leading-relaxed">
              {update.releaseNotes}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={onUpdateNow}
            className="flex-1 min-h-[48px] px-5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E6] hover:to-[#7C4DFF] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#6366F1]/25 active:scale-[0.985] transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Atualizar Agora</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[48px] px-5 rounded-2xl bg-[#0F0E13] border border-[#2A2738] hover:border-[#6366F1]/40 text-[#9CA3AF] hover:text-white text-sm font-medium transition-colors"
          >
            Depois
          </button>
        </div>
      </div>
    </div>
  );
}
