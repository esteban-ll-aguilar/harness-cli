const fs = require('fs');
const path = require('path');

function snapshotDir(harnessDir) { return path.join(harnessDir, 'reports', 'quality'); }
function snapshotQuality(harnessDir, report, { limit = 50 } = {}) {
    const dir = snapshotDir(harnessDir); fs.mkdirSync(dir, { recursive: true });
    const snapshot = { generatedAt: new Date().toISOString(), traceabilityMode: report.traceabilityMode, specs: report.specs.map(s => ({ spec: s.spec, total: s.total, covered: s.covered, adversarialGaps: s.adversarialGaps.length })), memory: { status: report.memoryHealth.status, dangling: report.memoryHealth.danglingEdges.length }, overrides: report.overrides.length };
    const stamp = Date.now(); let suffix = 0; let name = `${stamp}-${String(suffix).padStart(4, '0')}.json`;
    while (fs.existsSync(path.join(dir, name))) name = `${stamp}-${String(++suffix).padStart(4, '0')}.json`;
    fs.writeFileSync(path.join(dir, name), JSON.stringify(snapshot, null, 2));
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
    for (const file of files.slice(0, Math.max(0, files.length - limit))) fs.unlinkSync(path.join(dir, file));
    return snapshot;
}
function qualityTrend(harnessDir) {
    const dir = snapshotDir(harnessDir); const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort() : [];
    const read = file => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const current = files.length ? read(files.at(-1)) : null; const previous = files.length > 1 ? read(files.at(-2)) : null;
    const coverage = snapshot => (snapshot?.specs || []).reduce((sum, s) => sum + s.covered, 0);
    return { snapshots: files.length, current, previous, delta: current && previous ? { coveredRequirements: coverage(current) - coverage(previous), danglingEdges: current.memory.dangling - previous.memory.dangling, overrides: current.overrides - previous.overrides } : null };
}
module.exports = { snapshotDir, snapshotQuality, qualityTrend };
