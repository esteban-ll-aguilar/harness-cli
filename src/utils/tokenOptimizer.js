const fs = require('fs');
const path = require('path');
const { loadIndex, search } = require('./retrieval.js');
const { loadGraph, queryGraph } = require('./graphIndex.js');
const { ContextBudget } = require('./contextBudget.js');
const { loadSemanticIndex, querySemanticIndex } = require('./semanticMemory.js');

/**
 * Tiered Memory Loader
 * Optimizes token usage by loading only what's needed per context.
 * Compatible with any AI tool.
 */

const TIERS = {
    ALWAYS: 'always',      // ~500 tokens — loaded every session
    ON_DEMAND: 'on_demand', // Search semantic — loaded when needed
    TRIGGER: 'trigger',    // ~200 tokens — loaded after tool use
    RARE: 'rare'           // Full file — only on explicit request
};

function getAlwaysContext(harnessDir, { budgetTokens = 250 } = {}) {
    const files = [
        'brain/AGENTS.md',
        'brain/constitution.md',
        'brain/north-star.md'
    ];
    const budget = new ContextBudget(budgetTokens, { working: 1 });
    for (const file of files) {
        const fp = path.join(harnessDir, file);
        if (fs.existsSync(fp)) {
            const full = fs.readFileSync(fp, 'utf8');
            const remaining = Math.max(0, budgetTokens - budget.used);
            if (remaining === 0) {
                budget.omitted.push({ id: file, source: file, reason: 'total-budget', estimatedTokens: estimateTokens(full) });
                continue;
            }
            const maxChars = remaining * 4;
            const text = full.length > maxChars ? `${full.slice(0, Math.max(0, maxChars - 80))}\n\n[Truncated — read ${file} for the complete source.]` : full;
            budget.add('working', { id: file, source: file, text });
        }
    }
    return budget.included.map(item => `--- ${item.source} ---\n${item.text}`).join('\n\n');
}

function getOnDemandContext(harnessDir, query, { budgetTokens = 600 } = {}) {
    if (!query) return '';

    // Semantic retrieval is optional at runtime but shared by every external
    // agent because it lives behind this one context entry point. It augments
    // (rather than replaces) the deterministic graph/BM25 evidence below.
    try {
        const semantic = loadSemanticIndex(harnessDir);
        if (semantic && semantic.documents?.length) {
            const hits = querySemanticIndex(harnessDir, query, { topN: 3 });
            if (hits.length) {
                const used = new Set();
                const selected = [];
                let remaining = budgetTokens;
                for (const hit of hits) {
                    if (used.has(hit.id)) continue;
                    const cost = estimateTokens(hit.text);
                    if (cost > remaining) continue;
                    used.add(hit.id); remaining -= cost;
                    selected.push(`--- ${hit.source} (semantic ${hit.score.toFixed(3)}) ---\n${hit.text}`);
                }
                if (selected.length) return selected.join('\n\n');
            }
        }
    } catch (e) {
        // A missing/corrupt local model must never block agent work; the
        // graph and lexical retrieval below remain deterministic fallbacks.
    }

    // Graph retrieval: section-level nodes ranked by BM25 x confidence x
    // recency, superseded/expired facts excluded, cut at an explicit token
    // budget — never dumps a whole file just because one section matched.
    const graph = loadGraph(harnessDir, { rebuild: true });
    if (graph && graph.numNodes > 0) {
        const { nodes } = queryGraph(graph, query, { budgetTokens });
        if (nodes.length > 0) {
            return nodes.map(n => {
                const label = n.heading ? `${n.file}#${n.heading}` : n.file;
                return `--- ${label} (${n.type}) ---\n${n.text}`;
            }).join('\n\n');
        }
    }

    // Fallback: whole-file BM25 (empty/no-heading vault, or graph build failed).
    const index = loadIndex(harnessDir, { rebuild: true });
    if (!index || index.numDocs === 0) return '';

    const hits = search(index, harnessDir, query, 3);
    if (hits.length === 0) return '';

    return hits.map(r => {
        let content = '';
        try { content = fs.readFileSync(path.join(harnessDir, r.rel), 'utf8'); } catch (e) {}
        return `--- ${r.rel} ---\n${content}`;
    }).join('\n\n');
}

function getTriggerContext(harnessDir, changedFile) {
    // Load related specs when a file changes
    if (changedFile.includes('specs/')) {
        const specDir = path.dirname(changedFile);
        const specFile = path.join(harnessDir, specDir, 'spec.md');
        if (fs.existsSync(specFile)) {
            return fs.readFileSync(specFile, 'utf8');
        }
    }
    return '';
}

function estimateTokens(text) {
    // Rough estimate: ~4 chars per token for English/Spanish
    return Math.ceil(text.length / 4);
}

function buildPrompt(harnessDir, tier, query = '', changedFile = '') {
    const parts = [];

    // Tier 1: Always
    const always = getAlwaysContext(harnessDir);
    parts.push(`[HARNESS CONTEXT - ALWAYS]\n${always}`);

    // Tier 2: On Demand
    if (tier === TIERS.ON_DEMAND && query) {
        const onDemand = getOnDemandContext(harnessDir, query);
        if (onDemand) {
            parts.push(`[HARNESS CONTEXT - ON DEMAND: "${query}"]\n${onDemand}`);
        }
    }

    // Tier 3: Trigger
    if (tier === TIERS.TRIGGER && changedFile) {
        const trigger = getTriggerContext(harnessDir, changedFile);
        if (trigger) {
            parts.push(`[HARNESS CONTEXT - TRIGGER: ${changedFile}]\n${trigger}`);
        }
    }

    const fullPrompt = parts.join('\n\n');
    const tokens = estimateTokens(fullPrompt);

    return {
        prompt: fullPrompt,
        tokens,
        tier
    };
}

module.exports = {
    TIERS, getAlwaysContext, getOnDemandContext,
    getTriggerContext, estimateTokens, buildPrompt
};
