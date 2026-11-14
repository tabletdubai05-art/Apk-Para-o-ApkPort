export interface DetectedDeviceInfo {
  marca: string;
  modelo: string;
  chipset: string;
  gpu: string;
  ram: string;
  androidVersao: string;
}

interface NavigatorUAData {
  platform?: string;
  brands?: Array<{ brand: string; version: string }>;
  getHighEntropyValues?: (hints: string[]) => Promise<{
    model?: string;
    platform?: string;
    platformVersion?: string;
  }>;
}

interface CommercialModelEntry {
  name: string;
  brand: string;
}

// Dicionário de códigos técnicos exatos -> Nome comercial e marca
const EXACT_MODEL_DICTIONARY: Record<string, CommercialModelEntry> = {
  // OPPO
  CPH2727: { name: 'OPPO A5 4G', brand: 'OPPO' },
  CPH2683: { name: 'OPPO A3 4G', brand: 'OPPO' },
  CPH2669: { name: 'OPPO A40', brand: 'OPPO' },
  CPH2639: { name: 'OPPO A60', brand: 'OPPO' },
  CPH2659: { name: 'OPPO A80 5G', brand: 'OPPO' },
  CPH2591: { name: 'OPPO Reno 11 F 5G', brand: 'OPPO' },
  CPH2603: { name: 'OPPO Reno 11 5G', brand: 'OPPO' },
  CPH2625: { name: 'OPPO Reno 12 5G', brand: 'OPPO' },
  CPH2629: { name: 'OPPO Reno 12 F 5G', brand: 'OPPO' },
  CPH2689: { name: 'OPPO Reno 13 F 5G', brand: 'OPPO' },
  CPH2557: { name: 'OPPO A58', brand: 'OPPO' },
  CPH2577: { name: 'OPPO A38', brand: 'OPPO' },
  CPH2477: { name: 'OPPO A78 4G', brand: 'OPPO' },
  CPH2565: { name: 'OPPO A79 5G', brand: 'OPPO' },
  CPH2525: { name: 'OPPO Find N3 Flip', brand: 'OPPO' },
  CPH2581: { name: 'OPPO Find X7 Ultra', brand: 'OPPO' },

  // Xiaomi / Redmi / POCO
  '2312DRA50G': { name: 'Redmi Note 13 Pro 5G', brand: 'Xiaomi' },
  '2312DRA50I': { name: 'Redmi Note 13 Pro 5G', brand: 'Xiaomi' },
  '23117RA68G': { name: 'Redmi Note 13 Pro 4G', brand: 'Xiaomi' },
  '23090RA98G': { name: 'Redmi Note 13 Pro+ 5G', brand: 'Xiaomi' },
  '23129RAA4G': { name: 'Redmi Note 13 4G', brand: 'Xiaomi' },
  '23124RA7EO': { name: 'Redmi Note 13 5G', brand: 'Xiaomi' },
  '24090RA29G': { name: 'Redmi Note 14 Pro 5G', brand: 'Xiaomi' },
  '24094RAD4G': { name: 'Redmi Note 14 Pro+ 5G', brand: 'Xiaomi' },
  '24117RN76G': { name: 'Redmi Note 14 4G', brand: 'Xiaomi' },
  '24094RN2DG': { name: 'Redmi Note 14 5G', brand: 'Xiaomi' },
  '22101316G': { name: 'Redmi Note 12 Pro 5G', brand: 'Xiaomi' },
  '23021RAAEG': { name: 'Redmi Note 12 4G', brand: 'Xiaomi' },
  '23028RA60L': { name: 'Redmi Note 12 4G', brand: 'Xiaomi' },
  '22111317G': { name: 'Redmi Note 12S', brand: 'Xiaomi' },
  '23076RN8DY': { name: 'Redmi 12 4G', brand: 'Xiaomi' },
  '23106RN0DA': { name: 'Redmi 13C', brand: 'Xiaomi' },
  '24049RN28L': { name: 'Redmi 13', brand: 'Xiaomi' },
  '23124RN87G': { name: 'Redmi 13C', brand: 'Xiaomi' },
  '2409BRN2CG': { name: 'Redmi 14C', brand: 'Xiaomi' },
  '23049PCD8G': { name: 'POCO F5', brand: 'Xiaomi' },
  '23013PC75G': { name: 'POCO F5 Pro', brand: 'Xiaomi' },
  '24069PC21G': { name: 'POCO F6', brand: 'Xiaomi' },
  '23113RKC6G': { name: 'POCO F6 Pro', brand: 'Xiaomi' },
  '25053PC47G': { name: 'POCO F7', brand: 'Xiaomi' },
  '24122RKC7G': { name: 'POCO F7 Pro', brand: 'Xiaomi' },
  '22101320G': { name: 'POCO X5 Pro 5G', brand: 'Xiaomi' },
  '22111317PG': { name: 'POCO X5 5G', brand: 'Xiaomi' },
  '23122PCD1G': { name: 'POCO X6 5G', brand: 'Xiaomi' },
  '2311DRK48G': { name: 'POCO X6 Pro 5G', brand: 'Xiaomi' },
  '2412DPC0AG': { name: 'POCO X7 Pro', brand: 'Xiaomi' },
  '24095PCADG': { name: 'POCO X7 5G', brand: 'Xiaomi' },
  '23127PN0CG': { name: 'Xiaomi 14', brand: 'Xiaomi' },
  '24030PN60G': { name: 'Xiaomi 14 Ultra', brand: 'Xiaomi' },
  '2407FPN8EG': { name: 'Xiaomi 14T', brand: 'Xiaomi' },
  '2407FPN8ER': { name: 'Xiaomi 14T Pro', brand: 'Xiaomi' },
  '23078PND5G': { name: 'Xiaomi 13T', brand: 'Xiaomi' },
  '2201116PG': { name: 'POCO X4 Pro 5G', brand: 'Xiaomi' },
  '22021211RG': { name: 'POCO F4', brand: 'Xiaomi' },
  '21121210G': { name: 'POCO F4 GT', brand: 'Xiaomi' },
  M2102J20SG: { name: 'POCO X3 Pro', brand: 'Xiaomi' },
  M2007J20CG: { name: 'POCO X3 NFC', brand: 'Xiaomi' },
  M2012K11AG: { name: 'POCO F3', brand: 'Xiaomi' },
  M2101K6G: { name: 'Redmi Note 10 Pro', brand: 'Xiaomi' },
  M2101K7AG: { name: 'Redmi Note 10', brand: 'Xiaomi' },
  '2201117TG': { name: 'Redmi Note 11', brand: 'Xiaomi' },
  '2201116TG': { name: 'Redmi Note 11 Pro 5G', brand: 'Xiaomi' },
  '2310FPCA4G': { name: 'POCO C65', brand: 'Xiaomi' },
  '23095PC98G': { name: 'POCO M6 Pro', brand: 'Xiaomi' },
  '2404APC5FG': { name: 'POCO M6', brand: 'Xiaomi' },
  '22071219CG': { name: 'POCO M5', brand: 'Xiaomi' },

  // OnePlus
  CPH2449: { name: 'OnePlus 11 5G', brand: 'OnePlus' },
  CPH2583: { name: 'OnePlus 12 5G', brand: 'OnePlus' },
  CPH2611: { name: 'OnePlus 12R', brand: 'OnePlus' },
  CPH2653: { name: 'OnePlus 13', brand: 'OnePlus' },
  CPH2663: { name: 'OnePlus Nord 4', brand: 'OnePlus' },
  CPH2493: { name: 'OnePlus Nord 3 5G', brand: 'OnePlus' },
  CPH2465: { name: 'OnePlus Nord CE 3 Lite', brand: 'OnePlus' },
  LE2125: { name: 'OnePlus 9 Pro', brand: 'OnePlus' },
  NE2215: { name: 'OnePlus 10 Pro', brand: 'OnePlus' },

  // Realme
  RMX3706: { name: 'Realme GT Neo 5 SE', brand: 'Realme' },
  RMX3851: { name: 'Realme GT 6', brand: 'Realme' },
  RMX3853: { name: 'Realme GT 6T', brand: 'Realme' },
  RMX3840: { name: 'Realme 12 Pro+ 5G', brand: 'Realme' },
  RMX3842: { name: 'Realme 12 Pro 5G', brand: 'Realme' },
  RMX3870: { name: 'Realme 12 5G', brand: 'Realme' },
  RMX3930: { name: 'Realme C65', brand: 'Realme' },
  RMX3760: { name: 'Realme C53', brand: 'Realme' },
  RMX3710: { name: 'Realme C55', brand: 'Realme' },
  RMX3830: { name: 'Realme C67', brand: 'Realme' },
  RMX3941: { name: 'Realme C75', brand: 'Realme' },
  RMX3370: { name: 'Realme GT Neo 2', brand: 'Realme' },
  RMX3630: { name: 'Realme 10', brand: 'Realme' },
  RMX3741: { name: 'Realme 11 Pro+ 5G', brand: 'Realme' },

  // ASUS / ROG Phone
  AI2401: { name: 'ASUS ROG Phone 8', brand: 'ASUS' },
  AI2401_A: { name: 'ASUS ROG Phone 8 Pro', brand: 'ASUS' },
  AI2501: { name: 'ASUS ROG Phone 9', brand: 'ASUS' },
  AI2205: { name: 'ASUS ROG Phone 7', brand: 'ASUS' },
  AI2201: { name: 'ASUS ROG Phone 6', brand: 'ASUS' },
  AI2302: { name: 'ASUS Zenfone 10', brand: 'ASUS' },
  ZS676KS: { name: 'ASUS ROG Phone 5s', brand: 'ASUS' },

  // RedMagic / Nubia
  NX769J: { name: 'RedMagic 9 Pro', brand: 'RedMagic' },
  NX729J: { name: 'RedMagic 8 Pro', brand: 'RedMagic' },
  NX789J: { name: 'RedMagic 10 Pro', brand: 'RedMagic' },
  NX679J: { name: 'RedMagic 7', brand: 'RedMagic' },
  NX709J: { name: 'RedMagic 7S Pro', brand: 'RedMagic' },
  NX721J: { name: 'Nubia Z50 Ultra', brand: 'Nubia' },
  NX727J: { name: 'Nubia Z60 Ultra', brand: 'Nubia' },

  // Google Pixel
  GC3VE: { name: 'Google Pixel 8 Pro', brand: 'Google Pixel' },
  GKWS6: { name: 'Google Pixel 8', brand: 'Google Pixel' },
  G9BQD: { name: 'Google Pixel 8a', brand: 'Google Pixel' },
  GQML3: { name: 'Google Pixel 7 Pro', brand: 'Google Pixel' },
  GVU6C: { name: 'Google Pixel 7', brand: 'Google Pixel' },
  GUR25: { name: 'Google Pixel 9', brand: 'Google Pixel' },
  GEC77: { name: 'Google Pixel 9 Pro XL', brand: 'Google Pixel' },

  // Nothing
  A063: { name: 'Nothing Phone (1)', brand: 'Nothing' },
  A065: { name: 'Nothing Phone (2)', brand: 'Nothing' },
  A142: { name: 'Nothing Phone (2a)', brand: 'Nothing' },

  // Motorola
  XT2401: { name: 'Motorola Edge 50 Ultra', brand: 'Motorola' },
  XT2427: { name: 'Motorola Edge 50 Pro', brand: 'Motorola' },
  XT2429: { name: 'Motorola Edge 50 Fusion', brand: 'Motorola' },
  XT2409: { name: 'Motorola Edge 50 Neo', brand: 'Motorola' },
  XT2301: { name: 'Motorola Edge 40 Pro', brand: 'Motorola' },
  XT2303: { name: 'Motorola Edge 40', brand: 'Motorola' },
  XT2305: { name: 'Motorola Edge 40 Neo', brand: 'Motorola' },
  XT2203: { name: 'Motorola Edge 30 Fusion', brand: 'Motorola' },
  XT2343: { name: 'Moto G84 5G', brand: 'Motorola' },
  XT2437: { name: 'Moto G85 5G', brand: 'Motorola' },
  XT2335: { name: 'Moto G54 5G', brand: 'Motorola' },
  XT2433: { name: 'Moto G55 5G', brand: 'Motorola' },
  XT2363: { name: 'Moto G34 5G', brand: 'Motorola' },
  XT2415: { name: 'Moto G24', brand: 'Motorola' },
  XT2237: { name: 'Moto G73 5G', brand: 'Motorola' },
  XT2221: { name: 'Moto G82 5G', brand: 'Motorola' },
  XT2175: { name: 'Moto G200 5G', brand: 'Motorola' },

  // Infinix
  X6833B: { name: 'Infinix Note 30', brand: 'Infinix' },
  X6837: { name: 'Infinix GT 10 Pro', brand: 'Infinix' },
  X6871: { name: 'Infinix GT 20 Pro', brand: 'Infinix' },
  X6850: { name: 'Infinix Note 40 Pro', brand: 'Infinix' },
  X6739: { name: 'Infinix Hot 40 Pro', brand: 'Infinix' },
};

