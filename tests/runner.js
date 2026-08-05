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
const { slugify, timestamp, nextSpecId } = require('../src/utils/fileUtils.js');

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
// Summary
// ============================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}\n`);

if (failed > 0) {
    process.exit(1);
}
