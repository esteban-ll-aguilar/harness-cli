const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildGraph, queryGraph } = require('./graphIndex.js');
const { memoryHealth } = require('./memoryHealth.js');
const { buildTraceabilityReport } = require('./traceability.js');

// A hermetic corpus keeps quality claims reproducible in CI: no model download,
// API key or user vault data is involved.
function runMemoryEvaluation() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-memory-eval-'));
    try {
        const brain = path.join(root, 'brain', 'decisions'); const spec = path.join(root, 'specs', '001-auth');
        fs.mkdirSync(brain, { recursive: true }); fs.mkdirSync(path.join(spec, 'features'), { recursive: true }); fs.mkdirSync(path.join(spec, 'tests'), { recursive: true });
        fs.writeFileSync(path.join(brain, 'old.md'), '---\ndate: 2020-01-01\n---\n## Old\nUse obsolete password policy.');
        fs.writeFileSync(path.join(brain, 'current.md'), '---\nsupersedes: brain/decisions/old.md\ndate: 2025-01-01\n---\n## Current\nUse modern password policy with rate limits.');
        fs.writeFileSync(path.join(spec, 'spec.md'), '### REQ-001: Sign in\nThe system SHALL validate credentials.');
        fs.writeFileSync(path.join(spec, 'features', 'auth.feature'), '@covers:REQ-001\nScenario: Sign in\n');
        fs.writeFileSync(path.join(spec, 'tests', 'auth.test.js'), '// @covers:REQ-001 @adversarial:REQ-001\ntest("rejects malformed DTO", () => {});');
        const graph = buildGraph(root); const hits = queryGraph(graph, 'password policy', { budgetTokens: 200 }).nodes;
        const trace = buildTraceabilityReport(spec); const health = memoryHealth(graph);
        const recallAtK = hits.some(h => h.file.endsWith('current.md')) ? 1 : 0;
        const staleHitRate = hits.filter(h => h.file.endsWith('old.md')).length / Math.max(hits.length, 1);
        return { version: 1, recallAtK, staleHitRate, budgetCompliant: queryGraph(graph, 'password policy', { budgetTokens: 10 }).tokensUsed <= 10, danglingEdgeCount: health.danglingEdges.length, traceabilityCoverage: trace.covered / Math.max(trace.total, 1), pass: recallAtK === 1 && staleHitRate === 0 && health.danglingEdges.length === 0 };
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
module.exports = { runMemoryEvaluation };
