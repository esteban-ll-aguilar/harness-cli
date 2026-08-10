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
    listFiles, DEFAULT_IGNORES
};
