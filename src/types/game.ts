export type JogoArquivoTipo = 'normal' | 'link';

export interface JogoArquivo {
  tipo?: JogoArquivoTipo | string | null;
  nome: string;
  tamanho?: string;
  url: string;
  torrent_url?: string | null;
}

export interface TutorialItem {
  titulo: string;
  url: string;
}

export interface Jogo {
  id: number | string;
  titulo: string;
  categoria: string;
  versao: string;
  versao_minima?: string | null;
  tamanho: string;
  destaque: boolean;
  descricao: string;
  capa_url: string;
  video_url?: string | null;
  fotos_urls?: string | string[] | null;
  torrent_url?: string | null;
  webseed_url?: string | null;
  arquivos?: JogoArquivo[] | string | null;
  tutoriais?: string | TutorialItem[] | null;
  discord?: string | null;
  created_at?: string;
}

export interface CategoriaColecao {
  id: number | string;
  nome: string;
  descricao?: string | null;
  capa_url?: string | null;
  ordem?: number | null;
  jogos_ids?: Array<number | string> | null;
  created_at?: string;
}

export interface CategoriaJogoVinculo {
  id?: number | string;
  categoria_id: number | string;
  jogo_id: number | string;
  ordem?: number | null;
  created_at?: string;
}

export type AppLinkType = 'download' | 'site' | 'playstore';

export interface AppItem {
  id: number | string;
  created_at?: string;
  nome: string;
  categoria?: string | null;
  versao?: string | null;
  tamanho?: string | null;
  descricao?: string | null;
  icone_url?: string | null;
  fotos_urls?: string | string[] | null;
  tipo_link?: AppLinkType | string | null;
  link_url: string;
  link_secundario_url?: string | null;
  link_secundario_label?: string | null;
  destaque?: boolean | null;
  ordem?: number | null;
}

export type TabId =
  | 'inicio'
  | 'jogos'
  | 'categoria'
  | 'apps'
  | 'favoritos'
  | 'historico'
  | 'configuracoes';

export type SortOption = 'recentes' | 'nome' | 'tamanho';

export type ViewMode = 'lista' | 'grade';

export type DownloadStatus =
  | 'starting'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'error'
  | 'cancelled';

export type DownloadMode =
  | 'webtorrent'
  | 'http-fallback'
  | 'system-browser'
  | 'p2p-intent';

export type DownloadMethod = 'direct' | 'p2p';

export interface DownloadTask {
  taskId: string;
  gameId: string;
  titulo: string;
  arquivoNome: string;
  capa_url: string;
  versao: string;
  tamanho: string;
  torrent_url?: string | null;
  webseed_url?: string | null;
  status: DownloadStatus;
  mode: DownloadMode;
  method?: DownloadMethod;
  progress: number; // 0 to 100
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  peers: number;
  fileName: string;
  savedPath?: string;
  errorMessage?: string;
  initiatedAt?: number;
  updatedAt: number;
}

export interface RelatoDesempenho {
  id: string;
  jogo_id: string;
  user_id: string;
  usuario_nome: string;
  usuario_avatar?: string | null;
  marca: string;
  modelo: string;
  chipset?: string | null;
  gpu?: string | null;
  ram?: string | null;
  android_versao?: string | null;
  fps?: number | null;
  nota: number;
  tags: string[];
  created_at: string;
}
