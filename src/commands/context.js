const fs = require('fs');
const path = require('path');
const { getHarnessDir, loadHarnessRC } = require('../utils/fileUtils.js');
const { buildPrompt, TIERS } = require('../utils/tokenOptimizer.js');

/**
 * `harness context` — dump the full optimized context bundle.
 * Give this to any AI tool to onboard it to the project instantly.
 *
 *   harness context                      ALWAYS tier + project state
 *   harness context --spec=<id>          + that spec's artifacts
 *   harness context --query=<text>       + BM25 retrieval from the vault
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
        else if (a.startsWith('--file=')) opts.file = a.slice(7);
    }

    const rc = loadHarnessRC(cwd);
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

    // 3. Spec context
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

    const bundle = parts.join('\n\n');
    const bundleTokens = Math.ceil(bundle.length / 4);

    if (opts.file) {
        fs.writeFileSync(opts.file, bundle);
        console.log(`📦 Context bundle written: ${opts.file}`);
        console.log(`   Tokens (est): ${bundleTokens}`);
        return;
    }

    console.log(`📦 HARNESS CONTEXT BUNDLE — ${tokens > 0 ? bundleTokens + ' tokens (est)' : ''}`);
    console.log('─'.repeat(60));
    console.log(bundle);
    console.log('─'.repeat(60));
    console.log('💡 Tip: harness context --query="auth" adds retrieval, --file=ctx.md writes to disk.');
}

module.exports = { context };
