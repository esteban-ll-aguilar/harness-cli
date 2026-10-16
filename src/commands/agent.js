const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getHarnessDir, ensureDir, loadHarnessRC, writeHarnessRC, timestamp, slugify } = require('../utils/fileUtils.js');
const { buildPrompt, TIERS } = require('../utils/tokenOptimizer.js');
const { loadIndex, search } = require('../utils/retrieval.js');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

const AGENT_ORDER = ['interviewer', 'architect', 'tester', 'coder', 'backend-engineer', 'frontend-engineer', 'security-reviewer', 'reviewer', 'guardian', 'memory-steward'];

const DEFAULT_AGENTS = {
    interviewer: {
        emoji: '🎙️',
        model: 'capable',
        goal: 'Extract complete, unambiguous requirements from the stakeholder through structured questions.',
        instructions: 'Run an interactive requirement interview. Read brain/competencies/interviewer-script.md. Output a structured report to memory/session-logs/.'
    },
    architect: {
        emoji: '📐',
        model: 'capable',
        goal: 'Transform requirements into a formal EARS specification with plan.md and tasks.md.',
        instructions: 'Read the interview report + constitution + north-star. Write spec.md (EARS), plan.md and tasks.md. Get human approval before proceeding.'
    },
    tester: {
        emoji: '🧪',
        model: 'capable',
        goal: 'Author executable BDD scenarios and failing TDD tests BEFORE any implementation code.',
        instructions: 'Read spec.md + plan.md. Write features/*.feature and tests/*. All tests MUST fail before coding (Red phase).'
    },
    coder: {
        emoji: '💻',
        model: 'mid',
        goal: 'Implement the spec task by task following Red-Green-Refactor.',
        instructions: 'Read tasks.md + spec.md + tests/. Implement each task with TDD. Respect the constitution (max 200 lines/file, no any, parameterized SQL).'
    },
    'backend-engineer': {
        emoji: '⚙️', model: 'capable',
        goal: 'Implement and review service boundaries, data integrity and operational behavior.',
        instructions: 'Work as a supporting specialist for a claimed task. Define contracts first, validate inputs at boundaries, preserve authorization, use transactions/idempotency where relevant, and add unit plus integration tests. Submit durable findings to memory/inbox; do not promote them.'
    },
    'frontend-engineer': {
        emoji: '🖥️', model: 'capable',
        goal: 'Implement accessible, resilient user-facing flows from approved BDD scenarios.',
        instructions: 'Work as a supporting specialist for a claimed task. Cover loading, empty, error and success states; keyboard navigation, semantics, responsive behavior and API failure handling. Add component/E2E tests as appropriate and submit findings to memory/inbox.'
    },
    'security-reviewer': {
        emoji: '🔐', model: 'capable',
        goal: 'Review threat-sensitive changes before Guardian approval.',
        instructions: 'Check authentication, authorization, input/output handling, secrets, dependency risk and abuse controls. Report evidence and unresolved risks; do not silently approve an untested security property.'
    },
    reviewer: {
        emoji: '🔍',
        model: 'capable',
        goal: 'Verify the implementation matches every acceptance criterion in the spec.',
        instructions: 'Compare source against spec.md and features/. Check security issues. Output a review report to memory/session-logs/. If FAIL, return to coder with specific feedback.'
    },
    guardian: {
        emoji: '🛡️',
        model: 'fast',
        goal: 'Run the quality gates and block production unless everything passes.',
        instructions: 'Run lint, tests, coverage (>=80%), security scan. Output approval or failure report. If PASS, mark the spec as done.'
    },
    'memory-steward': {
        emoji: '🧠',
        model: 'fast',
        goal: 'Protect long-term project memory by validating, deduplicating and promoting provenance-bearing observations.',
        instructions: 'You are the sole durable-memory writer. Read memory/inbox/, validate source/evidence, process only with harness memory steward, and never invent or overwrite facts. Other agents submit observations; you publish receipts.'
    }
};

function getHarnessRC(cwd) {
    return loadHarnessRC(cwd);
}

