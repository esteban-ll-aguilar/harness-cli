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

function filesUnder(dir, extensions) {
    if (!fs.existsSync(dir)) return [];
    return listFiles(dir).filter(f => extensions.some(ext => f.toLowerCase().endsWith(ext)));
}

function buildTraceabilityReport(specDir) {
    const specPath = path.join(specDir, 'spec.md');
    const requirements = fs.existsSync(specPath) ? normativeRequirements(fs.readFileSync(specPath, 'utf8')) : [];
    const scenarios = {};
    const tests = {};
    for (const fp of filesUnder(path.join(specDir, 'features'), ['.feature'])) {
        for (const id of coveredIds(fs.readFileSync(fp, 'utf8'))) (scenarios[id] = scenarios[id] || []).push(fp);
    }
    for (const fp of filesUnder(path.join(specDir, 'tests'), ['.js', '.ts', '.py', '.go', '.rs', '.java', '.dart', '.cs'])) {
        for (const id of coveredIds(fs.readFileSync(fp, 'utf8'))) (tests[id] = tests[id] || []).push(fp);
    }
    const coverage = {};
    const gaps = [];
    for (const id of requirements) {
        const hasScenario = Boolean(scenarios[id]?.length);
        const hasTest = Boolean(tests[id]?.length);
        const status = hasScenario && hasTest ? 'covered' : hasScenario ? 'missing-test' : hasTest ? 'missing-scenario' : 'uncovered';
        coverage[id] = { status, scenarios: scenarios[id] || [], tests: tests[id] || [] };
        if (status !== 'covered') gaps.push({ requirementId: id, status });
    }
    return { requirements, scenarios, tests, coverage, gaps, covered: requirements.length - gaps.length, total: requirements.length };
}

module.exports = { normativeRequirements, coveredIds, buildTraceabilityReport };
