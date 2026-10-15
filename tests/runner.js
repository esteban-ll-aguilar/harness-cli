/**
 * Harness CLI Test Runner
 * Run with: node tests/runner.js
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e) {
        console.log(`  ❌ ${name}`);
        console.log(`     ${e.message}`);
        failed++;
    }
}

function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
        throw new Error(`${msg || 'Assertion failed'}: expected ${expected}, got ${actual}`);
    }
}

function assertTrue(value, msg) {
    if (!value) {
        throw new Error(msg || 'Expected true, got false');
    }
}

function assertFalse(value, msg) {
    if (value) {
        throw new Error(msg || 'Expected false, got true');
    }
}

// Load modules
const { detectLanguages, getLanguageConfig } = require('../src/utils/languageDetector.js');
const { slugify, timestamp, nextSpecId, listFiles, matchGlob, withHarnessRCLock, loadHarnessRC } = require('../src/utils/fileUtils.js');
const { detectAmbiguities } = require('../src/utils/ambiguityDetector.js');
const { tokenize, stripDiacritics, buildIndex, search } = require('../src/utils/retrieval.js');
const { getToolConfig } = require('../src/utils/aiAdapter.js');
const { parseToolsFlag, writeToolConfigs } = require('../src/utils/toolSetup.js');
const { STAGES, countBddScenarios } = require('../src/commands/advance.js');
const { parseOutput, specHasOwnConfig } = require('../src/utils/testRunner.js');
const { applyPreset, rulesForFile } = require('../src/commands/rules.js');
const { extractTaskPaths, specDriftCheck } = require('../src/commands/review.js');
const { execSync } = require('child_process');
const { advance } = require('../src/commands/advance.js');
const { approve } = require('../src/commands/approve.js');
const { orchestrate } = require('../src/commands/orchestrate.js');
const { compactSessionLogs } = require('../src/commands/memory.js');
const { buildSymbolIndex, findSymbol, getSymbolIndex, findReferences } = require('../src/utils/symbolIndex.js');
const { runCLI } = require('../src/cli.js');
const { selectJudgeRules, judgeRecord } = require('../src/commands/judge.js');
const { context } = require('../src/commands/context.js');
const { showHelp } = require('../src/utils/help.js');
const { newChange } = require('../src/commands/new-change.js');
const { judgeCheck } = require('../src/commands/review.js');
const { buildGraph, queryGraph, splitSections, classifyType, recencyDecay } = require('../src/utils/graphIndex.js');
const { getOnDemandContext } = require('../src/utils/tokenOptimizer.js');
const { buildTraceabilityReport } = require('../src/utils/traceability.js');
const { ContextBudget } = require('../src/utils/contextBudget.js');
const { submitObservation, processInbox } = require('../src/utils/memorySteward.js');
const { repairAgentLayout } = require('../src/utils/projectLayout.js');
const { memoryHealth } = require('../src/utils/memoryHealth.js');
const { cosineSimilarity, buildSemanticManifest } = require('../src/utils/semanticMemory.js');

console.log('\n🧪 Running Harness CLI Tests\n');

// ============================================================
// Superoptimization contracts — RED before implementation
// ============================================================
console.log('📦 Quality, Memory & Agent Workflow Contracts');

test('traceability links a requirement to BDD and TDD evidence', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const specDir = path.join(tmpDir, '001-auth');
    fs.mkdirSync(path.join(specDir, 'features'), { recursive: true });
    fs.mkdirSync(path.join(specDir, 'tests'));
    fs.writeFileSync(path.join(specDir, 'spec.md'), '### REQ-001: Sign in\nThe system SHALL sign in a valid user.\n');
    fs.writeFileSync(path.join(specDir, 'features', 'auth.feature'), '@covers:REQ-001\nScenario: valid sign in\n  When a user signs in\n  Then access is granted\n');
    fs.writeFileSync(path.join(specDir, 'tests', 'auth.test.js'), '// @covers:REQ-001\ntest("sign in", () => {})\n');
    const report = buildTraceabilityReport(specDir);
    assertEqual(report.coverage['REQ-001'].status, 'covered', 'Requirement should be fully traceable');
    fs.rmSync(tmpDir, { recursive: true });
});

test('context budget never exceeds its configured capacity and returns omissions', () => {
    const budget = new ContextBudget(10, { working: 0.5, episodic: 0.2, semantic: 0.3 });
    budget.add('working', { id: 'required', text: '12345678901234567890', priority: 10 });
    budget.add('semantic', { id: 'optional', text: '12345678901234567890', priority: 1 });
    const receipt = budget.receipt();
    assertTrue(receipt.tokensUsed <= 10, 'Budget must be a hard ceiling');
    assertTrue(receipt.omitted.length > 0, 'Over-budget items must be visible');
});

test('only Memory Steward promotes a unique observation and rejects duplicates', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    fs.mkdirSync(path.join(harnessDir, 'memory', 'inbox'), { recursive: true });
    fs.mkdirSync(path.join(harnessDir, 'brain', 'patterns'), { recursive: true });
    submitObservation(harnessDir, { claim: 'Use parameterized SQL', source: 'specs/001/spec.md', scope: '001', evidence: 'REQ-001' });
    assertEqual(processInbox(harnessDir, { actor: 'coder' }).rejected, 1, 'Non-steward must not promote memory');
    const first = processInbox(harnessDir, { actor: 'memory-steward' });
    assertEqual(first.promoted, 1, 'Steward should promote valid observation');
    submitObservation(harnessDir, { claim: 'Use parameterized SQL', source: 'specs/001/spec.md', scope: '001', evidence: 'REQ-001' });
    const second = processInbox(harnessDir, { actor: 'memory-steward' });
    assertEqual(second.duplicates, 1, 'Duplicate must not create another memory item');
    fs.rmSync(tmpDir, { recursive: true });
});

test('repairAgentLayout creates a compatibility projection without replacing canonical memory', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    fs.mkdirSync(path.join(harnessDir, 'brain'), { recursive: true });
    fs.writeFileSync(path.join(harnessDir, 'brain', 'AGENTS.md'), '# Canonical instructions\n');
    repairAgentLayout(tmpDir, harnessDir);
    assertTrue(fs.existsSync(path.join(tmpDir, 'AGENTS.md')), 'Root AGENTS entry point should exist');
    assertTrue(fs.existsSync(path.join(tmpDir, '.agents', 'AGENTS.md')), 'Compatibility projection should exist');
    assertEqual(fs.readFileSync(path.join(harnessDir, 'brain', 'AGENTS.md'), 'utf8'), '# Canonical instructions\n', 'Canonical memory must remain untouched');
    fs.rmSync(tmpDir, { recursive: true });
});

test('memory health reports dangling graph references without changing memory', () => {
    const graph = {
        nodes: { 'brain/a.md': { id: 'brain/a.md', validUntil: null } },
        edges: [{ from: 'brain/a.md', to: 'brain/missing.md', type: 'references' }],
        builtAt: new Date().toISOString()
    };
    const health = memoryHealth(graph);
    assertEqual(health.danglingEdges.length, 1, 'Missing target must be reported');
    assertEqual(health.status, 'warn', 'Dangling evidence should warn, not mutate the graph');
});

test('semantic memory manifest fingerprints the local embedding model and index contract', () => {
    const manifest = buildSemanticManifest({ model: 'Xenova/all-MiniLM-L6-v2', dimensions: 384, fingerprint: 'abc' });
    assertEqual(manifest.provider, 'transformers.js-local', 'Semantic memory must run in Node, not through an agent provider');
    assertEqual(manifest.dimensions, 384, 'Manifest must pin vector dimensions');
    assertTrue(cosineSimilarity([1, 0], [1, 0]) > 0.99, 'Identical vectors should have maximum similarity');
});

// ============================================================
// Language Detector Tests
// ============================================================
console.log('📦 Language Detector');

test('detects TypeScript from tsconfig.json', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}');
    const result = detectLanguages(tmpDir, { deep: false });
    assertEqual(result.primary.language, 'typescript', 'Should detect TypeScript');
    fs.rmSync(tmpDir, { recursive: true });
});

test('detects Python from requirements.txt', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'flask\n');
    const result = detectLanguages(tmpDir, { deep: false });
    assertEqual(result.primary.language, 'python', 'Should detect Python');
    fs.rmSync(tmpDir, { recursive: true });
});

test('detects Go from go.mod', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module test\n');
    const result = detectLanguages(tmpDir, { deep: false });
    assertEqual(result.primary.language, 'go', 'Should detect Go');
    fs.rmSync(tmpDir, { recursive: true });
});

test('detects Dart from pubspec.yaml', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.writeFileSync(path.join(tmpDir, 'pubspec.yaml'), 'name: test_app\n');
    const result = detectLanguages(tmpDir, { deep: false });
    assertEqual(result.primary.language, 'dart', 'Should detect Dart');
    fs.rmSync(tmpDir, { recursive: true });
});

test('detects monorepo with multiple languages', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');

    // Root: TypeScript (frontend)
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}');

    // Sub: Python (backend)
    fs.mkdirSync(path.join(tmpDir, 'backend'));
    fs.writeFileSync(path.join(tmpDir, 'backend', 'requirements.txt'), 'fastapi\n');

    // Sub: Dart (mobile)
    fs.mkdirSync(path.join(tmpDir, 'mobile'));
    fs.writeFileSync(path.join(tmpDir, 'mobile', 'pubspec.yaml'), 'name: app\n');

    const result = detectLanguages(tmpDir, { deep: true, maxDepth: 2 });

    assertTrue(result.isMonorepo, 'Should detect monorepo');
    assertTrue(result.totalLanguages >= 2, `Should detect multiple languages, got ${result.totalLanguages}`);
    assertEqual(result.primary.language, 'typescript', 'Primary should be TypeScript (root)');

    const hasPython = result.all.some(r => r.language === 'python');
    const hasDart = result.all.some(r => r.language === 'dart');
    assertTrue(hasPython, 'Should detect Python in backend/');
    assertTrue(hasDart, 'Should detect Dart in mobile/');

    fs.rmSync(tmpDir, { recursive: true });
});

test('getLanguageConfig returns correct config', () => {
    const config = getLanguageConfig('python');
    assertEqual(config.name, 'Python', 'Should return Python config');
    assertEqual(config.testFramework, 'pytest', 'Should have pytest');
});

test('getLanguageConfig falls back to TypeScript for unknown', () => {
    const config = getLanguageConfig('unknown-lang');
    assertEqual(config.name, 'TypeScript', 'Should fallback to TypeScript');
});

// ============================================================
// File Utils Tests
// ============================================================
console.log('\n📦 File Utils');

test('slugify converts to kebab-case', () => {
    assertEqual(slugify('User Authentication'), 'user-authentication');
    assertEqual(slugify('API v2 Handler'), 'api-v2-handler');
});

test('slugify handles special characters', () => {
    assertEqual(slugify('User@Auth!!!'), 'user-auth');
});

test('timestamp returns valid format', () => {
    const ts = timestamp();
    assertTrue(ts.includes('T'), 'Timestamp should be ISO format');
});

test('nextSpecId returns 001 for empty project', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.mkdirSync(path.join(tmpDir, '.harness'));
    fs.mkdirSync(path.join(tmpDir, '.harness', 'specs'));
    const id = nextSpecId(tmpDir);
    assertEqual(id, '001', 'First spec should be 001');
    fs.rmSync(tmpDir, { recursive: true });
});

test('nextSpecId increments correctly', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.mkdirSync(path.join(tmpDir, '.harness'));
    fs.mkdirSync(path.join(tmpDir, '.harness', 'specs'));
    fs.mkdirSync(path.join(tmpDir, '.harness', 'specs', '001-auth'));
    fs.mkdirSync(path.join(tmpDir, '.harness', 'specs', '002-payment'));
    const id = nextSpecId(tmpDir);
    assertEqual(id, '003', 'Should increment to 003');
    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Language Detector — ignores vendored/build dirs
// ============================================================
console.log('\n📦 Language Detector (ignores)');

test('does not detect Python inside node_modules', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.mkdirSync(path.join(tmpDir, 'node_modules'));
    fs.writeFileSync(path.join(tmpDir, 'node_modules', 'fake.py'), 'import os\n');
    fs.writeFileSync(path.join(tmpDir, 'node_modules', 'package.json'), '{}');
    const result = detectLanguages(tmpDir, { deep: true, maxDepth: 3 });
    const hasPython = result.all.some(r => r.language === 'python');
    assertFalse(hasPython, 'Should ignore node_modules');
    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Retrieval (BM25 RAG)
// ============================================================
console.log('\n📦 Retrieval (BM25 RAG)');

test('tokenize strips markdown noise and stopwords', () => {
    const tokens = tokenize('The system SHALL generate a magic-link token when the user requests auth!');
    assertTrue(tokens.includes('system'), 'Should keep content words');
    assertTrue(tokens.includes('token'), 'Should keep token');
    assertFalse(tokens.includes('the'), 'Should drop stopwords');
    assertFalse(tokens.includes('a'), 'Should drop stopwords');
});

test('stripDiacritics normalizes accented Spanish characters', () => {
    assertEqual(stripDiacritics('página'), 'pagina');
    assertEqual(stripDiacritics('código'), 'codigo');
    assertEqual(stripDiacritics('configuración'), 'configuracion');
});

test('tokenize makes accented and unaccented queries equivalent', () => {
    assertEqual(tokenize('Verificar la página').join(' '), tokenize('Verificar la pagina').join(' '));
});

test('search finds accented content when the query has no accents, and vice versa', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.mkdirSync(path.join(tmpDir, 'brain'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'brain', 'ui.md'),
        'Antes de construir cualquier página, proponer el diseño y la configuración de filtros.');
    const index = buildIndex(tmpDir);

    const withoutAccents = search(index, tmpDir, 'configuracion pagina', 3);
    assertTrue(withoutAccents.length > 0, 'Unaccented query should find accented content');

    const withAccents = search(index, tmpDir, 'configuración página', 3);
    assertTrue(withAccents.length > 0, 'Accented query should still find the same content');

    fs.rmSync(tmpDir, { recursive: true });
});

test('buildIndex + search ranks the relevant document first', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.mkdirSync(path.join(tmpDir, 'brain'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'brain', 'auth.md'),
        'The authentication module issues short-lived access tokens and refresh tokens. Rate limiting protects the auth endpoint.');
    fs.writeFileSync(path.join(tmpDir, 'brain', 'billing.md'),
        'The billing module handles invoices, payments and refunds. Stripe webhooks update the ledger.');

    const index = buildIndex(tmpDir);
    assertEqual(index.numDocs, 2, 'Should index 2 docs');

    const results = search(index, tmpDir, 'authentication token', 2);
    assertTrue(results.length > 0, 'Should return matches');
    assertEqual(results[0].rel, 'brain/auth.md', 'Auth doc should rank first for auth query');
    fs.rmSync(tmpDir, { recursive: true });
});

test('index fingerprint changes when a file changes', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.mkdirSync(path.join(tmpDir, 'brain'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'brain', 'note.md'), 'v1 content');
    const fp1 = require('../src/utils/retrieval.js').fingerprint(tmpDir);
    fs.writeFileSync(path.join(tmpDir, 'brain', 'note.md'), 'v2 content changed');
    const fp2 = require('../src/utils/retrieval.js').fingerprint(tmpDir);
    assertTrue(fp1 !== fp2, 'Fingerprint should change on edit');
    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// AI Adapter
// ============================================================
console.log('\n📦 AI Adapter');

test('getToolConfig does not crash on non-JSON hook scripts', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.mkdirSync(path.join(tmpDir, '.claude', 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.claude', 'scripts', 'session-start.js'), 'console.log("hi");');
    const result = getToolConfig(tmpDir, 'claude');
    assertEqual(result, null, 'Should return null instead of crashing');
    fs.rmSync(tmpDir, { recursive: true });
});

test('getToolConfig parses valid JSON configs', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.mkdirSync(path.join(tmpDir, '.opencode'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.opencode', 'opencode-config.json'), JSON.stringify({ tool: 'opencode' }));
    const result = getToolConfig(tmpDir, 'opencode');
    assertEqual(result.tool, 'opencode', 'Should parse JSON config');
    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Lifecycle
// ============================================================
console.log('\n📦 Spec Lifecycle');

test('advance STAGES follow the 6-agent workflow', () => {
    assertEqual(STAGES.join(' → '), 'interviewer → architect → tester → coder → reviewer → guardian');
});

// ============================================================
// Tool setup (init AI tool selection)
// ============================================================
console.log('\n🔌 Tool Setup');

test('parseToolsFlag filters to known tool ids', () => {
    assertEqual(parseToolsFlag('claude,opencode').join(','), 'claude,opencode');
    assertEqual(parseToolsFlag('Claude, BOGUS, codex').join(','), 'claude,codex');
    assertEqual(parseToolsFlag('bogus'), null, 'Unknown-only flag should return null');
    assertEqual(parseToolsFlag(''), null, 'Empty flag should return null');
});

test('writeToolConfigs writes real per-tool config files', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    writeToolConfigs(tmpDir, ['claude', 'opencode', 'codex', 'cursor']);

    const mcp = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
    assertEqual(mcp.mcpServers.harness.command, 'harness-mcp', '.mcp.json should register harness MCP');

    const opencode = JSON.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
    assertEqual(opencode.mcp.harness.type, 'local', 'opencode.json harness MCP should be local type');
    assertEqual(opencode.mcp.harness.command.join(' '), 'harness-mcp', 'opencode.json should register harness MCP');
    assertEqual(opencode.mcp.harness.enabled, true, 'opencode.json harness MCP should be enabled');
    assertTrue(opencode.instructions.includes('.harness/brain/AGENTS.md'), 'opencode.json should reference AGENTS.md');

    const toml = fs.readFileSync(path.join(tmpDir, '.codex', 'config.toml'), 'utf8');
    assertTrue(toml.includes('mcp_servers.harness'), 'Codex config.toml should register harness MCP');

    const cursorMcp = fs.readFileSync(path.join(tmpDir, '.cursor', 'mcp.json'), 'utf8');
    assertTrue(cursorMcp.includes('harness-mcp'), 'Cursor mcp.json should register harness MCP');

    // Unselected tools must NOT be written
    assertTrue(!fs.existsSync(path.join(tmpDir, 'opencode.json.other')), 'sanity');
    fs.rmSync(tmpDir, { recursive: true });
});

test('writeToolConfigs writes Qwen MCP to .qwen/settings.json and no fake .mcp.json for kimi/deepseek', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    writeToolConfigs(tmpDir, ['qwen', 'kimi', 'deepseek']);

    // Qwen Code reads mcpServers from .qwen/settings.json
    const qwen = JSON.parse(fs.readFileSync(path.join(tmpDir, '.qwen', 'settings.json'), 'utf8'));
    assertEqual(qwen.mcpServers.harness.command, 'harness-mcp', 'Qwen settings.json should register harness MCP');

    // Kimi/DeepSeek must NOT get a project .mcp.json they can't read
    assertTrue(!fs.existsSync(path.join(tmpDir, '.mcp.json')), 'Kimi/DeepSeek must not get a fake .mcp.json');
    fs.rmSync(tmpDir, { recursive: true });
});

test('writeToolConfigs merges into existing opencode.json', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify({ theme: 'dark' }));
    writeToolConfigs(tmpDir, ['opencode']);
    const merged = JSON.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
    assertEqual(merged.theme, 'dark', 'Existing keys should be preserved');
    assertEqual(merged.mcp.harness.command.join(' '), 'harness-mcp', 'MCP should be added to existing file');
    assertEqual(merged.mcp.harness.type, 'local', 'MCP should be local type');
    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Test Runner (real test execution)
// ============================================================
console.log('\n🧪 Test Runner');

test('parseOutput parses Jest summary', () => {
    const r = parseOutput('Tests: 12 passed, 3 failed, 15 total');
    assertEqual(r.passed, 12);
    assertEqual(r.failed, 3);
});

test('parseOutput parses pytest summary', () => {
    const r = parseOutput('====== 12 passed, 3 failed in 1.20s ======');
    assertEqual(r.passed, 12);
    assertEqual(r.failed, 3);
});

test('parseOutput parses cargo test summary', () => {
    const r = parseOutput('test result: ok. 12 passed; 3 failed; 0 ignored');
    assertEqual(r.passed, 12);
    assertEqual(r.failed, 3);
});

test('parseOutput parses go test output', () => {
    const ok = parseOutput('ok   example/pkg');
    assertEqual(ok.failed, 0);
    const fail = parseOutput('--- FAIL: TestAuth\nFAIL\n');
    assertTrue(fail.failed >= 1, 'FAIL should register a failure');
});

test('parseOutput returns null for unknown formats', () => {
    assertEqual(parseOutput('some random output'), null);
});

test('specHasOwnConfig detects build config in spec dir', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    assertFalse(specHasOwnConfig(tmpDir, 'typescript'), 'Empty dir should have no config');
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    assertTrue(specHasOwnConfig(tmpDir, 'typescript'), 'package.json should be detected');
    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// BDD gate (real Gherkin scenarios)
// ============================================================
console.log('\n🐛 BDD Gate');

test('countBddScenarios separates real from placeholder scenarios', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.mkdirSync(path.join(tmpDir, 'features'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'features', 'auth.feature'), `
Feature: Auth
  Scenario: Successful [main action]
    Given [precondition]
    When I login
    Then I should see the dashboard
  Scenario: Successful login
    Given valid credentials
    When I login
    Then I should see the dashboard
  Scenario: [Alternative happy path]
    Given [precondition]
    When I logout
    Then I should see the login screen
`);
    const { real, placeholder, files } = countBddScenarios(tmpDir);
    assertEqual(real, 1, 'Only non-bracketed scenario names count as real');
    assertEqual(placeholder, 2, 'Bracketed scenario names are placeholders');
    assertEqual(files, 1);
    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Rules Preset (curated default rule packs)
// ============================================================
console.log('\n📜 Rules Preset');

function setupRulesFixture() {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    fs.mkdirSync(path.join(harnessDir, 'brain'), { recursive: true });
    fs.writeFileSync(path.join(harnessDir, 'brain', 'AGENTS.md'), '# AGENTS\n');
    fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# AGENTS\n');
    return { tmpDir, harnessDir };
}

test('applyPreset seeds the senior rule pack and syncs into AGENTS.md', () => {
    const { tmpDir, harnessDir } = setupRulesFixture();

    const result = applyPreset(tmpDir, harnessDir, 'senior');
    assertTrue(result.ok, 'Should apply successfully');
    assertTrue(result.added > 5, 'Should add multiple default rules');
    assertEqual(result.skipped, 0, 'Nothing should be skipped on first apply');

    const rc = JSON.parse(fs.readFileSync(path.join(tmpDir, '.harnessrc'), 'utf8'));
    assertEqual(rc.rules.length, result.added, 'Rules should be persisted to .harnessrc');

    const agents = fs.readFileSync(path.join(harnessDir, 'brain', 'AGENTS.md'), 'utf8');
    assertTrue(agents.includes('Project Rules'), 'AGENTS.md should contain the synced rules section');
    assertTrue(agents.includes(rc.rules[0].title), 'AGENTS.md should contain a seeded rule title');

    fs.rmSync(tmpDir, { recursive: true });
});

test('applyPreset is idempotent — a second call skips already-seeded rules', () => {
    const { tmpDir, harnessDir } = setupRulesFixture();

    const first = applyPreset(tmpDir, harnessDir, 'senior');
    const second = applyPreset(tmpDir, harnessDir, 'senior');

    assertEqual(second.added, 0, 'Second apply should add nothing new');
    assertEqual(second.skipped, first.added, 'Second apply should skip everything already present');

    const rc = JSON.parse(fs.readFileSync(path.join(tmpDir, '.harnessrc'), 'utf8'));
    assertEqual(rc.rules.length, first.added, 'Rule count should not duplicate after a second apply');

    fs.rmSync(tmpDir, { recursive: true });
});

test('applyPreset returns an error for an unknown preset name', () => {
    const { tmpDir, harnessDir } = setupRulesFixture();
    const result = applyPreset(tmpDir, harnessDir, 'does-not-exist');
    assertFalse(result.ok, 'Unknown preset should fail gracefully');
    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Glob Matching (rule scoping)
// ============================================================
console.log('\n📦 Glob Matching');

test('matchGlob matches ** across directories', () => {
    assertTrue(matchGlob('src/pages/**', 'src/pages/foo/bar.tsx'), 'Should match nested path under src/pages/');
    assertFalse(matchGlob('src/pages/**', 'src/api/foo.ts'), 'Should not match a sibling directory');
});

test('matchGlob matches **/*.ext at any depth', () => {
    assertTrue(matchGlob('**/*.sql', 'db/migrations/001.sql'), 'Should match nested .sql file');
    assertTrue(matchGlob('**/*.sql', '001.sql'), 'Should match a top-level .sql file too');
    assertFalse(matchGlob('**/*.sql', 'db/migrations/001.js'), 'Should not match a different extension');
});

