const fs = require('fs');
const path = require('path');
const { getHarnessDir, loadHarnessRC } = require('../utils/fileUtils.js');
const { buildPrompt, TIERS } = require('../utils/tokenOptimizer.js');
const { rulesForFile } = require('./rules.js');
const { getSymbolIndex, findSymbol, findReferences } = require('../utils/symbolIndex.js');

/**
 * `harness context` — THE single entry point an agent should call
 * automatically before/while working, instead of remembering to invoke
 * separate search/lookup commands by name. Bundles: the ALWAYS tier
 * (AGENTS.md — which already contains every project rule, so there's no
 * separate "list the rules" step), project state, optional BM25 retrieval,
 * optional symbol lookup, optional file-scoped rules, and optional spec
 * artifacts — all in one call.
 *
 *   harness context                      ALWAYS tier + project state
 *   harness context --spec=<id>          + that spec's artifacts
 *   harness context --query=<text>       + BM25 retrieval from the vault
 *   harness context --symbol=<name>      + where it's defined AND referenced
 *   harness context --for-file=<path>    + rules scoped to that file (--glob)
 *   harness context --file=<path>        write the bundle to a file
 */

function context(cwd, args) {
    const harnessDir = getHarnessDir(cwd);
    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    const opts = {};
    for (const a of args) {
        if (a.startsWith('--spec=')) opts.spec = a.slice(7);
        else if (a.startsWith('--query=')) opts.query = a.slice(8);
        else if (a.startsWith('--symbol=')) opts.symbol = a.slice(9);
        else if (a.startsWith('--for-file=')) opts.forFile = a.slice(11);
        else if (a.startsWith('--budget=')) opts.budget = parseInt(a.slice(9), 10);
        else if (a.startsWith('--receipt=')) opts.receipt = a.slice(10);
        else if (a.startsWith('--file=')) opts.file = a.slice(7);
    }

    const rc = loadHarnessRC(cwd);
    const budget = Number.isFinite(opts.budget) && opts.budget > 0
        ? opts.budget
        : (rc.quality?.contextBudgetTokens || 1200);
    const parts = [];

    // 1. Tiered base context
    const tier = opts.query ? TIERS.ON_DEMAND : TIERS.ALWAYS;
    const { prompt, tokens } = buildPrompt(harnessDir, tier, opts.query || '');
    if (prompt) parts.push(prompt);

    // 2. Project state summary
    const specsDir = path.join(harnessDir, 'specs');
    const specs = fs.existsSync(specsDir) ? fs.readdirSync(specsDir).filter(d => /^\d{3}-/.test(d)).sort() : [];
    const active = (rc.activeSpecs || []).map(s => `${s.id} ${s.name} [${s.status}]`).join('\n') || '(none)';

    parts.push(`--- PROJECT STATE (.harnessrc) ---
Project: ${rc.projectName || path.basename(cwd)}
Language: ${rc.language?.name || 'unknown'}
Monorepo: ${rc.isMonorepo ? 'yes' : 'no'}
Specs on disk: ${specs.length}
Active specs:
${active}
Agents: ${Object.keys(rc.agents || {}).join(', ') || 'default 6'}`);

    // 3. Rules scoped to a specific file
    if (opts.forFile) {
        const scoped = rulesForFile(rc, opts.forFile);
        const lines = scoped.length
            ? scoped.map(r => `- **${r.severity.toUpperCase()}** (${r.tag}${r.glob ? `, scope: ${r.glob}` : ''}): ${r.title}`)
            : ['(no rules apply to this file)'];
        parts.push(`--- RULES FOR ${opts.forFile} ---\n${lines.join('\n')}`);
    }

    // 4. Symbol lookup: where X is defined AND where it's used ("who calls
    // this" matters before touching/removing it — bundled in the same call
    // rather than a separate lookup an agent has to remember to make).
    if (opts.symbol) {
        const symIndex = getSymbolIndex(cwd, harnessDir);
        const { exact, partial } = findSymbol(symIndex, opts.symbol);
        const hits = exact.length ? exact : partial;
        const lines = hits.length
            ? hits.slice(0, 10).map(o => `- ${o.symbol || opts.symbol}  →  ${o.file}:${o.line} (${o.kind})`)
            : ['(no matching symbol found)'];

        if (exact.length > 0) {
            const refs = findReferences(cwd, opts.symbol, exact);
            lines.push('');
            lines.push(refs.length > 0
                ? `Referenced in ${refs.length} other place(s):`
                : 'No other references found (dead code, or only called dynamically).');
            for (const r of refs.slice(0, 15)) lines.push(`- ${r.file}:${r.line}`);
            if (refs.length > 15) lines.push(`… (+${refs.length - 15} more)`);
        }

        parts.push(`--- SYMBOL "${opts.symbol}" ---\n${lines.join('\n')}`);
    }

    // 5. Spec context
    if (opts.spec) {
        const dir = specs.find(s => s.startsWith(opts.spec));
        if (dir) {
            const specDir = path.join(specsDir, dir);
            for (const f of ['spec.md', 'plan.md', 'tasks.md']) {
                const fp = path.join(specDir, f);
                if (fs.existsSync(fp)) {
                    parts.push(`--- specs/${dir}/${f} ---\n${fs.readFileSync(fp, 'utf8')}`);
                }
            }
        }
    }

    const unboundedBundle = parts.join('\n\n');
    const rawTokens = Math.ceil(unboundedBundle.length / 4);
    const maxChars = budget * 4;
    const wasTrimmed = unboundedBundle.length > maxChars;
    const bundle = wasTrimmed
        ? `${unboundedBundle.slice(0, Math.max(0, maxChars - 160))}\n\n--- CONTEXT RECEIPT ---\nRemaining sections omitted because the ${budget}-token budget was exhausted. Use --spec, --query or --symbol to retrieve a narrower source.\n`
        : unboundedBundle;
    const bundleTokens = Math.ceil(bundle.length / 4);
    const receipt = {
        budgetTokens: budget,
        tokensUsed: bundleTokens,
        rawTokens,
        omitted: wasTrimmed ? [{ reason: 'total-budget', estimatedTokens: rawTokens - bundleTokens }] : []
    };

    if (opts.file) {
        fs.writeFileSync(opts.file, bundle);
        console.log(`📦 Context bundle written: ${opts.file}`);
        console.log(`   Tokens (est): ${bundleTokens}`);
        if (opts.receipt === 'json') console.log(JSON.stringify(receipt));
        return;
    }

    console.log(`📦 HARNESS CONTEXT BUNDLE — ${tokens > 0 ? bundleTokens + ' tokens (est)' : ''}`);
    console.log('─'.repeat(60));
    console.log(bundle);
    console.log('─'.repeat(60));
    if (opts.receipt === 'json') console.log(JSON.stringify(receipt, null, 2));
    else if (wasTrimmed) console.log(`⚠️  Context receipt: ${receipt.omitted[0].estimatedTokens} token(s) omitted to honor the ${budget}-token budget.`);
    console.log('💡 Tip: harness context --query="auth" adds retrieval, --file=ctx.md writes to disk.');
}

module.exports = { context };
