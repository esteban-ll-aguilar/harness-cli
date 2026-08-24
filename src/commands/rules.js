const fs = require('fs');
const path = require('path');
const { getHarnessDir, ensureDir, loadHarnessRC, writeHarnessRC, slugify, timestamp } = require('../utils/fileUtils.js');
const { PRESETS } = require('../data/default-rules.js');

/**
 * `harness rules` — manage project rules that ALWAYS apply.
 *
 *   harness rules list                Show constitution + project rules
 *   harness rules add <text>          Add a project rule (with severity)
 *   harness rules remove <id>         Disable a project rule
 *   harness rules sync                Regenerate the Rules section in AGENTS.md
 *
 * Rules are stored as Markdown in brain/rules/*.md and merged into AGENTS.md
 * so every AI tool follows them. The Guardian (`harness review`) checks them.
 */

const RULES_DIR = ['brain', 'rules'];

function rules(cwd, args) {
    const harnessDir = getHarnessDir(cwd);
    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    const sub = args[0];
    switch (sub) {
        case 'list':
        case 'ls':
            listRules(cwd, harnessDir);
            break;
        case 'add':
            addRule(cwd, harnessDir, args.slice(1));
            break;
        case 'remove':
        case 'rm':
            removeRule(cwd, harnessDir, args[1]);
            break;
        case 'sync':
            syncRules(cwd, harnessDir);
            console.log('✅ Rules synchronized into AGENTS.md');
            break;
        case 'check':
            checkRules(cwd, harnessDir);
            break;
        case 'preset':
            presetCmd(cwd, harnessDir, args.slice(1));
            break;
        default:
            console.log(`
📜 HARNESS RULES — rules that ALWAYS apply to every agent

  harness rules list                   Show all rules (constitution + project)
  harness rules add <text> [--severity=must/should] [--tag=...]
                                       Add a rule (auto-synced to AGENTS.md)
  harness rules remove <id>            Disable a rule by id
  harness rules preset [name]          Apply a curated rule pack (default: senior)
                                       Seeded automatically by \`harness init\`;
                                       run this to retrofit an existing project.
  harness rules sync                   Regenerate the Rules section in AGENTS.md
  harness rules check                  Verify rules are present and enforced

  Available presets: ${Object.keys(PRESETS).join(', ')}
`);
    }
}

function rulesDir(harnessDir) {
    return path.join(harnessDir, ...RULES_DIR);
}

function parseArgs(args) {
    const opts = { severity: 'must', tag: 'general' };
    const rest = [];
    for (const a of args) {
        if (a.startsWith('--severity=')) opts.severity = a.slice(11);
        else if (a.startsWith('--tag=')) opts.tag = a.slice(6);
        else rest.push(a);
    }
    opts.text = rest.join(' ').trim();
    return opts;
}

function addRule(cwd, harnessDir, args) {
    const { text, severity, tag } = parseArgs(args);
    if (!text) {
        console.log('❌ Usage: harness rules add "Every PR must include a test" [--severity=must] [--tag=testing]');
        return;
    }

    const dir = rulesDir(harnessDir);
    ensureDir(dir);

    const rc = loadHarnessRC(cwd);
    const rules = rc.rules || [];
    const id = slugify(text).slice(0, 40) || `rule-${rules.length + 1}`;
    const ts = timestamp();

    const file = path.join(dir, `${id}.md`);
    if (fs.existsSync(file)) {
        console.log(`⚠️  A rule with that name already exists: ${id}`);
        return;
    }

    const content = `---
id: ${id}
title: ${text}
severity: ${severity}
tag: ${tag}
enabled: true
created: ${ts}
---

# ${id}

- **Rule:** ${text}
- **Severity:** ${severity}
- **Tag:** ${tag}

## Rationale

_Add the "why" here so agents respect the rule._

## Enforcement

The Guardian checks this rule during \`harness review\`.
`;
    fs.writeFileSync(file, content);

    // Register in .harnessrc
    rules.push({ id, title: text, severity, tag, enabled: true, createdAt: ts });
    rc.rules = rules;
    require('../utils/fileUtils.js').writeHarnessRC(cwd, rc);

    syncRules(cwd, harnessDir);
    console.log(`✅ Rule added (${severity}/${tag}): ${text}`);
    console.log(`   ${path.join('.harness', ...RULES_DIR, id + '.md')}`);
}

