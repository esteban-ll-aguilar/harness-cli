const fs = require('fs');
const path = require('path');

/**
 * Language Detector
 * Auto-detects project language by analyzing root files.
 * Supports: TypeScript, JavaScript, Python, Go, Rust, Java, C#, Ruby, PHP, Swift, Kotlin, Dart
 */

const LANGUAGE_SIGNATURES = {
    typescript: {
        files: ['tsconfig.json', 'package.json'],
        packageDeps: ['typescript', 'ts-node', '@types/'],
        extensions: ['.ts', '.tsx'],
        default: true
    },
    javascript: {
        files: ['package.json'],
        packageDeps: [],
        extensions: ['.js', '.jsx'],
        default: false
    },
    python: {
        files: ['pyproject.toml', 'setup.py', 'requirements.txt', 'Pipfile', 'poetry.lock'],
        packageDeps: [],
        extensions: ['.py'],
        default: false
    },
    go: {
        files: ['go.mod', 'go.sum'],
        packageDeps: [],
        extensions: ['.go'],
        default: false
    },
    rust: {
        files: ['Cargo.toml', 'Cargo.lock'],
        packageDeps: [],
        extensions: ['.rs'],
        default: false
    },
    java: {
        files: ['pom.xml', 'build.gradle', 'gradlew'],
        packageDeps: [],
        extensions: ['.java'],
        default: false
    },
    csharp: {
        files: ['.csproj', '.sln', 'Program.cs'],
        packageDeps: [],
        extensions: ['.cs'],
        default: false
    },
    ruby: {
        files: ['Gemfile', 'Gemfile.lock', 'Rakefile'],
        packageDeps: [],
        extensions: ['.rb'],
        default: false
    },
    php: {
        files: ['composer.json', 'composer.lock'],
        packageDeps: [],
        extensions: ['.php'],
        default: false
    },
    swift: {
        files: ['Package.swift', '.xcodeproj'],
        packageDeps: [],
        extensions: ['.swift'],
        default: false
    },
    kotlin: {
        files: ['build.gradle.kts', 'settings.gradle.kts'],
        packageDeps: [],
        extensions: ['.kt', '.kts'],
        default: false
    },
    dart: {
        files: ['pubspec.yaml', 'pubspec.lock', 'analysis_options.yaml'],
        packageDeps: [],
        extensions: ['.dart'],
        default: false
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

function detectLanguage(cwd) {
    const scores = {};

    for (const [lang, sig] of Object.entries(LANGUAGE_SIGNATURES)) {
        scores[lang] = 0;

        // Check signature files
        for (const file of sig.files) {
            if (fs.existsSync(path.join(cwd, file))) {
                scores[lang] += 10;

                // Extra points if package.json has specific deps
                if (file === 'package.json' && sig.packageDeps.length > 0) {
                    try {
                        const pkg = JSON.parse(fs.readFileSync(path.join(cwd, file), 'utf8'));
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

        // Check file extensions in src/ or lib/
        const srcDirs = ['src', 'lib', 'app', 'test'];
        for (const srcDirName of srcDirs) {
            const srcDir = path.join(cwd, srcDirName);
            if (fs.existsSync(srcDir)) {
                try {
                    const files = fs.readdirSync(srcDir, { recursive: true });
                    for (const file of files) {
                        if (sig.extensions.some(ext => file.endsWith(ext))) {
                            scores[lang] += 2;
                        }
                    }
                } catch (e) {}
            }
        }
    }

    // Find highest score
    let detected = 'typescript'; // default
    let maxScore = -1;

    for (const [lang, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            detected = lang;
        }
    }

    return {
        language: detected,
        config: LANGUAGE_CONFIGS[detected],
        confidence: maxScore,
        scores
    };
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
    getTemplateDir,
    getLanguageConfig,
    LANGUAGE_CONFIGS,
    LANGUAGE_SIGNATURES
};