test('matchGlob single * does not cross directory boundaries', () => {
    assertTrue(matchGlob('src/*.ts', 'src/foo.ts'));
    assertFalse(matchGlob('src/*.ts', 'src/sub/foo.ts'), 'Single * should not match across /');
});

// ============================================================
// Rule scoping (glob field on rules)
// ============================================================
console.log('\n📜 Rule Scoping');

test('rulesForFile includes unscoped rules for any path', () => {
    const rc = { rules: [{ id: 'always', title: 'Always applies', severity: 'must', tag: 'general', enabled: true }] };
    const matches = rulesForFile(rc, 'src/anything.ts');
    assertEqual(matches.length, 1, 'Unscoped rule should apply to any file');
});

test('rulesForFile filters scoped rules by glob', () => {
    const rc = {
        rules: [
            { id: 'ui-only', title: 'UI rule', severity: 'must', tag: 'ui-ux', enabled: true, glob: 'src/pages/**' },
            { id: 'always', title: 'Always applies', severity: 'should', tag: 'general', enabled: true }
        ]
    };
    const inScope = rulesForFile(rc, 'src/pages/list.tsx');
    const outOfScope = rulesForFile(rc, 'src/api/list.ts');

    assertEqual(inScope.length, 2, 'Both rules should apply inside src/pages/');
    assertEqual(outOfScope.length, 1, 'Only the unscoped rule should apply outside src/pages/');
    assertEqual(outOfScope[0].id, 'always');
});

