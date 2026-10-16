const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getHarnessDir, loadHarnessRC, listFiles, timestamp } = require('../utils/fileUtils.js');
const { runTests, findSpecDir } = require('../utils/testRunner.js');
const { getLanguageConfig } = require('../utils/languageDetector.js');

function review(cwd, args) {
    const specId = args[0];
    const harnessDir = getHarnessDir(cwd);
    const skipTests = args.includes('--skip-tests');
    const cmdFlag = args.find(a => a.startsWith('--cmd='));
    const cmd = cmdFlag ? cmdFlag.split('=').slice(1).join('=') : null;
    let rc;

    try {
        rc = loadHarnessRC(cwd);
    } catch (e) {
        console.error('❌ Error reading .harnessrc:', e.message);
        return;
    }

    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  🔍 HARNESS GUARDIAN REVIEW                                         ║
╠══════════════════════════════════════════════════════════════════════╣
`);

    const checks = [];

    // Check 1: Constitution compliance
    try {
        const constitutionPath = path.join(harnessDir, 'brain', 'constitution.md');
        checks.push({
            name: 'Constitution exists',
            status: fs.existsSync(constitutionPath) ? 'PASS' : 'FAIL'
        });
    } catch (e) {
        checks.push({ name: 'Constitution exists', status: 'ERROR' });
    }

    // Check 2: AGENTS.md in root
    checks.push({
        name: 'AGENTS.md in root',
        status: fs.existsSync(path.join(cwd, 'AGENTS.md')) ? 'PASS' : 'FAIL'
    });

    // Check 3: Specs have required files
    const specsDir = path.join(harnessDir, 'specs');
    if (fs.existsSync(specsDir)) {
        try {
            const specs = fs.readdirSync(specsDir).filter(d => /^\d{3}-/.test(d));
            let specChecks = 0;
            for (const spec of specs) {
                const specPath = path.join(specsDir, spec, 'spec.md');
                const planPath = path.join(specsDir, spec, 'plan.md');
                const tasksPath = path.join(specsDir, spec, 'tasks.md');
                if (fs.existsSync(specPath) && fs.existsSync(planPath) && fs.existsSync(tasksPath)) {
                    specChecks++;
                }
            }
            checks.push({
                name: `Specs complete (${specChecks}/${specs.length})`,
                status: specChecks === specs.length && specs.length > 0 ? 'PASS' : 'WARN'
            });
        } catch (e) {
            checks.push({ name: 'Specs complete', status: 'ERROR' });
        }
    } else {
        checks.push({ name: 'Specs complete (0/0)', status: 'WARN' });
    }

    // Check 4: BDD features have REAL scenarios (not template placeholders)
    if (fs.existsSync(specsDir)) {
        try {
            const specs = fs.readdirSync(specsDir).filter(d => /^\d{3}-/.test(d));
            const active = specId ? specs.filter(d => d.startsWith(specId)) : specs;
            let realCount = 0, placeholderCount = 0, checked = 0;
            for (const spec of specs) {
                const featuresDir = path.join(specsDir, spec, 'features');
                if (!fs.existsSync(featuresDir)) continue;
                for (const feat of fs.readdirSync(featuresDir).filter(f => f.endsWith('.feature'))) {
                    const content = fs.readFileSync(path.join(featuresDir, feat), 'utf8');
                    const scenarios = content.match(/^\s*(?:Scenario Outline|Scenario):\s+(.+)$/gm) || [];
                    checked++;
                    for (const s of scenarios) {
                        if (/\[/.test(s)) placeholderCount++;
                        else realCount++;
                    }
                }
            }
            const total = realCount + placeholderCount;
            const status = total === 0 ? 'WARN'
                : placeholderCount === 0 ? 'PASS'
                : 'WARN';
            checks.push({
                name: `BDD scenarios (${realCount} real / ${total}${placeholderCount ? `, ${placeholderCount} placeholder` : ''})`,
                status,
                hint: placeholderCount > 0 ? `Replace [bracketed] placeholders in ${active.length} spec(s) with real Gherkin. Run: harness agent run tester ${specId || '<spec>'}` : ''
            });
        } catch (e) {
            checks.push({ name: 'BDD scenarios', status: 'ERROR' });
        }
    }

    // Check 5: Tests exist
    const testsDir = path.join(harnessDir, 'tests');
    if (fs.existsSync(testsDir)) {
        try {
            const hasTests = listFiles(testsDir).some(f => {
                return (f.endsWith('.test.js') || f.endsWith('.spec.js') || f.endsWith('_test.py') || 
                        f.endsWith('_test.go') || f.endsWith('_test.dart') || f.endsWith('Test.java'));
            });
            checks.push({
                name: 'Test artifacts present',
                status: hasTests ? 'PASS' : 'WARN'
            });
        } catch (e) {
            checks.push({ name: 'Test artifacts', status: 'ERROR' });
        }
    }

    // Check 6: Tests actually RUN and PASS (the real TDD gate)
    const runCheck = runTestsGate(cwd, harnessDir, rc, specId, { skipTests, cmd });
    checks.push(runCheck);

    // Check 7: ADRs for decisions
    const decisionsDir = path.join(harnessDir, 'brain', 'decisions');
    if (fs.existsSync(decisionsDir)) {
        try {
            const adrs = fs.readdirSync(decisionsDir).filter(f => f.endsWith('.md'));
            checks.push({
                name: `ADRs documented (${adrs.length})`,
                status: adrs.length > 0 ? 'PASS' : rc.quality?.requireAdr ? 'FAIL' : 'WARN'
            });
        } catch (e) {
            checks.push({ name: 'ADRs documented', status: 'ERROR' });
        }
    }

    // Check 8: Spec drift — files touched outside what tasks.md described
    const driftCheckResult = specDriftCheck(cwd, harnessDir, rc, specId);
    if (driftCheckResult) checks.push(driftCheckResult);

    // Check 9: Guardian self-judge — recorded verdicts on judge-selected "must" rules
    const judgeCheckResult = judgeCheck(rc, specId);
    if (judgeCheckResult) checks.push(judgeCheckResult);

    // Check 10: Project rules synced into AGENTS.md
    const projectRules = (rc.rules || []).filter(r => r.enabled !== false);
    if (projectRules.length > 0) {
        let synced = 0;
        const agentsContent = fs.existsSync(path.join(harnessDir, 'brain', 'AGENTS.md'))
            ? fs.readFileSync(path.join(harnessDir, 'brain', 'AGENTS.md'), 'utf8') : '';
        for (const r of projectRules) {
            if (agentsContent.includes(r.title)) synced++;
        }
        checks.push({
            name: `Project rules in AGENTS.md (${synced}/${projectRules.length})`,
            status: synced === projectRules.length ? 'PASS' : 'FAIL'
        });
    } else {
        checks.push({ name: 'Project rules (none configured)', status: 'WARN' });
    }

    // Check 11: traceability debt is never silently promoted to coverage.
    const overrides = rc.quality?.traceabilityOverrides || [];
    const expiredOverrides = overrides.filter(o => Date.parse(o.expiresAt) <= Date.now());
    const activeOverrides = overrides.filter(o => Date.parse(o.expiresAt) > Date.now());
    checks.push({
        name: `Traceability overrides (${activeOverrides.length} active, ${expiredOverrides.length} expired)`,
        status: expiredOverrides.length ? 'FAIL' : activeOverrides.length ? 'WARN' : 'PASS',
        hint: activeOverrides.length ? 'Overrides are visible debt and do not count as requirement coverage.' : ''
    });

    // Print results
    for (const check of checks) {
        const icon = check.status === 'PASS' ? '✅' : check.status === 'FAIL' ? '❌' : check.status === 'ERROR' ? '💥' : '⚠️';
        console.log(`  ${icon} ${check.name}`);
        if (check.hint) console.log(`      ↳ ${check.hint}`);
    }

    const failures = checks.filter(c => c.status === 'FAIL').length;
    const errors = checks.filter(c => c.status === 'ERROR').length;
    const warnings = checks.filter(c => c.status === 'WARN').length;

    console.log(`
╠══════════════════════════════════════════════════════════════════════╣
║  RESULT: ${failures === 0 && errors === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} FAILURES, ${errors} ERRORS, ${warnings} WARNINGS`}                      ║
╚══════════════════════════════════════════════════════════════════════╝
`);

    if (failures > 0 || errors > 0) {
        console.log('🛠️  Fix failures/errors before proceeding to production.');
        process.exit(1);
    }
}

