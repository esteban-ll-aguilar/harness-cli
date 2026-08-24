const fs = require('fs');
const path = require('path');
const { listFiles } = require('./fileUtils.js');

/**
 * Regex-based "where is X defined" index over the PROJECT's own source (not
 * the .harness vault — a different question than BM25 text search answers).
 * No AST, no vector DB — a per-language pattern set, same spirit as
 * languageDetector.js's file-signature detection. Misses some definitions,
 * occasionally over-matches; good enough for "roughly where is this", not a
 * refactoring tool.
 */

const JS_PATTERNS = [
    { re: /\bfunction\s+([A-Za-z_$][\w$]*)/, kind: 'function' },
    { re: /\bclass\s+([A-Za-z_$][\w$]*)/, kind: 'class' },
    { re: /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/, kind: 'function' }
];
const PY_PATTERNS = [
    { re: /^\s*def\s+([A-Za-z_]\w*)/, kind: 'function' },
    { re: /^\s*class\s+([A-Za-z_]\w*)/, kind: 'class' }
];
const GO_PATTERNS = [
    { re: /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)/, kind: 'function' }
];
const JAVA_PATTERNS = [
    { re: /\bclass\s+([A-Za-z_]\w*)/, kind: 'class' },
    { re: /\binterface\s+([A-Za-z_]\w*)/, kind: 'interface' }
];
const RUST_PATTERNS = [
    { re: /\bfn\s+([A-Za-z_]\w*)/, kind: 'function' },
    { re: /\bstruct\s+([A-Za-z_]\w*)/, kind: 'struct' }
];
const DART_PATTERNS = [
    { re: /\bclass\s+([A-Za-z_]\w*)/, kind: 'class' }
];

const LANG_PATTERNS = {
    '.js': JS_PATTERNS, '.jsx': JS_PATTERNS, '.mjs': JS_PATTERNS, '.cjs': JS_PATTERNS,
    '.ts': JS_PATTERNS, '.tsx': JS_PATTERNS,
    '.py': PY_PATTERNS,
    '.go': GO_PATTERNS,
    '.java': JAVA_PATTERNS,
    '.rs': RUST_PATTERNS,
    '.dart': DART_PATTERNS
};

/**
 * Fingerprint of every source file the symbol scanner cares about (path +
 * mtime) — lets `getSymbolIndex` know when to rebuild, same pattern as
 * `retrieval.js`'s BM25 index. Without this, a cached symbol index would
 * silently go stale forever (no one would remember to re-run `memory index`).
 */
function fingerprint(cwd) {
    const parts = [];
    for (const fp of listFiles(cwd)) {
        if (!LANG_PATTERNS[path.extname(fp)]) continue;
        let st;
        try { st = fs.statSync(fp); } catch (e) { continue; }
        parts.push(`${path.relative(cwd, fp)}:${st.mtimeMs}`);
    }
    return parts.sort().join('|');
}

function buildSymbolIndex(cwd) {
    const symbols = {};
    for (const fp of listFiles(cwd)) {
        const patterns = LANG_PATTERNS[path.extname(fp)];
        if (!patterns) continue;

        let content;
        try { content = fs.readFileSync(fp, 'utf8'); } catch (e) { continue; }
        const rel = path.relative(cwd, fp).replace(/\\/g, '/');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            for (const { re, kind } of patterns) {
                const m = re.exec(lines[i]);
                if (m && m[1]) {
                    (symbols[m[1]] = symbols[m[1]] || []).push({ file: rel, line: i + 1, kind });
                }
            }
        }
    }
    return {
        symbols,
        numSymbols: Object.keys(symbols).length,
        fingerprint: fingerprint(cwd),
        builtAt: new Date().toISOString()
    };
}

function symbolIndexPath(harnessDir) {
    return path.join(harnessDir, '.index', 'symbol-index.json');
}

function saveSymbolIndex(harnessDir, index) {
    const dir = path.dirname(symbolIndexPath(harnessDir));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(symbolIndexPath(harnessDir), JSON.stringify(index));
}

function loadSymbolIndex(harnessDir) {
    try {
        return JSON.parse(fs.readFileSync(symbolIndexPath(harnessDir), 'utf8'));
    } catch (e) {
        return null;
    }
}

/**
 * The function callers should actually use: returns a symbol index that's
 * guaranteed fresh (rebuilds automatically when the project's source has
 * changed since it was last built), mirroring `retrieval.js`'s `loadIndex`.
 * This is what makes `harness context --symbol=`/`harness memory symbol`
 * "just work" without a separate "did you remember to reindex?" step.
 */
function getSymbolIndex(cwd, harnessDir, { rebuild = true } = {}) {
    const cached = loadSymbolIndex(harnessDir);
    if (cached && cached.fingerprint === fingerprint(cwd)) return cached;
    if (!rebuild) return cached;

    const fresh = buildSymbolIndex(cwd);
    saveSymbolIndex(harnessDir, fresh);
    return fresh;
}

/**
 * Exact match first; falls back to substring match (case-insensitive) over
 * symbol names when there's no exact hit.
 */
function findSymbol(index, name) {
    if (!index || !index.symbols) return { exact: [], partial: [] };

    const exact = index.symbols[name] || [];
    if (exact.length > 0) return { exact, partial: [] };

    const needle = name.toLowerCase();
    const partial = [];
    for (const [symbol, occurrences] of Object.entries(index.symbols)) {
        if (symbol.toLowerCase().includes(needle)) {
            for (const o of occurrences) partial.push({ ...o, symbol });
        }
    }
    return { exact: [], partial };
}

/**
 * "Who calls X" — a live regex scan (not persisted; a per-lookup query, not
 * a bulk index like definitions) for `name` as a whole word across
 * recognized-language files, excluding lines already known to be its
 * definition. Same zero-dependency, "roughly right" philosophy as
 * `buildSymbolIndex` — useful before touching/removing a function, not a
 * refactoring tool.
 */
function findReferences(cwd, name, definitions = []) {
    const defLines = new Set(definitions.map(d => `${d.file}:${d.line}`));
    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRe = new RegExp(`\\b${escaped}\\b`);

    const refs = [];
    for (const fp of listFiles(cwd)) {
        if (!LANG_PATTERNS[path.extname(fp)]) continue;
        let content;
        try { content = fs.readFileSync(fp, 'utf8'); } catch (e) { continue; }
        const rel = path.relative(cwd, fp).replace(/\\/g, '/');
        content.split('\n').forEach((line, i) => {
            const lineNo = i + 1;
            if (defLines.has(`${rel}:${lineNo}`)) return;
            if (wordRe.test(line)) refs.push({ file: rel, line: lineNo, text: line.trim().slice(0, 120) });
        });
    }
    return refs;
}

module.exports = { buildSymbolIndex, saveSymbolIndex, loadSymbolIndex, getSymbolIndex, symbolIndexPath, findSymbol, findReferences, fingerprint };
