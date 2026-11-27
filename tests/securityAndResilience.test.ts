import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSafeAndroidP2PIntentUrl,
  buildSafeArchiveServerUrl,
  computeSha256Hex,
  parseSafeArchiveOrgDownloadUrl,
  parseSafeYoutubeEmbedUrl,
  sanitizeApkUpdateUrl,
  sanitizeDirectDownloadUrl,
  sanitizeDiscordUrl,
  sanitizeImageUrl,
  sanitizeMagnetUri,
  sanitizeP2PTorrentUrl,
  sanitizeSha256Hex,
  verifySha256Hex,
} from '../src/utils/urlSecurity';
import {
  parsePhotos,
  parseTutorials,
  parseVideoSource,
  resolveGameFiles,
} from '../src/utils/formatters';
import { parsePkceOAuthCallback } from '../src/lib/communitySupabase';
import {
  clearAllQueryCache,
  dedupeInFlight,
  formatFriendlySupabaseError,
  getCachedValue,
  invalidateCacheKey,
  RateLimitOrUnavailableError,
  setCachedValue,
  withRetryOnTransientError,
} from '../src/utils/supabaseResilience';
import type { Jogo } from '../src/types/game';

describe('urlSecurity — Proteção de URLs, APK Updates, Archive.org, Magnet & Intents', () => {
  it('bloqueia esquemas perigosos (javascript:, file:, data:, intent:, blob:) em todas as funções', () => {
    const malicious = [
      'javascript:alert(1)',
      'JAVASCRIPT:fetch("https://evil.test")',
      'file:///etc/passwd',
      'file:///sdcard/Download/evil.apk',
      'data:text/html,<script>alert(1)</script>',
      'intent://evil#Intent;package=com.evil;end',
      'vbscript:msgbox(1)',
      'blob:https://droidport.store/123',
      '//evil.example/payload.apk',
    ];

    for (const url of malicious) {
      assert.equal(sanitizeApkUpdateUrl(url), null, `APK devia bloquear: ${url}`);
      assert.equal(sanitizeDirectDownloadUrl(url), null, `Direct devia bloquear: ${url}`);
      assert.equal(sanitizeDiscordUrl(url), null, `Discord devia bloquear: ${url}`);
      assert.equal(sanitizeImageUrl(url), null, `Image devia bloquear: ${url}`);
      assert.equal(sanitizeMagnetUri(url), null, `Magnet devia bloquear: ${url}`);
      assert.equal(sanitizeP2PTorrentUrl(url), null, `P2P devia bloquear: ${url}`);
      assert.equal(buildSafeAndroidP2PIntentUrl(url), null, `Intent devia bloquear: ${url}`);
    }
  });

  it('exige HTTPS e host homologado em link_apk de atualização', () => {
    assert.equal(
      sanitizeApkUpdateUrl('http://github.com/droidport/store/releases/download/v1/app.apk'),
      null
    );
    assert.equal(
      sanitizeApkUpdateUrl('https://evil-mirror.example/DroidPort.apk'),
      null
    );
    assert.equal(
      sanitizeApkUpdateUrl('https://127.0.0.1/DroidPort.apk'),
      null
    );
    assert.equal(
      sanitizeApkUpdateUrl('https://user:pass@github.com/org/repo/app.apk'),
      null
    );
    assert.equal(
      sanitizeApkUpdateUrl('https://github.com/droidport/store/releases/download/v1.0.26/DroidPort-Store.apk'),
      'https://github.com/droidport/store/releases/download/v1.0.26/DroidPort-Store.apk'
    );
    assert.equal(
      sanitizeApkUpdateUrl('https://mfwzkzywxvbbonsshjgh.supabase.co/storage/v1/object/public/apks/store.apk'),
      'https://mfwzkzywxvbbonsshjgh.supabase.co/storage/v1/object/public/apks/store.apk'
    );
  });

  it('valida links do Discord aceitando apenas domínios oficiais e HTTPS', () => {
    assert.equal(sanitizeDiscordUrl('discord.gg/droidport'), 'https://discord.gg/droidport');
    assert.equal(sanitizeDiscordUrl('http://discord.com/invite/abc'), 'https://discord.com/invite/abc');
    assert.equal(sanitizeDiscordUrl('https://discord.gg.evil.com/fake'), null);
    assert.equal(sanitizeDiscordUrl('https://t.me/fakegroup'), null);
  });

  it('protege resolução do Archive.org contra SSRF, host spoofing e path traversal', () => {
    const valid = parseSafeArchiveOrgDownloadUrl('https://archive.org/details/cat-quest-port/game.apk');
    assert.ok(valid);
    assert.equal(valid.itemId, 'cat-quest-port');
    assert.equal(valid.filePath, 'game.apk');
    assert.equal(valid.normalizedUrl, 'https://archive.org/download/cat-quest-port/game.apk');

    assert.equal(
      parseSafeArchiveOrgDownloadUrl('https://archive.org.evil.com/download/item/file.apk'),
      null
    );
    assert.equal(
      parseSafeArchiveOrgDownloadUrl('https://archive.org/download/../etc/passwd'),
      null
    );

    assert.equal(
      buildSafeArchiveServerUrl('ia800100.us.archive.org', '/12/items/cat-quest', 'game.apk'),
      'https://ia800100.us.archive.org/12/items/cat-quest/game.apk'
    );
    assert.equal(
      buildSafeArchiveServerUrl('169.254.169.254', '/latest/meta-data', 'iam'),
      null
    );
    assert.equal(
      buildSafeArchiveServerUrl('ia800100.us.archive.org.attacker.com', '/12/items', 'a.apk'),
      null
    );
    assert.equal(
      buildSafeArchiveServerUrl('ia800100.us.archive.org', '/12/../../secret', 'a.apk'),
      null
    );
  });

  it('valida Magnet URI e bloqueia parâmetros #Intent; injetados', () => {
    const validHex = 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=GamePort';
    assert.equal(sanitizeMagnetUri(validHex), validHex);

    const safeIntent = buildSafeAndroidP2PIntentUrl(validHex);
    assert.ok(safeIntent);
    assert.ok(safeIntent.includes('package=org.proninyaroslav.libretorrent'));
    assert.ok(safeIntent.includes('scheme=magnet'));

    // Tentativas de injeção de componente/fallback via Intent URI
    const injected =
      'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567#Intent;package=com.evil;S.browser_fallback_url=javascript:alert(1);end';
    assert.equal(sanitizeMagnetUri(injected), null);
    assert.equal(buildSafeAndroidP2PIntentUrl(injected), null);

    // Hash inválido
    assert.equal(sanitizeMagnetUri('magnet:?xt=urn:btih:short'), null);
  });

  it('calcula e valida checksum SHA-256 para integridade de arquivos', async () => {
    const payload = new TextEncoder().encode('droidport-apk-test-binary');
    const hex = await computeSha256Hex(payload);
    assert.ok(sanitizeSha256Hex(hex));
    assert.equal(await verifySha256Hex(payload, hex), true);
    assert.equal(await verifySha256Hex(payload, '0'.repeat(64)), false);
    assert.equal(sanitizeSha256Hex('not-a-sha256'), undefined);
  });

  it('extrai apenas embeds seguros do YouTube', () => {
    assert.equal(
      parseSafeYoutubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ'),
      'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1'
    );
    assert.equal(parseSafeYoutubeEmbedUrl('https://youtu.be/../../evil'), null);
  });
});

