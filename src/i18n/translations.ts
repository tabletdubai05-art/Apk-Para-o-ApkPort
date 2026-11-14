export type AppLanguage = 'pt-BR' | 'en' | 'es';
export type LanguagePreference = 'auto' | AppLanguage;
export type ThemePreference = 'dark' | 'light' | 'purple' | 'system';

export function detectDeviceLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return 'pt-BR';
  const rawLang = (
    (Array.isArray(navigator.languages) && navigator.languages[0]) ||
    navigator.language ||
    'pt-BR'
  ).toLowerCase();

  if (rawLang.startsWith('es')) return 'es';
  if (rawLang.startsWith('en')) return 'en';
  return 'pt-BR';
}

export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  'pt-BR': 'Português (Brasil)',
  en: 'English',
  es: 'Español',
};

export interface AppTranslations {
  nav: {
    inicio: string;
    jogos: string;
    favoritos: string;
    historico: string;
    configuracoes: string;
  };
  catalog: {
    searchPlaceholder: string;
    filters: string;
    categories: string;
    allCategories: string;
    sortRecent: string;
    sortName: string;
    sortSize: string;
    featured: string;
    allGames: string;
    favorites: string;
    reloadCatalog: string;
    clearFilters: string;
    emptyFilter: string;
    emptyCatalog: string;
    emptyFavorites: string;
    listMode: string;
    gridMode: string;
    refreshCatalog: string;
    featuredBadge: string;
  };
  history: {
    title: string;
    clearHistory: string;
    emptyTitle: string;
    emptyDescription: string;
    downloadAgain: string;
    direct: string;
    p2p: string;
  };
  settings: {
    title: string;
    accountSectionTitle: string;
    accountConnected: string;
    accountGuestTitle: string;
    accountGuestDesc: string;
    signInGoogle: string;
    redirecting: string;
    signOut: string;
    appearanceSectionTitle: string;
    themeLabel: string;
    themeDark: string;
    themeLight: string;
    themePurple: string;
    themeSystem: string;
    languageLabel: string;
    languageDeviceDefault: string;
    preferencesSectionTitle: string;
    defaultViewLabel: string;
    defaultViewList: string;
    defaultViewGrid: string;
    autoUpdatesLabel: string;
    autoUpdatesDesc: string;
    checkUpdatesNow: string;
    checkingUpdates: string;
    upToDateMessage: string;
    updateFoundMessage: string;
    libreTorrentTitle: string;
    libreTorrentDesc: string;
    libreTorrentAction: string;
    storageSectionTitle: string;
    clearHistoryTitle: string;
    clearHistoryDesc: string;
    clearFavoritesTitle: string;
    clearFavoritesDesc: string;
    clearAction: string;
    clearedAction: string;
    recordSingular: string;
    recordPlural: string;
    favoriteSingular: string;
    favoritePlural: string;
    aboutTitle: string;
    aboutDesc: string;
    versionLabel: string;
    engineLabel: string;
    persistenceLabel: string;
  };
  details: {
    back: string;
    aboutPort: string;
    noDescription: string;
    availableFiles: string;
    downloadAll: string;
    noFiles: string;
    downloadDirect: string;
    downloadP2P: string;
    downloadAgain: string;
    copied: string;
    copyP2P: string;
    redirectedNotice: string;
    maxSpeedTipTitle: string;
    maxSpeedTipBody: string;
    tutorialVideos: string;
    video: string;
    photoGallery: string;
  };
  community: {
    sectionTitle: string;
    sectionSubtitle: string;
    reportDevice: string;
    connectedAs: string;
    signOut: string;
    overallRating: string;
    ofFive: string;
    reportSingular: string;
    reportPlural: string;
    avgFps: string;
    amongFpsReports: string;
    distribution: string;
    good: string;
    playable: string;
    bad: string;
    searchPlaceholder: string;
    retry: string;
    emptyTitle: string;
    emptyDesc: string;
    emptyFilterTitle: string;
    emptyFilterDesc: string;
    authTitle: string;
    authDesc: string;
    signInGoogle: string;
    cancel: string;
    modalTitle: string;
    detectingDevice: string;
    detectedDevice: string;
    edit: string;
    done: string;
    model: string;
    modelFieldLabel: string;
    chipset: string;
    gpu: string;
    ram: string;
    android: string;
    notDetected: string;
    notDetectedFem: string;
    brandLabel: string;
    fpsLabel: string;
    optional: string;
    howItRan: string;
    doesNotRun: string;
    perfect: string;
    whatNoticed: string;
    upToSix: string;
    submitReport: string;
    submittingReport: string;
    saveChanges: string;
    savingChanges: string;
    reportSuccess: string;
    updateSuccess: string;
  };
  updateModal: {
    titlePrefix: string;
    subtitle: string;
    updateNow: string;
    later: string;
  };
}

