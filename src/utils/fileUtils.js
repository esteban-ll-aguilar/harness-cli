const fs = require('fs');
const path = require('path');

const DEFAULT_IGNORES = new Set([
    'node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'out', 'target',
    '.next', '.nuxt', '.turbo', '.cache', 'coverage', 'vendor', '.obsidian',
    '.claude', '.codex', '.kimi', '.deepseek', '.qwen', '.opencode', '.vscode',
    '.github', '.idea', 'Pods', '.gradle', '__pycache__', '.venv', 'venv',
    '.tox', '.pytest_cache', '.ruff_cache', '.mypy_cache', '.terraform',
    '.serverless', 'tmp', 'temp'
]);

/**
 * Recursively list files under a directory, skipping ignored dirs.
 * Returns absolute paths. Works on Node 18.0+ (manual traversal).
 */
function listFiles(dir, { ignore = DEFAULT_IGNORES } = {}) {
    const results = [];
    function walk(current) {
        let entries;
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        } catch (e) {
            return;
        }
        for (const entry of entries) {
            const fp = path.join(current, entry.name);
            if (entry.isDirectory()) {
                if (ignore.has(entry.name)) continue;
                walk(fp);
            } else if (entry.isFile()) {
                results.push(fp);
            }
        }
    }
    walk(dir);
    return results;
}

/**
 * Zero-dependency glob matcher for rule scoping (`--glob=`). Supports a
 * double-star wildcard for any depth (including path separators) and a
 * single star for any run of characters except a path separator — enough
 * for the simple path patterns rules use, e.g. "src/pages" + double-star,
 * or double-star + "/*.sql".
 */
function matchGlob(pattern, filePath) {
    const normPattern = String(pattern).replace(/\\/g, '/');
    const normPath = String(filePath).replace(/\\/g, '/');

    let re = '';
    for (let i = 0; i < normPattern.length; i++) {
        if (normPattern[i] === '*' && normPattern[i + 1] === '*') {
            if (normPattern[i + 2] === '/') {
                re += '(?:.*/)?'; // "**/" matches any number of path segments, including zero
                i += 2;
            } else {
                re += '.*';
                i += 1;
            }
        } else if (normPattern[i] === '*') {
            re += '[^/]*';
        } else {
            re += normPattern[i].replace(/[.+^${}()|[\]\\]/g, '\\$&');
        }
    }
    return new RegExp(`^${re}$`).test(normPath);
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function copyTemplate(src, dest, vars = {}) {
    ensureDir(path.dirname(dest));
    let content = fs.readFileSync(src, 'utf8');
    Object.entries(vars).forEach(([key, val]) => {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), val);
    });
    fs.writeFileSync(dest, content);
}

function copyDir(src, dest, vars = {}) {
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath, vars);
        } else {
            copyTemplate(srcPath, destPath, vars);
        }
    }
}

function loadHarnessRC(cwd) {
    const rcPath = path.join(cwd, '.harnessrc');
    if (fs.existsSync(rcPath)) {
        try {
            return JSON.parse(fs.readFileSync(rcPath, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

function writeHarnessRC(cwd, data) {
    const rcPath = path.join(cwd, '.harnessrc');
    fs.writeFileSync(rcPath, JSON.stringify(data, null, 2));
}

function getHarnessDir(cwd) {
    const rc = loadHarnessRC(cwd);
    return path.join(cwd, rc.harnessDir || '.harness');
}

/**
 * Minimal frontmatter parser — every log/rule this codebase writes uses flat
 * `key: value` frontmatter (no nested YAML), so a hand-rolled split is enough
 * and avoids a YAML dependency.
 */
function parseFrontmatter(content) {
    const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(content);
    if (!m) return { meta: {}, body: content };
    const meta = {};
    for (const line of m[1].split('\n')) {
        const idx = line.indexOf(':');
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (key) meta[key] = value;
    }
    return { meta, body: m[2] };
}

/**
 * Zero-dependency synchronous sleep (Atomics.wait is allowed on Node's main
 * thread, unlike a browser main thread) — used only by the lock's retry loop.
 */
function sleepSync(ms) {
    const sab = new SharedArrayBuffer(4);
    Atomics.wait(new Int32Array(sab), 0, 0, ms);
}

/**
 * Atomic read-modify-write for `.harnessrc`, so concurrent callers (e.g.
 * several agent sessions each running `harness advance`/`harness orchestrate
 * claim` on the same project) can't silently clobber each other's writes.
 *
 * The lock is a directory (`fs.mkdirSync` is atomic — fails with EEXIST if
 * already held, on any POSIX/NTFS filesystem, no dependency needed). If the
 * lock is older than `staleMs`, it's assumed to be left behind by a crashed
 * process and is force-recovered.
 *
 * `mutatorFn(rc)` MUST mutate `rc` in place — its return value is NOT written
 * to disk (the mutated `rc` always is); the return value is passed straight
 * through to the caller as arbitrary metadata (e.g. `{ alreadyApproved: true }`),
 * decoupled on purpose so a caller can't accidentally overwrite `.harnessrc`
 * with a status object instead of the real state.
 */
function withHarnessRCLock(cwd, mutatorFn, { retryMs = 50, timeoutMs = 2000, staleMs = 10000 } = {}) {
    const lockDir = path.join(cwd, '.harnessrc.lock');
    const start = Date.now();

    for (;;) {
        try {
            fs.mkdirSync(lockDir);
            break;
        } catch (e) {
            if (e.code !== 'EEXIST') throw e;

            let stat = null;
            try { stat = fs.statSync(lockDir); } catch (_) { /* lock released between calls */ }
            if (stat && (Date.now() - stat.mtimeMs) > staleMs) {
                try { fs.rmdirSync(lockDir); } catch (_) { /* someone else recovered it first */ }
                continue;
            }

            if (Date.now() - start > timeoutMs) {
                throw new Error('🔒 Project busy: could not acquire the .harnessrc lock in time. Try again.');
            }
            sleepSync(retryMs);
        }
    }

    try {
        const rc = loadHarnessRC(cwd);
        const meta = mutatorFn(rc);
        writeHarnessRC(cwd, rc);
        return meta;
    } finally {
        try { fs.rmdirSync(lockDir); } catch (e) { /* best-effort release */ }
    }
}

function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function timestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function findLatestSpec(cwd) {
    const specsDir = path.join(getHarnessDir(cwd), 'specs');
    if (!fs.existsSync(specsDir)) return null;
    const dirs = fs.readdirSync(specsDir)
        .filter(d => /^\d{3}-/.test(d))
        .sort();
    return dirs.length ? dirs[dirs.length - 1] : null;
}

function nextSpecId(cwd) {
    const latest = findLatestSpec(cwd);
    if (!latest) return '001';
    const num = parseInt(latest.split('-')[0], 10) + 1;
    return num.toString().padStart(3, '0');
}

module.exports = {
    ensureDir, copyTemplate, copyDir,
    loadHarnessRC, writeHarnessRC, getHarnessDir,
    slugify, timestamp, findLatestSpec, nextSpecId,
    listFiles, DEFAULT_IGNORES, matchGlob, withHarnessRCLock, parseFrontmatter
};
