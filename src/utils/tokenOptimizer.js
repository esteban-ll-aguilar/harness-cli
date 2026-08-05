const fs = require('fs');
const path = require('path');

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
    // Simple keyword-based retrieval. In production, use embeddings.
    const brainDir = path.join(harnessDir, 'brain');
    if (!fs.existsSync(brainDir)) return '';

    const results = [];
    function scan(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fp = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                scan(fp);
            } else if (entry.name.endsWith('.md')) {
                const content = fs.readFileSync(fp, 'utf8');
                const keywords = query.toLowerCase().split(/\s+/);
                const score = keywords.filter(k => content.toLowerCase().includes(k)).length;
                if (score > 0) {
                    results.push({ score, file: fp.replace(harnessDir + '/', ''), content });
                }
            }
        }
    }
    scan(brainDir);
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 3).map(r => `--- ${r.file} ---\n${r.content}`).join('\n\n');
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