function agent(cwd, args) {
    const harnessDir = getHarnessDir(cwd);
    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    const sub = args[0];
    switch (sub) {
        case 'list':
        case 'ls':
            listAgents(cwd);
            break;
        case 'new':
        case 'create':
            createAgent(cwd, args.slice(1));
            break;
        case 'run':
        case 'execute':
            runAgent(cwd, args.slice(1));
            break;
        case 'ensure':
            ensureAgents(cwd);
            break;
        default:
            console.log(`
🤖 HARNESS AGENTS — define and run AI agents

  harness agent list                       List all agents (built-in + custom)
  harness agent new <name>                 Create a new agent (interactive)
  harness agent new <name> --goal=... --instructions=... --model=...
                                           Create non-interactively
  harness agent run <name> [specId]        Build the full context prompt for an agent
  harness agent ensure                     Auto-create missing agent scripts

Each agent has a competency script in brain/competencies/<name>-script.md
and is registered in .harnessrc.agents.
`);
    }
}

function listAgents(cwd) {
    const rc = getHarnessRC(cwd);
    const agents = rc.agents || {};

    console.log(`
🤖 AGENT ROSTER — ${path.basename(cwd)}
${'─'.repeat(60)}`);

    for (const name of AGENT_ORDER) {
        const def = agents[name] || DEFAULT_AGENTS[name];
        if (!def) continue;
        const emoji = def.emoji || '🤖';
        const enabled = def.enabled !== false;
        const scriptExists = fs.existsSync(path.join(getHarnessDir(cwd), 'brain', 'competencies', `${name}-script.md`));
        console.log(`  ${emoji} ${name.padEnd(12)} ${enabled ? '✅' : '❌'}  ${scriptExists ? '📄 script' : '📄 (no script)'}  [${def.model || 'mid'}]`);
        if (def.goal) console.log(`      ↳ ${def.goal}`);
    }

    // Custom agents (not in the default order)
    const custom = Object.keys(agents).filter(a => !AGENT_ORDER.includes(a));
    if (custom.length > 0) {
        console.log(`\n${'─'.repeat(60)}`);
        console.log('CUSTOM AGENTS:');
        for (const name of custom) {
            const def = agents[name];
            console.log(`  🤖 ${name.padEnd(12)} ${def.enabled === false ? '❌' : '✅'}  [${def.model || 'mid'}]`);
            if (def.goal) console.log(`      ↳ ${def.goal}`);
        }
    }
    console.log('');
}

function createAgent(cwd, args) {
    const name = args[0];
    if (!name || name.startsWith('--')) {
        console.log('❌ Usage: harness agent new <name> [--goal=...] [--instructions=...] [--model=...]');
        return;
    }

    const slug = slugify(name);
    const opts = parseFlags(args.slice(1));

    let goal = opts.goal;
    let instructions = opts.instructions;
    let model = opts.model || 'mid';

    // Interactive fallback when flags are missing
    if (!goal || !instructions) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = q => new Promise(res => rl.question(q, res));
        (async () => {
            try {
                if (!goal) goal = await ask(`  🎯 Goal for "${slug}" (1 sentence): `);
                if (!instructions) instructions = await ask(`  📝 Instructions (what the agent must do): `);
            } finally {
                rl.close();
            }
            finishCreate(cwd, slug, { goal, instructions, model });
        })();
        return;
    }

    finishCreate(cwd, slug, { goal, instructions, model });
}

