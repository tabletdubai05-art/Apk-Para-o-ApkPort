import { App as CapacitorApp } from '@capacitor/app';
import { isNativeApp } from '../lib/communitySupabase';
import { APP_VERSION } from '../version';

export function parseSemverParts(
  version: string
): [number, number, number] | null {
  const cleaned = version.trim().replace(/^v/i, '');
  if (!cleaned) return null;

  const mainPart = cleaned.split(/[-+]/)[0]?.trim();
  if (!mainPart) return null;

  const rawSegments = mainPart.split('.');
  if (rawSegments.length === 0) return null;

  const nums = rawSegments.map((seg) => {
    const cleanSeg = seg.trim();
    if (!/^\d+$/.test(cleanSeg)) return NaN;
    return Number.parseInt(cleanSeg, 10);
  });

  if (nums.some((n) => Number.isNaN(n))) return null;

  return [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0];
}

export function compareSemver(a: string, b: string): -1 | 0 | 1 | null {
  const pa = parseSemverParts(a);
  const pb = parseSemverParts(b);
  if (!pa || !pb) return null;

  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

export function isRemoteVersionGreater(
  remoteVersion: string,
  installedVersion: string
): boolean {
  return compareSemver(remoteVersion, installedVersion) === 1;
}

/**
 * Filtra jogos por `versao_minima` usando exclusivamente a versão real
 * instalada no aparelho do usuário (nunca compara com `config.versao_atual`).
 * Só exibe o jogo quando `versaoInstalada >= jogo.versao_minima` (ou quando `versao_minima` for nula/vazia).
 */
export function isGameCompatibleWithInstalledVersion(
  installedVersion: string,
  versaoMinima?: string | null
): boolean {
  if (versaoMinima === null || versaoMinima === undefined) return true;
  const minClean = String(versaoMinima).trim();
  if (!minClean) return true;

  const cmp = compareSemver(installedVersion, minClean);
  if (cmp === null) return true;
  return cmp >= 0;
}

/**
 * Lê a versão real do APK instalada no dispositivo (PackageInfo.versionName via Capacitor App)
 * com fallback para a constante compilada APP_VERSION (BuildConfig/bundle).
 */
export async function getRealInstalledAppVersion(): Promise<string> {
  if (isNativeApp()) {
    try {
      const info = await CapacitorApp.getInfo();
      const nativeVer =
        typeof info?.version === 'string' ? info.version.trim() : '';
      if (nativeVer && parseSemverParts(nativeVer)) {
        return nativeVer;
      }
    } catch {
      // Fallback para APP_VERSION compilada no bundle
    }
  }
  return APP_VERSION;
}
