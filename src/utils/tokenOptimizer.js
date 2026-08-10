const fs = require('fs');
const path = require('path');
const { loadIndex, search } = require('./retrieval.js');

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

function getOnDemandContext(harnessDir, query) {
    if (!query) return '';
    // BM25 retrieval over the whole vault (brain + specs + memory).
    // Falls back to a simple keyword scan when the index is unavailable.
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
