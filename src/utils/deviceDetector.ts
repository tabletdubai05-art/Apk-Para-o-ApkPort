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

  if (!marca && modelo) {
    marca = inferBrandFromModel(modelo);
  }

  return { modelo, androidVersao, marca };
}

export async function detectCurrentDevice(): Promise<DetectedDeviceInfo> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: NavigatorUAData;
  }) : undefined;

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
        modelo = hints.model.trim();
      }
      if (hints.platform?.toLowerCase() === 'android' && hints.platformVersion) {
        const major = hints.platformVersion.split('.')[0];
        if (major && Number(major) > 0) {
          androidVersao = `Android ${hints.platformVersion.replace(/\.0\.0$/, '')}`;
        }
      }
      if (modelo) {
        const inferred = inferBrandFromModel(modelo);
        if (inferred) marca = inferred;
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
