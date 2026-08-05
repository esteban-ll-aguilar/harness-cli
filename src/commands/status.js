const fs = require('fs');
const path = require('path');
const { getHarnessDir, loadHarnessRC } = require('../utils/fileUtils.js');

function status(cwd) {
    const rc = loadHarnessRC(cwd);
    const harnessDir = getHarnessDir(cwd);

    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    const specsDir = path.join(harnessDir, 'specs');
    const specs = fs.existsSync(specsDir) ? fs.readdirSync(specsDir).filter(d => /^\d{3}-/.test(d)) : [];

    const active = rc.activeSpecs || [];
    const completed = rc.completedSpecs || [];

    // Count files
    const countFiles = (dir) => {
        if (!fs.existsSync(dir)) return 0;
        return fs.readdirSync(dir, { recursive: true }).filter(f => !fs.statSync(path.join(dir, f)).isDirectory()).length;
    };

    const brainFiles = countFiles(path.join(harnessDir, 'brain'));
    const memoryFiles = countFiles(path.join(harnessDir, 'memory'));
    const testFiles = countFiles(path.join(harnessDir, 'tests'));

    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  📊 HARNESS PROJECT STATUS                                          ║
╠══════════════════════════════════════════════════════════════════════╣
║  Project: ${(rc.projectName || 'unknown').padEnd(58)} ║
║  Harness: ${(rc.version || 'unknown').padEnd(58)} ║
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
            console.log(`   ${spec.id} — ${spec.name} [${spec.status}]`);
        }
    }
}

module.exports = { status };
