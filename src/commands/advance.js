const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getHarnessDir, loadHarnessRC, writeHarnessRC, timestamp, listFiles } = require('../utils/fileUtils.js');
const { detectAmbiguities } = require('../utils/ambiguityDetector.js');

/**
 * `harness advance <specId>` — walk a spec through the 6-agent lifecycle.
 *
 *   harness advance 001              → next stage
 *   harness advance 001 --to=coder   → jump to a stage (intermediate stages are
 *                                      recorded as OMITTED, not silently done)
 *   harness advance 001 --back       → previous stage
 *
 * Stages: interviewer → architect → tester → coder → reviewer → guardian → done
 *
 * Philosophy: the flow is followed by default. Skipping is ALLOWED but must be
 * explicit (`--to=`) and every omitted stage is logged with a timestamp so the
 * decision is auditable. A stage in `omitted` state is skipped automatically on
 * the next `advance`.
 *
 * When the tester stage completes, the BDD feature files are checked for real
 * Gherkin scenarios (no `[bracketed]` placeholders). If placeholders remain and
 * stdin is a TTY, the user is asked how to proceed.
 */

const STAGES = ['interviewer', 'architect', 'tester', 'coder', 'reviewer', 'guardian'];

const STAGE_STATUS = {
    interviewer: 'requirements',
    architect: 'spec-approved',
    tester: 'tests-written',
    coder: 'implemented',
    reviewer: 'reviewed',
    guardian: 'done'
};

function advance(cwd, args) {
    const specId = args[0];
    if (!specId) {
        console.log('❌ Usage: harness advance <specId> [--to=<agent>] [--back]');
        console.log('   Example: harness advance 001');
        console.log('   Stages: ' + STAGES.join(' → ') + ' → done');
        return;
    }

    const harnessDir = getHarnessDir(cwd);
    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    let rc;
    try {
        rc = loadHarnessRC(cwd);
    } catch (e) {
        console.error('❌ Error reading .harnessrc:', e.message);
        return;
    }

    const spec = (rc.activeSpecs || []).find(s => s.id === specId);
    if (!spec) {
        console.log(`❌ Spec "${specId}" not found in active specs. Run: harness status`);
        return;
    }

    const toFlag = args.find(a => a.startsWith('--to='));
    const back = args.includes('--back');
    const force = args.includes('--force');
    const to = toFlag ? toFlag.split('=')[1] : null;

    if (to) {
        if (!STAGES.includes(to)) {
            console.log(`❌ Unknown stage: ${to}. Valid: ${STAGES.join(', ')}`);
            return;
        }
        jumpTo(cwd, harnessDir, rc, spec, to);
        return;
    }

    if (back) {
        step(cwd, harnessDir, rc, spec, -1, { force });
        return;
    }

    step(cwd, harnessDir, rc, spec, 1, { force });
}

function step(cwd, harnessDir, rc, spec, delta, opts = {}) {
    const agents = spec.agents || {};
    const doneCount = STAGES.filter(a => agents[a] === 'done').length;
    const omitted = STAGES.filter(a => agents[a] === 'omitted');

    let affectedStage;
    if (delta > 0) {
        if (doneCount >= STAGES.length) {
            completeSpec(cwd, harnessDir, rc, spec, omitted);
            return;
        }
        // Next non-done, non-omitted stage (omitted ones are skipped automatically)
        const next = STAGES.find(s => agents[s] !== 'done' && agents[s] !== 'omitted');
        if (!next) {
            // Everything left is omitted → the flow is fully walked (with recorded omissions)
            completeSpec(cwd, harnessDir, rc, spec, omitted);
            return;
        }

        if (checkApprovalGate(rc, spec, next)) return;
        if (next === 'tester' && agents.architect === 'done' && checkClarifyGate(cwd, harnessDir, spec, opts)) return;

        agents[next] = 'done';
        spec.status = STAGE_STATUS[next];
        affectedStage = next;
    } else {
        if (doneCount <= 0) {
            console.log('🛑 Already at the first stage.');
            return;
        }
        const prev = STAGES[doneCount - 1];
        agents[prev] = 'pending';
        spec.status = doneCount - 1 === 0 ? 'spec-drafting' : STAGE_STATUS[STAGES[doneCount - 2]];
        affectedStage = prev;
    }

    spec.updatedAt = new Date().toISOString();
    writeHarnessRC(cwd, rc);
    logStage(cwd, harnessDir, spec, affectedStage);

    // BDD gate: when tester completes, verify real Gherkin scenarios
    if (affectedStage === 'tester') {
        const specDir = findSpecDir(harnessDir, spec.id);
        if (specDir) verifyBddScenarios(cwd, harnessDir, rc, spec, specDir);
    }

    printState(spec);
}