function runTestsGate(cwd, harnessDir, rc, specId, { skipTests, cmd }) {
    const specs = (rc.activeSpecs || []).filter(s => !specId || s.id === specId);
    if (specs.length === 0) {
        return { name: 'Tests executed', status: 'WARN', hint: 'No active specs to test.' };
    }

    if (skipTests) {
        logDecision(cwd, harnessDir, specs, 'tests-skipped',
            `Tests intentionally omitted from review${specId ? ` for spec ${specId}` : ''} (--skip-tests).`);
        return { name: 'Tests executed (skipped)', status: 'WARN', hint: 'Omission registered in memory/session-logs/.' };
    }

    let runnable = 0, passed = 0, failed = 0, notRunnable = 0;
    const notes = [];
    for (const spec of specs) {
        const specDir = findSpecDir(harnessDir, spec.id);
        if (!specDir) { notRunnable++; notes.push(`${spec.id}: spec dir missing`); continue; }
        const langConfig = getLanguageConfig(spec.language || rc.language?.detected || 'typescript');
        const result = runTests(cwd, specDir, langConfig, { cmd });
        if (!result.runnable) { notRunnable++; notes.push(`${spec.id}: ${result.reason}`); continue; }
        runnable++;
        if (result.ok) { passed++; notes.push(`${spec.id}: ${result.passed} passed`); }
        else { failed++; notes.push(`${spec.id}: ${result.failed} failed`); }
    }

    let status;
    if (failed > 0) {
        status = 'FAIL';
        logDecision(cwd, harnessDir, specs, 'tests-failed', `Review blocked: ${notes.join('; ')}.`);
    } else if (notRunnable > 0 && runnable === 0) {
        status = 'WARN';
    } else {
        status = 'PASS';
    }

    return {
        name: `Tests pass (executed) [${notes.join(', ') || 'no specs'}]`,
        status,
        hint: status === 'FAIL' ? 'Fix failing tests, or omit them explicitly with review --skip-tests.' :
              notRunnable > 0 ? 'Some suites were not runnable in this environment. Use --cmd= to wire a runner, or --skip-tests to omit.' :
              specs.length > 1 ? 'All active specs were executed.' : ''
    };
}