/**
 * Apply a curated rule pack (see src/data/default-rules.js) to the project.
 * Idempotent: rules whose id is already present (by id, regardless of
 * enabled/disabled state) are skipped, so re-running after `harness rules
 * remove <id>` won't resurrect a rule the user deliberately disabled/removed.
 * Called automatically by `harness init` and available standalone via
 * `harness rules preset [name]` to retrofit an existing project.
 */
function applyPreset(cwd, harnessDir, presetName = 'senior') {
    const preset = PRESETS[presetName];
    if (!preset) {
        return { ok: false, error: `Unknown preset "${presetName}". Available: ${Object.keys(PRESETS).join(', ')}` };
    }

    const dir = rulesDir(harnessDir);
    ensureDir(dir);

    const rc = loadHarnessRC(cwd);
    const rules = rc.rules || [];
    const existingIds = new Set(rules.map(r => r.id));
    const ts = timestamp();

    let added = 0;
    for (const r of preset) {
        if (existingIds.has(r.id)) continue;

        const file = path.join(dir, `${r.id}.md`);
        const content = `---
id: ${r.id}
title: ${r.title}
severity: ${r.severity}
tag: ${r.tag}
enabled: true
created: ${ts}
preset: ${presetName}
---

# ${r.id}

- **Rule:** ${r.title}
- **Severity:** ${r.severity}
- **Tag:** ${r.tag}
- **Preset:** ${presetName}

## Rationale

${r.rationale}

## Enforcement

The Guardian checks this rule during \`harness review\`.
`;
        fs.writeFileSync(file, content);

        rules.push({ id: r.id, title: r.title, severity: r.severity, tag: r.tag, enabled: true, createdAt: ts, preset: presetName });
        existingIds.add(r.id);
        added++;
    }

    rc.rules = rules;
    writeHarnessRC(cwd, rc);
    if (added > 0) syncRules(cwd, harnessDir);

    return { ok: true, added, skipped: preset.length - added, total: preset.length };
}

function presetCmd(cwd, harnessDir, args) {
    const name = args[0] || 'senior';
    const result = applyPreset(cwd, harnessDir, name);
    if (!result.ok) {
        console.log(`❌ ${result.error}`);
        return;
    }
    console.log(`✅ Preset "${name}": ${result.added} rule(s) added, ${result.skipped} already present (${result.total} total in preset).`);
    if (result.added > 0) console.log('   Synced into AGENTS.md (brain + root). Run: harness rules list');
}

function removeRule(cwd, harnessDir, id) {
    if (!id) {
        console.log('❌ Usage: harness rules remove <id>');
        return;
    }
    const dir = rulesDir(harnessDir);
    const file = path.join(dir, `${id}.md`);
    const rc = loadHarnessRC(cwd);
    const rules = rc.rules || [];

    if (fs.existsSync(file)) {
        fs.rmSync(file, { force: true });
    }
    const remaining = rules.filter(r => r.id !== id);
    const removed = remaining.length !== rules.length;
    rc.rules = remaining;
    require('../utils/fileUtils.js').writeHarnessRC(cwd, rc);

    if (!removed) {
        console.log(`⚠️  Rule "${id}" not found. Run: harness rules list`);
        return;
    }
    syncRules(cwd, harnessDir);
    console.log(`✅ Rule removed: ${id}`);
}