test('rulesForFile excludes disabled rules', () => {
    const rc = { rules: [{ id: 'off', title: 'Disabled rule', severity: 'must', tag: 'general', enabled: false }] };
    assertEqual(rulesForFile(rc, 'src/x.ts').length, 0, 'Disabled rules should never apply');
});

test('harness rules add --glob persists the scope in .harnessrc', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    fs.mkdirSync(path.join(harnessDir, 'brain'), { recursive: true });
    fs.writeFileSync(path.join(harnessDir, 'brain', 'AGENTS.md'), '# AGENTS\n');
    fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# AGENTS\n');

    const { rules } = require('../src/commands/rules.js');
    rules(tmpDir, ['add', 'Scoped UI rule', '--glob=src/pages/**', '--tag=ui-ux']);

    const rc = JSON.parse(fs.readFileSync(path.join(tmpDir, '.harnessrc'), 'utf8'));
    assertEqual(rc.rules.length, 1);
    assertEqual(rc.rules[0].glob, 'src/pages/**', 'glob should be persisted on the rule entry');

    const ruleFile = fs.readFileSync(path.join(harnessDir, 'brain', 'rules', rc.rules[0].id + '.md'), 'utf8');
    assertTrue(ruleFile.includes('glob: src/pages/**'), 'glob should be in the rule frontmatter');

    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Spec Drift Detection (Guardian)
// ============================================================
console.log('\n🔬 Spec Drift Detection');

test('extractTaskPaths extracts backtick-quoted and bare file paths', () => {
    const md = '- [ ] 1.1 Add `matchGlob()` to `src/utils/fileUtils.js`\n- [ ] 1.2 Update src/commands/rules.js too';
    const paths = extractTaskPaths(md);
    assertTrue(paths.has('src/utils/fileUtils.js'), 'Should extract backtick-quoted path');
    assertTrue(paths.has('src/commands/rules.js'), 'Should extract bare path');
});

test('extractTaskPaths returns an empty set for content with no paths', () => {
    assertEqual(extractTaskPaths('- [ ] 1.1 Think about the design').size, 0);
});

function setupDriftFixture() {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    execSync('git init -q', { cwd: tmpDir });
    const harnessDir = path.join(tmpDir, '.harness');
    const specDir = path.join(harnessDir, 'specs', '001-auth');
    fs.mkdirSync(specDir, { recursive: true });
    fs.writeFileSync(path.join(specDir, 'tasks.md'), '- [ ] 1.1 Implement `src/auth.js`');
    const rc = { activeSpecs: [{ id: '001', slug: 'auth', name: 'auth' }] };
    return { tmpDir, harnessDir, rc };
}

test('specDriftCheck flags a file touched outside tasks.md', () => {
    const { tmpDir, harnessDir, rc } = setupDriftFixture();
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'unexpected.js'), '// not in tasks.md\n');

    const result = specDriftCheck(tmpDir, harnessDir, rc, null);
    assertTrue(result !== null, 'Should produce a check result');
    assertEqual(result.status, 'WARN');
    assertTrue(result.hint.includes('src/unexpected.js'), 'Hint should name the unexpected file');

    fs.rmSync(tmpDir, { recursive: true });
});

