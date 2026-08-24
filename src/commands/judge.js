const fs = require('fs');
const { execSync } = require('child_process');
const { getHarnessDir, loadHarnessRC, withHarnessRCLock } = require('../utils/fileUtils.js');

/**
 * `harness judge <specId>` / `harness judge record ...` — hybrid,
 * deterministic self-assessment. harness-cli never calls an LLM itself:
 * `judge` builds a structured prompt (up to 3 enabled "must" rules + the
 * diff) for whichever agent is already in the session to answer;
 * `judge record` persists the verdict. `harness review`'s Guardian then
 * enforces it: a recorded `fail` blocks the gate, a selected-but-never-
 * judged rule warns — never silently treated as passing.
 */
function judge(cwd, args) {
    if (args[0] === 'record') {
        judgeRecord(cwd, args.slice(1));
        return;
    }
    printJudgePrompt(cwd, args);
}

function printJudgePrompt(cwd, args) {
    const specId = args[0];
    if (!specId) {
        console.log('❌ Usage: harness judge <specId>  (or: harness judge record <specId> --rule= --verdict=)');
        return;
    }

    const harnessDir = getHarnessDir(cwd);
    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    const rc = loadHarnessRC(cwd);
    const rules = selectJudgeRules(rc);
    if (rules.length === 0) {
        console.log('⚠️  No enabled "must" rules to judge. Add some: harness rules add "..." --severity=must');
        return;
    }

    console.log(`\n⚖️  JUDGE — spec ${specId}: self-assess ${rules.length} "must" rule(s) against the diff\n`);
    rules.forEach((r, i) => {
        console.log(`  ${i + 1}. [${r.id}] ${r.title}`);
        console.log(`     Does the diff below satisfy this rule? Record your answer:`);
        console.log(`       harness judge record ${specId} --rule=${r.id} --verdict=pass|fail|partial --note="why"`);
        console.log('');
    });

    console.log('--- DIFF ---');
    console.log(getDiffText(cwd));
    console.log('');

    return rules;
}

function selectJudgeRules(rc) {
    return (rc.rules || []).filter(r => r.enabled !== false && r.severity === 'must').slice(0, 3);
}

function getDiffText(cwd) {
    const run = (cmd) => {
        try { return execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch (e) { return ''; }
    };
    let diff = run('git diff HEAD') || run('git diff --staged') || run('git diff');
    if (!diff.trim()) return '(no diff available — not a git repo, no changes, or no commits yet)';
    const MAX = 4000;
    return diff.length > MAX ? diff.slice(0, MAX) + '\n… (truncated)' : diff;
}

function judgeRecord(cwd, args) {
    const specId = args[0];
    const ruleFlag = args.find(a => a.startsWith('--rule='));
    const verdictFlag = args.find(a => a.startsWith('--verdict='));
    const noteFlag = args.find(a => a.startsWith('--note='));

    if (!specId || !ruleFlag || !verdictFlag) {
        console.log('❌ Usage: harness judge record <specId> --rule=<id> --verdict=pass|fail|partial [--note="..."]');
        return;
    }

    const rule = ruleFlag.slice(7);
    const verdict = verdictFlag.slice(10);
    if (!['pass', 'fail', 'partial'].includes(verdict)) {
        console.log('❌ --verdict must be one of: pass, fail, partial');
        return;
    }
    const note = noteFlag ? noteFlag.slice(7) : '';

    let outcome;
    try {
        outcome = withHarnessRCLock(cwd, (rc) => {
            const spec = (rc.activeSpecs || []).find(s => s.id === specId);
            if (!spec) return { error: `Spec "${specId}" not found in active specs.` };
            spec.judgeVerdicts = spec.judgeVerdicts || [];
            spec.judgeVerdicts.push({
                rule, verdict, note,
                judgedAt: new Date().toISOString(),
                judgedBy: process.env.USER || process.env.USERNAME || 'unknown'
            });
            return { recorded: true };
        });
    } catch (e) {
        console.log(`❌ ${e.message}`);
        return;
    }

    if (outcome.error) { console.log(`❌ ${outcome.error}`); return; }
    console.log(`✅ Verdict recorded: [${rule}] ${verdict}${note ? ` — ${note}` : ''}`);
    if (verdict === 'fail') console.log('   ⚠️  This will FAIL the Guardian (harness review) until re-judged as pass.');
}

module.exports = { judge, judgeRecord, selectJudgeRules };
