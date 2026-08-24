const fs = require('fs');
const os = require('os');
const path = require('path');
const { getHarnessDir, withHarnessRCLock, loadHarnessRC, timestamp } = require('../utils/fileUtils.js');

/**
 * `harness orchestrate` — coordination for running SEVERAL independent specs
 * of the same project across SEVERAL independent agent sessions at once.
 *
 * harness-cli never calls an LLM itself (zero dependencies, AI-client
 * agnostic by design). "Parallel automatic agent work" here means: make it
 * safe for N external agent sessions to divide up N specs without
 * colliding — a claim/release protocol on top of the same lock `advance.js`
 * uses, plus a status view an orchestrating session can read to decide what
 * to dispatch next.
 *
 *   harness orchestrate status                    List specs + claim state
 *   harness orchestrate claim <specId> [--owner=]  Reserve a spec (idempotent)
 *   harness orchestrate release <specId> [--owner=] Free a spec (idempotent)
 */

const STALE_CLAIM_MS = 2 * 60 * 60 * 1000; // 2 hours

function defaultOwner() {
    return `${os.hostname()}:${process.pid}`;
}

function orchestrate(cwd, args) {
    const harnessDir = getHarnessDir(cwd);
    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    const sub = args[0];
    switch (sub) {
        case 'status':
            statusCmd(cwd);
            break;
        case 'claim':
            claimCmd(cwd, harnessDir, args.slice(1));
            break;
        case 'release':
            releaseCmd(cwd, harnessDir, args.slice(1));
            break;
        default:
            console.log(`
🎛️  HARNESS ORCHESTRATE — coordinate parallel work across specs

  harness orchestrate status                     List specs + claim state
  harness orchestrate claim <specId> [--owner=]   Reserve a spec (idempotent)
  harness orchestrate release <specId> [--owner=] Free a spec (idempotent)

  Note: harness-cli never calls an LLM itself. This coordinates SEPARATE
  agent sessions (e.g. several Claude Code / Codex sessions) so each one
  can safely work a different, unclaimed spec at the same time.
`);
    }
}

function claimState(spec) {
    if (!spec.claimedBy) return { free: true };
    const ageMs = Date.now() - new Date(spec.claimedAt).getTime();
    return { free: false, stale: ageMs > STALE_CLAIM_MS, owner: spec.claimedBy, claimedAt: spec.claimedAt, ageMs };
}

function statusCmd(cwd) {
    const rc = loadHarnessRC(cwd);
    const specs = rc.activeSpecs || [];

    console.log(`\n🎛️  ORCHESTRATE STATUS — ${specs.length} active spec(s)`);
    console.log('─'.repeat(60));
    if (specs.length === 0) {
        console.log('  (no active specs)');
    }
    for (const spec of specs) {
        const cs = claimState(spec);
        const claim = cs.free ? 'free' : `claimed by ${cs.owner}${cs.stale ? ' (stale)' : ''} since ${cs.claimedAt}`;
        console.log(`  📌 ${spec.id} — ${spec.name}  [${spec.status || 'unknown'}]  → ${claim}`);
    }
    console.log('');
}

function claimCmd(cwd, harnessDir, args) {
    const specId = args[0];
    if (!specId) {
        console.log('❌ Usage: harness orchestrate claim <specId> [--owner=<name>]');
        return;
    }
    const ownerFlag = args.find(a => a.startsWith('--owner='));
    const owner = ownerFlag ? ownerFlag.slice(8) : defaultOwner();
    const ts = timestamp();

    let outcome;
    try {
        outcome = withHarnessRCLock(cwd, (rc) => {
            const spec = (rc.activeSpecs || []).find(s => s.id === specId);
            if (!spec) return { error: `Spec "${specId}" not found in active specs.` };

            const cs = claimState(spec);
            if (cs.free || cs.stale) {
                const stolen = !cs.free && cs.stale;
                spec.claimedBy = owner;
                spec.claimedAt = new Date().toISOString();
                return { claimed: true, stolen, previousOwner: stolen ? cs.owner : null };
            }
            if (cs.owner === owner) {
                return { claimed: true, alreadyOwn: true };
            }
            return { refused: true, owner: cs.owner, claimedAt: cs.claimedAt };
        });
    } catch (e) {
        console.log(`❌ ${e.message}`);
        return;
    }

    if (outcome.error) { console.log(`❌ ${outcome.error}`); return; }
    if (outcome.refused) {
        console.log(`🛑 Spec ${specId} is already claimed by ${outcome.owner} (since ${outcome.claimedAt}). Try another spec.`);
        return;
    }
    if (outcome.alreadyOwn) {
        console.log(`✅ Spec ${specId} is already claimed by you (${owner}). No change.`);
        return;
    }
    if (outcome.stolen) {
        console.log(`⚠️  Spec ${specId}'s claim by ${outcome.previousOwner} was stale — took it over as ${owner}.`);
        logClaimEvent(harnessDir, specId, 'claim-stolen', `${owner} took over a stale claim from ${outcome.previousOwner}`, ts);
        return;
    }
    console.log(`✅ Spec ${specId} claimed by ${owner}.`);
}

function releaseCmd(cwd, harnessDir, args) {
    const specId = args[0];
    if (!specId) {
        console.log('❌ Usage: harness orchestrate release <specId>');
        return;
    }

    let outcome;
    try {
        outcome = withHarnessRCLock(cwd, (rc) => {
            const spec = (rc.activeSpecs || []).find(s => s.id === specId);
            if (!spec) return { error: `Spec "${specId}" not found in active specs.` };
            if (!spec.claimedBy) return { alreadyFree: true };
            delete spec.claimedBy;
            delete spec.claimedAt;
            return { released: true };
        });
    } catch (e) {
        console.log(`❌ ${e.message}`);
        return;
    }

    if (outcome.error) { console.log(`❌ ${outcome.error}`); return; }
    if (outcome.alreadyFree) { console.log(`✅ Spec ${specId} was already free. No change.`); return; }
    console.log(`✅ Spec ${specId} released.`);
}

function logClaimEvent(harnessDir, specId, event, reason, ts) {
    const log = `---
date: ${ts}
agent: harness-cli
event: ${event}
spec: ${specId}
---

# ${event} — spec ${specId}

${reason}
`;
    fs.appendFileSync(
        path.join(harnessDir, 'memory', 'session-logs', `${event}-${specId}-${Date.now()}.md`),
        log
    );
}

module.exports = { orchestrate };