test('specDriftCheck passes when all changed files are covered', () => {
    const { tmpDir, harnessDir, rc } = setupDriftFixture();
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'auth.js'), '// covered by tasks.md\n');

    const result = specDriftCheck(tmpDir, harnessDir, rc, null);
    assertEqual(result.status, 'PASS', 'Only covered files changed, should be PASS');

    fs.rmSync(tmpDir, { recursive: true });
});

test('specDriftCheck warns "not checkable" outside a git repo', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    const specDir = path.join(harnessDir, 'specs', '001-auth');
    fs.mkdirSync(specDir, { recursive: true });
    fs.writeFileSync(path.join(specDir, 'tasks.md'), '- [ ] 1.1 Implement `src/auth.js`');
    const rc = { activeSpecs: [{ id: '001', slug: 'auth', name: 'auth' }] };

    const result = specDriftCheck(tmpDir, harnessDir, rc, null);
    assertEqual(result.status, 'WARN');
    assertTrue(result.hint.includes('not checkable'), 'Should report not checkable outside a git repo');

    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Concurrent safety (.harnessrc lock)
// ============================================================
console.log('\n🔒 Concurrent Safety (.harnessrc lock)');

test('withHarnessRCLock: sequential acquisitions both succeed', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.writeFileSync(path.join(tmpDir, '.harnessrc'), JSON.stringify({ counter: 0 }));

    withHarnessRCLock(tmpDir, rc => { rc.counter = 1; });
    withHarnessRCLock(tmpDir, rc => { rc.a = 'first'; });

    const rc = loadHarnessRC(tmpDir);
    assertEqual(rc.counter, 1, 'First mutation should persist');
    assertEqual(rc.a, 'first', 'Second mutation should persist on top of the first');

    fs.rmSync(tmpDir, { recursive: true });
});

test('withHarnessRCLock: a held lock blocks a second acquisition until released', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.writeFileSync(path.join(tmpDir, '.harnessrc'), JSON.stringify({}));
    const lockDir = path.join(tmpDir, '.harnessrc.lock');
    fs.mkdirSync(lockDir); // simulate another process holding the lock

    let threw = false;
    try {
        withHarnessRCLock(tmpDir, rc => { rc.x = 1; }, { timeoutMs: 150, retryMs: 30 });
    } catch (e) {
        threw = true;
    }
    assertTrue(threw, 'Should time out instead of writing while the lock is held');

    fs.rmdirSync(lockDir); // release
    withHarnessRCLock(tmpDir, rc => { rc.x = 1; });
    assertEqual(loadHarnessRC(tmpDir).x, 1, 'Should succeed once the lock is released');

    fs.rmSync(tmpDir, { recursive: true });
});