function listRules(cwd, harnessDir) {
    const rc = loadHarnessRC(cwd);
    const projectRules = rc.rules || [];

    console.log(`
📜 PROJECT RULES — ${path.basename(cwd)}
${'─'.repeat(60)}`);
    if (projectRules.length === 0) {
        console.log('  (no project rules yet — add with: harness rules add "<text>")');
    }
    for (const r of projectRules) {
        if (r.enabled === false) {
            console.log(`  ✖️ [disabled] ${r.id} — ${r.title}`);
        } else {
            console.log(`  🔒 [${r.severity}] ${r.title}   (${r.tag})`);
        }
    }

    console.log(`
📕 CONSTITUTION (immutable) — brain/constitution.md
${'─'.repeat(60)}`);
    const constitutionPath = path.join(harnessDir, 'brain', 'constitution.md');
    if (fs.existsSync(constitutionPath)) {
        const lines = fs.readFileSync(constitutionPath, 'utf8').split('\n');
        const items = [];
        for (const line of lines) {
            const m = line.match(/^###?\s+(\d+(?:\.\d+)?)\s+[\u00C0-\uFFFF\w].*$/);
            if (m) items.push(line.trim().replace(/^#{2,3}\s+/, ''));
        }
        for (const it of items.slice(0, 20)) console.log(`  ⚖️  ${it}`);
        if (items.length > 20) console.log(`  … (+${items.length - 20} more sections)`);
    }
    console.log('');
}

function syncRules(cwd, harnessDir) {
    const rc = loadHarnessRC(cwd);
    const rules = (rc.rules || []).filter(r => r.enabled !== false);

    const section = [
        '',
        '## 13. Project Rules (harness rules)',
        '',
        'These rules are managed with `harness rules`. They apply to EVERY agent session:',
        ''
    ];
    for (const r of rules) {
        section.push(`- **${r.severity.toUpperCase()}** (${r.tag}): ${r.title}`);
    }
    if (rules.length === 0) {
        section.push('- _No project rules added yet. Use `harness rules add`._');
    }
    section.push('', '> Manage with `harness rules list | add | remove | sync`.');

    // Update .harness/brain/AGENTS.md and the root AGENTS.md copy
    const agentsPath = path.join(harnessDir, 'brain', 'AGENTS.md');
    const rootAgentsPath = path.join(cwd, 'AGENTS.md');
    for (const fp of [agentsPath, rootAgentsPath]) {
        if (!fs.existsSync(fp)) continue;
        let content = fs.readFileSync(fp, 'utf8');

        // 1. Drop any previous rules section
        content = content.replace(/\n## 13\. Project Rules[\s\S]*$/, '');

        // 2. Drop trailing autogenerated footer lines so we can re-append cleanly
        content = content.replace(/\n?\*Last updated:.*\*\n?/, '\n');
        content = content.replace(/\n?\*This file is maintained by the Harness system.*\*\n?/, '\n');
        content = content.replace(/\n+$/, '');

        // 3. Append rules section + footer
        content += '\n' + section.join('\n') + '\n';
        content += `\n*Last updated: ${new Date().toISOString().split('T')[0]}*\n*This file is maintained by the Harness system. Do not edit manually without ADR.*\n`;
        fs.writeFileSync(fp, content);
    }
}

function checkRules(cwd, harnessDir) {
    const rc = loadHarnessRC(cwd);
    const rules = (rc.rules || []).filter(r => r.enabled !== false);
    const agentsPath = path.join(harnessDir, 'brain', 'AGENTS.md');
    const rootAgentsPath = path.join(cwd, 'AGENTS.md');

    const agents = fs.existsSync(agentsPath) ? fs.readFileSync(agentsPath, 'utf8') : '';
    const root = fs.existsSync(rootAgentsPath) ? fs.readFileSync(rootAgentsPath, 'utf8') : '';

    let pass = 0, fail = 0;
    for (const r of rules) {
        const present = agents.includes(r.title) && root.includes(r.title);
        if (present) { pass++; } else { fail++; console.log(`  ❌ Rule not in AGENTS.md: ${r.title}`); }
    }
    console.log(`
📜 RULES CHECK — ${rules.length} enabled rules
   ✅ in AGENTS.md (brain + root): ${pass}
   ❌ missing: ${fail}`);
    return fail === 0;
}

module.exports = { rules, applyPreset };
