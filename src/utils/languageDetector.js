const fs = require('fs');
const path = require('path');

/**
 * Language Detector V2 — Monorepo-aware Deep Scanner
 * 
 * Scans the ENTIRE project tree (not just root) to detect all languages.
 * In monorepos, multiple languages can coexist (e.g., frontend=TS, backend=Go, mobile=Dart).
 * 
 * Detection strategy:
 * 1. Scan root first (fast path for single-language projects)
 * 2. If root is ambiguous or low confidence, scan subdirectories up to 3 levels deep
 * 3. Return ALL detected languages with confidence scores
 * 4. Allow user to select or auto-pick the highest confidence
 */

const IGNORED_DIRS = new Set([
    'node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'out', 'target',
    '.next', '.nuxt', '.turbo', '.cache', 'coverage', 'vendor', '.harness',
    '.obsidian', '.claude', '.codex', '.kimi', '.deepseek', '.qwen', '.opencode',
    '.vscode', '.github', '.idea', 'Pods', '.gradle', '__pycache__', '.venv',
    'venv', '.tox', '.pytest_cache', '.ruff_cache', '.mypy_cache', '.terraform',
    '.serverless', 'tmp', 'temp'
]);

const LANGUAGE_SIGNATURES = {
    typescript: {
        files: ['tsconfig.json', 'package.json'],
        packageDeps: ['typescript', 'ts-node', '@types/'],
        extensions: ['.ts', '.tsx'],
        weight: 10,
        dirs: ['src', 'app', 'lib', 'packages']
    },
    javascript: {
        files: ['package.json'],
        packageDeps: [],
        extensions: ['.js', '.jsx'],
        weight: 8,
        dirs: ['src', 'app', 'lib', 'packages']
    },
    python: {
        files: ['pyproject.toml', 'setup.py', 'requirements.txt', 'Pipfile', 'poetry.lock'],
        packageDeps: [],
        extensions: ['.py'],
        weight: 10,
        dirs: ['src', 'app', 'lib', 'backend', 'api', 'services']
    },
    go: {
        files: ['go.mod', 'go.sum'],
        packageDeps: [],
        extensions: ['.go'],
        weight: 10,
        dirs: ['src', 'cmd', 'pkg', 'internal', 'backend', 'api', 'services']
    },
    rust: {
        files: ['Cargo.toml', 'Cargo.lock'],
        packageDeps: [],
        extensions: ['.rs'],
        weight: 10,
        dirs: ['src', 'crates', 'backend', 'services']
    },
    java: {
        files: ['pom.xml', 'build.gradle', 'gradlew'],
        packageDeps: [],
        extensions: ['.java'],
        weight: 10,
        dirs: ['src', 'app', 'backend', 'services']
    },
    csharp: {
        files: ['.csproj', '.sln'],
        packageDeps: [],
        extensions: ['.cs'],
        weight: 10,
        dirs: ['src', 'app', 'backend', 'services']
    },
    ruby: {
        files: ['Gemfile', 'Gemfile.lock', 'Rakefile'],
        packageDeps: [],
        extensions: ['.rb'],
        weight: 10,
        dirs: ['src', 'app', 'lib', 'backend']
    },
    php: {
        files: ['composer.json', 'composer.lock'],
        packageDeps: [],
        extensions: ['.php'],
        weight: 10,
        dirs: ['src', 'app', 'lib', 'backend']
    },
    swift: {
        files: ['Package.swift', '.xcodeproj'],
        packageDeps: [],
        extensions: ['.swift'],
        weight: 10,
        dirs: ['src', 'app', 'ios', 'mobile']
    },
    kotlin: {
        files: ['build.gradle.kts', 'settings.gradle.kts'],
        packageDeps: [],
        extensions: ['.kt', '.kts'],
        weight: 10,
        dirs: ['src', 'app', 'android', 'mobile']
    },
    dart: {
        files: ['pubspec.yaml', 'pubspec.lock', 'analysis_options.yaml'],
        packageDeps: [],
        extensions: ['.dart'],
        weight: 10,
        dirs: ['lib', 'src', 'app', 'mobile', 'flutter']
    }
};