// Prefixos comuns (Samsung Galaxy com variantes regionais B/E/U/W/N/0, Motorola, ASUS, RedMagic)
const PREFIX_MODEL_DICTIONARY: Array<{
  prefix: string;
  name: string;
  brand: string;
}> = [
  { prefix: 'SM-S938', name: 'Galaxy S25 Ultra', brand: 'Samsung' },
  { prefix: 'SM-S936', name: 'Galaxy S25+', brand: 'Samsung' },
  { prefix: 'SM-S931', name: 'Galaxy S25', brand: 'Samsung' },
  { prefix: 'SM-S928', name: 'Galaxy S24 Ultra', brand: 'Samsung' },
  { prefix: 'SM-S926', name: 'Galaxy S24+', brand: 'Samsung' },
  { prefix: 'SM-S921', name: 'Galaxy S24', brand: 'Samsung' },
  { prefix: 'SM-S918', name: 'Galaxy S23 Ultra', brand: 'Samsung' },
  { prefix: 'SM-S916', name: 'Galaxy S23+', brand: 'Samsung' },
  { prefix: 'SM-S911', name: 'Galaxy S23', brand: 'Samsung' },
  { prefix: 'SM-S711', name: 'Galaxy S23 FE', brand: 'Samsung' },
  { prefix: 'SM-S721', name: 'Galaxy S24 FE', brand: 'Samsung' },
  { prefix: 'SM-S908', name: 'Galaxy S22 Ultra', brand: 'Samsung' },
  { prefix: 'SM-S906', name: 'Galaxy S22+', brand: 'Samsung' },
  { prefix: 'SM-S901', name: 'Galaxy S22', brand: 'Samsung' },
  { prefix: 'SM-G998', name: 'Galaxy S21 Ultra', brand: 'Samsung' },
  { prefix: 'SM-G996', name: 'Galaxy S21+', brand: 'Samsung' },
  { prefix: 'SM-G991', name: 'Galaxy S21', brand: 'Samsung' },
  { prefix: 'SM-G990', name: 'Galaxy S21 FE', brand: 'Samsung' },
  { prefix: 'SM-G780', name: 'Galaxy S20 FE', brand: 'Samsung' },
  { prefix: 'SM-G781', name: 'Galaxy S20 FE 5G', brand: 'Samsung' },
  { prefix: 'SM-A566', name: 'Galaxy A56 5G', brand: 'Samsung' },
  { prefix: 'SM-A556', name: 'Galaxy A55 5G', brand: 'Samsung' },
  { prefix: 'SM-A546', name: 'Galaxy A54 5G', brand: 'Samsung' },
  { prefix: 'SM-A536', name: 'Galaxy A53 5G', brand: 'Samsung' },
  { prefix: 'SM-A528', name: 'Galaxy A52s 5G', brand: 'Samsung' },
  { prefix: 'SM-A525', name: 'Galaxy A52', brand: 'Samsung' },
  { prefix: 'SM-A366', name: 'Galaxy A36 5G', brand: 'Samsung' },
  { prefix: 'SM-A356', name: 'Galaxy A35 5G', brand: 'Samsung' },
  { prefix: 'SM-A346', name: 'Galaxy A34 5G', brand: 'Samsung' },
  { prefix: 'SM-A336', name: 'Galaxy A33 5G', brand: 'Samsung' },
  { prefix: 'SM-A256', name: 'Galaxy A25 5G', brand: 'Samsung' },
  { prefix: 'SM-A245', name: 'Galaxy A24', brand: 'Samsung' },
  { prefix: 'SM-A165', name: 'Galaxy A16 4G', brand: 'Samsung' },
  { prefix: 'SM-A166', name: 'Galaxy A16 5G', brand: 'Samsung' },
  { prefix: 'SM-A155', name: 'Galaxy A15 4G', brand: 'Samsung' },
  { prefix: 'SM-A156', name: 'Galaxy A15 5G', brand: 'Samsung' },
  { prefix: 'SM-A145', name: 'Galaxy A14 4G', brand: 'Samsung' },
  { prefix: 'SM-A146', name: 'Galaxy A14 5G', brand: 'Samsung' },
  { prefix: 'SM-A057', name: 'Galaxy A05s', brand: 'Samsung' },
  { prefix: 'SM-M546', name: 'Galaxy M54 5G', brand: 'Samsung' },
  { prefix: 'SM-M556', name: 'Galaxy M55 5G', brand: 'Samsung' },
  { prefix: 'SM-M356', name: 'Galaxy M35 5G', brand: 'Samsung' },
  { prefix: 'SM-M346', name: 'Galaxy M34 5G', brand: 'Samsung' },
  { prefix: 'SM-M156', name: 'Galaxy M15 5G', brand: 'Samsung' },
  { prefix: 'SM-M146', name: 'Galaxy M14 5G', brand: 'Samsung' },
  { prefix: 'SM-F946', name: 'Galaxy Z Fold 5', brand: 'Samsung' },
  { prefix: 'SM-F956', name: 'Galaxy Z Fold 6', brand: 'Samsung' },
  { prefix: 'SM-F731', name: 'Galaxy Z Flip 5', brand: 'Samsung' },
  { prefix: 'SM-F741', name: 'Galaxy Z Flip 6', brand: 'Samsung' },
  { prefix: 'SM-X910', name: 'Galaxy Tab S9 Ultra', brand: 'Samsung' },
  { prefix: 'SM-X810', name: 'Galaxy Tab S9+', brand: 'Samsung' },
  { prefix: 'SM-X710', name: 'Galaxy Tab S9', brand: 'Samsung' },
  { prefix: 'SM-X510', name: 'Galaxy Tab S9 FE', brand: 'Samsung' },
  { prefix: 'SM-X210', name: 'Galaxy Tab A9+', brand: 'Samsung' },
  { prefix: 'XT2401', name: 'Motorola Edge 50 Ultra', brand: 'Motorola' },
  { prefix: 'XT2427', name: 'Motorola Edge 50 Pro', brand: 'Motorola' },
  { prefix: 'XT2429', name: 'Motorola Edge 50 Fusion', brand: 'Motorola' },
  { prefix: 'XT2409', name: 'Motorola Edge 50 Neo', brand: 'Motorola' },
  { prefix: 'XT2301', name: 'Motorola Edge 40 Pro', brand: 'Motorola' },
  { prefix: 'XT2303', name: 'Motorola Edge 40', brand: 'Motorola' },
  { prefix: 'XT2343', name: 'Moto G84 5G', brand: 'Motorola' },
  { prefix: 'XT2437', name: 'Moto G85 5G', brand: 'Motorola' },
  { prefix: 'XT2335', name: 'Moto G54 5G', brand: 'Motorola' },
  { prefix: 'XT2433', name: 'Moto G55 5G', brand: 'Motorola' },
  { prefix: 'XT2363', name: 'Moto G34 5G', brand: 'Motorola' },
  { prefix: 'NX789J', name: 'RedMagic 10 Pro', brand: 'RedMagic' },
  { prefix: 'NX769J', name: 'RedMagic 9 Pro', brand: 'RedMagic' },
  { prefix: 'NX729J', name: 'RedMagic 8 Pro', brand: 'RedMagic' },
  { prefix: 'AI2501', name: 'ASUS ROG Phone 9', brand: 'ASUS' },
  { prefix: 'AI2401', name: 'ASUS ROG Phone 8', brand: 'ASUS' },
  { prefix: 'AI2205', name: 'ASUS ROG Phone 7', brand: 'ASUS' },
  { prefix: 'AI2201', name: 'ASUS ROG Phone 6', brand: 'ASUS' },
];

