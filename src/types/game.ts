export interface Jogo {
  id: number | string;
  titulo: string;
  categoria: string;
  versao: string;
  tamanho: string;
  destaque: boolean;
  descricao: string;
  capa_url: string;
  video_url?: string | null;
  fotos_urls?: string | string[] | null;
  torrent_url?: string | null;
  webseed_url?: string | null;
  created_at?: string;
}

export type TabId = 'inicio' | 'jogos' | 'favoritos' | 'progresso' | 'configuracoes';

export type SortOption = 'recentes' | 'nome' | 'tamanho';

export type ViewMode = 'lista' | 'grade';

export type DownloadStatus =
  | 'starting'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'error'
  | 'cancelled';

export type DownloadMode = 'webtorrent' | 'http-fallback';

export interface DownloadTask {
  gameId: string;
  titulo: string;
  capa_url: string;
  versao: string;
  tamanho: string;
  torrent_url?: string | null;
  webseed_url?: string | null;
  status: DownloadStatus;
  mode: DownloadMode;
  progress: number; // 0 to 100
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  peers: number;
  fileName: string;
  errorMessage?: string;
  blobUrl?: string;
  updatedAt: number;
}
