const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync, spawn } = require('child_process');
const { listFiles } = require('./fileUtils.js');
const { fingerprint } = require('./retrieval.js');

// Multilingual by default: durable project knowledge may be written in Spanish,
// English, or both. Transformers.js downloads the ONNX artifacts once during
// package installation and reuses the same user-level cache across projects.
const DEFAULT_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const INDEX_VERSION = 1;
const MODEL_MARKER = '.harness-model.json';
// The embedding worker runs with the user's project as cwd. Resolve the
// provider from Harness itself so consumers never need to install it locally.
const TRANSFORMERS_ENTRY = require.resolve('@huggingface/transformers');

function cosineSimilarity(a, b) {
    let dot = 0, aa = 0, bb = 0;
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i++) { dot += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
    return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}

function buildSemanticManifest({ model = DEFAULT_MODEL, dimensions = 384, fingerprint: corpusFingerprint = '' } = {}) {
    return { version: INDEX_VERSION, provider: 'transformers.js-local', model, dimensions, fingerprint: corpusFingerprint, builtAt: new Date().toISOString() };
}

function documentFingerprint(document) {
    return crypto.createHash('sha256').update(document.text).digest('hex');
}

function isCompatibleSemanticIndex(index, { model } = {}) {
    if (!index || index.version !== INDEX_VERSION || index.provider !== 'transformers.js-local') return false;
    if (model && index.model !== model) return false;
    if (!Number.isInteger(index.dimensions) || index.dimensions <= 0 || !Array.isArray(index.documents)) return false;
    return index.documents.every(document =>
        typeof document.id === 'string' && typeof document.source === 'string' &&
        typeof document.text === 'string' && typeof document.contentHash === 'string' &&
        Array.isArray(document.vector) && document.vector.length === index.dimensions
    );
}

function getGlobalModelCacheDir() {
    if (process.env.HARNESS_MODEL_CACHE_DIR) return path.resolve(process.env.HARNESS_MODEL_CACHE_DIR);
    if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Harness', 'models');
    if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Caches', 'Harness', 'models');
    return path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'harness', 'models');
}

function semanticDir(harnessDir) { return path.join(harnessDir, '.index', 'semantic'); }
function semanticIndexPath(harnessDir) { return path.join(semanticDir(harnessDir), 'index.json'); }
// Kept as a compatibility-named helper for callers from older releases. The
// model itself is global; only the semantic index remains project-local.
function semanticModelDir() { return getGlobalModelCacheDir(); }
function semanticLockPath() { return path.join(getGlobalModelCacheDir(), '.harness-model.lock'); }
function modelMarkerPath(cacheDir = getGlobalModelCacheDir()) { return path.join(cacheDir, MODEL_MARKER); }

function getModelStatus({ model = DEFAULT_MODEL, cacheDir = getGlobalModelCacheDir() } = {}) {
    const marker = modelMarkerPath(cacheDir);
    let metadata = null;
    try { metadata = JSON.parse(fs.readFileSync(marker, 'utf8')); } catch (_) {}
    return { ready: Boolean(metadata && metadata.model === model), model, cacheDir, marker, metadata };
}

function chunksForVault(harnessDir) {
    const docs = [];
    for (const root of ['brain', 'specs', 'memory']) {
        const dir = path.join(harnessDir, root);
        if (!fs.existsSync(dir)) continue;
        for (const fp of listFiles(dir)) {
            if (!/\.(md|markdown|txt|feature)$/i.test(fp)) continue;
            const source = path.relative(harnessDir, fp).replace(/\\/g, '/');
            const text = fs.readFileSync(fp, 'utf8');
            for (let offset = 0, part = 0; offset < text.length; offset += 1000, part++) {
                const chunk = text.slice(offset, offset + 1200).trim();
                if (chunk) docs.push({ id: `${source}#${part}`, source, text: chunk });
            }
        }
    }
    return docs;
}

const EMBED_SCRIPT = `
const fs = require('fs');
(async () => {
  const input = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  const { pipeline, env } = await import(input.transformersEntry);
  env.cacheDir = input.cacheDir;
  env.allowLocalModels = true;
  env.allowRemoteModels = input.allowRemote !== false;
  const pipelineOptions = input.progress
    ? { progress_callback: progress => process.stderr.write('HARNESS_PROGRESS ' + JSON.stringify(progress) + '\\n') }
    : {};
  const extractor = await pipeline('feature-extraction', input.model, pipelineOptions);
  const vectors = [];
  for (const text of input.texts) {
    const result = await extractor(text, { pooling: 'mean', normalize: true });
    vectors.push(Array.from(result.data));
  }
  process.stdout.write(JSON.stringify({ vectors }));
})().catch(error => { process.stderr.write(error.stack || error.message); process.exit(1); });`;