function finishCreate(cwd, slug, { goal, instructions, model }) {
    const harnessDir = getHarnessDir(cwd);
    const rc = getHarnessRC(cwd);

    // 1. Competency script
    const competenciesDir = path.join(harnessDir, 'brain', 'competencies');
    ensureDir(competenciesDir);
    const scriptPath = path.join(competenciesDir, `${slug}-script.md`);

    const templatePath = path.join(TEMPLATES_DIR, 'brain', 'competencies', 'agent-script-template.md');
    let template = 'INSTRUCTIONS_TEMPLATE_MISSING';
    if (fs.existsSync(templatePath)) {
        template = fs.readFileSync(templatePath, 'utf8');
    }
    const now = new Date().toISOString();
    const script = template
        .replace(/{{name}}/g, slug)
        .replace(/{{goal}}/g, goal)
        .replace(/{{instructions}}/g, instructions)
        .replace(/{{model}}/g, model)
        .replace(/{{date}}/g, now.split('T')[0])
        .replace(/{{timestamp}}/g, timestamp());

    // 2. Register in .harnessrc
    rc.agents = rc.agents || {};
    rc.agents[slug] = {
        enabled: true,
        model,
        goal,
        instructions,
        custom: true,
        createdAt: now
    };
    writeHarnessRC(cwd, rc);
    fs.writeFileSync(scriptPath, script);

    // 3. Sync into the OpenCode agent config so agents run there too
    syncOpenCodeConfig(harnessDir, slug, { goal, instructions, model });

    console.log(`
✅ Agent "${slug}" created and registered.

   📄 Script: brain/competencies/${slug}-script.md
   ⚙️  Config: .harnessrc → agents.${slug}
   🎯 Goal: ${goal}

Run it:      harness agent run ${slug}
List all:    harness agent list
`);
}

function runAgent(cwd, args) {
    const name = args[0];
    const specId = args[1];
    if (!name) {
        console.log('❌ Usage: harness agent run <name> [specId]');
        console.log('   Example: harness agent run architect 001');
        return;
    }

    const harnessDir = getHarnessDir(cwd);
    const rc = getHarnessRC(cwd);
    const registered = (rc.agents || {})[name];
    const def = { ...(DEFAULT_AGENTS[name] || {}), ...(registered || {}) };

    if (!def.goal) {
        console.log(`❌ Agent "${name}" not found. Run: harness agent list`);
        return;
    }

    // Agent competency script
    const scriptPath = path.join(harnessDir, 'brain', 'competencies', `${name}-script.md`);
    const script = fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, 'utf8') : '';

    // Base tiered context
    const { prompt: base } = buildPrompt(harnessDir, TIERS.ON_DEMAND, def.goal || name);

    // Relevant memory from the RAG index (ADRs, rules, prior specs, session logs)
    let memoryContext = '';
    try {
        const index = loadIndex(harnessDir, { rebuild: false });
        if (index && index.numDocs > 0) {
            const query = [def.goal, specId ? `spec ${specId}` : '', name].filter(Boolean).join(' ');
            const hits = search(index, harnessDir, query, 4);
            if (hits.length > 0) {
                memoryContext = hits
                    .map(h => `--- ${h.rel} ---\n${h.snippet}\n`)
                    .join('\n');
            }
        }
    } catch (e) {
        memoryContext = '';
    }

    // Spec context
    let specContext = '';
    if (specId) {
        const specDir = path.join(harnessDir, 'specs');
        const specs = fs.existsSync(specDir) ? fs.readdirSync(specDir).filter(d => d.startsWith(specId)) : [];
        if (specs.length > 0) {
            const dir = path.join(specDir, specs[0]);
            for (const f of ['spec.md', 'plan.md', 'tasks.md']) {
                const fp = path.join(dir, f);
                if (fs.existsSync(fp)) {
                    specContext += `--- ${path.join('specs', specs[0], f)} ---\n${fs.readFileSync(fp, 'utf8')}\n\n`;
                }
            }
            const featuresDir = path.join(dir, 'features');
            if (fs.existsSync(featuresDir)) {
                for (const feat of fs.readdirSync(featuresDir).filter(f => f.endsWith('.feature'))) {
                    specContext += `--- ${path.join('specs', specs[0], 'features', feat)} ---\n${fs.readFileSync(path.join(featuresDir, feat), 'utf8')}\n\n`;
                }
            }
        }
    }

    const prompt = [
        `# AGENT: ${name} (${def.model || 'mid'})`,
        '',
        `## ROLE — ${def.goal}`,
        '',
        `## MANDATE`,
        instructionsText(def),
        '',
        '## NON-NEGOTIABLE WORKFLOW',
        'Before editing: run `harness work start ' + (specId || '<specId>') + '`. Follow SDD → BDD → Red → Green → Refactor. For every normative REQ, preserve @covers evidence and add a hostile/adversarial test (malformed DTO, wrong type, authorization, boundary, replay or concurrency as applicable). Do not claim completion without exact test output and a completion receipt. Submit reusable evidence to memory/inbox; only Memory Steward promotes it.',
        '',
        '## COMPETENCY SCRIPT',
        script || '(none — follow the mandate)',
        '',
        specContext ? '## SPEC CONTEXT\n' + specContext : '',
        memoryContext ? '## RELEVANT MEMORY (from the .harness vault)\n' + memoryContext : '',
        '## PROJECT CONTEXT (tiered)',
        base
    ].filter(s => s !== '').join('\n');

    const tokens = Math.ceil(prompt.length / 4);
    console.log(`🤖 AGENT PROMPT READY — ${name}${specId ? ' (spec ' + specId + ')' : ''}`);
    console.log(`   Tokens (est): ${tokens}`);
    if (memoryContext) console.log(`   🧠 Relevant memory injected: ${(memoryContext.match(/^--- .+? ---/gm) || []).length} doc(s)`);
    console.log(`   Copy this prompt into your AI tool, or write it to a file:\n`);
    console.log('─'.repeat(60));
    console.log(prompt);
    console.log('─'.repeat(60));
}