export function resolveCommercialModelName(rawModel: string): {
  displayName: string;
  brand: string;
} {
  const trimmed = rawModel.trim();
  if (!trimmed) {
    return { displayName: '', brand: '' };
  }

  const upper = trimmed.toUpperCase();

  const exact = EXACT_MODEL_DICTIONARY[upper];
  if (exact) {
    const displayName = upper.includes(exact.name.toUpperCase())
      ? trimmed
      : `${exact.name} (${trimmed})`;
    return { displayName, brand: exact.brand };
  }

  for (const entry of PREFIX_MODEL_DICTIONARY) {
    if (upper.startsWith(entry.prefix)) {
      const displayName = upper.includes(entry.name.toUpperCase())
        ? trimmed
        : `${entry.name} (${trimmed})`;
      return { displayName, brand: entry.brand };
    }
  }

  return {
    displayName: trimmed,
    brand: inferBrandFromModel(trimmed),
  };
}

function cleanWebGLRenderer(raw: string): string {
  let cleaned = raw.trim();
  const angleMatch = cleaned.match(/^ANGLE\s*\((.+)\)$/i);
  if (angleMatch && angleMatch[1]) {
    const parts = angleMatch[1]
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      cleaned = parts[1];
    } else if (parts.length === 1) {
      cleaned = parts[0];
    }
  }
  return cleaned
    .replace(/\(TM\)/gi, '')
    .replace(/\(R\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectWebGLGpu(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    if (!gl) return '';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      if (typeof renderer === 'string' && renderer.trim()) {
        return cleanWebGLRenderer(renderer);
      }
    }

    const fallbackRenderer = gl.getParameter(gl.RENDERER);
    if (typeof fallbackRenderer === 'string' && fallbackRenderer.trim()) {
      const cleaned = cleanWebGLRenderer(fallbackRenderer);
      if (cleaned.toLowerCase() !== 'webkit webgl') {
        return cleaned;
      }
    }
    return '';
  } catch {
    return '';
  }
}

