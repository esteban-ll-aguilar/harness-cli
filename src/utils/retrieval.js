const fs = require('fs');
const path = require('path');
const { listFiles } = require('./fileUtils.js');

/**
 * Retrieval — BM25 semantic-ish search over the .harness vault.
 *
 * The harness memory lives as Markdown in brain/, specs/ and memory/.
 * Obsidian is a VIEWER over those files (open .harness/ as a vault);
 * this module is the RETRIEVAL engine over the same corpus.
 *
 * We build a small BM25 (Okapi) index — no external deps, no API calls —
 * which is a big step up from the previous substring keyword matching.
 * It supports the `harness memory search` command and the tiered loader.
 */

const STOPWORDS = new Set(`
a an and are as at be but by for from has have he her his i if in is it its
of on or our she so that the their there they this to was we were will with you
your el la los las un una unos unas y o e de del al en para por con sin sobre
entre es son fue eran había hay no ni que como cuando donde este esta estos
estas eso esa esos esas lo le se su sus mi mis tu tus nu nues vuestro vuestros
the a an of to in for on with as by from at or and but not is are was were be
it this that these those which who whom whose what when where why how then
there here will would can could should may might must shall do does did done
having been being them their theirs they we our ours us
`.split(/\s+/).filter(Boolean));

const INDEX_VERSION = 2;

/**
 * Strip diacritics (á→a, é→e, ñ→n, ...) so search is accent-insensitive.
 * Precomposed accented characters decompose to exactly one base codepoint
 * under NFD, so this preserves string length/character positions — safe to
 * reuse for snippet-position lookups against the original (accented) text.
 */
function stripDiacritics(text) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function tokenize(text) {
    return stripDiacritics(String(text).toLowerCase())
        .replace(/```[\s\S]*?```/g, ' ')      // drop code blocks (noise)
        .replace(/[`*#_>|~[\](){}'"!,.;:?\\/-]+/g, ' ')  // markdown noise
        .split(/\s+/)
        .map(t => t.replace(/^\d+$/, ''))     // drop bare numbers
        .filter(t => t.length > 1 && t.length < 40 && !STOPWORDS.has(t));
}

function termFrequencies(tokens) {
    const tf = {};
    for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
    return tf;
}

/**
 * Fingerprint the corpus so the cached index is only rebuilt when files change.
 */
function fingerprint(harnessDir) {
    const roots = ['brain', 'specs', 'memory'];
    const parts = [];
    for (const root of roots) {
        const dir = path.join(harnessDir, root);
        if (!fs.existsSync(dir)) continue;
        for (const fp of listFiles(dir)) {
            let st;
            try { st = fs.statSync(fp); } catch (e) { continue; }
            parts.push(`${path.relative(harnessDir, fp)}:${st.mtimeMs}`);
        }
    }
    return parts.sort().join('|');
}

/**
 * Build a BM25 index over brain/, specs/ and memory/.
 */
function buildIndex(harnessDir) {
    const docs = {};
    const df = {};
    const corpus = [];

    const roots = ['brain', 'specs', 'memory'];
    for (const root of roots) {
        const dir = path.join(harnessDir, root);
        if (!fs.existsSync(dir)) continue;
        for (const fp of listFiles(dir)) {
            if (!/\.(md|markdown|txt|feature)$/i.test(fp)) continue;
            let content;
            try { content = fs.readFileSync(fp, 'utf8'); } catch (e) { continue; }
            const rel = path.relative(harnessDir, fp);
            const tf = termFrequencies(tokenize(content));
            const docLen = Object.values(tf).reduce((a, b) => a + b, 0);
            if (docLen === 0) continue;
            docs[rel] = { len: docLen, tf };
            corpus.push(rel);
            for (const term of Object.keys(tf)) df[term] = (df[term] || 0) + 1;
        }
    }

    const numDocs = corpus.length;
    const avgDocLen = numDocs ? corpus.reduce((a, rel) => a + docs[rel].len, 0) / numDocs : 0;

    return {
        version: INDEX_VERSION,
        fingerprint: fingerprint(harnessDir),
        numDocs,
        avgDocLen,
        docs,
        df,
        builtAt: new Date().toISOString()
    };
}

/**
 * BM25 (Okapi) score for a single document.
 */
function bm25Score(index, rel, queryTerms) {
    const { docs, df, numDocs, avgDocLen } = index;
    const doc = docs[rel];
    if (!doc) return 0;
    const k1 = 1.5, b = 0.75;
    const docLen = doc.len;
    let score = 0;
    const seen = new Set();
    for (const term of queryTerms) {
        if (seen.has(term)) continue;
        seen.add(term);
        const tf = doc.tf[term] || 0;
        if (tf === 0) continue;
        const idf = Math.log(1 + (numDocs - df[term] + 0.5) / (df[term] + 0.5));
        score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLen))));
    }
    return score;
}

/**
 * Search the index, returning top-N results with context snippets.
 */
function search(index, harnessDir, query, topN = 5) {
    if (!index || !index.docs) return [];
    const terms = tokenize(query);
    if (terms.length === 0) return [];

    const scored = [];
    for (const rel of Object.keys(index.docs)) {
        const s = bm25Score(index, rel, terms);
        if (s > 0) scored.push({ rel, score: s });
    }
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topN).map(r => {
        let content = '';
        try { content = fs.readFileSync(path.join(harnessDir, r.rel), 'utf8'); } catch (e) {}
        return { ...r, snippet: snippetFor(content, terms) };
    });
}

function snippetFor(content, terms, width = 200) {
    if (!content) return '';
    // terms[] are already accent-stripped (tokenize() normalized the query) —
    // search on an equally-stripped copy of content so an accent-insensitive
    // match still finds its position, but slice from the ORIGINAL content so
    // the snippet shown to a human keeps its real accents.
    const idx = stripDiacritics(content.toLowerCase()).indexOf(terms[0]);
    if (idx === -1) return content.slice(0, width);
    const start = Math.max(0, idx - 60);
    return (start > 0 ? '…' : '') + content.slice(start, start + width) + '…';
}

// --- Persistence ----------------------------------------------------------

function indexPath(harnessDir) {
    return path.join(harnessDir, '.index', 'harness-index.json');
}

function saveIndex(harnessDir, index) {
    const dir = path.dirname(indexPath(harnessDir));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(indexPath(harnessDir), JSON.stringify(index));
}

function loadIndex(harnessDir, { rebuild = true } = {}) {
    let index = null;
    try {
        index = JSON.parse(fs.readFileSync(indexPath(harnessDir), 'utf8'));
    } catch (e) {
        index = null;
    }

    if (index && index.version === INDEX_VERSION && index.fingerprint === fingerprint(harnessDir)) {
        return index;
    }

    if (!rebuild) return index;
    index = buildIndex(harnessDir);
    saveIndex(harnessDir, index);
    return index;
}

module.exports = {
    INDEX_VERSION,
    tokenize,
    stripDiacritics,
    termFrequencies,
    fingerprint,
    buildIndex,
    bm25Score,
    search,
    indexPath,
    saveIndex,
    loadIndex
};