export const TRANSLATIONS: Record<AppLanguage, AppTranslations> = {
  'pt-BR': {
    nav: {
      inicio: 'Início',
      jogos: 'Jogos',
      favoritos: 'Favoritos',
      historico: 'Histórico',
      configuracoes: 'Configurações',
    },
    catalog: {
      searchPlaceholder: 'Pesquisar jogos...',
      filters: 'Filtros',
      categories: 'Categorias',
      allCategories: 'Todas',
      sortRecent: 'Mais Recentes',
      sortName: 'Nome (A-Z)',
      sortSize: 'Tamanho',
      featured: 'Destaques',
      allGames: 'Todos os jogos',
      favorites: 'Favoritos',
      reloadCatalog: 'Recarregar catálogo',
      clearFilters: 'Limpar filtros',
      emptyFilter: 'Nenhum jogo encontrado com os filtros atuais.',
      emptyCatalog: 'Nenhum jogo encontrado no catálogo.',
      emptyFavorites:
        'Você ainda não favoritou nenhum jogo. Toque no coração de qualquer port para salvá-lo aqui.',
      listMode: 'Modo Lista',
      gridMode: 'Modo Grade',
      refreshCatalog: 'Atualizar catálogo',
      featuredBadge: '★ DESTAQUE',
    },
    history: {
      title: 'Histórico',
      clearHistory: 'Limpar histórico',
      emptyTitle: 'Nenhum item no histórico',
      emptyDescription:
        'Escolha qualquer jogo no catálogo e inicie um download para vê-lo registrado aqui.',
      downloadAgain: 'Baixar novamente',
      direct: 'Direto',
      p2p: 'P2P',
    },
    settings: {
      title: 'Configurações',
      accountSectionTitle: 'Conta Google',
      accountConnected: 'Conectado para relatos da comunidade',
      accountGuestTitle: 'Entre com sua conta Google',
      accountGuestDesc:
        'Conecte sua conta para publicar, editar ou gerenciar seus relatos de desempenho.',
      signInGoogle: 'Entrar com Google',
      redirecting: 'Redirecionando...',
      signOut: 'Sair',
      appearanceSectionTitle: 'Aparência e Idioma',
      themeLabel: 'Tema do aplicativo',
      themeDark: 'Escuro',
      themeLight: 'Claro',
      themePurple: 'Roxo',
      themeSystem: 'Sistema',
      languageLabel: 'Idioma',
      languageDeviceDefault: 'Padrão do dispositivo',
      preferencesSectionTitle: 'Catálogo e Atualizações',
      defaultViewLabel: 'Exibição do catálogo',
      defaultViewList: 'Lista',
      defaultViewGrid: 'Grade',
      autoUpdatesLabel: 'Verificar atualizações automaticamente',
      autoUpdatesDesc: 'Avisa ao abrir o app quando existir uma nova versão do APK.',
      checkUpdatesNow: 'Verificar agora',
      checkingUpdates: 'Verificando...',
      upToDateMessage: 'Você já está usando a versão mais recente.',
      updateFoundMessage: 'Nova atualização encontrada!',
      libreTorrentTitle: 'Cliente P2P recomendado (LibreTorrent)',
      libreTorrentDesc:
        'Necessário para baixar jogos pesados em velocidade máxima pelo botão P2P.',
      libreTorrentAction: 'Instalar',
      storageSectionTitle: 'Armazenamento e Dados',
      clearHistoryTitle: 'Limpar histórico de downloads',
      clearHistoryDesc: 'Remove registros salvos no histórico local',
      clearFavoritesTitle: 'Limpar favoritos',
      clearFavoritesDesc: 'Remove todos os jogos salvos localmente',
      clearAction: 'Limpar',
      clearedAction: 'Limpo',
      recordSingular: 'registro',
      recordPlural: 'registros',
      favoriteSingular: 'favorito',
      favoritePlural: 'favoritos',
      aboutTitle: 'Informações sobre o App',
      aboutDesc:
        'é uma vitrine mobile-first dedicada a ports de jogos para Android.',
      versionLabel: 'Versão',
      engineLabel: 'Motor de Download: Navegador Nativo / Gerenciador do Sistema Android',
      persistenceLabel: 'Persistência: localStorage (preferências e favoritos) + IndexedDB (histórico)',
    },
    details: {
      back: 'Voltar',
      aboutPort: 'Sobre o Port',
      noDescription: 'Nenhuma descrição informada para este port.',
      availableFiles: 'Arquivos Disponíveis',
      downloadAll: 'Baixar Todos',
      noFiles: 'Nenhum arquivo disponível para download neste port.',
      downloadDirect: 'Download Direto',
      downloadP2P: 'Baixar P2P',
      downloadAgain: 'Baixar novamente',
      copied: 'Copiado',
      copyP2P: 'Copiar link P2P',
      redirectedNotice: 'Redirecionado para o gerenciador de downloads do dispositivo',
      maxSpeedTipTitle: 'Dica para velocidade máxima:',
      maxSpeedTipBody:
        'Para jogos pesados (acima de 2 GB), recomendamos usar o app gratuito LibreTorrent no botão P2P acima. Ele permite pausar o download e baixa em velocidade máxima.',
      tutorialVideos: 'Vídeos Tutoriais',
      video: 'Vídeo',
      photoGallery: 'Galeria de Fotos',
    },
    community: {
      sectionTitle: 'Roda no seu celular?',
      sectionSubtitle: 'Relatos reais da comunidade sobre desempenho de',
      reportDevice: 'Relatar meu aparelho',
      connectedAs: 'Conectado como',
      signOut: 'Sair',
      overallRating: 'Nota geral',
      ofFive: 'de 5',
      reportSingular: 'relato',
      reportPlural: 'relatos',
      avgFps: 'Média de FPS',
      amongFpsReports: 'Entre relatos com FPS',
      distribution: 'Distribuição dos relatos',
      good: 'Bom',
      playable: 'Jogável',
      bad: 'Ruim',
      searchPlaceholder: 'Filtrar por aparelho, marca, Snapdragon, Mali, Adreno...',
      retry: 'Tentar novamente',
      emptyTitle: 'Ainda não há relatos para este jogo',
      emptyDesc:
        'Seja o primeiro a testar e compartilhar como este port roda no seu celular.',
      emptyFilterTitle: 'Nenhum aparelho encontrado com esse filtro',
      emptyFilterDesc: 'Tente buscar por outro modelo, marca ou processador.',
      authTitle: 'Entrar com Google',
      authDesc:
        'Faça login com sua conta Google para publicar como este jogo roda no seu aparelho.',
      signInGoogle: 'Entrar com Google',
      cancel: 'Cancelar',
      modalTitle: 'Como rodou no seu aparelho?',
      detectingDevice: 'Detectando seu aparelho...',
      detectedDevice: 'Aparelho detectado',
      edit: 'Editar',
      done: 'Concluir',
      model: 'Modelo',
      modelFieldLabel: 'Modelo / Nome comercial *',
      chipset: 'Chipset',
      gpu: 'GPU',
      ram: 'RAM',
      android: 'Android',
      notDetected: 'Não detectado',
      notDetectedFem: 'Não detectada',
      brandLabel: 'Marca do aparelho',
      fpsLabel: 'FPS',
      optional: '(opcional)',
      howItRan: 'Como rodou',
      doesNotRun: 'Não roda',
      perfect: 'Perfeito',
      whatNoticed: 'O que você notou?',
      upToSix: '(opcional, até 6)',
      submitReport: 'Enviar relato',
      submittingReport: 'Enviando relato...',
      saveChanges: 'Salvar alterações',
      savingChanges: 'Salvando alterações...',
      reportSuccess: 'Relato enviado com sucesso! Obrigado por ajudar a comunidade.',
      updateSuccess: 'Relato atualizado com sucesso!',
    },
    updateModal: {
      titlePrefix: 'Nova Atualização Disponível',
      subtitle: 'Uma nova versão do DroidPort Store está pronta para instalar.',
      updateNow: 'Atualizar Agora',
      later: 'Depois',
    },
  },
  en: {
    nav: {
      inicio: 'Home',
      jogos: 'Games',
      favoritos: 'Favorites',
      historico: 'History',
      configuracoes: 'Settings',
    },
    catalog: {
      searchPlaceholder: 'Search games...',
      filters: 'Filters',
      categories: 'Categories',
      allCategories: 'All',
      sortRecent: 'Newest',
      sortName: 'Name (A-Z)',
      sortSize: 'Size',
      featured: 'Featured',
      allGames: 'All games',
      favorites: 'Favorites',
      reloadCatalog: 'Reload catalog',
      clearFilters: 'Clear filters',
      emptyFilter: 'No games found matching the current filters.',
      emptyCatalog: 'No games found in catalog.',
      emptyFavorites:
        'You have no favorites yet. Tap the heart icon on any port to save it here.',
      listMode: 'List View',
      gridMode: 'Grid View',
      refreshCatalog: 'Refresh catalog',
      featuredBadge: '★ FEATURED',
    },
    history: {
      title: 'History',
      clearHistory: 'Clear history',
      emptyTitle: 'No history yet',
      emptyDescription:
        'Pick any game in the catalog and start a download to keep track of it here.',
      downloadAgain: 'Download again',
      direct: 'Direct',
      p2p: 'P2P',
    },
    settings: {
      title: 'Settings',
      accountSectionTitle: 'Google Account',
      accountConnected: 'Connected for community reports',
      accountGuestTitle: 'Sign in with Google',
      accountGuestDesc:
        'Connect your account to submit, edit, or manage your performance reports.',
      signInGoogle: 'Sign in with Google',
      redirecting: 'Redirecting...',
      signOut: 'Sign out',
      appearanceSectionTitle: 'Appearance & Language',
      themeLabel: 'App theme',
      themeDark: 'Dark',
      themeLight: 'Light',
      themePurple: 'Purple',
      themeSystem: 'System',
      languageLabel: 'Language',
      languageDeviceDefault: 'Device default',
      preferencesSectionTitle: 'Catalog & Updates',
      defaultViewLabel: 'Catalog layout',
      defaultViewList: 'List',
      defaultViewGrid: 'Grid',
      autoUpdatesLabel: 'Check for updates automatically',
      autoUpdatesDesc: 'Notifies on launch when a new APK version is available.',
      checkUpdatesNow: 'Check now',
      checkingUpdates: 'Checking...',
      upToDateMessage: 'You are already running the latest version.',
      updateFoundMessage: 'New update found!',
      libreTorrentTitle: 'Recommended P2P client (LibreTorrent)',
      libreTorrentDesc:
        'Recommended for large games at full speed using the P2P button.',
      libreTorrentAction: 'Install',
      storageSectionTitle: 'Storage & Data',
      clearHistoryTitle: 'Clear download history',
      clearHistoryDesc: 'Removes local download history entries',
      clearFavoritesTitle: 'Clear favorites',
      clearFavoritesDesc: 'Removes all locally saved favorite games',
      clearAction: 'Clear',
      clearedAction: 'Cleared',
      recordSingular: 'entry',
      recordPlural: 'entries',
      favoriteSingular: 'favorite',
      favoritePlural: 'favorites',
      aboutTitle: 'About the App',
      aboutDesc:
        'is a mobile-first storefront dedicated to Android game ports.',
      versionLabel: 'Version',
      engineLabel: 'Download Engine: Native Browser / Android System Manager',
      persistenceLabel: 'Storage: localStorage (preferences & favorites) + IndexedDB (history)',
    },
    details: {
      back: 'Back',
      aboutPort: 'About the Port',
      noDescription: 'No description provided for this port.',
      availableFiles: 'Available Files',
      downloadAll: 'Download All',
      noFiles: 'No files available for download on this port.',
      downloadDirect: 'Direct Download',
      downloadP2P: 'Download P2P',
      downloadAgain: 'Download again',
      copied: 'Copied',
      copyP2P: 'Copy P2P link',
      redirectedNotice: 'Redirected to your device download manager',
      maxSpeedTipTitle: 'Tip for maximum speed:',
      maxSpeedTipBody:
        'For large games (over 2 GB), we recommend using the free LibreTorrent app via the P2P button above. It supports pause/resume and full-speed downloads.',
      tutorialVideos: 'Tutorial Videos',
      video: 'Video',
      photoGallery: 'Photo Gallery',
    },
    community: {
      sectionTitle: 'Does it run on your phone?',
      sectionSubtitle: 'Real community performance reports for',
      reportDevice: 'Report my device',
      connectedAs: 'Signed in as',
      signOut: 'Sign out',
      overallRating: 'Overall score',
      ofFive: 'of 5',
      reportSingular: 'report',
      reportPlural: 'reports',
      avgFps: 'Average FPS',
      amongFpsReports: 'Among reports with FPS',
      distribution: 'Report breakdown',
      good: 'Good',
      playable: 'Playable',
      bad: 'Poor',
      searchPlaceholder: 'Filter by device, brand, Snapdragon, Mali, Adreno...',
      retry: 'Try again',
      emptyTitle: 'No reports for this game yet',
      emptyDesc:
        'Be the first to test and share how this port runs on your phone.',
      emptyFilterTitle: 'No matching devices found',
      emptyFilterDesc: 'Try searching another model, brand, or chipset.',
      authTitle: 'Sign in with Google',
      authDesc:
        'Sign in with your Google account to share how this game runs on your device.',
      signInGoogle: 'Sign in with Google',
      cancel: 'Cancel',
      modalTitle: 'How did it run on your device?',
      detectingDevice: 'Detecting your device...',
      detectedDevice: 'Detected device',
      edit: 'Edit',
      done: 'Done',
      model: 'Model',
      modelFieldLabel: 'Model / Commercial name *',
      chipset: 'Chipset',
      gpu: 'GPU',
      ram: 'RAM',
      android: 'Android',
      notDetected: 'Not detected',
      notDetectedFem: 'Not detected',
      brandLabel: 'Device brand',
      fpsLabel: 'FPS',
      optional: '(optional)',
      howItRan: 'Performance',
      doesNotRun: "Doesn't run",
      perfect: 'Perfect',
      whatNoticed: 'What did you notice?',
      upToSix: '(optional, up to 6)',
      submitReport: 'Submit report',
      submittingReport: 'Submitting report...',
      saveChanges: 'Save changes',
      savingChanges: 'Saving changes...',
      reportSuccess: 'Report submitted! Thank you for helping the community.',
      updateSuccess: 'Report updated successfully!',
    },
    updateModal: {
      titlePrefix: 'New Update Available',
      subtitle: 'A new version of DroidPort Store is ready to install.',
      updateNow: 'Update Now',
      later: 'Later',
    },
  },
  es: {
    nav: {
      inicio: 'Inicio',
      jogos: 'Juegos',
      favoritos: 'Favoritos',
      historico: 'Historial',
      configuracoes: 'Ajustes',
    },
    catalog: {
      searchPlaceholder: 'Buscar juegos...',
      filters: 'Filtros',
      categories: 'Categorías',
      allCategories: 'Todas',
      sortRecent: 'Más Recientes',
      sortName: 'Nombre (A-Z)',
      sortSize: 'Tamaño',
      featured: 'Destacados',
      allGames: 'Todos los juegos',
      favorites: 'Favoritos',
      reloadCatalog: 'Recargar catálogo',
      clearFilters: 'Limpar filtros',
      emptyFilter: 'No se encontraron juegos con los filtros actuales.',
      emptyCatalog: 'No se encontraron juegos en el catálogo.',
      emptyFavorites:
        'Aún no tienes favoritos. Toca el corazón en cualquier port para guardarlo aquí.',
      listMode: 'Vista Lista',
      gridMode: 'Vista Cuadrícula',
      refreshCatalog: 'Actualizar catálogo',
      featuredBadge: '★ DESTACADO',
    },
    history: {
      title: 'Historial',
      clearHistory: 'Borrar historial',
      emptyTitle: 'Sin elementos en el historial',
      emptyDescription:
        'Elige cualquier juego del catálogo e inicia una descarga para verlo aquí.',
      downloadAgain: 'Descargar de nuevo',
      direct: 'Directo',
      p2p: 'P2P',
    },
    settings: {
      title: 'Ajustes',
      accountSectionTitle: 'Cuenta de Google',
      accountConnected: 'Conectado para reportes de la comunidad',
      accountGuestTitle: 'Inicia sesión con Google',
      accountGuestDesc:
        'Conecta tu cuenta para publicar, editar o gestionar tus reportes de rendimiento.',
      signInGoogle: 'Entrar con Google',
      redirecting: 'Redirigiendo...',
      signOut: 'Cerrar sesión',
      appearanceSectionTitle: 'Apariencia e Idioma',
      themeLabel: 'Tema de la app',
      themeDark: 'Oscuro',
      themeLight: 'Claro',
      themePurple: 'Morado',
      themeSystem: 'Sistema',
      languageLabel: 'Idioma',
      languageDeviceDefault: 'Predeterminado del dispositivo',
      preferencesSectionTitle: 'Catálogo y Actualizaciones',
      defaultViewLabel: 'Vista del catálogo',
      defaultViewList: 'Lista',
      defaultViewGrid: 'Cuadrícula',
      autoUpdatesLabel: 'Buscar actualizaciones automáticamente',
      autoUpdatesDesc: 'Avisa al abrir la app cuando haya una nueva versión del APK.',
      checkUpdatesNow: 'Buscar ahora',
      checkingUpdates: 'Buscando...',
      upToDateMessage: 'Ya tienes la versión más reciente.',
      updateFoundMessage: '¡Nueva actualización disponible!',
      libreTorrentTitle: 'Cliente P2P recomendado (LibreTorrent)',
      libreTorrentDesc:
        'Recomendado para juegos pesados a máxima velocidad con el botón P2P.',
      libreTorrentAction: 'Instalar',
      storageSectionTitle: 'Almacenamiento y Datos',
      clearHistoryTitle: 'Borrar historial de descargas',
      clearHistoryDesc: 'Elimina los registros guardados localmente',
      clearFavoritesTitle: 'Borrar favoritos',
      clearFavoritesDesc: 'Elimina todos los juegos guardados localmente',
      clearAction: 'Borrar',
      clearedAction: 'Borrado',
      recordSingular: 'registro',
      recordPlural: 'registros',
      favoriteSingular: 'favorito',
      favoritePlural: 'favoritos',
      aboutTitle: 'Acerca de la App',
      aboutDesc:
        'es una tienda mobile-first dedicada a ports de juegos para Android.',
      versionLabel: 'Versión',
      engineLabel: 'Motor de Descarga: Navegador Nativo / Gestor del Sistema Android',
      persistenceLabel: 'Persistencia: localStorage (ajustes y favoritos) + IndexedDB (historial)',
    },
    details: {
      back: 'Volver',
      aboutPort: 'Sobre el Port',
      noDescription: 'No hay descripción disponible para este port.',
      availableFiles: 'Archivos Disponibles',
      downloadAll: 'Descargar Todos',
      noFiles: 'No hay archivos disponibles para descargar en este port.',
      downloadDirect: 'Descarga Directa',
      downloadP2P: 'Descargar P2P',
      downloadAgain: 'Descargar de nuevo',
      copied: 'Copiado',
      copyP2P: 'Copiar enlace P2P',
      redirectedNotice: 'Redirigido al gestor de descargas del dispositivo',
      maxSpeedTipTitle: 'Consejo para máxima velocidad:',
      maxSpeedTipBody:
        'Para juegos pesados (más de 2 GB), recomendamos usar la app gratuita LibreTorrent en el botón P2P de arriba. Permite pausar y descarga a máxima velocidad.',
      tutorialVideos: 'Videos Tutoriales',
      video: 'Video',
      photoGallery: 'Galería de Fotos',
    },
    community: {
      sectionTitle: '¿Corre en tu celular?',
      sectionSubtitle: 'Reportes reales de la comunidad sobre el rendimiento de',
      reportDevice: 'Reportar mi dispositivo',
      connectedAs: 'Conectado como',
      signOut: 'Salir',
      overallRating: 'Nota general',
      ofFive: 'de 5',
      reportSingular: 'reporte',
      reportPlural: 'reportes',
      avgFps: 'Promedio de FPS',
      amongFpsReports: 'Entre reportes con FPS',
      distribution: 'Distribución',
      good: 'Bueno',
      playable: 'Jugable',
      bad: 'Malo',
      searchPlaceholder: 'Filtrar por modelo, marca, Snapdragon, Mali, Adreno...',
      retry: 'Reintentar',
      emptyTitle: 'Aún no hay reportes para este juego',
      emptyDesc:
        'Sé el primero en probar y compartir cómo funciona este port en tu celular.',
      emptyFilterTitle: 'No se encontraron dispositivos con ese filtro',
      emptyFilterDesc: 'Prueba buscando otro modelo, marca o procesador.',
      authTitle: 'Entrar con Google',
      authDesc:
        'Inicia sesión con tu cuenta de Google para publicar cómo funciona este juego en tu dispositivo.',
      signInGoogle: 'Entrar con Google',
      cancel: 'Cancelar',
      modalTitle: '¿Cómo funcionó en tu dispositivo?',
      detectingDevice: 'Detectando tu dispositivo...',
      detectedDevice: 'Dispositivo detectado',
      edit: 'Editar',
      done: 'Listo',
      model: 'Modelo',
      modelFieldLabel: 'Modelo / Nombre comercial *',
      chipset: 'Chipset',
      gpu: 'GPU',
      ram: 'RAM',
      android: 'Android',
      notDetected: 'No detectado',
      notDetectedFem: 'No detectada',
      brandLabel: 'Marca del dispositivo',
      fpsLabel: 'FPS',
      optional: '(opcional)',
      howItRan: 'Cómo funcionó',
      doesNotRun: 'No abre',
      perfect: 'Perfecto',
      whatNoticed: '¿Qué notaste?',
      upToSix: '(opcional, hasta 6)',
      submitReport: 'Enviar reporte',
      submittingReport: 'Enviando reporte...',
      saveChanges: 'Guardar cambios',
      savingChanges: 'Guardando cambios...',
      reportSuccess: '¡Reporte enviado! Gracias por ayudar a la comunidad.',
      updateSuccess: '¡Reporte actualizado con éxito!',
    },
    updateModal: {
      titlePrefix: 'Nueva Actualización Disponible',
      subtitle: 'Una nueva versión de DroidPort Store está lista para instalar.',
      updateNow: 'Actualizar Ahora',
      later: 'Después',
    },
  },
};