test('withHarnessRCLock: a stale lock is recovered instead of blocking forever', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.writeFileSync(path.join(tmpDir, '.harnessrc'), JSON.stringify({}));
    const lockDir = path.join(tmpDir, '.harnessrc.lock');
    fs.mkdirSync(lockDir);
    const old = new Date(Date.now() - 60000); // 60s old — well past a small staleMs
    fs.utimesSync(lockDir, old, old);

    withHarnessRCLock(tmpDir, rc => { rc.recovered = true; }, { staleMs: 1000, timeoutMs: 500 });
    assertTrue(loadHarnessRC(tmpDir).recovered, 'Should recover the stale lock and write successfully');

    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Ambiguity detector (clarify gate)
// ============================================================
console.log('\n❓ Ambiguity Detector');

test('detectAmbiguities flags missing performance/error/security/scale coverage', () => {
    const findings = detectAmbiguities('This system lets people upload photos.');
    assertEqual(findings.length, 4, 'Should flag all 4 categories when none are mentioned');
});

test('detectAmbiguities returns nothing when all categories are covered', () => {
    const text = 'Performance: p95 under 200ms. Errors return a 4xx with a message. ' +
        'Security: auth required on every endpoint. Scale: supports 500 concurrent users.';
    assertEqual(detectAmbiguities(text).length, 0, 'Should find nothing missing');
});

// ============================================================
// Clarify gate + Approval checkpoint (advance.js lifecycle gating)
// ============================================================
console.log('\n🚦 Lifecycle Gating (clarify + approval)');

function setupAdvanceFixture(specMdContent) {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    const specDir = path.join(harnessDir, 'specs', '001-auth');
    fs.mkdirSync(path.join(harnessDir, 'memory', 'session-logs'), { recursive: true });
    fs.mkdirSync(specDir, { recursive: true });
    fs.writeFileSync(path.join(specDir, 'spec.md'), specMdContent);
    fs.writeFileSync(
        path.join(tmpDir, '.harnessrc'),
        JSON.stringify({
            harnessDir: '.harness',
            activeSpecs: [{ id: '001', slug: 'auth', name: 'auth', agents: {}, status: 'requirements' }],
            quality: { approvalGates: ['architect'] }
        })
    );
    return { tmpDir, harnessDir };
}

function readSpec(tmpDir) {
    const rc = loadHarnessRC(tmpDir);
    return rc.activeSpecs.find(s => s.id === '001');
}

test('advance blocks past architect without approval; harness approve unblocks it', () => {
    const { tmpDir } = setupAdvanceFixture('# spec\nPerformance: fast. Errors: handled. Security: auth. Scale: many users.');

    advance(tmpDir, ['001']); // interviewer -> done
    assertEqual(readSpec(tmpDir).agents.interviewer, 'done');

    advance(tmpDir, ['001']); // architect blocked (no approval yet)
    assertTrue(readSpec(tmpDir).agents.architect !== 'done', 'architect should stay not-done without approval');

    approve(tmpDir, ['001', '--stage=architect']);
    advance(tmpDir, ['001']); // architect now unblocked
    assertEqual(readSpec(tmpDir).agents.architect, 'done', 'architect should advance once approved');

    fs.rmSync(tmpDir, { recursive: true });
});

test('approve is idempotent: re-approving is a no-op with a single log entry', () => {
    const { tmpDir, harnessDir } = setupAdvanceFixture('# spec\nno details');

    approve(tmpDir, ['001', '--stage=architect']);
    approve(tmpDir, ['001', '--stage=architect']);

    const logs = fs.readdirSync(path.join(harnessDir, 'memory', 'session-logs')).filter(f => f.startsWith('approved-001-'));
    assertEqual(logs.length, 1, 'Only one approval log entry should exist after approving twice');

    fs.rmSync(tmpDir, { recursive: true });
});

test('advance blocks tester on unresolved ambiguities, --force overrides and logs it', () => {
    const { tmpDir, harnessDir } = setupAdvanceFixture('# spec\nJust a vague description, nothing specific.');

    approve(tmpDir, ['001', '--stage=architect']);
    advance(tmpDir, ['001']); // interviewer -> done
    advance(tmpDir, ['001']); // architect -> done (approved)
    assertEqual(readSpec(tmpDir).agents.architect, 'done');

    advance(tmpDir, ['001']); // tester blocked on ambiguities
    assertTrue(readSpec(tmpDir).agents.tester !== 'done', 'tester should stay blocked without --force');

    advance(tmpDir, ['001', '--force']); // override
    assertEqual(readSpec(tmpDir).agents.tester, 'done', 'tester should advance with --force');

    const logs = fs.readdirSync(path.join(harnessDir, 'memory', 'session-logs')).filter(f => f.startsWith('ambiguity-override-001-'));
    assertEqual(logs.length, 1, 'The override should be logged');

    fs.rmSync(tmpDir, { recursive: true });
});

test('advance proceeds through tester normally when spec.md has no detected ambiguities', () => {
    const { tmpDir } = setupAdvanceFixture(
        '# spec\nPerformance: p95 200ms. Errors: return 4xx. Security: auth required. Scale: 500 concurrent.'
    );

    approve(tmpDir, ['001', '--stage=architect']);
    advance(tmpDir, ['001']); // interviewer
    advance(tmpDir, ['001']); // architect
    advance(tmpDir, ['001']); // tester — should NOT block
    assertEqual(readSpec(tmpDir).agents.tester, 'done', 'tester should advance without --force when spec.md is unambiguous');

    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Parallel spec orchestration (claim/release protocol)
// ============================================================
console.log('\n🎛️  Parallel Spec Orchestration');

function setupOrchestrateFixture() {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    fs.mkdirSync(path.join(harnessDir, 'memory', 'session-logs'), { recursive: true });
    fs.writeFileSync(
        path.join(tmpDir, '.harnessrc'),
        JSON.stringify({
            harnessDir: '.harness',
            activeSpecs: [{ id: '001', slug: 'auth', name: 'auth', agents: {}, status: 'requirements' }]
        })
    );
    return { tmpDir, harnessDir };
}

test('orchestrate claim succeeds on a free spec', () => {
    const { tmpDir } = setupOrchestrateFixture();
    orchestrate(tmpDir, ['claim', '001', '--owner=agent-a']);
    const rc = loadHarnessRC(tmpDir);
    assertEqual(rc.activeSpecs[0].claimedBy, 'agent-a');

    fs.rmSync(tmpDir, { recursive: true });
});

test('orchestrate claim is idempotent for the same owner', () => {
    const { tmpDir } = setupOrchestrateFixture();
    orchestrate(tmpDir, ['claim', '001', '--owner=agent-a']);
    const firstClaimedAt = loadHarnessRC(tmpDir).activeSpecs[0].claimedAt;

    orchestrate(tmpDir, ['claim', '001', '--owner=agent-a']);
    const rc = loadHarnessRC(tmpDir);
    assertEqual(rc.activeSpecs[0].claimedBy, 'agent-a');
    assertEqual(rc.activeSpecs[0].claimedAt, firstClaimedAt, 'Re-claiming your own claim should not change the timestamp');

    fs.rmSync(tmpDir, { recursive: true });
});

test('orchestrate claim is refused for a fresh claim held by someone else', () => {
    const { tmpDir } = setupOrchestrateFixture();
    orchestrate(tmpDir, ['claim', '001', '--owner=agent-a']);
    orchestrate(tmpDir, ['claim', '001', '--owner=agent-b']);

    const rc = loadHarnessRC(tmpDir);
    assertEqual(rc.activeSpecs[0].claimedBy, 'agent-a', 'Claim should remain with the original owner');

    fs.rmSync(tmpDir, { recursive: true });
});

test('orchestrate claim steals a stale claim and logs it', () => {
    const { tmpDir, harnessDir } = setupOrchestrateFixture();
    const rc = loadHarnessRC(tmpDir);
    rc.activeSpecs[0].claimedBy = 'agent-a';
    rc.activeSpecs[0].claimedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // 3h old
    fs.writeFileSync(path.join(tmpDir, '.harnessrc'), JSON.stringify(rc));

    orchestrate(tmpDir, ['claim', '001', '--owner=agent-b']);

    const after = loadHarnessRC(tmpDir);
    assertEqual(after.activeSpecs[0].claimedBy, 'agent-b', 'Stale claim should be taken over');

    const logs = fs.readdirSync(path.join(harnessDir, 'memory', 'session-logs')).filter(f => f.startsWith('claim-stolen-001-'));
    assertEqual(logs.length, 1, 'Stealing a stale claim should be logged');

    fs.rmSync(tmpDir, { recursive: true });
});

test('orchestrate release is idempotent', () => {
    const { tmpDir } = setupOrchestrateFixture();
    orchestrate(tmpDir, ['release', '001']); // never claimed — no-op
    orchestrate(tmpDir, ['claim', '001', '--owner=agent-a']);
    orchestrate(tmpDir, ['release', '001']);
    orchestrate(tmpDir, ['release', '001']); // already released — no-op

    const rc = loadHarnessRC(tmpDir);
    assertTrue(!rc.activeSpecs[0].claimedBy, 'Spec should be free after release');

    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Memory compaction
// ============================================================
console.log('\n🗜️  Memory Compaction');

function writeLogWithAge(logsDir, name, ageDays, frontmatterExtra = '') {
    const fp = path.join(logsDir, name);
    fs.writeFileSync(fp, `---\ndate: some-date\nagent: harness-cli\nevent: stage-advanced\n${frontmatterExtra}---\n\n# ${name}\n`);
    const past = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000);
    fs.utimesSync(fp, past, past);
    return fp;
}

test('memory compact archives logs older than the threshold and writes a digest', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    const logsDir = path.join(harnessDir, 'memory', 'session-logs');
    fs.mkdirSync(logsDir, { recursive: true });
    writeLogWithAge(logsDir, 'old-log.md', 40);

    const result = compactSessionLogs(tmpDir, harnessDir, { days: 30 });
    assertEqual(result.archived, 1, 'One log should be archived');
    assertFalse(fs.existsSync(path.join(logsDir, 'old-log.md')), 'Original should be moved out');
    assertTrue(fs.existsSync(path.join(harnessDir, '.archive', 'session-logs', 'old-log.md')), 'Should exist in the archive');
    assertTrue(fs.existsSync(result.digestPath), 'Digest file should be written');

    fs.rmSync(tmpDir, { recursive: true });
});

test('memory compact leaves recent logs in place', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    const logsDir = path.join(harnessDir, 'memory', 'session-logs');
    fs.mkdirSync(logsDir, { recursive: true });
    writeLogWithAge(logsDir, 'recent-log.md', 2);

    const result = compactSessionLogs(tmpDir, harnessDir, { days: 30 });
    assertEqual(result.archived, 0, 'Recent log should not be archived');
    assertTrue(fs.existsSync(path.join(logsDir, 'recent-log.md')), 'Recent log should stay in place');

    fs.rmSync(tmpDir, { recursive: true });
});

test('memory compact is idempotent — a second run finds nothing to compact', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    const logsDir = path.join(harnessDir, 'memory', 'session-logs');
    fs.mkdirSync(logsDir, { recursive: true });
    writeLogWithAge(logsDir, 'old-log.md', 40);

    compactSessionLogs(tmpDir, harnessDir, { days: 30 });
    const second = compactSessionLogs(tmpDir, harnessDir, { days: 30 });
    assertEqual(second.archived, 0, 'Second run should find nothing eligible');

    fs.rmSync(tmpDir, { recursive: true });
});

test('archived logs are excluded from a rebuilt BM25 index', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    const logsDir = path.join(harnessDir, 'memory', 'session-logs');
    fs.mkdirSync(logsDir, { recursive: true });
    writeLogWithAge(logsDir, 'old-log.md', 40);

    compactSessionLogs(tmpDir, harnessDir, { days: 30 });
    const index = buildIndex(harnessDir);
    const hasArchived = Object.keys(index.docs).some(rel => rel.includes('.archive'));
    assertFalse(hasArchived, 'Archived logs must not be part of the indexed corpus');

    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Graph Memory (typed, weighted, temporal — section-level)
// ============================================================
console.log('\n🕸️  Graph Memory');

function writeVault(files) {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    for (const [rel, content] of Object.entries(files)) {
        const fp = path.join(tmpDir, rel);
        fs.mkdirSync(path.dirname(fp), { recursive: true });
        fs.writeFileSync(fp, content);
    }
    return tmpDir;
}

test('splitSections chunks by heading and keeps a preamble node', () => {
    const sections = splitSections('# Title\nintro text\n\n## Context\nctx body\n\n## Decision\ndecision body\n');
    assertEqual(sections.length, 3, 'Should produce preamble + 2 heading sections');
    assertEqual(sections[0].heading, null, 'First section has no heading');
    assertEqual(sections[1].heading, 'Context', 'Second section heading');
    assertEqual(sections[2].heading, 'Decision', 'Third section heading');
});

test('classifyType infers node type from vault path', () => {
    assertEqual(classifyType('brain/decisions/adr-001.md'), 'decision');
    assertEqual(classifyType('brain/patterns/clean-architecture.md'), 'pattern');
    assertEqual(classifyType('brain/constitution.md'), 'charter');
    assertEqual(classifyType('specs/001-auth/spec.md'), 'spec');
    assertEqual(classifyType('memory/session-logs/2026-01-01.md'), 'session');
    assertEqual(classifyType('memory/random-note.md'), 'note');
});

test('buildGraph produces one node per section, typed and scored by confidence', () => {
    const tmpDir = writeVault({
        'brain/decisions/adr-001.md': '---\ndate: 2026-01-01\n---\n# ADR-001\n\n## Decision\nUse BM25 for retrieval.\n'
    });
    const graph = buildGraph(tmpDir);
    assertEqual(graph.numNodes, 2, 'Preamble + Decision section');
    const decisionNode = graph.nodes['brain/decisions/adr-001.md#decision'];
    assertTrue(!!decisionNode, 'Decision section should be addressable by file#heading');
    assertEqual(decisionNode.type, 'decision');
    assertEqual(decisionNode.confidence, 1.0, 'Decisions are fully confident by default');
    fs.rmSync(tmpDir, { recursive: true });
});

test('buildGraph turns wikilinks into references edges', () => {
    const tmpDir = writeVault({
        'brain/decisions/adr-001.md': '# ADR-001\n\n## Decision\nSee [[adr-002]] for the follow-up.\n',
        'brain/decisions/adr-002.md': '# ADR-002\n\n## Decision\nFollow-up decision.\n'
    });
    const graph = buildGraph(tmpDir);
    const refs = graph.edges.filter(e => e.type === 'references');
    assertTrue(refs.some(e => e.to === 'brain/decisions/adr-002.md'), 'Wikilink should resolve to the target file id');
    fs.rmSync(tmpDir, { recursive: true });
});

test('queryGraph ranks the matching section above an unrelated one', () => {
    const tmpDir = writeVault({
        'brain/decisions/auth.md': '# Auth\n\n## Decision\nUse short-lived access tokens and refresh tokens for authentication.\n',
        'brain/decisions/billing.md': '# Billing\n\n## Decision\nInvoices and refunds go through Stripe webhooks.\n'
    });
    const graph = buildGraph(tmpDir);
    const { nodes } = queryGraph(graph, 'authentication access token', { budgetTokens: 600 });
    assertTrue(nodes.length > 0, 'Should return matches');
    assertEqual(nodes[0].file, 'brain/decisions/auth.md', 'Auth section should rank first');
    fs.rmSync(tmpDir, { recursive: true });
});

test('queryGraph excludes a section superseded by a newer note', () => {
    const tmpDir = writeVault({
        'brain/decisions/adr-001.md': '---\ndate: 2026-01-01\n---\n# ADR-001\n\n## Decision\nUse plain BM25 file-level retrieval.\n',
        'brain/decisions/adr-002.md': '---\ndate: 2026-06-01\nsupersedes: brain/decisions/adr-001.md\n---\n# ADR-002\n\n## Decision\nUse section-level graph retrieval instead.\n'
    });
    const graph = buildGraph(tmpDir);
    const superseded = graph.nodes['brain/decisions/adr-001.md#decision'];
    assertTrue(superseded.validUntil !== null, 'Superseded section should have a validUntil');

    const { nodes } = queryGraph(graph, 'retrieval', { budgetTokens: 600 });
    assertFalse(nodes.some(n => n.file === 'brain/decisions/adr-001.md'), 'Superseded ADR must not surface in results');
    assertTrue(nodes.some(n => n.file === 'brain/decisions/adr-002.md'), 'Superseding ADR should surface');
    fs.rmSync(tmpDir, { recursive: true });
});

test('queryGraph stops adding nodes once the token budget is exhausted', () => {
    const tmpDir = writeVault({
        'brain/decisions/adr-001.md': `# ADR-001\n\n## Decision\n${'retrieval architecture decision. '.repeat(80)}\n`
    });
    const graph = buildGraph(tmpDir);
    const { nodes, tokensUsed, truncated } = queryGraph(graph, 'retrieval architecture decision', { budgetTokens: 10 });
    assertEqual(nodes.length, 0, 'A section larger than the budget should not be added');
    assertTrue(truncated, 'Should report truncation');
    assertTrue(tokensUsed <= 10, 'Token usage must respect the budget');
    fs.rmSync(tmpDir, { recursive: true });
});

test('recencyDecay leaves durable types (decision) at full weight regardless of age', () => {
    const oldNode = { type: 'decision', validFrom: Date.now() - 400 * 24 * 60 * 60 * 1000 };
    assertEqual(recencyDecay(oldNode, Date.now()), 1, 'Decisions never decay');
});

test('recencyDecay fades a session note over time', () => {
    const fresh = { type: 'session', validFrom: Date.now() };
    const old = { type: 'session', validFrom: Date.now() - 60 * 24 * 60 * 60 * 1000 };
    const now = Date.now();
    assertTrue(recencyDecay(fresh, now) > recencyDecay(old, now), 'A 60-day-old session note should score lower than a fresh one');
});

test('getOnDemandContext returns only the matching section, not the whole file', () => {
    const tmpDir = writeVault({
        'brain/decisions/adr-001.md': `# ADR-001\n\n## Context\nUnrelated background noise padding out this file.\n\n## Decision\nUse rate limiting on the auth endpoint.\n`
    });
    const harnessDir = tmpDir; // getOnDemandContext takes the harness dir directly
    const out = getOnDemandContext(harnessDir, 'rate limiting auth endpoint', { budgetTokens: 600 });
    assertTrue(out.includes('rate limiting'), 'Should include the matching section');
    assertTrue(out.includes('#decision') || out.includes('Decision'), 'Should be scoped to the Decision section');
    fs.rmSync(tmpDir, { recursive: true });
});

test('memory compact rebuilds the graph index so archived logs drop out of it', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    const logsDir = path.join(harnessDir, 'memory', 'session-logs');
    fs.mkdirSync(logsDir, { recursive: true });
    writeLogWithAge(logsDir, 'old-log.md', 40);

    compactSessionLogs(tmpDir, harnessDir, { days: 30 });
    const graph = buildGraph(harnessDir);
    const hasArchived = Object.values(graph.nodes).some(n => n.file.includes('.archive'));
    assertFalse(hasArchived, 'Archived logs must not be part of the graph corpus');

    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Symbol Index
// ============================================================
console.log('\n🔎 Symbol Index');

test('buildSymbolIndex finds a JS function and class definition', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'auth.js'),
        'function getUserByEmail(email) {\n  return null;\n}\n\nclass AuthService {\n}\n');

    const index = buildSymbolIndex(tmpDir);
    assertTrue(!!index.symbols.getUserByEmail, 'Should find the function');
    assertEqual(index.symbols.getUserByEmail[0].line, 1);
    assertEqual(index.symbols.getUserByEmail[0].kind, 'function');
    assertTrue(!!index.symbols.AuthService, 'Should find the class');
    assertEqual(index.symbols.AuthService[0].kind, 'class');

    fs.rmSync(tmpDir, { recursive: true });
});