function inferChipsetFromGpu(gpu: string): string {
  const g = gpu.toLowerCase();
  if (!g) return '';

  if (g.includes('adreno')) {
    if (g.includes('750')) return 'Snapdragon 8 Gen 3';
    if (g.includes('740')) return 'Snapdragon 8 Gen 2';
    if (g.includes('735')) return 'Snapdragon 8s Gen 3';
    if (g.includes('732')) return 'Snapdragon 7+ Gen 3';
    if (g.includes('730')) return 'Snapdragon 8 Gen 1';
    if (g.includes('725')) return 'Snapdragon 7+ Gen 2';
    if (g.includes('720')) return 'Snapdragon 7 Gen 3';
    if (g.includes('710')) return 'Snapdragon 7s Gen 2';
    if (g.includes('660')) return 'Snapdragon 888';
    if (g.includes('650')) return 'Snapdragon 865 / 870';
    if (g.includes('644')) return 'Snapdragon 7 Gen 1';
    if (g.includes('642')) return 'Snapdragon 778G / 780G';
    if (g.includes('640')) return 'Snapdragon 855';
    if (g.includes('630')) return 'Snapdragon 845';
    if (g.includes('619')) return 'Snapdragon 695 / 4 Gen 1';
    if (g.includes('618')) return 'Snapdragon 720G / 732G';
    if (g.includes('616')) return 'Snapdragon 710 / 712';
    if (g.includes('613')) return 'Snapdragon 4 Gen 2';
    if (g.includes('612')) return 'Snapdragon 675';
    if (g.includes('610')) return 'Snapdragon 665 / 680';
    if (g.includes('540')) return 'Snapdragon 835';
    if (g.includes('530')) return 'Snapdragon 820 / 821';
    if (g.includes('512')) return 'Snapdragon 660';
    if (g.includes('506')) return 'Snapdragon 625';
  }

  if (g.includes('xclipse 940')) return 'Exynos 2400';
  if (g.includes('xclipse 920')) return 'Exynos 2200';
  if (g.includes('xclipse 530')) return 'Exynos 1480';
  if (g.includes('immortalis-g720')) return 'MediaTek Dimensity 9300';
  if (g.includes('immortalis-g715')) return 'MediaTek Dimensity 9200';
  if (g.includes('mali-g710')) return 'MediaTek Dimensity 9000 / Tensor G2';
  if (g.includes('mali-g715')) return 'Google Tensor G3 / G4';
  if (g.includes('mali-g615')) return 'MediaTek Dimensity 8300';
  if (g.includes('mali-g610')) return 'MediaTek Dimensity 8100 / 8200';
  if (g.includes('mali-g68')) return 'Exynos 1280 / 1380 / Dimensity 900';
  if (g.includes('mali-g57')) return 'MediaTek Helio G99 / Dimensity 700';

  return '';
}

