const fs = require('fs');
const path = require('path');
const { loadIndex, search } = require('./retrieval.js');
const { loadGraph, queryGraph } = require('./graphIndex.js');

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

function getAlwaysContext(harnessDir) {
    const files = [
        'brain/AGENTS.md',
        'brain/constitution.md',
        'brain/north-star.md'
    ];
    const context = [];
    for (const file of files) {
        const fp = path.join(harnessDir, file);
        if (fs.existsSync(fp)) {
            context.push(`--- ${file} ---\n${fs.readFileSync(fp, 'utf8')}`);
        }
    }
    return context.join('\n\n');
}

function getOnDemandContext(harnessDir, query, { budgetTokens = 600 } = {}) {
    if (!query) return '';

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
