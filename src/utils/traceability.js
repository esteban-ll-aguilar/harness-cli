const fs = require('fs');
const path = require('path');
const { listFiles } = require('./fileUtils.js');

function normativeRequirements(content) {
    const found = [];
    const re = /^#{2,4}\s+(REQ-[A-Za-z0-9_-]+)\s*[:\-]?\s*(.*)$/gmi;
    let match;
    while ((match = re.exec(content))) {
        const next = content.slice(match.index + match[0].length).search(/^#{2,4}\s+/m);
        const body = content.slice(match.index + match[0].length, next === -1 ? undefined : match.index + match[0].length + next);
        if (/\b(SHALL|MUST)\b/i.test(`${match[2]} ${body}`)) found.push(match[1]);
    }
    return found;
}

function coveredIds(content) {
    const ids = new Set();
    const re = /@covers\s*:\s*(REQ-[A-Za-z0-9_-]+)/gi;
    let match;
    while ((match = re.exec(content))) ids.add(match[1]);
    return [...ids];
}

// A happy-path-only test suite is not a contract. Tests or scenarios may mark
// their hostile case explicitly (`@adversarial:REQ-001`) so this remains
// language-neutral and works for DTO/schema, auth and boundary tests alike.
function adversarialIds(content) {
    const ids = new Set();
    const re = /@adversarial\s*:\s*(REQ-[A-Za-z0-9_-]+)/gi;
    let match;
    while ((match = re.exec(content))) ids.add(match[1]);
    return [...ids];
}

function filesUnder(dir, extensions) {
    if (!fs.existsSync(dir)) return [];
    return listFiles(dir).filter(f => extensions.some(ext => f.toLowerCase().endsWith(ext)));
}

function buildTraceabilityReport(specDir) {
    const specPath = path.join(specDir, 'spec.md');
    const requirements = fs.existsSync(specPath) ? normativeRequirements(fs.readFileSync(specPath, 'utf8')) : [];
    const scenarios = {};
    const tests = {};
    const adversarial = {};
    for (const fp of filesUnder(path.join(specDir, 'features'), ['.feature'])) {
        for (const id of coveredIds(fs.readFileSync(fp, 'utf8'))) (scenarios[id] = scenarios[id] || []).push(fp);
    }
    for (const fp of filesUnder(path.join(specDir, 'tests'), ['.js', '.ts', '.py', '.go', '.rs', '.java', '.dart', '.cs'])) {
        const content = fs.readFileSync(fp, 'utf8');
        for (const id of coveredIds(content)) (tests[id] = tests[id] || []).push(fp);
        for (const id of adversarialIds(content)) (adversarial[id] = adversarial[id] || []).push(fp);
    }
    const coverage = {};
    const gaps = [];
    for (const id of requirements) {
        const hasScenario = Boolean(scenarios[id]?.length);
        const hasTest = Boolean(tests[id]?.length);
        const status = hasScenario && hasTest ? 'covered' : hasScenario ? 'missing-test' : hasTest ? 'missing-scenario' : 'uncovered';
        coverage[id] = { status, scenarios: scenarios[id] || [], tests: tests[id] || [], adversarial: adversarial[id] || [] };
        if (status !== 'covered') gaps.push({ requirementId: id, status });
    }
    const adversarialGaps = requirements.filter(id => !(adversarial[id] || []).length)
        .map(requirementId => ({ requirementId, status: 'missing-adversarial-test' }));
    return { requirements, scenarios, tests, adversarial, coverage, gaps, adversarialGaps, covered: requirements.length - gaps.length, total: requirements.length };
}

module.exports = { normativeRequirements, coveredIds, adversarialIds, buildTraceabilityReport };