test('buildSymbolIndex finds a Python def', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.writeFileSync(path.join(tmpDir, 'auth.py'), 'def get_user_by_email(email):\n    return None\n');

    const index = buildSymbolIndex(tmpDir);
    assertTrue(!!index.symbols.get_user_by_email, 'Should find the Python function');

    fs.rmSync(tmpDir, { recursive: true });
});

test('findSymbol falls back to substring matches when there is no exact hit', () => {
    const index = { symbols: { getUserByEmail: [{ file: 'src/auth.js', line: 1, kind: 'function' }] } };
    const exactMiss = findSymbol(index, 'getUser');
    assertEqual(exactMiss.exact.length, 0);
    assertTrue(exactMiss.partial.length > 0, 'Should fall back to a substring match');
    assertEqual(exactMiss.partial[0].symbol, 'getUserByEmail');
});

test('findSymbol reports no matches cleanly', () => {
    const index = { symbols: { getUserByEmail: [{ file: 'src/auth.js', line: 1, kind: 'function' }] } };
    const result = findSymbol(index, 'totallyUnrelatedName');
    assertEqual(result.exact.length, 0);
    assertEqual(result.partial.length, 0);
});

test('getSymbolIndex auto-rebuilds when the project source changes (no manual reindex step)', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    fs.mkdirSync(path.join(harnessDir, 'brain'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'a.js'), 'function firstFn() {}\n');

    const first = getSymbolIndex(tmpDir, harnessDir);
    assertTrue(!!first.symbols.firstFn, 'Should find the first function');
    assertFalse(!!first.symbols.secondFn, 'secondFn does not exist yet');

    fs.writeFileSync(path.join(tmpDir, 'src', 'a.js'), 'function firstFn() {}\nfunction secondFn() {}\n');
    const second = getSymbolIndex(tmpDir, harnessDir);
    assertTrue(!!second.symbols.secondFn, 'A second call after a source change should see the new function without an explicit rebuild call');

    fs.rmSync(tmpDir, { recursive: true });
});