const LANGUAGE_CONFIGS = {
    typescript: {
        name: 'TypeScript',
        testFramework: 'Vitest',
        testExt: '.test.ts',
        bddFramework: 'Cucumber',
        featureExt: '.feature',
        runner: 'npm test',
        lint: 'eslint',
        coverage: 'vitest --coverage',
        templateDir: 'typescript'
    },
    javascript: {
        name: 'JavaScript',
        testFramework: 'Jest',
        testExt: '.test.js',
        bddFramework: 'Cucumber',
        featureExt: '.feature',
        runner: 'npm test',
        lint: 'eslint',
        coverage: 'jest --coverage',
        templateDir: 'javascript'
    },
    python: {
        name: 'Python',
        testFramework: 'pytest',
        testExt: '_test.py',
        bddFramework: 'pytest-bdd',
        featureExt: '.feature',
        runner: 'pytest',
        lint: 'ruff',
        coverage: 'pytest --cov',
        templateDir: 'python'
    },
    go: {
        name: 'Go',
        testFramework: 'testing',
        testExt: '_test.go',
        bddFramework: 'godog',
        featureExt: '.feature',
        runner: 'go test',
        lint: 'golangci-lint',
        coverage: 'go test -cover',
        templateDir: 'go'
    },
    rust: {
        name: 'Rust',
        testFramework: 'cargo test',
        testExt: '.rs',
        bddFramework: 'cucumber-rs',
        featureExt: '.feature',
        runner: 'cargo test',
        lint: 'clippy',
        coverage: 'cargo tarpaulin',
        templateDir: 'rust'
    },
    java: {
        name: 'Java',
        testFramework: 'JUnit 5',
        testExt: 'Test.java',
        bddFramework: 'Cucumber JVM',
        featureExt: '.feature',
        runner: 'mvn test',
        lint: 'checkstyle',
        coverage: 'jacoco',
        templateDir: 'java'
    },
    csharp: {
        name: 'C#',
        testFramework: 'xUnit',
        testExt: 'Tests.cs',
        bddFramework: 'SpecFlow',
        featureExt: '.feature',
        runner: 'dotnet test',
        lint: 'dotnet format',
        coverage: 'dotnet test --collect:"XPlat Code Coverage"',
        templateDir: 'csharp'
    },
    ruby: {
        name: 'Ruby',
        testFramework: 'RSpec',
        testExt: '_spec.rb',
        bddFramework: 'Cucumber',
        featureExt: '.feature',
        runner: 'rspec',
        lint: 'rubocop',
        coverage: 'simplecov',
        templateDir: 'ruby'
    },
    php: {
        name: 'PHP',
        testFramework: 'PHPUnit',
        testExt: 'Test.php',
        bddFramework: 'Behat',
        featureExt: '.feature',
        runner: 'phpunit',
        lint: 'phpstan',
        coverage: 'phpunit --coverage',
        templateDir: 'php'
    },
    swift: {
        name: 'Swift',
        testFramework: 'XCTest',
        testExt: 'Tests.swift',
        bddFramework: 'XCTest + Gherkin',
        featureExt: '.feature',
        runner: 'swift test',
        lint: 'swiftlint',
        coverage: 'xcodebuild -enableCodeCoverage',
        templateDir: 'swift'
    },
    kotlin: {
        name: 'Kotlin',
        testFramework: 'JUnit 5',
        testExt: 'Test.kt',
        bddFramework: 'Cucumber JVM',
        featureExt: '.feature',
        runner: 'gradle test',
        lint: 'ktlint',
        coverage: 'jacoco',
        templateDir: 'kotlin'
    },
    dart: {
        name: 'Dart',
        testFramework: 'test (package:test)',
        testExt: '_test.dart',
        bddFramework: 'gherkin (package:gherkin)',
        featureExt: '.feature',
        runner: 'dart test',
        lint: 'dart analyze',
        coverage: 'dart test --coverage',
        templateDir: 'dart'
    }
};

/**
 * Scan a single directory for language evidence
 */
