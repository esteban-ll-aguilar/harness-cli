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
const { slugify, timestamp, nextSpecId, listFiles } = require('../src/utils/fileUtils.js');
const { tokenize, buildIndex, search } = require('../src/utils/retrieval.js');
const { getToolConfig } = require('../src/utils/aiAdapter.js');
const { parseToolsFlag, writeToolConfigs } = require('../src/utils/toolSetup.js');
const { STAGES, countBddScenarios } = require('../src/commands/advance.js');
const { parseOutput, specHasOwnConfig } = require('../src/utils/testRunner.js');

console.log('\n🧪 Running Harness CLI Tests\n');

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
    assertEqual(opencode.mcp.harness.command, 'harness-mcp', 'opencode.json should register harness MCP');
    assertTrue(opencode.instructions.includes('.harness/brain/AGENTS.md'), 'opencode.json should reference AGENTS.md');

    const toml = fs.readFileSync(path.join(tmpDir, '.codex', 'config.toml'), 'utf8');
    assertTrue(toml.includes('mcp_servers.harness'), 'Codex config.toml should register harness MCP');

    const cursorMcp = fs.readFileSync(path.join(tmpDir, '.cursor', 'mcp.json'), 'utf8');
    assertTrue(cursorMcp.includes('harness-mcp'), 'Cursor mcp.json should register harness MCP');

    // Unselected tools must NOT be written
    assertTrue(!fs.existsSync(path.join(tmpDir, 'opencode.json.other')), 'sanity');
    fs.rmSync(tmpDir, { recursive: true });
});

test('writeToolConfigs merges into existing opencode.json', () => {
    const tmpDir = fs.mkdtempSync('/tmp/harness-test-');
    fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify({ theme: 'dark' }));
    writeToolConfigs(tmpDir, ['opencode']);
    const merged = JSON.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
    assertEqual(merged.theme, 'dark', 'Existing keys should be preserved');
    assertEqual(merged.mcp.harness.command, 'harness-mcp', 'MCP should be added to existing file');
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
// Summary
// ============================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}\n`);

if (failed > 0) {
    process.exit(1);
}
