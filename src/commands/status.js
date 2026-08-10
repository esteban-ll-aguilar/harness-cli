const fs = require('fs');
const path = require('path');
const { getHarnessDir, loadHarnessRC, listFiles } = require('../utils/fileUtils.js');

function status(cwd) {
    let rc;
    try {
        rc = loadHarnessRC(cwd);
    } catch (e) {
        console.error('❌ Error reading .harnessrc:', e.message);
        return;
    }

    const harnessDir = getHarnessDir(cwd);

    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    const specsDir = path.join(harnessDir, 'specs');
    const specs = fs.existsSync(specsDir) ? fs.readdirSync(specsDir).filter(d => /^\d{3}-/.test(d)) : [];

    const active = rc.activeSpecs || [];
    const completed = rc.completedSpecs || [];

    const countFiles = (dir) => listFiles(dir).length;

    const brainFiles = countFiles(path.join(harnessDir, 'brain'));
    const memoryFiles = countFiles(path.join(harnessDir, 'memory'));
    const testFiles = countFiles(path.join(harnessDir, 'tests'));

    const langInfo = rc.isMonorepo 
        ? `Monorepo (${rc.languages?.all?.length || 1} languages)`
        : rc.language?.name || 'Unknown';

    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  📊 HARNESS PROJECT STATUS                                          ║
╠══════════════════════════════════════════════════════════════════════╣
║  Project: ${(rc.projectName || 'unknown').padEnd(58)} ║
║  Harness: ${(rc.version || 'unknown').padEnd(58)} ║
║  Language: ${langInfo.padEnd(57)} ║
╠══════════════════════════════════════════════════════════════════════╣
║  SPECS:                                                              ║
║    Total:     ${String(specs.length).padEnd(52)} ║
║    Active:    ${String(active.length).padEnd(52)} ║
║    Completed: ${String(completed.length).padEnd(52)} ║
╠══════════════════════════════════════════════════════════════════════╣
║  KNOWLEDGE BASE:                                                     ║
║    Brain files:   ${String(brainFiles).padEnd(48)} ║
║    Memory logs:   ${String(memoryFiles).padEnd(48)} ║
║    Test artifacts: ${String(testFiles).padEnd(47)} ║
╠══════════════════════════════════════════════════════════════════════╣
║  AGENT STATUS:                                                       ║
║    🎙️ Interviewer  ${(rc.agents?.interviewer?.enabled ? '✅' : '❌').padEnd(49)} ║
║    📐 Architect    ${(rc.agents?.architect?.enabled ? '✅' : '❌').padEnd(49)} ║
║    🧪 Tester       ${(rc.agents?.tester?.enabled ? '✅' : '❌').padEnd(49)} ║
║    💻 Coder        ${(rc.agents?.coder?.enabled ? '✅' : '❌').padEnd(49)} ║
║    🔍 Reviewer     ${(rc.agents?.reviewer?.enabled ? '✅' : '❌').padEnd(49)} ║
║    🛡️ Guardian     ${(rc.agents?.guardian?.enabled ? '✅' : '❌').padEnd(49)} ║
╠══════════════════════════════════════════════════════════════════════╣
║  QUALITY GATES:                                                      ║
║    Min Coverage:  ${String((rc.quality?.minCoverage || 0) + '%').padEnd(48)} ║
║    Max File Lines: ${String(rc.quality?.maxFileLines || 0).padEnd(47)} ║
║    Require ADR:    ${(rc.quality?.requireAdr ? '✅' : '❌').padEnd(48)} ║
║    Require Spec:   ${(rc.quality?.requireSpec ? '✅' : '❌').padEnd(48)} ║
║    Require BDD:    ${(rc.quality?.requireBdd ? '✅' : '❌').padEnd(48)} ║
║    Require TDD:    ${(rc.quality?.requireTdd ? '✅' : '❌').padEnd(48)} ║
╚══════════════════════════════════════════════════════════════════════╝
`);

    if (active.length > 0) {
        console.log('📝 Active Specs:');
        for (const spec of active) {
            const lang = spec.language ? `(${spec.language})` : '';
            console.log(`   ${spec.id} — ${spec.name} ${lang} [${spec.status}]`);
        }
    }

    if (rc.isMonorepo && rc.languages?.all) {
        console.log('\n📦 Monorepo Languages:');
        for (const lang of rc.languages.all) {
            const marker = lang.isRoot ? '📁 root' : '📂 sub';
            console.log(`   ${lang.name} ${marker}`);
        }
    }
}

module.exports = { status };