function scanDirectory(dirPath, maxDepth = 0, currentDepth = 0) {
    const scores = {};
    const locations = {}; // Where each language was found

    for (const [lang, sig] of Object.entries(LANGUAGE_SIGNATURES)) {
        scores[lang] = 0;
        locations[lang] = [];
    }

    // Check signature files in this directory
    for (const [lang, sig] of Object.entries(LANGUAGE_SIGNATURES)) {
        for (const file of sig.files) {
            const filePath = path.join(dirPath, file);
            if (fs.existsSync(filePath)) {
                scores[lang] += sig.weight;
                locations[lang].push(filePath);

                // Extra points for package.json deps
                if (file === 'package.json' && sig.packageDeps.length > 0) {
                    try {
                        const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                        for (const dep of sig.packageDeps) {
                            if (Object.keys(deps).some(d => d.includes(dep))) {
                                scores[lang] += 5;
                            }
                        }
                    } catch (e) {}
                }
            }
        }
    }

    // Check file extensions
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isFile()) {
                for (const [lang, sig] of Object.entries(LANGUAGE_SIGNATURES)) {
                    if (sig.extensions.some(ext => entry.name.endsWith(ext))) {
                        scores[lang] += 2;
                        locations[lang].push(path.join(dirPath, entry.name));
                    }
                }
            } else if (entry.isDirectory() && currentDepth < maxDepth) {
                // Skip build/vendor/dependency directories — they pollute detection
                if (IGNORED_DIRS.has(entry.name)) {
                    continue;
                }
                // Recurse into subdirectories
                const subScores = scanDirectory(
                    path.join(dirPath, entry.name), 
                    maxDepth, 
                    currentDepth + 1
                );

                for (const [lang, score] of Object.entries(subScores.scores)) {
                    scores[lang] += score;
                    if (subScores.locations[lang]) {
                        locations[lang].push(...subScores.locations[lang]);
                    }
                }
            }
        }
    } catch (e) {
        // Permission denied or other error, skip
    }

    return { scores, locations };
}

/**
 * Scan only the subdirectories of a root (used for the deep pass).
 * Root files are NOT re-counted here to avoid double scoring.
 */
function scanSubdirs(rootPath, maxDepth) {
    const scores = {};
    const locations = {};
    for (const lang of Object.keys(LANGUAGE_SIGNATURES)) {
        scores[lang] = 0;
        locations[lang] = [];
    }

    let entries;
    try {
        entries = fs.readdirSync(rootPath, { withFileTypes: true });
    } catch (e) {
        return { scores, locations };
    }

    for (const entry of entries) {
        if (!entry.isDirectory() || IGNORED_DIRS.has(entry.name)) continue;
        const sub = scanDirectory(path.join(rootPath, entry.name), maxDepth, 1);
        for (const lang of Object.keys(LANGUAGE_SIGNATURES)) {
            scores[lang] += sub.scores[lang] || 0;
            if (sub.locations[lang]) locations[lang].push(...sub.locations[lang]);
        }
    }
    return { scores, locations };
}

/**
 * Detect all languages in a project
 */
function detectLanguages(cwd, options = {}) {
    const { deep = true, maxDepth = 3 } = options;

    // Phase 1: Root scan (fast)
    const rootScan = scanDirectory(cwd, 0, 0);

    // Phase 2: Deep scan if needed — only subdirectories (root already scored)
    let deepScan = { scores: {}, locations: {} };
    if (deep) {
        deepScan = scanSubdirs(cwd, maxDepth);
    }

    // Merge scores
    const mergedScores = {};
    const mergedLocations = {};

    for (const lang of Object.keys(LANGUAGE_SIGNATURES)) {
        const rootScore = rootScan.scores[lang] || 0;
        const deepScore = deepScan.scores[lang] || 0;

        // Root scores count more (they indicate main project)
        mergedScores[lang] = (rootScore * 1.5) + deepScore;

        mergedLocations[lang] = [
            ...(rootScan.locations[lang] || []),
            ...(deepScan.locations[lang] || [])
        ];
    }

    // Sort by score
    const sorted = Object.entries(mergedScores)
        .filter(([_, score]) => score > 0)
        .sort((a, b) => b[1] - a[1]);

    // Build results
    const results = sorted.map(([lang, score]) => ({
        language: lang,
        config: LANGUAGE_CONFIGS[lang],
        confidence: score,
        locations: mergedLocations[lang].slice(0, 5), // Top 5 locations
        isRoot: (rootScan.scores[lang] || 0) > 0
    }));

    // Primary = highest score
    const primary = results[0] || {
        language: 'typescript',
        config: LANGUAGE_CONFIGS.typescript,
        confidence: 0,
        locations: [],
        isRoot: false
    };

    return {
        primary,
        all: results,
        isMonorepo: results.length > 1 && results[1].confidence > 5,
        totalLanguages: results.length
    };
}

/**
 * Legacy single-language detect (for backward compat)
 */
function detectLanguage(cwd) {
    return detectLanguages(cwd, { deep: true, maxDepth: 3 });
}

function getTemplateDir(language) {
    const config = LANGUAGE_CONFIGS[language] || LANGUAGE_CONFIGS.typescript;
    return config.templateDir;
}

function getLanguageConfig(language) {
    return LANGUAGE_CONFIGS[language] || LANGUAGE_CONFIGS.typescript;
}

module.exports = {
    detectLanguage,
    detectLanguages,
    getTemplateDir,
    getLanguageConfig,
    LANGUAGE_CONFIGS,
    LANGUAGE_SIGNATURES
};