function embedTexts(harnessDir, texts, { model = DEFAULT_MODEL, allowRemote = true, cacheDir = getGlobalModelCacheDir() } = {}) {
    const inputPath = path.join(os.tmpdir(), `harness-embed-${process.pid}-${Date.now()}.json`);
    fs.mkdirSync(cacheDir, { recursive: true });
    const lockPath = path.join(cacheDir, '.harness-model.lock');
    let lockFd;
    try {
        // Provisioning ONNX is large. A global lock prevents concurrent agent
        // sessions or npm installs from downloading/corrupting shared files.
        lockFd = fs.openSync(lockPath, 'wx');
        fs.writeFileSync(lockFd, String(process.pid));
    } catch (e) {
        if (e.code === 'EEXIST') {
            let alive = false;
            try { const pid = Number(fs.readFileSync(lockPath, 'utf8')); process.kill(pid, 0); alive = true; } catch (_) {}
            if (!alive) {
                try { fs.unlinkSync(lockPath); lockFd = fs.openSync(lockPath, 'wx'); fs.writeFileSync(lockFd, String(process.pid)); } catch (_) { throw new Error('Semantic model provisioning is already running; retry after it completes.'); }
            } else throw new Error('Semantic model provisioning is already running; retry after it completes.');
        } else throw e;
    }
    fs.writeFileSync(inputPath, JSON.stringify({ texts, model, allowRemote, cacheDir, transformersEntry: TRANSFORMERS_ENTRY }));
    try {
        const result = spawnSync(process.execPath, ['-e', EMBED_SCRIPT, inputPath], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 10 * 60 * 1000 });
        if (result.status !== 0) throw new Error(result.stderr || 'Embedding process failed');
        return JSON.parse(result.stdout).vectors;
    } finally {
        try { fs.unlinkSync(inputPath); } catch (e) {}
        try { if (lockFd !== undefined) fs.closeSync(lockFd); fs.unlinkSync(lockPath); } catch (e) {}
    }
}

function provisionSemanticModel({ model = DEFAULT_MODEL, cacheDir = getGlobalModelCacheDir(), allowRemote = true } = {}) {
    const status = getModelStatus({ model, cacheDir });
    if (status.ready) return status;
    // An empty input still forces Transformers.js to load and cache the model.
    embedTexts(process.cwd(), [], { model, cacheDir, allowRemote });
    const metadata = { model, provider: 'transformers.js-local', provisionedAt: new Date().toISOString() };
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(modelMarkerPath(cacheDir), JSON.stringify(metadata, null, 2));
    return getModelStatus({ model, cacheDir });
}

function provisionSemanticModelWithProgress({ model = DEFAULT_MODEL, cacheDir = getGlobalModelCacheDir(), allowRemote = true, onProgress = () => {} } = {}) {
    const status = getModelStatus({ model, cacheDir });
    if (status.ready) return Promise.resolve(status);
    const inputPath = path.join(os.tmpdir(), `harness-embed-progress-${process.pid}-${Date.now()}.json`);
    fs.mkdirSync(cacheDir, { recursive: true });
    const lockPath = path.join(cacheDir, '.harness-model.lock');
    let lockFd;
    try {
        lockFd = fs.openSync(lockPath, 'wx');
        fs.writeFileSync(lockFd, String(process.pid));
    } catch (error) {
        if (error.code === 'EEXIST') throw new Error('Semantic model provisioning is already running; retry after it completes.');
        throw error;
    }
    fs.writeFileSync(inputPath, JSON.stringify({ texts: [], model, allowRemote, cacheDir, transformersEntry: TRANSFORMERS_ENTRY, progress: true }));
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['-e', EMBED_SCRIPT, inputPath], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        let pending = '';
        child.stdout.on('data', chunk => { stdout += chunk.toString(); });
        child.stderr.on('data', chunk => {
            pending += chunk.toString();
            const lines = pending.split(/\r?\n/);
            pending = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('HARNESS_PROGRESS ')) {
                    try { onProgress(JSON.parse(line.slice('HARNESS_PROGRESS '.length))); } catch (_) {}
                } else if (line) stderr += `${line}\n`;
            }
        });
        const cleanup = () => {
            try { fs.unlinkSync(inputPath); } catch (_) {}
            try { if (lockFd !== undefined) fs.closeSync(lockFd); fs.unlinkSync(lockPath); } catch (_) {}
        };
        child.on('error', error => { cleanup(); reject(error); });
        child.on('close', code => {
            if (pending.startsWith('HARNESS_PROGRESS ')) {
                try { onProgress(JSON.parse(pending.slice('HARNESS_PROGRESS '.length))); } catch (_) {}
            } else if (pending) stderr += pending;
            cleanup();
            if (code !== 0) return reject(new Error(stderr || 'Embedding process failed'));
            const metadata = { model, provider: 'transformers.js-local', provisionedAt: new Date().toISOString() };
            fs.writeFileSync(modelMarkerPath(cacheDir), JSON.stringify(metadata, null, 2));
            resolve(getModelStatus({ model, cacheDir }));
        });
    });
}

