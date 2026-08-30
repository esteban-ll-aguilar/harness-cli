const fs = require('fs');
const path = require('path');
const { listFiles, parseFrontmatter } = require('./fileUtils.js');
const { tokenize, stripDiacritics, fingerprint } = require('./retrieval.js');

/**
 * Graph memory — a typed, weighted, temporal index over the .harness vault.
 *
 * Why this exists: `retrieval.js` (BM25) and `tokenOptimizer.js` used to treat
 * every file as one opaque blob — a hit on a 400-line brain doc meant dumping
 * all 400 lines into the agent's context. That doesn't scale (a growing
 * constitution.md or a long ADR wastes the token budget on sections that
 * weren't the match) and it never distinguishes a durable decision from a
 * one-off session note that's since been superseded.
 *
 * This module re-parses the same corpus (brain/specs/memory — same roots and
 * fingerprint as retrieval.js, so caching stays in sync) at SECTION
 * granularity instead of file granularity:
 *   - node   = one markdown section (a `##`/`###` block, or the whole file
 *              if it has no headings), typed by its path (decision, spec,
 *              pattern, session, charter, note) with a confidence and a
 *              validity window
 *   - edge   = a wikilink between sections (`references`), a section's
 *              membership in its parent file (`part_of`), or an explicit
 *              `supersedes:` frontmatter pointer (contradiction resolution —
 *              the old node's `validUntil` is set instead of deleting it)
 *
 * No embeddings, no LLM calls, no external graph DB — entity resolution is
 * "same file path", relevance is BM25 over node text. That's deliberately
 * the cheap 80% (per-node ranking + a hard token budget) rather than the
 * full Graphiti-style pipeline (LLM entity extraction, community detection),
 * which isn't worth the added dependency/cost at the vault sizes (hundreds,
 * not millions, of notes) this CLI targets.
 */

const INDEX_VERSION = 1;

// Confidence: how durable a fact is once written. Decisions/charters rarely
// change; session logs are a snapshot of one moment and decay fast.
const TYPE_CONFIDENCE = {
    charter: 1.0,
    decision: 1.0,
    spec: 0.9,
    pattern: 0.85,
    person: 0.8,
    note: 0.7,
    session: 0.5
};

// Recency half-life in days. Types absent here never decay (durable knowledge
// stays fully weighted regardless of age).
const TYPE_HALFLIFE_DAYS = {
    session: 14,
    note: 60,
    spec: 120
};

