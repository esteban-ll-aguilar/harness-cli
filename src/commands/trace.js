const fs = require('fs');
const path = require('path');
const { getHarnessDir } = require('../utils/fileUtils.js');
const { buildTraceabilityReport } = require('../utils/traceability.js');

function findSpecDir(harnessDir, specId) {
    const dir = path.join(harnessDir, 'specs');
    if (!fs.existsSync(dir)) return null;
    const match = fs.readdirSync(dir).find(name => name === specId || name.startsWith(specId));
    return match ? path.join(dir, match) : null;
}

function trace(cwd, args) {
    const specId = args.find(a => !a.startsWith('--'));
    if (!specId) { console.log('❌ Usage: harness quality trace <specId> [--json]'); return; }
    const specDir = findSpecDir(getHarnessDir(cwd), specId);
    if (!specDir) { console.log(`❌ Spec "${specId}" not found.`); return; }
    const report = buildTraceabilityReport(specDir);
    if (args.includes('--json')) { console.log(JSON.stringify(report, null, 2)); return report; }
    console.log(`\n🔗 TRACEABILITY — ${path.basename(specDir)}\n`);
    for (const id of report.requirements) console.log(`  ${report.coverage[id].status === 'covered' ? '✅' : '⚠️ '} ${id}: ${report.coverage[id].status}`);
    console.log(`\n  Covered: ${report.covered}/${report.total}${report.gaps.length ? ` · gaps: ${report.gaps.length}` : ''}\n`);
    return report;
}

module.exports = { trace, findSpecDir };