export function inferBrandFromModel(model: string): string {
  const m = model.trim().toLowerCase();
  if (!m) return '';

  if (m.includes('samsung') || m.startsWith('sm-') || m.startsWith('gt-') || m.includes('galaxy')) {
    return 'Samsung';
  }
  if (m.includes('redmagic') || m.startsWith('nx7') || m.startsWith('nx6')) {
    return 'RedMagic';
  }
  if (m.includes('nubia')) return 'Nubia';
  if (
    m.includes('xiaomi') ||
    m.includes('redmi') ||
    m.includes('poco') ||
    m.startsWith('m20') ||
    m.startsWith('m21') ||
    m.startsWith('22') ||
    m.startsWith('23') ||
    m.startsWith('24')
  ) {
    return 'Xiaomi';
  }
  if (m.includes('rog') || m.includes('asus') || m.includes('zenfone') || m.startsWith('ai2')) {
    return 'ASUS';
  }
  if (m.includes('oneplus') || m.startsWith('cph24') || m.startsWith('cph25') || m.startsWith('le2') || m.startsWith('ne2')) {
    return 'OnePlus';
  }
  if (m.includes('iqoo')) return 'iQOO';
  if (m.includes('vivo') || m.startsWith('v21') || m.startsWith('v22') || m.startsWith('v23')) {
    return 'Vivo';
  }
  if (m.includes('realme') || m.startsWith('rmx')) return 'Realme';
  if (m.includes('oppo') || m.startsWith('cph')) return 'OPPO';
  if (m.includes('pixel')) return 'Google Pixel';
  if (m.includes('moto') || m.includes('motorola') || m.startsWith('xt')) return 'Motorola';
  if (m.includes('honor')) return 'Honor';
  if (m.includes('huawei')) return 'Huawei';
  if (m.includes('iphone') || m.includes('ipad') || m.includes('apple')) return 'Apple';
  if (m.includes('sony') || m.includes('xperia') || m.startsWith('xq-')) return 'Sony';
  if (m.includes('nothing') || m.startsWith('a06') || m.startsWith('a05') || m.startsWith('a14')) {
    return 'Nothing';
  }
  if (m.includes('lenovo') || m.includes('legion')) return 'Lenovo';
  if (m.includes('zte')) return 'ZTE';
  if (m.includes('meizu')) return 'Meizu';
  if (m.includes('infinix') || m.startsWith('x6')) return 'Infinix';

  return '';
}