/**
 * True (and blocks) when `stage` is in `.harnessrc.quality.approvalGates`
 * (default `['architect']`) and hasn't been approved yet via
 * `harness gate approve <specId> --stage=<stage>`.
 */
function checkApprovalGate(rc, spec, stage) {
    const gates = rc.quality?.approvalGates || ['architect'];
    if (!gates.includes(stage)) return false;
    if (spec.approvals && spec.approvals[stage]) return false;

    console.log(`\n🛑 Approval required before "${stage}" can be marked done.`);
    console.log(`   Run: harness gate approve ${spec.id} --stage=${stage}\n`);
    return true;
}

/**
 * True (and blocks, unless --force) when the spec's spec.md still has
 * unresolved ambiguities right as the flow is about to move from architect
 * into tester. With --force, proceeds and logs the override.
 */
function checkClarifyGate(cwd, harnessDir, spec, opts) {
    const specDir = findSpecDir(harnessDir, spec.id);
    if (!specDir) return false;
    const specMdPath = path.join(specDir, 'spec.md');
    if (!fs.existsSync(specMdPath)) return false;

    const findings = detectAmbiguities(fs.readFileSync(specMdPath, 'utf8'));
    if (findings.length === 0) return false;

    if (opts.force) {
        logAmbiguityOverride(cwd, harnessDir, spec, findings);
        return false;
    }

    console.log(`\n🛑 Clarify gate: spec.md still has ${findings.length} unresolved area(s):\n`);
    findings.forEach(f => console.log('  ' + f));
    console.log(`\n   Fix spec.md, run \`harness gate clarify ${spec.id}\` to re-check, or override with:`);
    console.log(`   harness advance ${spec.id} --force   (logged as a conscious decision)\n`);
    return true;
}

function logAmbiguityOverride(cwd, harnessDir, spec, findings) {
    const log = `---
date: ${timestamp()}
agent: harness-cli
event: ambiguity-override
spec: ${spec.id}-${spec.slug}
---

# Clarify gate overridden — ${spec.name}

Advanced from architect to tester with \`--force\` despite ${findings.length}
unresolved ambiguity area(s):

${findings.map(f => `${f}`).join('\n')}

This is an explicit, recorded decision — not a silent skip.
`;
    fs.appendFileSync(
        path.join(harnessDir, 'memory', 'session-logs', `ambiguity-override-${spec.id}-${Date.now()}.md`),
        log
    );
}

/**
 * Jump directly to a stage. Stages that were not done and are not the target are
 * marked `omitted` — the omission is logged, so the flow stays auditable.
 */
function jumpTo(cwd, harnessDir, rc, spec, target) {
    const agents = spec.agents || {};
    const targetIdx = STAGES.indexOf(target);

    STAGES.forEach((stage, i) => {
        if (stage === target) agents[stage] = 'done';
        else if (agents[stage] === 'done') agents[stage] = 'done';
        else agents[stage] = 'omitted';
    });
    spec.status = STAGE_STATUS[target];
    spec.updatedAt = new Date().toISOString();

    const omittedStages = STAGES.filter(s => agents[s] === 'omitted');
    if (omittedStages.length > 0) {
        logOmission(cwd, harnessDir, spec, omittedStages, target);
    }

    writeHarnessRC(cwd, rc);
    logStage(cwd, harnessDir, spec, target);
    printState(spec);
}

function completeSpec(cwd, harnessDir, rc, spec, omitted) {
    rc.activeSpecs = (rc.activeSpecs || []).filter(s => s.id !== spec.id);
    rc.completedSpecs = rc.completedSpecs || [];
    rc.completedSpecs.push({ ...spec, status: 'done', completedAt: new Date().toISOString() });
    writeHarnessRC(cwd, rc);

    const omitNote = omitted.length > 0
        ? `\nOmitted stages: ${omitted.join(', ')} (see session logs for reasons)\n`
        : '\nAll 6 agent stages completed in order.\n';

    const log = `---
date: ${timestamp()}
agent: harness-cli
event: spec-completed
spec: ${spec.id}-${spec.slug}
---

# Spec Completed: ${spec.name}

${omitNote}
`;
    fs.appendFileSync(
        path.join(harnessDir, 'memory', 'session-logs', `complete-${spec.id}-${Date.now()}.md`),
        log
    );

    console.log(`🎉 Spec ${spec.id} (${spec.name}) COMPLETED. Moved to completed specs.`);
    if (omitted.length > 0) {
        console.log(`   ⏭️  Omitted: ${omitted.join(', ')} — decision logged in memory/session-logs/`);
    }
}

/**
 * Count real vs placeholder BDD scenarios in a spec's feature files.
 */
