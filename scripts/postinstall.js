#!/usr/bin/env node

// Keep install reliable in CI and restricted/offline environments. Semantic
// memory has BM25 + graph fallbacks, so a failed optional download must not
// make the CLI unusable.
if (process.env.HARNESS_SKIP_MODEL_DOWNLOAD === '1') {
    console.log('[harness] Skipping global semantic model download (HARNESS_SKIP_MODEL_DOWNLOAD=1).');
    process.exit(0);
}

(async () => {
    try {
        const { DEFAULT_MODEL, provisionSemanticModelWithProgress } = require('../src/utils/semanticMemory.js');
        let lastFile = '';
        const render = progress => {
            const file = progress.file ? String(progress.file).split(/[\\/]/).pop() : 'model';
            const percent = Number.isFinite(progress.progress) ? Math.max(0, Math.min(100, progress.progress)) : null;
            const label = percent === null ? `${progress.status || 'loading'} ${file}` : `${file} ${percent.toFixed(0)}%`;
            if (label !== lastFile) {
                process.stdout.write(`\r[harness] Downloading semantic model: ${label.padEnd(72)}\x1b[K`);
                lastFile = label;
            }
        };
        const status = await provisionSemanticModelWithProgress({ model: DEFAULT_MODEL, onProgress: render });
        if (lastFile) process.stdout.write('\n');
        console.log(`[harness] Global semantic model ready: ${status.cacheDir}`);
    } catch (error) {
        process.stdout.write('\n');
        console.warn(`[harness] Global semantic model was not downloaded: ${error.message}`);
        console.warn('[harness] BM25 + graph memory remain available. Retry with: harness memory semantic setup');
    }
})();