function parseUserAgentFallback(ua: string): {
  modelo: string;
  androidVersao: string;
  marca: string;
} {
  let androidVersao = '';
  let modelo = '';
  let marca = '';

  const androidMatch = ua.match(/Android\s+([0-9]+(?:\.[0-9]+)*)/i);
  if (androidMatch && androidMatch[1]) {
    androidVersao = `Android ${androidMatch[1]}`;
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const iosMatch = ua.match(/OS\s+([0-9_]+)/i);
    androidVersao = iosMatch ? `iOS ${iosMatch[1].replace(/_/g, '.')}` : 'iOS';
    modelo = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
    marca = 'Apple';
  } else if (/Windows NT/i.test(ua)) {
    androidVersao = 'Windows (Desktop)';
  } else if (/Mac OS X/i.test(ua)) {
    androidVersao = 'macOS (Desktop)';
  } else if (/Linux/i.test(ua)) {
    androidVersao = 'Linux';
  }

  if (!modelo && androidMatch) {
    const parenMatch = ua.match(/Android\s+[0-9.]+;\s*([^)]+)\)/i);
    if (parenMatch && parenMatch[1]) {
      const segments = parenMatch[1]
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s && s.toLowerCase() !== 'wv' && !/^[a-z]{2}-[a-z]{2}$/i.test(s));

      const rawModel = segments[segments.length - 1] || '';
      const cleanedModel = rawModel
        .replace(/\s+Build\/.*$/i, '')
        .replace(/^Linux;\s*/i, '')
        .trim();

      if (cleanedModel && cleanedModel.toLowerCase() !== 'k') {
        modelo = cleanedModel;
      }
    }
  }

  if (modelo) {
    const resolved = resolveCommercialModelName(modelo);
    modelo = resolved.displayName;
    if (resolved.brand) {
      marca = resolved.brand;
    }
  }

  return { modelo, androidVersao, marca };
}