function countBddScenarios(specDir) {
    const featuresDir = path.join(specDir, 'features');
    if (!fs.existsSync(featuresDir)) return { real: 0, placeholder: 0, files: 0 };
    let real = 0, placeholder = 0, files = 0;
    for (const feat of fs.readdirSync(featuresDir).filter(f => f.endsWith('.feature'))) {
        const content = fs.readFileSync(path.join(featuresDir, feat), 'utf8');
        const scenarios = content.match(/^\s*(?:Scenario Outline|Scenario):\s+(.+)$/gm) || [];
        files++;
        for (const s of scenarios) {
            if (/\[/.test(s)) placeholder++;
            else real++;
        }
    }
    return { real, placeholder, files };
}

function findSpecDir(harnessDir, specId) {
    const specsDir = path.join(harnessDir, 'specs');
    if (!fs.existsSync(specsDir)) return null;
    const dirs = fs.readdirSync(specsDir).filter(d => /^\d{3}-/.test(d));
    const match = dirs.find(d => d === specId || d.startsWith(specId));
    return match ? path.join(specsDir, match) : null;
}

/**
 * After the tester stage, verify Gherkin scenarios are real. In a TTY, ask how
 * to proceed when placeholders remain; otherwise just warn.
 */
function verifyBddScenarios(cwd, harnessDir, rc, spec, specDir) {
    const { real, placeholder, files } = countBddScenarios(specDir);
    if (placeholder === 0) {
        if (real > 0) console.log(`   ✅ BDD: ${real} real Gherkin scenarios in ${files} feature file(s).`);
        else console.log('   ⚠️  BDD: no scenarios found in feature files.');
        return;
    }

    console.log(`\n   ⚠️  BDD: ${real} real scenarios, but ${placeholder} still have [bracketed] placeholders.`);

    if (!process.stdin.isTTY) {
        console.log('   (non-interactive) Recorded as pending — run `harness agent run tester <spec>` to complete them.');
        logOmission(cwd, harnessDir, spec, [`bdd-scenarios (${placeholder} placeholders)`], 'tester');
        return;
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = q => new Promise(res => rl.question(q, res));
    (async () => {
        console.log('');
        console.log('   What do you want to do?');
        console.log('   [1] Generar escenarios con el agente tester (harness agent run tester)');
        console.log('   [2] Los escribo yo manualmente');
        console.log('   [3] Omitir (registrar decisión)');
        try {
            const ans = (await ask('   → ')).trim();
            if (ans === '1') {
                console.log(`\n   📋 Ejecutá: harness agent run tester ${spec.id}`);
                console.log('   Luego corré: harness advance ' + spec.id);
            } else if (ans === '3') {
                logOmission(cwd, harnessDir, spec, [`bdd-scenarios (${placeholder} placeholders)`], 'tester');
                console.log('   ⏭️  Omission recorded in memory/session-logs/.');
            } else {
                console.log('   👌 Manually. Run: harness advance ' + spec.id + ' when done.');
            }
        } finally {
            rl.close();
        }
    })();
}

function logOmission(cwd, harnessDir, spec, stages, target) {
    const log = `---
date: ${timestamp()}
agent: harness-cli
event: stage-omitted
spec: ${spec.id}-${spec.slug}
skipped: ${stages.join(', ')}
target: ${target}
---

# Omission — ${spec.name}

Stages/artifacts **omitted** while advancing to \`${target}\`:

${stages.map(s => `- ${s}`).join('\n')}

This is an explicit, recorded decision. Re-run the omitted stage later if needed
(\`harness agent run <stage> ${spec.id}\`).
`;
    fs.appendFileSync(
        path.join(harnessDir, 'memory', 'session-logs', `omitted-${spec.id}-${Date.now()}.md`),
        log
    );
}

function logStage(cwd, harnessDir, spec, agent) {
    const log = `---
date: ${timestamp()}
agent: harness-cli
event: stage-advanced
spec: ${spec.id}-${spec.slug}
stage: ${agent}
status: ${spec.status}
---

# Stage ${agent} advanced — ${spec.name}

Spec ${spec.id} is now in stage **${agent}** (${spec.status}).
`;
    fs.appendFileSync(
        path.join(harnessDir, 'memory', 'session-logs', `stage-${spec.id}-${Date.now()}.md`),
        log
    );
}

function printState(spec) {
    const agents = spec.agents || {};
    const line = STAGES.map(s => agents[s] === 'done' ? `✅ ${s}` : agents[s] === 'omitted' ? `⏭️  ${s}` : `⏳ ${s}`).join(' → ');
    console.log(`\n📌 Spec ${spec.id} — ${spec.name}`);
    console.log(`   Status: ${spec.status}`);
    console.log(`   ${line}`);
    if (spec.status !== 'done') {
        const next = STAGES.find(s => agents[s] !== 'done' && agents[s] !== 'omitted');
        if (next) console.log(`\n🚀 Next stage: ${next}  (run: harness agent run ${next} ${spec.id})`);
    }
}

module.exports = { advance, STAGES, countBddScenarios };
