const fs = require('fs');
const path = require('path');
const { getHarnessDir, loadHarnessRC } = require('../utils/fileUtils.js');
const { buildTraceabilityReport } = require('../utils/traceability.js');
const { getOnDemandContext } = require('../utils/tokenOptimizer.js');

function handoff(cwd, args) {
    const specId = args[0]; if (!specId) { console.log('❌ Usage: harness work handoff <specId> [--task=<id>] [--budget=N]'); return null; }
    const harnessDir = getHarnessDir(cwd), rc = loadHarnessRC(cwd);
    const spec = (rc.activeSpecs || []).find(s => s.id === specId); const dir = fs.readdirSync(path.join(harnessDir, 'specs')).find(d => d.startsWith(specId));
    if (!spec || !dir) { console.log(`❌ Active spec ${specId} not found.`); return null; }
    const task = args.find(a => a.startsWith('--task='))?.slice(7); const budget = Number(args.find(a => a.startsWith('--budget='))?.slice(9)) || 600;
    const trace = buildTraceabilityReport(path.join(harnessDir, 'specs', dir));
    const packet = { spec: { id: spec.id, name: spec.name, status: spec.status }, task: task || null, claim: task ? spec.taskClaims?.[task] || null : spec.claimedBy ? { owner: spec.claimedBy, at: spec.claimedAt } : null, traceability: trace.coverage, verification: `harness quality trace ${specId} && harness quality test ${specId}`, completionReceipt: 'brain/competencies/completion-receipt.md', context: getOnDemandContext(harnessDir, `${spec.name} ${task || ''}`, { budgetTokens: budget }) };
    console.log(JSON.stringify(packet, null, 2)); return packet;
}
module.exports = { handoff };
