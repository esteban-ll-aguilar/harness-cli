const fs = require('fs');
const path = require('path');
const { getHarnessDir } = require('../utils/fileUtils.js');
const { loadHarnessRC, writeHarnessRC } = require('../utils/fileUtils.js');
const { buildTraceabilityReport } = require('../utils/traceability.js');

function findSpecDir(harnessDir, specId) {
    const dir = path.join(harnessDir, 'specs');
    if (!fs.existsSync(dir)) return null;
    const match = fs.readdirSync(dir).find(name => name === specId || name.startsWith(specId));
    return match ? path.join(dir, match) : null;
}

function trace(cwd, args) {
    if (args[0] === 'override') return override(cwd, args.slice(1));
    const specId = args.find(a => !a.startsWith('--'));
    if (!specId) { console.log('❌ Usage: harness quality trace <specId> [--json]'); return; }
    const specDir = findSpecDir(getHarnessDir(cwd), specId);
    if (!specDir) { console.log(`❌ Spec "${specId}" not found.`); return; }
    const report = buildTraceabilityReport(specDir);
    if (args.includes('--json')) { console.log(JSON.stringify(report, null, 2)); return report; }
    console.log(`\n🔗 TRACEABILITY — ${path.basename(specDir)}\n`);
    for (const id of report.requirements) console.log(`  ${report.coverage[id].status === 'covered' ? '✅' : '⚠️ '} ${id}: ${report.coverage[id].status}`);
    console.log(`\n  Covered: ${report.covered}/${report.total}${report.gaps.length ? ` · gaps: ${report.gaps.length}` : ''}${report.adversarialGaps.length ? ` · adversarial gaps: ${report.adversarialGaps.length}` : ''}\n`);
    return report;
}

function override(cwd, args) {
    const specId = args[0]; const req = args.find(a => a.startsWith('--req='))?.slice(6);
    const reason = args.find(a => a.startsWith('--reason='))?.slice(9); const owner = args.find(a => a.startsWith('--owner='))?.slice(8);
    const expiresAt = args.find(a => a.startsWith('--expires='))?.slice(10);
    if (!specId || !req || !reason || !owner || !expiresAt || Number.isNaN(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) {
        console.log('❌ Usage: harness quality trace override <spec> --req=REQ-001 --reason="..." --owner=name --expires=YYYY-MM-DD'); return null;
    }
    const rc = loadHarnessRC(cwd); rc.quality = rc.quality || {}; rc.quality.traceabilityOverrides = (rc.quality.traceabilityOverrides || []).filter(o => !(o.specId === specId && o.requirementId === req));
    rc.quality.traceabilityOverrides.push({ specId, requirementId: req, reason, owner, expiresAt, createdAt: new Date().toISOString() }); writeHarnessRC(cwd, rc);
    console.log(`⚠️  Override recorded for ${req}; expires ${expiresAt}. It remains visible as warning and never counts as coverage.`); return rc;
}

module.exports = { trace, findSpecDir, override };