function classifyType(rel) {
    if (/^brain\/decisions\//.test(rel)) return 'decision';
    if (/^brain\/patterns\//.test(rel)) return 'pattern';
    if (/^brain\/people\//.test(rel)) return 'person';
    if (/^brain\/(AGENTS|constitution|north-star)\.md$/.test(rel)) return 'charter';
    if (/^specs\//.test(rel)) return 'spec';
    if (/^memory\/session-logs\//.test(rel)) return 'session';
    return 'note';
}

function slugHeading(text) {
    return stripDiacritics(String(text).toLowerCase())
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
}

/**
 * Split a markdown body into sections at `##`/`###` headings. A file with no
 * such headings (or content before the first heading) yields one node so
 * nothing is silently dropped.
 */
function splitSections(body) {
    const lines = body.split('\n');
    const sections = [];
    let current = { heading: null, lines: [] };

    for (const line of lines) {
        const m = /^(##|###)\s+(.+)$/.exec(line);
        if (m) {
            if (current.heading !== null || current.lines.some(l => l.trim())) sections.push(current);
            current = { heading: m[2].trim(), lines: [] };
        } else {
            current.lines.push(line);
        }
    }
    if (current.heading !== null || current.lines.some(l => l.trim())) sections.push(current);

    return sections.map(s => ({ heading: s.heading, text: s.lines.join('\n').trim() }))
        .filter(s => s.text.length > 0 || s.heading);
}

const WIKILINK_RE = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|[^\]]+)?\]\]/g;

function extractWikilinks(text) {
    const targets = [];
    let m;
    WIKILINK_RE.lastIndex = 0;
    while ((m = WIKILINK_RE.exec(text))) {
        targets.push({ target: m[1].trim(), heading: m[2] ? m[2].trim() : null });
    }
    return targets;
}

function resolveWikilinkFile(target) {
    // Wikilinks are written without extension per Obsidian convention.
    return target.endsWith('.md') ? target : `${target}.md`;
}

function parseDate(meta, fallbackMs) {
    if (meta && meta.date) {
        const ts = Date.parse(meta.date);
        if (!Number.isNaN(ts)) return ts;
    }
    return fallbackMs;
}

/**
 * Build the graph over brain/specs/memory. Mirrors retrieval.js's buildIndex
 * shape (same roots, same fingerprint) so both indexes go stale together.
 */
function buildGraph(harnessDir) {
    const nodes = {};       // id -> node
    const edges = [];       // { from, to, type, weight }
    const byFile = {};      // rel -> [nodeId, ...] in document order

    const roots = ['brain', 'specs', 'memory'];
    for (const root of roots) {
        const dir = path.join(harnessDir, root);
        if (!fs.existsSync(dir)) continue;
        for (const fp of listFiles(dir)) {
            if (!/\.(md|markdown)$/i.test(fp)) continue;
            let content;
            try { content = fs.readFileSync(fp, 'utf8'); } catch (e) { continue; }
            const rel = path.relative(harnessDir, fp).replace(/\\/g, '/');
            let mtimeMs = Date.now();
            try { mtimeMs = fs.statSync(fp).mtimeMs; } catch (e) { /* keep default */ }

            const { meta, body } = parseFrontmatter(content);
            const type = classifyType(rel);
            const validFrom = parseDate(meta, mtimeMs);
            const confidence = TYPE_CONFIDENCE[type] ?? 0.7;

            const sections = splitSections(body);
            byFile[rel] = [];

            sections.forEach((section, i) => {
                const id = section.heading ? `${rel}#${slugHeading(section.heading)}` : (i === 0 ? rel : `${rel}#${i}`);
                const tf = {};
                for (const t of tokenize(section.text)) tf[t] = (tf[t] || 0) + 1;
                const len = Object.values(tf).reduce((a, b) => a + b, 0);

                nodes[id] = {
                    id, file: rel, heading: section.heading, type,
                    text: section.text, tf, len,
                    confidence, validFrom, validUntil: null,
                    source: rel
                };
                byFile[rel].push(id);

                if (meta.supersedes) {
                    const target = meta.supersedes.trim();
                    edges.push({ from: id, to: target, type: 'supersedes', weight: 1.0 });
                }

                for (const link of extractWikilinks(section.text)) {
                    edges.push({
                        from: id, type: 'references', weight: 1.0,
                        toRaw: resolveWikilinkFile(link.target),
                        toHeadingSlug: link.heading ? slugHeading(link.heading) : null
                    });
                }
            });

            // part_of edges linking sibling sections to their file's first node
            const ids = byFile[rel];
            for (let i = 1; i < ids.length; i++) {
                edges.push({ from: ids[i], to: ids[0], type: 'part_of', weight: 0.5 });
            }
        }
    }

    // Resolve `supersedes` targets: a bare file path (no `#heading`) means
    // "the whole file" — every section of it is stale, not just its first
    // node — so a superseded doc can't leak content through an untouched
    // node id. Note a file's title-only preamble section shares the file's
    // own `rel` as its node id, so `nodes[edge.to]` alone can't tell "whole
    // file" from "that one specific node" apart — the presence of `#` can.
    for (const edge of edges) {
        if (edge.type !== 'supersedes') continue;
        const sourceNode = nodes[edge.from];
        if (!sourceNode) continue;

        const targetIds = edge.to.includes('#') ? (nodes[edge.to] ? [edge.to] : []) : (byFile[edge.to] || []);
        for (const targetId of targetIds) {
            const targetNode = nodes[targetId];
            if (targetNode && (targetNode.validUntil === null || sourceNode.validFrom < targetNode.validUntil)) {
                targetNode.validUntil = sourceNode.validFrom;
            }
        }
        edge.to = targetIds[0] || edge.to;
    }

    // Resolve wikilink targets: Obsidian links are usually written by
    // basename (`[[adr-002]]`), not full vault-relative path, so a naive
    // "target + .md" never matches the real node id (`brain/decisions/
    // adr-002.md`). Resolve by basename across the vault, same as Obsidian's
    // own shortest-path link resolution; an unresolvable/ambiguous link is
    // left as-is — it just won't match a node at query time (dangling, not
    // fatal, consistent with this module's "roughly right" philosophy).
    const basenameIndex = {};
    for (const rel of Object.keys(byFile)) {
        const base = path.basename(rel, '.md').toLowerCase();
        (basenameIndex[base] = basenameIndex[base] || []).push(rel);
    }
    for (const edge of edges) {
        if (edge.type !== 'references') continue;
        let targetFile = byFile[edge.toRaw] ? edge.toRaw : null;
        if (!targetFile) {
            const matches = basenameIndex[path.basename(edge.toRaw, '.md').toLowerCase()];
            if (matches && matches.length === 1) targetFile = matches[0];
        }
        edge.to = targetFile ? (edge.toHeadingSlug ? `${targetFile}#${edge.toHeadingSlug}` : targetFile) : edge.toRaw;
        delete edge.toRaw;
        delete edge.toHeadingSlug;
    }

    // Corpus-wide document frequency, needed for BM25 idf at query time.
    const df = {};
    const nodeList = Object.values(nodes);
    for (const node of nodeList) {
        for (const term of Object.keys(node.tf)) df[term] = (df[term] || 0) + 1;
    }
    const numNodes = nodeList.length;
    const avgLen = numNodes ? nodeList.reduce((a, n) => a + n.len, 0) / numNodes : 0;

    return {
        version: INDEX_VERSION,
        fingerprint: fingerprint(harnessDir),
        numNodes,
        numEdges: edges.length,
        avgLen,
        df,
        nodes,
        edges,
        builtAt: new Date().toISOString()
    };
}

function bm25NodeScore(graph, node, queryTerms) {
    const { df, numNodes, avgLen } = graph;
    const k1 = 1.5, b = 0.75;
    let score = 0;
    const seen = new Set();
    for (const term of queryTerms) {
        if (seen.has(term)) continue;
        seen.add(term);
        const tf = node.tf[term] || 0;
        if (tf === 0) continue;
        const docFreq = df[term] || 0;
        const idf = Math.log(1 + (numNodes - docFreq + 0.5) / (docFreq + 0.5));
        score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (node.len / (avgLen || 1)))));
    }
    return score;
}

