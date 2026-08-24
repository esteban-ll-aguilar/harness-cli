const fs = require('fs');
const path = require('path');
const { getHarnessDir, withHarnessRCLock, timestamp } = require('../utils/fileUtils.js');
const { STAGES } = require('./advance.js');

/**
 * `harness gate approve <specId> [--stage=<stage>]` — record explicit human
 * approval for a stage. `harness advance` refuses to mark a stage listed in
 * `.harnessrc.quality.approvalGates` (default `['architect']`) as done until
 * it has been approved. Idempotent: re-approving an already-approved stage
 * is a no-op success (no duplicate log entry).
 */
function approve(cwd, args) {
    const specId = args[0];
    if (!specId) {
        console.log('❌ Usage: harness gate approve <specId> [--stage=<stage>]');
        return;
    }

    const harnessDir = getHarnessDir(cwd);
    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    const stageFlag = args.find(a => a.startsWith('--stage='));
    const ts = timestamp();

    let outcome;
    try {
        outcome = withHarnessRCLock(cwd, (rc) => {
            const spec = (rc.activeSpecs || []).find(s => s.id === specId);
            if (!spec) return { error: `Spec "${specId}" not found in active specs. Run: harness status` };

            const gates = rc.quality?.approvalGates || ['architect'];
            const stage = stageFlag ? stageFlag.slice(8) : gates[0];
            if (!STAGES.includes(stage)) {
                return { error: `Unknown stage: ${stage}. Valid: ${STAGES.join(', ')}` };
            }

            spec.approvals = spec.approvals || {};
            if (spec.approvals[stage]) {
                return { alreadyApproved: true, stage, approvedAt: spec.approvals[stage].approvedAt };
            }

            spec.approvals[stage] = { approvedAt: new Date().toISOString(), approvedBy: process.env.USER || process.env.USERNAME || 'unknown' };
            return { approved: true, stage };
        });
    } catch (e) {
        console.log(`❌ ${e.message}`);
        return;
    }

    if (outcome.error) {
        console.log(`❌ ${outcome.error}`);
        return;
    }

    if (outcome.alreadyApproved) {
        console.log(`✅ "${outcome.stage}" was already approved (at ${outcome.approvedAt}). No change.`);
        return;
    }

    console.log(`✅ "${outcome.stage}" approved for spec ${specId}.`);
    logApproval(cwd, harnessDir, specId, outcome.stage, ts);
    console.log(`   Run: harness advance ${specId}`);
}

function logApproval(cwd, harnessDir, specId, stage, ts) {
    const log = `---
date: ${ts}
agent: harness-cli
event: stage-approved
spec: ${specId}
stage: ${stage}
---

# Approval — spec ${specId}

Stage **${stage}** was explicitly approved by a human before advancing past it.
`;
    fs.appendFileSync(
        path.join(harnessDir, 'memory', 'session-logs', `approved-${specId}-${Date.now()}.md`),
        log
    );
}

module.exports = { approve };