function instructionsText(def) {
    if (def.instructions) return def.instructions;
    return 'Execute the competency script to the best of your ability. Follow the constitution and the spec.';
}

function ensureAgents(cwd) {
    const harnessDir = getHarnessDir(cwd);
    const rc = getHarnessRC(cwd);
    rc.agents = rc.agents || {};

    let created = 0;
    for (const name of AGENT_ORDER) {
        const def = rc.agents[name] || DEFAULT_AGENTS[name];
        if (!def) continue;
        if (!rc.agents[name]) {
            rc.agents[name] = { enabled: true, model: def.model, goal: def.goal, instructions: def.instructions, builtin: true };
            created++;
        }
        // Auto-generate missing competency scripts
        const scriptPath = path.join(harnessDir, 'brain', 'competencies', `${name}-script.md`);
        if (!fs.existsSync(scriptPath)) {
            const template = path.join(TEMPLATES_DIR, 'brain', 'competencies', `${name}-script.md`);
            const fallback = path.join(TEMPLATES_DIR, 'brain', 'competencies', 'agent-script-template.md');
            const src = fs.existsSync(template) ? template : fallback;
            const vars = { name, goal: def.goal, instructions: def.instructions, model: def.model, date: new Date().toISOString().split('T')[0] };
            const content = fs.readFileSync(src, 'utf8')
                .replace(/{{name}}/g, vars.name)
                .replace(/{{goal}}/g, vars.goal)
                .replace(/{{instructions}}/g, vars.instructions)
                .replace(/{{model}}/g, vars.model)
                .replace(/{{date}}/g, vars.date);
            fs.writeFileSync(scriptPath, content);
            created++;
        }
    }
    writeHarnessRC(cwd, rc);
    console.log(`✅ Agents ensured: ${AGENT_ORDER.length} registered, ${created} scripts auto-generated.`);
}

function syncOpenCodeConfig(harnessDir, name, { goal, instructions, model }) {
    const cfgPath = path.join(harnessDir, '.opencode', 'opencode-config.json');
    if (!fs.existsSync(cfgPath)) return;
    try {
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        cfg.agents = cfg.agents || {};
        cfg.agents[name] = {
            prompt: `${goal} ${instructions}`,
            model: model || 'local-llm'
        };
        fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
    } catch (e) {
        // Don't fail the command if the OpenCode config is malformed
    }
}

function parseFlags(args) {
    const opts = {};
    for (const a of args) {
        if (a.startsWith('--goal=')) opts.goal = a.slice(7);
        else if (a.startsWith('--instructions=')) opts.instructions = a.slice(15);
        else if (a.startsWith('--model=')) opts.model = a.slice(8);
    }
    return opts;
}

module.exports = { agent, ensureAgents, AGENT_ORDER, DEFAULT_AGENTS };