test('getSymbolIndex returns the cached index unchanged when nothing changed', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    fs.mkdirSync(path.join(harnessDir, 'brain'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'a.js'), 'function firstFn() {}\n');

    const first = getSymbolIndex(tmpDir, harnessDir);
    const second = getSymbolIndex(tmpDir, harnessDir);
    assertEqual(second.builtAt, first.builtAt, 'Should not rebuild (same builtAt) when the fingerprint is unchanged');

    fs.rmSync(tmpDir, { recursive: true });
});

test('findReferences finds call sites and excludes the definition line', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'total.js'),
        'function computeTotal(items) {\n  return 0;\n}\n');
    fs.writeFileSync(path.join(tmpDir, 'src', 'orders.js'),
        'const x = computeTotal(cart);\nconsole.log(computeTotal(other));\n');

    const index = buildSymbolIndex(tmpDir);
    const defs = index.symbols.computeTotal;
    const refs = findReferences(tmpDir, 'computeTotal', defs);

    assertEqual(refs.length, 2, 'Should find both call sites, one per line');
    assertFalse(refs.some(r => r.file === 'src/total.js' && r.line === 1), 'Should exclude the definition line itself');

    fs.rmSync(tmpDir, { recursive: true });
});

test('findReferences returns empty when a symbol is never used elsewhere', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'dead.js'), 'function neverCalled() {}\n');

    const index = buildSymbolIndex(tmpDir);
    const refs = findReferences(tmpDir, 'neverCalled', index.symbols.neverCalled);
    assertEqual(refs.length, 0, 'A symbol used only in its own definition line has no references');

    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Guardian self-judge
// ============================================================
console.log('\n⚖️  Guardian Self-Judge');

function makeRule(id, severity = 'must') {
    return { id, title: `Rule ${id}`, severity, tag: 'general', enabled: true };
}

test('selectJudgeRules picks up to 3 enabled must rules', () => {
    const rc = { rules: [makeRule('a'), makeRule('b'), makeRule('c'), makeRule('d'), makeRule('e', 'should')] };
    const selected = selectJudgeRules(rc);
    assertEqual(selected.length, 3, 'Should cap at 3');
    assertTrue(selected.every(r => r.severity === 'must'), 'Should only select must rules');
});

function setupJudgeFixture() {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    fs.mkdirSync(path.join(harnessDir, 'memory', 'session-logs'), { recursive: true });
    fs.writeFileSync(
        path.join(tmpDir, '.harnessrc'),
        JSON.stringify({
            harnessDir: '.harness',
            rules: [makeRule('a'), makeRule('b')],
            activeSpecs: [{ id: '001', slug: 'auth', name: 'auth', agents: {} }]
        })
    );
    return { tmpDir, harnessDir };
}