export async function detectCurrentDevice(): Promise<DetectedDeviceInfo> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const nav =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & {
          deviceMemory?: number;
          userAgentData?: NavigatorUAData;
        })
      : undefined;

  const fallback = parseUserAgentFallback(ua);
  let modelo = fallback.modelo;
  let androidVersao = fallback.androidVersao;
  let marca = fallback.marca;

  if (nav?.userAgentData?.getHighEntropyValues) {
    try {
      const hints = await nav.userAgentData.getHighEntropyValues([
        'model',
        'platform',
        'platformVersion',
      ]);
      if (hints.model && hints.model.trim()) {
        const resolved = resolveCommercialModelName(hints.model.trim());
        modelo = resolved.displayName;
        if (resolved.brand) {
          marca = resolved.brand;
        }
      }
      if (hints.platform?.toLowerCase() === 'android' && hints.platformVersion) {
        const major = hints.platformVersion.split('.')[0];
        if (major && Number(major) > 0) {
          androidVersao = `Android ${hints.platformVersion.replace(/\.0\.0$/, '')}`;
        }
      }
    } catch {
      // Ignore Client Hints permission/availability errors
    }
  }

  const gpu = detectWebGLGpu();
  const chipset = inferChipsetFromGpu(gpu);
  const ram =
    typeof nav?.deviceMemory === 'number' && nav.deviceMemory > 0
      ? `${nav.deviceMemory} GB`
      : '';

  return {
    marca,
    modelo,
    chipset,
    gpu,
    ram,
    androidVersao,
  };
}