describe('formatters — Sanitização de Catálogo, Fotos, Vídeos e Tutoriais', () => {
  it('remove URLs maliciosas preservando itens válidos do catálogo', () => {
    const mockGame: Jogo = {
      id: 42,
      titulo: 'Cat Quest Port',
      categoria: 'RPG, Aventura',
      versao: '1.2.0',
      tamanho: '450 MB',
      destaque: true,
      descricao: 'Port de teste',
      capa_url: 'https://cdn.example.com/cover.jpg',
      fotos_urls: 'https://cdn.example.com/1.jpg, javascript:alert(1), /local/img.png',
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      arquivos: [
        {
          nome: 'APK Seguro',
          url: 'https://archive.org/download/cat-quest/catquest.apk',
          torrent_url: 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567',
        },
        {
          nome: 'Arquivo Malicioso',
          url: 'javascript:alert(document.cookie)',
          torrent_url: 'intent://x#Intent;package=com.evil;end',
        },
      ],
      tutoriais: JSON.stringify([
        { titulo: 'Guia Oficial', url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' },
        { titulo: 'Payload XSS', url: 'javascript:alert(1)' },
      ]),
    };

    assert.deepEqual(parsePhotos(mockGame.fotos_urls), [
      'https://cdn.example.com/1.jpg',
      '/local/img.png',
    ]);

    const video = parseVideoSource(mockGame.video_url);
    assert.deepEqual(video, {
      type: 'youtube',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1',
    });

    const files = resolveGameFiles(mockGame);
    assert.equal(files.length, 1);
    assert.equal(files[0].nome, 'APK Seguro');

    const tutorials = parseTutorials(mockGame.tutoriais);
    assert.equal(tutorials.length, 1);
    assert.equal(tutorials[0].titulo, 'Guia Oficial');
  });
});

describe('communitySupabase — OAuth PKCE Callback Parser', () => {
  it('aceita callback PKCE válido com ?code= e rejeita tokens implícitos na URL', () => {
    const valid = parsePkceOAuthCallback('droidport://login-callback?code=pkce_code_12345');
    assert.deepEqual(valid, { valid: true, code: 'pkce_code_12345' });

    // Rejeita token implícito legado em fragmento ou query sem code PKCE
    assert.deepEqual(
      parsePkceOAuthCallback('droidport://login-callback#access_token=abc&refresh_token=xyz'),
      { valid: false }
    );
    assert.deepEqual(
      parsePkceOAuthCallback('droidport://login-callback?access_token=abc'),
      { valid: false }
    );

    // Rejeita host/scheme falsificado
    assert.deepEqual(
      parsePkceOAuthCallback('droidport://login-callback.evil.com?code=123'),
      { valid: false }
    );
    assert.deepEqual(
      parsePkceOAuthCallback('https://evil.example/login-callback?code=123'),
      { valid: false }
    );

    // Propaga erro explícito do provedor OAuth
    assert.deepEqual(
      parsePkceOAuthCallback('droidport://login-callback?error_description=access_denied'),
      { valid: true, error: 'access_denied' }
    );
  });
});

describe('supabaseResilience — Cache TTL, Deduplicação e Retry 429/503', () => {
  it('deduplica chamadas simultâneas para a mesma chave', async () => {
    clearAllQueryCache();
    let executions = 0;

    const factory = async () => {
      executions += 1;
      await new Promise((r) => setTimeout(r, 15));
      return 'ok';
    };

    const [a, b, c] = await Promise.all([
      dedupeInFlight('catalog:test', factory),
      dedupeInFlight('catalog:test', factory),
      dedupeInFlight('catalog:test', factory),
    ]);

    assert.equal(executions, 1);
    assert.equal(a, 'ok');
    assert.equal(b, 'ok');
    assert.equal(c, 'ok');
  });

  it('armazena e invalida cache com TTL', () => {
    clearAllQueryCache();
    setCachedValue('k1', { items: [1, 2] }, 5_000);
    assert.deepEqual(getCachedValue('k1'), { items: [1, 2] });
    invalidateCacheKey('k1');
    assert.equal(getCachedValue('k1'), null);
  });

  it('faz retry em HTTP 429/503 e não faz retry em erro 403/400', async () => {
    let attempts = 0;
    const recovered = await withRetryOnTransientError(
      async () => {
        attempts += 1;
        if (attempts < 2) {
          throw { status: 429, message: 'Too Many Requests' };
        }
        return 'recuperado';
      },
      { maxRetries: 2, baseDelayMs: 5, maxDelayMs: 10 }
    );
    assert.equal(recovered, 'recuperado');
    assert.equal(attempts, 2);

    let forbiddenAttempts = 0;
    await assert.rejects(
      () =>
        withRetryOnTransientError(
          async () => {
            forbiddenAttempts += 1;
            throw { status: 403, message: 'Forbidden' };
          },
          { maxRetries: 2, baseDelayMs: 5, maxDelayMs: 10 }
        ),
      (err: unknown) => (err as { status?: number })?.status === 403
    );
    assert.equal(forbiddenAttempts, 1);

    const errMsg = formatFriendlySupabaseError(
      new RateLimitOrUnavailableError(429),
      'Erro genérico'
    );
    assert.ok(errMsg.includes('HTTP 429'));
  });
});