test('judge-record persists a verdict on the spec', () => {
    const { tmpDir } = setupJudgeFixture();
    judgeRecord(tmpDir, ['001', '--rule=a', '--verdict=pass', '--note=looks good']);

    const rc = loadHarnessRC(tmpDir);
    const spec = rc.activeSpecs.find(s => s.id === '001');
    assertEqual(spec.judgeVerdicts.length, 1);
    assertEqual(spec.judgeVerdicts[0].verdict, 'pass');

    fs.rmSync(tmpDir, { recursive: true });
});

test('review FAILs when a judge verdict is recorded as fail', () => {
    const { tmpDir } = setupJudgeFixture();
    judgeRecord(tmpDir, ['001', '--rule=a', '--verdict=fail', '--note=broke it']);

    const rc = loadHarnessRC(tmpDir);
    const result = judgeCheck(rc, '001');
    assertEqual(result.status, 'FAIL', 'A recorded fail verdict should fail the Guardian check');

    fs.rmSync(tmpDir, { recursive: true });
});

test('review WARNs when a selected rule was never judged', () => {
    const { tmpDir } = setupJudgeFixture();
    // rule "a" never judged, rule "b" never judged either
    const rc = loadHarnessRC(tmpDir);
    const result = judgeCheck(rc, '001');
    assertEqual(result.status, 'WARN', 'Unjudged selected rules should warn, not silently pass');

    fs.rmSync(tmpDir, { recursive: true });
});

test('review is clean (PASS) when all selected rules have a recorded pass verdict', () => {
    const { tmpDir } = setupJudgeFixture();
    judgeRecord(tmpDir, ['001', '--rule=a', '--verdict=pass']);
    judgeRecord(tmpDir, ['001', '--rule=b', '--verdict=pass']);

    const rc = loadHarnessRC(tmpDir);
    const result = judgeCheck(rc, '001');
    assertEqual(result.status, 'PASS');

    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Context command — single automatic entry point (search + symbol folded in)
// ============================================================
console.log('\n📦 Context (unified automatic entry point)');

function captureConsole(fn) {
    const original = console.log;
    let out = '';
    console.log = (...a) => { out += a.map(String).join(' ') + '\n'; };
    try { fn(); } finally { console.log = original; }
    return out;
}

test('harness context --symbol= finds a real definition without a separate command', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    fs.mkdirSync(path.join(harnessDir, 'brain'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'auth.js'), 'function getUserByEmail(e) {}\n');
    fs.writeFileSync(path.join(tmpDir, '.harnessrc'), JSON.stringify({ harnessDir: '.harness' }));

    const output = captureConsole(() => context(tmpDir, ['--symbol=getUserByEmail']));
    assertTrue(output.includes('src/auth.js:1'), 'Context bundle should include the symbol location');

    fs.rmSync(tmpDir, { recursive: true });
});

test('harness context --symbol= reports cleanly when nothing matches', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    fs.mkdirSync(path.join(harnessDir, 'brain'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.harnessrc'), JSON.stringify({ harnessDir: '.harness' }));

    const output = captureConsole(() => context(tmpDir, ['--symbol=totallyMissingSymbol']));
    assertTrue(output.includes('no matching symbol found'), 'Should report no match cleanly, not crash');

    fs.rmSync(tmpDir, { recursive: true });
});

// This is a regression guard: help.js's MCP tool count went stale TWICE this
// session (once for months pre-session at "13 tools" while the real count had
// grown to 20, and again right after the memory_search/symbol/rules_list/
// clarify tool-reduction pass, where help.js briefly still said "24 tools").
// Nothing else would catch that drift, since help.js and harness-mcp.js are
// two independent files with no shared source of truth for the count.
test('help.js MCP tool count matches the actual TOOLS array in harness-mcp.js', () => {
    const mcpSource = fs.readFileSync(path.join(__dirname, '..', 'bin', 'harness-mcp.js'), 'utf8');
    const actualCount = (mcpSource.match(/\bname: 'harness_[a-zA-Z_]+'/g) || []).length;
    assertTrue(actualCount > 0, 'Sanity check: should find at least one tool definition');

    const helpOutput = captureConsole(() => showHelp());
    const m = helpOutput.match(/MCP server \((\d+) tools\)/);
    assertTrue(!!m, 'help.js should state the MCP tool count in this exact format');
    assertEqual(parseInt(m[1], 10), actualCount, 'help.js tool count must match harness-mcp.js — update BOTH when adding/removing a tool');
});

// ============================================================
// CLI dispatcher (runCLI / src/cli.js) — routing, not just command logic
// ============================================================
console.log('\n🧭 CLI Dispatcher (runCLI)');

// Everything above tests command functions directly (rules(), advance(), ...),
// which never exercises src/cli.js's switch/case routing. That routing was
// rewritten twice this session (clarify+approve -> `gate`, judge-record ->
// `judge record`) with nothing catching a typo'd case label. These tests
// go through runCLI() itself, the same entry point bin/harness.js uses.

test('runCLI routes "gate approve" to the approve command', () => {
    const { tmpDir } = setupJudgeFixture();
    runCLI(['gate', 'approve', '001'], { cwd: tmpDir });

    const rc = loadHarnessRC(tmpDir);
    assertTrue(!!rc.activeSpecs[0].approvals?.architect, 'gate approve should record an approval');

    fs.rmSync(tmpDir, { recursive: true });
});

test('runCLI routes "gate clarify" to the clarify command without mutating state', () => {
    const { tmpDir } = setupAdvanceFixture('# spec\nno details at all');
    const before = loadHarnessRC(tmpDir);

    runCLI(['gate', 'clarify', '001'], { cwd: tmpDir });

    const after = loadHarnessRC(tmpDir);
    assertEqual(JSON.stringify(after), JSON.stringify(before), 'clarify is read-only, .harnessrc should be untouched');

    fs.rmSync(tmpDir, { recursive: true });
});

test('runCLI routes "judge record" to persist a verdict', () => {
    const { tmpDir } = setupJudgeFixture();
    runCLI(['judge', 'record', '001', '--rule=a', '--verdict=pass'], { cwd: tmpDir });

    const rc = loadHarnessRC(tmpDir);
    assertEqual(rc.activeSpecs[0].judgeVerdicts.length, 1);
    assertEqual(rc.activeSpecs[0].judgeVerdicts[0].verdict, 'pass');

    fs.rmSync(tmpDir, { recursive: true });
});

test('runCLI routes "orchestrate claim" through to the orchestrate command', () => {
    const { tmpDir } = setupJudgeFixture();
    runCLI(['orchestrate', 'claim', '001', '--owner=test-agent'], { cwd: tmpDir });

    const rc = loadHarnessRC(tmpDir);
    assertEqual(rc.activeSpecs[0].claimedBy, 'test-agent');

    fs.rmSync(tmpDir, { recursive: true });
});

test('runCLI does not throw on an unknown command (falls back to help)', () => {
    const { tmpDir } = setupJudgeFixture();
    let threw = false;
    try { runCLI(['this-command-does-not-exist'], { cwd: tmpDir }); } catch (e) { threw = true; }
    assertFalse(threw, 'Unknown commands should print help, not throw');

    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// new-change defensive fix: activeSpecs may be missing from .harnessrc
// ============================================================
console.log('\n🩹 new-change Defensive Fix');

test('new-change initializes activeSpecs when missing from .harnessrc', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    const harnessDir = path.join(tmpDir, '.harness');
    fs.mkdirSync(path.join(harnessDir, 'specs'), { recursive: true });
    fs.mkdirSync(path.join(harnessDir, 'memory', 'session-logs'), { recursive: true });
    fs.mkdirSync(path.join(harnessDir, 'brain', 'decisions'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.harnessrc'), JSON.stringify({
        harnessDir: '.harness',
        language: { detected: 'typescript', name: 'TypeScript' }
        // deliberately no activeSpecs — simulates a hand-edited/legacy .harnessrc
    }));

    let threw = false;
    try {
        newChange(tmpDir, ['auth-flow']);
    } catch (e) {
        threw = true;
    }
    assertFalse(threw, 'new-change should not crash when activeSpecs is missing');

    const rc = JSON.parse(fs.readFileSync(path.join(tmpDir, '.harnessrc'), 'utf8'));
    assertEqual(rc.activeSpecs.length, 1, 'activeSpecs should be created and contain the new spec');

    fs.rmSync(tmpDir, { recursive: true });
});

// ============================================================
// Summary
// ============================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}\n`);

if (failed > 0) {
    process.exit(1);
}