function buildSemanticIndex(harnessDir, options = {}) {
    const documents = chunksForVault(harnessDir);
    const model = options.model || DEFAULT_MODEL;
    const existing = loadSemanticIndex(harnessDir);
    // A document is reusable only when its exact chunk content and the model
    // contract match. This keeps rebuilds local and deterministic while never
    // mixing vectors from incompatible models or dimensions.
    const reusable = isCompatibleSemanticIndex(existing, { model })
        ? new Map(existing.documents.map(document => [`${document.id}:${document.contentHash}`, document.vector]))
        : new Map();
    const decorated = documents.map(document => ({ ...document, contentHash: documentFingerprint(document) }));
    const missing = decorated.filter(document => !reusable.has(`${document.id}:${document.contentHash}`));
    const embedder = options.embedder || embedTexts;
    const vectors = missing.length ? embedder(harnessDir, missing.map(d => d.text), options) : [];
    if (vectors.length !== missing.length) throw new Error('Embedding provider returned an unexpected vector count');
    const newVectors = new Map(missing.map((document, i) => [`${document.id}:${document.contentHash}`, vectors[i]]));
    const allVectors = decorated.map(document => reusable.get(`${document.id}:${document.contentHash}`) || newVectors.get(`${document.id}:${document.contentHash}`));
    const dimensions = allVectors[0]?.length || existing?.dimensions || 384;
    if (!allVectors.every(vector => Array.isArray(vector) && vector.length === dimensions)) throw new Error('Embedding provider returned incompatible vector dimensions');
    const manifest = buildSemanticManifest({ model, dimensions, fingerprint: fingerprint(harnessDir) });
    const index = { ...manifest, documents: decorated.map((document, i) => ({ ...document, vector: allVectors[i] })) };
    fs.mkdirSync(semanticDir(harnessDir), { recursive: true });
    fs.writeFileSync(semanticIndexPath(harnessDir), JSON.stringify(index));
    return index;
}

function loadSemanticIndex(harnessDir) {
    try { return JSON.parse(fs.readFileSync(semanticIndexPath(harnessDir), 'utf8')); } catch (e) { return null; }
}

function getSemanticIndex(harnessDir, { rebuildIfMissing = true, ...options } = {}) {
    const index = loadSemanticIndex(harnessDir);
    const currentFingerprint = fingerprint(harnessDir);
    if (isCompatibleSemanticIndex(index, options) && index.fingerprint === currentFingerprint) return index;
    if (!index && !rebuildIfMissing) return null;
    return buildSemanticIndex(harnessDir, { model: index?.model || options.model || DEFAULT_MODEL, ...options });
}

function querySemanticIndex(harnessDir, query, options = {}) {
    const index = getSemanticIndex(harnessDir, options);
    if (!index) return [];
    const embedder = options.embedder || embedTexts;
    const [vector] = embedder(harnessDir, [query], { model: index.model, allowRemote: options.allowRemote === true });
    return index.documents.map(d => ({ ...d, score: cosineSimilarity(vector, d.vector) })).sort((a, b) => b.score - a.score).slice(0, options.topN || 5);
}

module.exports = { DEFAULT_MODEL, cosineSimilarity, buildSemanticManifest, isCompatibleSemanticIndex, semanticIndexPath, getGlobalModelCacheDir, semanticModelDir, semanticLockPath, modelMarkerPath, getModelStatus, provisionSemanticModel, provisionSemanticModelWithProgress, chunksForVault, embedTexts, buildSemanticIndex, loadSemanticIndex, getSemanticIndex, querySemanticIndex };
