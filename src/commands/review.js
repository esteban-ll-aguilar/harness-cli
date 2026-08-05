const fs = require('fs');
const path = require('path');
const { getHarnessDir, loadHarnessRC } = require('../utils/fileUtils.js');

function review(cwd, args) {
    const specId = args[0];
    const harnessDir = getHarnessDir(cwd);
    const rc = loadHarnessRC(cwd);

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
    const constitutionPath = path.join(harnessDir, 'brain', 'constitution.md');
    if (fs.existsSync(constitutionPath)) {
        checks.push({ name: 'Constitution exists', status: 'PASS' });
    } else {
        checks.push({ name: 'Constitution exists', status: 'FAIL' });
    }

    // Check 2: AGENTS.md in root
    if (fs.existsSync(path.join(cwd, 'AGENTS.md'))) {
        checks.push({ name: 'AGENTS.md in root', status: 'PASS' });
    } else {
        checks.push({ name: 'AGENTS.md in root', status: 'FAIL' });
    }

    // Check 3: Specs have required files
    const specsDir = path.join(harnessDir, 'specs');
    if (fs.existsSync(specsDir)) {
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
    }

    // Check 4: BDD features exist
    if (fs.existsSync(specsDir)) {
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
    }

    // Check 5: Tests exist
    const testsDir = path.join(harnessDir, 'tests');
    if (fs.existsSync(testsDir)) {
        const hasTests = fs.readdirSync(testsDir, { recursive: true }).some(f => f.endsWith('.test.js') || f.endsWith('.spec.js'));
        checks.push({
            name: 'Test artifacts present',
            status: hasTests ? 'PASS' : 'WARN'
        });
    }

    // Check 6: ADRs for decisions
    const decisionsDir = path.join(harnessDir, 'brain', 'decisions');
    if (fs.existsSync(decisionsDir)) {
        const adrs = fs.readdirSync(decisionsDir).filter(f => f.endsWith('.md'));
        checks.push({
            name: `ADRs documented (${adrs.length})`,
            status: adrs.length > 0 ? 'PASS' : rc.quality?.requireAdr ? 'FAIL' : 'WARN'
        });
    }

    // Print results
    for (const check of checks) {
        const icon = check.status === 'PASS' ? '✅' : check.status === 'FAIL' ? '❌' : '⚠️';
        console.log(`  ${icon} ${check.name}`);
    }

    const failures = checks.filter(c => c.status === 'FAIL').length;
    const warnings = checks.filter(c => c.status === 'WARN').length;

    console.log(`
╠══════════════════════════════════════════════════════════════════════╣
║  RESULT: ${failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} FAILURES, ${warnings} WARNINGS`}                      ║
╚══════════════════════════════════════════════════════════════════════╝
`);

    if (failures > 0) {
        console.log('🛠️  Fix failures before proceeding to production.');
        process.exit(1);
    }
}

module.exports = { review };
