const fs = require('fs');
const path = require('path');
const { getHarnessDir, loadHarnessRC, timestamp } = require('../utils/fileUtils.js');
const { runTests, findSpecDir } = require('../utils/testRunner.js');
const { getLanguageConfig } = require('../utils/languageDetector.js');

/**
 * `harness test <specId>` — execute the spec's tests for real.
 *
 *   harness test 001                  → run tests for spec 001
 *   harness test 001 --cmd="npm test" → override the command
 *   harness test 001 --skip           → record an explicit omission (no run)
 *
 * The whole point: the flow's gates should be backed by ACTUAL test results,
 * not by "the file exists". Skipping is allowed but must be explicit.
 */

function testCmd(cwd, args) {
    const specId = args[0];
    const harnessDir = getHarnessDir(cwd);
    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    const cmdFlag = args.find(a => a.startsWith('--cmd='));
    const cmd = cmdFlag ? cmdFlag.split('=').slice(1).join('=') : null;
    const skip = args.includes('--skip');

    if (!specId) {
        console.log('❌ Usage: harness test <specId> [--cmd=<command>] [--skip]');
        console.log('   Example: harness test 001');
        console.log('   --skip records an explicit "tests not applicable" decision.');
        return;
    }

    let rc;
    try { rc = loadHarnessRC(cwd); } catch (e) {
        console.error('❌ Error reading .harnessrc:', e.message);
        return;
    }

    const spec = (rc.activeSpecs || []).find(s => s.id === specId);
    if (!spec) {
        console.log(`❌ Spec "${specId}" not found in active specs. Run: harness status`);
        return;
    }

    const specDir = findSpecDir(harnessDir, specId);
    if (!specDir) {
        console.log(`❌ Spec dir for "${specId}" not found.`);
        return;
    }

    const langConfig = getLanguageConfig(spec.language || rc.language?.detected || 'typescript');

    if (skip) {
        logDecision(cwd, harnessDir, spec, 'tests-skipped',
            `Tests intentionally skipped for spec ${specId} (${spec.name}).`);
        console.log(`⏭️  Tests SKIPPED for spec ${specId} (${spec.name}).`);
        console.log(`   Omisión registrada en memory/session-logs/`);
        return;
    }

    console.log(`🧪 Running tests for spec ${specId} (${spec.name})...`);
    console.log(`   Language: ${langConfig.name} · Framework: ${langConfig.testFramework}`);
    console.log(`   Command:  ${cmd ? cmd : '(auto-detect)'}`);
    console.log('');

    const result = runTests(cwd, specDir, langConfig, { cmd });

    console.log('─'.repeat(60));

    if (!result.runnable) {
        console.log(`⚠️  Tests NOT runnable here: ${result.reason}`);
        console.log(`   Command tried: ${result.command}`);
        console.log(`   Use --cmd=<command> to wire your own runner, or --skip to record an omission.`);
        logDecision(cwd, harnessDir, spec, 'tests-not-runnable', result.reason);
        return;
    }

    if (result.ok) {
        console.log(`✅ TESTS PASSED (${result.passed} passed${result.failed ? `, ${result.failed} failed` : ''})`);
        console.log(`   Command: ${result.command}`);
        logResult(cwd, harnessDir, spec, result, 'pass');
    } else {
        console.log(`❌ TESTS FAILED (${result.failed} failed${result.passed ? `, ${result.passed} passed` : ''})`);
        console.log(`   Command: ${result.command}`);
        console.log('');
        const tail = (result.output || '').split('\n').filter(l => l.trim()).slice(-15).join('\n');
        if (tail) console.log(tail.slice(0, 2000));
        logResult(cwd, harnessDir, spec, result, 'fail');
        process.exit(1);
    }
}

function logResult(cwd, harnessDir, spec, result, verdict) {
    const log = `---
date: ${timestamp()}
agent: harness-cli
event: tests-${verdict}
spec: ${spec.id}-${spec.slug}
---

# Tests ${verdict === 'pass' ? 'PASSED' : 'FAILED'} — ${spec.name}

- Command: \`${result.command}\`
- Passed: ${result.passed}
- Failed: ${result.failed}
${result.output ? '\n## Output\n\n```\n' + result.output.slice(0, 1500) + '\n```\n' : ''}
`;
    fs.appendFileSync(
        path.join(harnessDir, 'memory', 'session-logs', `tests-${spec.id}-${Date.now()}.md`),
        log
    );
}

function logDecision(cwd, harnessDir, spec, event, reason) {
    const log = `---
date: ${timestamp()}
agent: harness-cli
event: ${event}
spec: ${spec.id}-${spec.slug}
---

# Decision — ${spec.name}

${reason}
`;
    fs.appendFileSync(
        path.join(harnessDir, 'memory', 'session-logs', `${event}-${spec.id}-${Date.now()}.md`),
        log
    );
}

module.exports = { testCmd };
