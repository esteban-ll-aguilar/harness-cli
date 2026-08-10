const fs = require('fs');
const path = require('path');
const { getHarnessDir, loadHarnessRC, listFiles } = require('../utils/fileUtils.js');

function review(cwd, args) {
    const specId = args[0];
    const harnessDir = getHarnessDir(cwd);
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

    // Check 4: BDD features exist
    if (fs.existsSync(specsDir)) {
        try {
            const specs = fs.readdirSync(specsDir).filter(d => /^\d{3}-/.test(d));
            let featureChecks = 0;
            for (const spec of specs) {
                const featuresDir = path.join(specsDir, spec, 'features');
                if (fs.existsSync(featuresDir) && fs.readdirSync(featuresDir).some(f => f.endsWith('.feature'))) {
                    featureChecks++;
                }
            }
            checks.push({
                name: `BDD features (${featureChecks}/${specs.length})`,
                status: featureChecks === specs.length && specs.length > 0 ? 'PASS' : 'WARN'
            });
        } catch (e) {
            checks.push({ name: 'BDD features', status: 'ERROR' });
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

    // Check 6: ADRs for decisions
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

    // Check 7: Project rules synced into AGENTS.md
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

    // Print results
    for (const check of checks) {
        const icon = check.status === 'PASS' ? '✅' : check.status === 'FAIL' ? '❌' : check.status === 'ERROR' ? '💥' : '⚠️';
        console.log(`  ${icon} ${check.name}`);
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

module.exports = { review };
