const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getLanguageConfig } = require('./languageDetector.js');

/**
 * Test Runner — executes the spec's tests for real and parses the result.
 *
 *   runTests(cwd, specDir, langConfig, { cmd })
 *     → { runnable, command, passed, failed, output, ok, reason? }
 *
 * Strategy (honest, no fake results):
 *   1. If the spec dir has its own build config (package.json, go.mod, …)
 *      run langConfig.runner there.
 *   2. Otherwise run the language's test binary directly against the spec's
 *      tests/ dir from the project root.
 *   3. If the binary is missing → { runnable: false, reason } — the caller
 *      reports it as WARN, never as a fake pass.
 *
 * Parsing supports Jest, Vitest, pytest, go test, cargo test and a generic
 * `N passed, M failed` pattern. `--cmd=...` overrides the command entirely.
 */

const BUILDCONFIG_FILES = {
    typescript: 'package.json',
    javascript: 'package.json',
    python: ['pyproject.toml', 'pytest.ini', 'setup.cfg'],
    go: 'go.mod',
    rust: 'Cargo.toml',
    java: 'pom.xml',
    csharp: '.csproj',
    ruby: 'Gemfile',
    php: 'composer.json',
    swift: 'Package.swift',
    kotlin: 'build.gradle.kts',
    dart: 'pubspec.yaml'
};

function specHasOwnConfig(specDir, lang) {
    const candidates = BUILDCONFIG_FILES[lang] || [];
    const list = Array.isArray(candidates) ? candidates : [candidates];
    return list.some(f => fs.existsSync(path.join(specDir, f)));
}

/**
 * Parse test output for pass/fail counts. Returns { passed, failed } or null
 * when the format is unknown (exit code decides then).
 */
function parseOutput(output) {
    if (!output) return null;

    // Jest:  "Tests: 12 passed, 3 failed, 15 total"
    // Vitest: "Tests  12 passed (3 failed)"
    let m = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+failed/i);
    if (m) return { passed: +m[1], failed: +m[2] };

    // pytest: "12 passed, 3 failed"
    m = output.match(/(\d+)\s+passed,\s+(\d+)\s+failed/i);
    if (m) return { passed: +m[1], failed: +m[2] };

    // cargo:  "test result: ok. 12 passed; 3 failed"
    m = output.match(/test result:\s+(ok|FAILED)\.\s+(\d+)\s+passed;?\s*(\d+)\s+failed/i);
    if (m) return { passed: +m[2], failed: +m[3] };

    // go:     "ok   package"  /  "--- FAIL:"
    if (/^FAIL/m.test(output) || /--- FAIL:/.test(output)) {
        const ok = (output.match(/^ok\s/m) || []).length;
        return { passed: ok, failed: 1 };
    }
    if (/^ok\s/m.test(output)) return { passed: 1, failed: 0 };

    return null;
}

/**
 * Build the command for a language run against the spec's tests dir.
 */
function buildCommand(cwd, specDir, langConfig) {
    const testsPath = path.join(specDir, 'tests');
    const rootTests = path.relative(cwd, testsPath);
    const lang = langConfig.templateDir || 'javascript';

    switch (lang) {
        case 'typescript':
        case 'javascript':
            // Respect a local package.json first, else run the framework directly
            if (specHasOwnConfig(specDir, lang)) {
                return { command: langConfig.runner, cwd: specDir };
            }
            return { command: `npx --no-install vitest run ${rootTests} || npx --no-install jest ${rootTests}`, cwd };
        case 'python':
            if (specHasOwnConfig(specDir, lang)) return { command: langConfig.runner, cwd: specDir };
            return { command: `python -m pytest ${rootTests}`, cwd };
        case 'go':
            return { command: 'go test ./...', cwd: specDir };
        case 'rust':
            return { command: 'cargo test', cwd: specDir };
        default:
            // Java, C#, Ruby, PHP, Kotlin, Dart, Swift — best effort in the spec dir
            return { command: langConfig.runner, cwd: specDir };
    }
}

/**
 * Run the spec's tests.
 *   runTests(cwd, specDir, langConfig, { cmd, timeoutMs })
 */
function runTests(cwd, specDir, langConfig, opts = {}) {
    const { command: builtCmd, cwd: builtCwd } = buildCommand(cwd, specDir, langConfig);
    const command = opts.cmd || builtCmd;
    // Explicit --cmd overrides run from the spec dir (that's where the tests live)
    const runCwd = opts.cmd ? specDir : builtCwd;
    const timeoutMs = opts.timeoutMs || 120000;

    const result = {
        runnable: true,
        command,
        passed: 0,
        failed: 0,
        output: '',
        ok: false
    };

    try {
        const out = execSync(command, {
            cwd: runCwd,
            encoding: 'utf8',
            timeout: timeoutMs,
            shell: '/bin/bash',
            stdio: ['ignore', 'pipe', 'pipe']
        });
        result.output = out;
        result.ok = true;
        // npx --no-install with a missing package prints this and exits 0 — treat as not runnable
        if (/npx canceled due to missing packages/i.test(out)) {
            result.runnable = false;
            result.reason = `missing test framework (${out.match(/\["([^"]+)"\]/)?.[1] || 'unknown'}) — install it or use --cmd=`;
            result.ok = false;
            return result;
        }
        const parsed = parseOutput(out);
        if (parsed) { result.passed = parsed.passed; result.failed = parsed.failed; }
        else { result.passed = 1; result.failed = 0; }
        return result;
    } catch (e) {
        result.output = (e.stdout || '') + (e.stderr || '') + (e.message || '');
        // Non-zero exit — figure out pass/fail from output if possible
        const parsed = parseOutput(result.output);
        if (parsed) { result.passed = parsed.passed; result.failed = parsed.failed; }
        else {
            if (e.code === 'ENOENT' || /command not found|npx canceled/i.test(result.output)) {
                result.runnable = false;
                result.reason = `"${command.split(' ')[0]}" not available in this environment`;
            } else {
                result.failed = 1;
            }
        }
        result.ok = false;
        return result;
    }
}

/**
 * Find the spec directory for an id (accepts "001" or "001-auth").
 */
function findSpecDir(harnessDir, specId) {
    const specsDir = path.join(harnessDir, 'specs');
    if (!fs.existsSync(specsDir)) return null;
    const dirs = fs.readdirSync(specsDir).filter(d => /^\d{3}-/.test(d));
    const match = dirs.find(d => d === specId || d.startsWith(specId));
    return match ? path.join(specsDir, match) : null;
}

module.exports = { runTests, parseOutput, findSpecDir, specHasOwnConfig };
