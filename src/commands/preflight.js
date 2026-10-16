const fs = require('fs');
const path = require('path');
const { getHarnessDir, loadHarnessRC } = require('../utils/fileUtils.js');
const { buildTraceabilityReport } = require('../utils/traceability.js');

function preflight(cwd, args) {
    const specId = args[0];
    const harnessDir = getHarnessDir(cwd); const rc = loadHarnessRC(cwd);
    if (!specId) { console.log('❌ Usage: harness work start <specId> [--task=<id>]'); return null; }
    const dir = fs.readdirSync(path.join(harnessDir, 'specs')).find(d => d.startsWith(specId));
    if (!dir) { console.log(`❌ Spec ${specId} not found.`); return null; }
    const spec = (rc.activeSpecs || []).find(s => s.id === specId);
    const report = buildTraceabilityReport(path.join(harnessDir, 'specs', dir));
    const packet = { spec: specId, task: args.find(a => a.startsWith('--task='))?.slice(7) || null, stage: spec?.status || 'unknown', traceability: { total: report.total, gaps: report.gaps.length, adversarialGaps: report.adversarialGaps.length }, checklist: ['Read bounded context and spec before editing.', 'Work only on the claimed task.', 'Write a failing test before production code.', 'Include malformed-input/authorization/boundary cases when applicable.', 'Run exact tests; submit evidence to Memory Steward.', 'Do not mark complete without a completion receipt.'] };
    console.log(`\n🧭 WORK PREFLIGHT — spec ${specId}${packet.task ? ` task ${packet.task}` : ''}`);
    console.log(`   Stage: ${packet.stage} · traceability gaps: ${packet.traceability.gaps} · adversarial gaps: ${packet.traceability.adversarialGaps}`);
    packet.checklist.forEach((item, i) => console.log(`   ${i + 1}. ${item}`));
    console.log('\n   Next: harness agent run <role> ' + specId + '\n');
    return packet;
}
module.exports = { preflight };
