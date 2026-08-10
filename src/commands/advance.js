const fs = require('fs');
const path = require('path');
const { getHarnessDir, loadHarnessRC, writeHarnessRC, timestamp } = require('../utils/fileUtils.js');

/**
 * `harness advance <specId>` — walk a spec through the 6-agent lifecycle.
 *
 *   harness advance 001              → next stage
 *   harness advance 001 --to=coder   → jump straight to a stage
 *   harness advance 001 --back       → previous stage
 *
 * Stages: interviewer → architect → tester → coder → reviewer → guardian → done
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
        step(cwd, harnessDir, rc, spec, -1);
        return;
    }

    step(cwd, harnessDir, rc, spec, 1);
}

function step(cwd, harnessDir, rc, spec, delta) {
    const agents = spec.agents || {};
    const doneCount = STAGES.filter(a => agents[a] === 'done').length;

    let affectedStage;
    if (delta > 0) {
        if (doneCount >= STAGES.length) {
            completeSpec(cwd, harnessDir, rc, spec);
            return;
        }
        const next = STAGES[doneCount];
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
    printState(spec);
}

function jumpTo(cwd, harnessDir, rc, spec, target) {
    const agents = spec.agents || {};
    const targetIdx = STAGES.indexOf(target);

    STAGES.forEach((stage, i) => {
        agents[stage] = i <= targetIdx ? 'done' : 'pending';
    });
    spec.status = STAGE_STATUS[target];
    spec.updatedAt = new Date().toISOString();

    writeHarnessRC(cwd, rc);
    logStage(cwd, harnessDir, spec, target);
    printState(spec);
}

function completeSpec(cwd, harnessDir, rc, spec) {
    rc.activeSpecs = (rc.activeSpecs || []).filter(s => s.id !== spec.id);
    rc.completedSpecs = rc.completedSpecs || [];
    rc.completedSpecs.push({ ...spec, status: 'done', completedAt: new Date().toISOString() });
    writeHarnessRC(cwd, rc);

    const log = `---
date: ${timestamp()}
agent: harness-cli
event: spec-completed
spec: ${spec.id}-${spec.slug}
---

# Spec Completed: ${spec.name}

All 6 agent stages passed. Spec moved to completedSpecs.
`;
    fs.appendFileSync(
        path.join(harnessDir, 'memory', 'session-logs', `complete-${spec.id}-${Date.now()}.md`),
        log
    );

    console.log(`🎉 Spec ${spec.id} (${spec.name}) COMPLETED. Moved to completed specs.`);
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
    const line = STAGES.map(s => agents[s] === 'done' ? `✅ ${s}` : `⏳ ${s}`).join(' → ');
    console.log(`\n📌 Spec ${spec.id} — ${spec.name}`);
    console.log(`   Status: ${spec.status}`);
    console.log(`   ${line}`);
    if (spec.status !== 'done') {
        const next = STAGES.find(s => agents[s] !== 'done');
        console.log(`\n🚀 Next stage: ${next}  (run: harness agent run ${next} ${spec.id})`);
    }
}

module.exports = { advance, STAGES };