function recencyDecay(node, now) {
    const halflife = TYPE_HALFLIFE_DAYS[node.type];
    if (!halflife) return 1; // durable types don't decay
    const ageDays = Math.max(0, (now - node.validFrom) / (24 * 60 * 60 * 1000));
    return Math.pow(0.5, ageDays / halflife);
}

function isCurrentlyValid(node, now) {
    return node.validUntil === null || node.validUntil === undefined || now < node.validUntil;
}

function estimateTokens(text) {
    return Math.ceil(String(text).length / 4);
}

/**
 * Query the graph within an explicit token budget: rank by
 * BM25 x confidence x recency, drop superseded/expired nodes, then expand
 * one hop from the best entry points if budget remains. This is the
 * "never dump a 10,000-line file" replacement for naive whole-file retrieval.
 */
function queryGraph(graph, query, { budgetTokens = 600, topN = 8, now = Date.now() } = {}) {
    if (!graph || !graph.nodes) return { nodes: [], tokensUsed: 0, truncated: false };
    const terms = tokenize(query);
    if (terms.length === 0) return { nodes: [], tokensUsed: 0, truncated: false };

    const candidates = [];
    for (const node of Object.values(graph.nodes)) {
        if (!isCurrentlyValid(node, now)) continue;
        const bm25 = bm25NodeScore(graph, node, terms);
        if (bm25 <= 0) continue;
        const score = bm25 * node.confidence * recencyDecay(node, now);
        candidates.push({ node, score });
    }
    candidates.sort((a, b) => b.score - a.score);

    const picked = [];
    const pickedIds = new Set();
    let tokensUsed = 0;
    let truncated = false;

    function tryAdd(node, score) {
        if (pickedIds.has(node.id)) return true;
        const cost = estimateTokens(node.text);
        if (tokensUsed + cost > budgetTokens) { truncated = true; return false; }
        picked.push({ ...node, score });
        pickedIds.add(node.id);
        tokensUsed += cost;
        return true;
    }

    const entryPoints = candidates.slice(0, topN);
    for (const { node, score } of entryPoints) {
        if (!tryAdd(node, score)) break;
    }

    // 1-hop expansion from the top 2 entry points along `references` edges —
    // pulls in directly-linked context even if it didn't score high alone.
    for (const { node } of entryPoints.slice(0, 2)) {
        if (truncated) break;
        const neighbors = graph.edges
            .filter(e => e.type === 'references' && e.from === node.id)
            .map(e => graph.nodes[e.to])
            .filter(n => n && isCurrentlyValid(n, now));
        for (const neighbor of neighbors) {
            if (!tryAdd(neighbor, 0)) break;
        }
    }

    return { nodes: picked, tokensUsed, truncated };
}

// --- Persistence (mirrors retrieval.js's cache-with-fingerprint pattern) --

function graphIndexPath(harnessDir) {
    return path.join(harnessDir, '.index', 'graph-index.json');
}

function saveGraph(harnessDir, graph) {
    const dir = path.dirname(graphIndexPath(harnessDir));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(graphIndexPath(harnessDir), JSON.stringify(graph));
}

function loadGraph(harnessDir, { rebuild = true } = {}) {
    let graph = null;
    try {
        graph = JSON.parse(fs.readFileSync(graphIndexPath(harnessDir), 'utf8'));
    } catch (e) {
        graph = null;
    }

    if (graph && graph.version === INDEX_VERSION && graph.fingerprint === fingerprint(harnessDir)) {
        return graph;
    }

    if (!rebuild) return graph;
    graph = buildGraph(harnessDir);
    saveGraph(harnessDir, graph);
    return graph;
}

module.exports = {
    INDEX_VERSION,
    TYPE_CONFIDENCE, TYPE_HALFLIFE_DAYS,
    classifyType, splitSections, extractWikilinks,
    buildGraph, queryGraph, recencyDecay, isCurrentlyValid, estimateTokens,
    graphIndexPath, saveGraph, loadGraph
};