/**
 * Extract file-path-looking tokens (backtick-quoted or bare) from a
 * tasks.md, e.g. `src/utils/fileUtils.js` or src/commands/rules.js.
 * Heuristic (regex, not a parser) — used only for a WARN-level hint.
 */
function extractTaskPaths(tasksMdContent) {
    const paths = new Set();
    if (!tasksMdContent) return paths;
    const pathRe = /[\w.-]+(?:\/[\w.-]+)+\.[A-Za-z0-9]+/g;
    const matches = tasksMdContent.match(pathRe) || [];
    for (const m of matches) paths.add(m.replace(/^`+|`+$/g, ''));
    return paths;
}

/**
 * Files changed in the working tree (unstaged + staged + untracked),
 * relative to the git root. Gracefully reports `ok: false` when the
 * project isn't a git repo — never throws.
 */
function diffFilesForSpec(cwd) {
    try {
        const isRepo = execSync('git rev-parse --is-inside-work-tree', { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
            .toString().trim();
        if (isRepo !== 'true') return { ok: false, reason: 'not a git repository' };
    } catch (e) {
        return { ok: false, reason: 'not a git repository (or git unavailable)' };
    }

    const run = (cmd) => {
        try {
            return execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n').filter(Boolean);
        } catch (e) {
            return [];
        }
    };

    const files = new Set([
        ...run('git diff --name-only'),
        ...run('git diff --name-only --staged'),
        ...run('git ls-files --others --exclude-standard')
    ]);
    return { ok: true, files: Array.from(files) };
}

const SCAFFOLDING_FILES = new Set(['.harnessrc', '.harnessignore', 'AGENTS.md', '.obsidian', '.mcp.json', 'opencode.json']);
const SCAFFOLDING_PREFIXES = ['.mcp.json', '.cursor/', '.codex/', '.qwen/', '.opencode/', '.kimi/', '.deepseek/', '.obsidian/'];

/**
 * Files `harness init` writes at the project root (per-tool MCP/config,
 * AGENTS.md, .harnessignore) — scaffolding, not code a spec's tasks would
 * enumerate.
 */
function isScaffoldingFile(f) {
    return SCAFFOLDING_FILES.has(f) || SCAFFOLDING_PREFIXES.some(p => f === p || f.startsWith(p));
}

/**
 * Guardian check: files touched in the working tree that aren't referenced
 * anywhere in any active spec's tasks.md. WARN only — heuristic path
 * extraction has real false positives/negatives, this is a hint, not a gate.
 */
function specDriftCheck(cwd, harnessDir, rc, specId) {
    const specs = (rc.activeSpecs || []).filter(s => !specId || s.id === specId);
    if (specs.length === 0) return null;

    const diff = diffFilesForSpec(cwd);
    if (!diff.ok) {
        return { name: 'Spec drift (code vs tasks.md)', status: 'WARN', hint: `not checkable — ${diff.reason}` };
    }

    // Harness scaffolding itself (spec.md, tasks.md checkboxes, session logs,
    // per-tool MCP/config files `harness init` writes at the project root, ...)
    // isn't "code the spec touched" — exclude it from the comparison.
    const harnessRel = path.relative(cwd, harnessDir).replace(/\\/g, '/') + '/';
    const codeFiles = diff.files.filter(f => !f.startsWith(harnessRel) && !isScaffoldingFile(f));

    let anyTasksChecked = false;
    const uncovered = [];
    for (const spec of specs) {
        const specDir = findSpecDir(harnessDir, spec.id);
        if (!specDir) continue;
        const tasksPath = path.join(specDir, 'tasks.md');
        if (!fs.existsSync(tasksPath)) continue;
        const taskPaths = Array.from(extractTaskPaths(fs.readFileSync(tasksPath, 'utf8')));
        if (taskPaths.length === 0) continue;
        anyTasksChecked = true;
        for (const f of codeFiles) {
            const covered = taskPaths.some(tp => f.endsWith(tp) || tp.endsWith(f));
            if (!covered && !uncovered.includes(f)) uncovered.push(f);
        }
    }

    if (!anyTasksChecked) return null;

    return {
        name: `Spec drift (code vs tasks.md) — ${uncovered.length} unexpected file(s)`,
        status: uncovered.length === 0 ? 'PASS' : 'WARN',
        hint: uncovered.length > 0
            ? `Touched but not referenced in any active spec's tasks.md: ${uncovered.slice(0, 5).join(', ')}${uncovered.length > 5 ? '…' : ''}`
            : ''
    };
}

/**
 * Guardian check for `harness judge` verdicts: any recorded `fail` on a
 * judge-selected "must" rule FAILs the gate; a selected rule with no
 * recorded verdict at all WARNs — never silently treated as passing.
 */
function judgeCheck(rc, specId) {
    const specs = (rc.activeSpecs || []).filter(s => !specId || s.id === specId);
    if (specs.length === 0) return null;

    const mustRules = (rc.rules || []).filter(r => r.enabled !== false && r.severity === 'must').slice(0, 3);
    if (mustRules.length === 0) return null;

    let anyFail = false;
    const unjudged = [];
    for (const spec of specs) {
        const verdicts = spec.judgeVerdicts || [];
        for (const rule of mustRules) {
            const forRule = verdicts.filter(v => v.rule === rule.id);
            const latest = forRule[forRule.length - 1];
            if (!latest) { unjudged.push(`${spec.id}:${rule.id}`); continue; }
            if (latest.verdict === 'fail') anyFail = true;
        }
    }

    if (anyFail) {
        return {
            name: 'Guardian self-judge (must rules)',
            status: 'FAIL',
            hint: 'A recorded verdict marked a "must" rule as failed. Fix the code and re-judge (harness judge record ... --verdict=pass).'
        };
    }
    if (unjudged.length > 0) {
        return {
            name: `Guardian self-judge (${unjudged.length} rule(s) not yet judged)`,
            status: 'WARN',
            hint: `Run: harness judge ${specId || '<spec>'}`
        };
    }
    return { name: 'Guardian self-judge (must rules)', status: 'PASS' };
}

function logDecision(cwd, harnessDir, specs, event, reason) {
    const log = `---
date: ${timestamp()}
agent: harness-cli
event: ${event}
spec: ${specs.map(s => s.id).join(',')}
---

# Review decision — ${event}

${reason}
`;
    fs.appendFileSync(
        path.join(harnessDir, 'memory', 'session-logs', `${event}-${Date.now()}.md`),
        log
    );
}

module.exports = { review, extractTaskPaths, diffFilesForSpec, specDriftCheck, judgeCheck };
