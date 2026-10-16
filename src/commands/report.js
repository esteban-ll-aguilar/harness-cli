const fs = require('fs');
const path = require('path');
const { getHarnessDir, loadHarnessRC } = require('../utils/fileUtils.js');
const { buildTraceabilityReport } = require('../utils/traceability.js');
const { loadGraph } = require('../utils/graphIndex.js');
const { memoryHealth } = require('../utils/memoryHealth.js');

function qualityReport(cwd, args = []) {
    const harnessDir = getHarnessDir(cwd);
    const rc = loadHarnessRC(cwd);
    const specsDir = path.join(harnessDir, 'specs');
    const reports = fs.existsSync(specsDir) ? fs.readdirSync(specsDir).filter(d => /^\d{3}-/.test(d)).map(dir => {
        const trace = buildTraceabilityReport(path.join(specsDir, dir));
        return { spec: dir, total: trace.total, covered: trace.covered, gaps: trace.gaps, adversarialGaps: trace.adversarialGaps };
    }) : [];
    const output = { generatedAt: new Date().toISOString(), traceabilityMode: rc.quality?.traceabilityMode || 'warn', specs: reports, memoryHealth: memoryHealth(loadGraph(harnessDir, { rebuild: false })), overrides: rc.quality?.traceabilityOverrides || [] };
    if (args.includes('--json')) console.log(JSON.stringify(output, null, 2));
    else {
        console.log('\n📊 HARNESS QUALITY REPORT');
        for (const r of reports) console.log(`  ${r.spec}: ${r.covered}/${r.total} traceable · ${r.adversarialGaps.length} adversarial gaps`);
        console.log(`  Memory: ${output.memoryHealth.status} · ${output.memoryHealth.nodeCount} nodes · ${output.memoryHealth.danglingEdges.length} dangling`);
        console.log(`  Overrides: ${output.overrides.length}\n`);
    }
    return output;
}
module.exports = { qualityReport };
