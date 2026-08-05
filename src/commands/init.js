const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { ensureDir, copyDir, copyTemplate, writeHarnessRC, getHarnessDir } = require('../utils/fileUtils.js');
const { detectLanguages, getLanguageConfig } = require('../utils/languageDetector.js');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

function askQuestion(rl, question) {
    return new Promise(resolve => rl.question(question, resolve));
}

async function selectLanguage(rl, detection) {
    if (!detection.isMonorepo || detection.totalLanguages === 1) {
        return detection.primary;
    }

    console.log(`\n🔍 Monorepo detected! ${detection.totalLanguages} languages found:`);
    detection.all.forEach((r, i) => {
        const marker = r.isRoot ? '📁 root' : '📂 sub';
        console.log(`  ${i + 1}. ${r.config.name} (${r.language}) — confidence: ${r.confidence} ${marker}`);
    });
    console.log(`  ${detection.all.length + 1}. Other / Manual`);

    const answer = await askQuestion(rl, '\nSelect primary language for this harness (number): ');
    const choice = parseInt(answer, 10);

    if (choice >= 1 && choice <= detection.all.length) {
        return detection.all[choice - 1];
    }

    // Manual entry
    const manual = await askQuestion(rl, 'Enter language (typescript/python/go/rust/java/csharp/ruby/php/swift/kotlin/dart): ');
    const config = getLanguageConfig(manual.trim().toLowerCase());
    return {
        language: manual.trim().toLowerCase(),
        config,
        confidence: 0,
        locations: [],
        isRoot: true
    };
}

async function initProject(cwd, args) {
    const harnessDir = path.join(cwd, '.harness');
    const force = args.includes('--force');

    if (fs.existsSync(harnessDir) && !force) {
        console.log('⚠️  .harness/ already exists. Use --force to reinitialize.');
        return;
    }

    // 🔍 AUTO-DETECT LANGUAGE (deep scan for monorepos)
    console.log('🔍 Scanning project structure...');
    const detection = detectLanguages(cwd, { deep: true, maxDepth: 3 });

    let selectedLang = detection.primary;

    // Interactive selection for monorepos
    if (detection.isMonorepo && !args.includes('--auto')) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        try {
            selectedLang = await selectLanguage(rl, detection);
        } finally {
            rl.close();
        }
    }

    const langConfig = selectedLang.config;

    console.log(`\n🏗️  Initializing Harness SDD-BDD-TDD...`);
    console.log(`🔧 Primary language: ${langConfig.name}`);
    if (detection.isMonorepo) {
        console.log(`📦 Monorepo mode: ${detection.totalLanguages} languages detected`);
        console.log(`   (Other languages can be added with: harness new-change --lang <lang>)`);
    }

    try {
        // Create .harness/ structure
        const dirs = [
            'brain/decisions',
            'brain/people',
            'brain/patterns',
            'brain/competencies',
            'memory/session-logs',
            'specs',
            'tests/unit',
            'tests/integration',
            'tests/e2e',
            '.obsidian/templates',
            '.claude/scripts',
            '.codex',
            '.kimi',
            '.deepseek',
            '.qwen',
            '.opencode',
            '.vscode',
            '.github/workflows',
            'scripts'
        ];

        for (const dir of dirs) {
            ensureDir(path.join(harnessDir, dir));
        }

        // Copy templates
        copyDir(path.join(TEMPLATES_DIR, 'brain'), path.join(harnessDir, 'brain'), {
            projectName: path.basename(cwd),
            date: new Date().toISOString().split('T')[0]
        });

        copyDir(path.join(TEMPLATES_DIR, '.obsidian'), path.join(harnessDir, '.obsidian'));
        copyDir(path.join(TEMPLATES_DIR, '.claude'), path.join(harnessDir, '.claude'));
        copyDir(path.join(TEMPLATES_DIR, '.codex'), path.join(harnessDir, '.codex'));
        copyDir(path.join(TEMPLATES_DIR, '.kimi'), path.join(harnessDir, '.kimi'));
        copyDir(path.join(TEMPLATES_DIR, '.deepseek'), path.join(harnessDir, '.deepseek'));
        copyDir(path.join(TEMPLATES_DIR, '.qwen'), path.join(harnessDir, '.qwen'));
        copyDir(path.join(TEMPLATES_DIR, '.opencode'), path.join(harnessDir, '.opencode'));
        copyDir(path.join(TEMPLATES_DIR, '.vscode'), path.join(harnessDir, '.vscode'));
        copyDir(path.join(TEMPLATES_DIR, '.github'), path.join(harnessDir, '.github'));
        copyDir(path.join(TEMPLATES_DIR, 'scripts'), path.join(harnessDir, 'scripts'));

        // Create .harnessrc in project root
        const allLanguages = detection.all.map(r => ({
            language: r.language,
            name: r.config.name,
            confidence: r.confidence,
            isRoot: r.isRoot
        }));

        writeHarnessRC(cwd, {
            version: '1.0.0',
            harnessDir: '.harness',
            projectName: path.basename(cwd),
            createdAt: new Date().toISOString(),
            isMonorepo: detection.isMonorepo,
            languages: {
                primary: selectedLang.language,
                all: allLanguages
            },
            language: {
                detected: selectedLang.language,
                name: langConfig.name,
                confidence: selectedLang.confidence,
                testFramework: langConfig.testFramework,
                testExt: langConfig.testExt,
                bddFramework: langConfig.bddFramework,
                runner: langConfig.runner,
                lint: langConfig.lint,
                coverage: langConfig.coverage
            },
            activeSpecs: [],
            completedSpecs: [],
            agents: {
                interviewer: { enabled: true, model: 'capable' },
                architect: { enabled: true, model: 'capable' },
                tester: { enabled: true, model: 'capable' },
                coder: { enabled: true, model: 'mid' },
                reviewer: { enabled: true, model: 'capable' },
                guardian: { enabled: true, model: 'fast' }
            },
            quality: {
                minCoverage: 80,
                maxFileLines: 200,
                requireAdr: true,
                requireSpec: true,
                requireBdd: true,
                requireTdd: true
            }
        });

        // Create root-level references
        const rootAgents = path.join(cwd, 'AGENTS.md');
        const rootHarnessIgnore = path.join(cwd, '.harnessignore');

        const agentsContent = fs.readFileSync(path.join(harnessDir, 'brain', 'AGENTS.md'), 'utf8');
        fs.writeFileSync(rootAgents, agentsContent);

        fs.writeFileSync(rootHarnessIgnore, `# Harness ignore patterns
node_modules/
.harness/memory/session-logs/
*.log
.env
`);

        const rootObsidian = path.join(cwd, '.obsidian');
        if (!fs.existsSync(rootObsidian)) {
            try {
                fs.symlinkSync(path.join(harnessDir, '.obsidian'), rootObsidian, 'junction');
            } catch (e) {
                copyDir(path.join(harnessDir, '.obsidian'), rootObsidian);
            }
        }

        // Create vault-manifest.json
        const manifest = {
            id: `harness-${Date.now()}`,
            name: path.basename(cwd),
            version: '1.0.0',
            harnessVersion: '1.0.0',
            language: selectedLang.language,
            isMonorepo: detection.isMonorepo,
            aiTools: ['claude', 'codex', 'opencode', 'kimi', 'qwen', 'deepseek', 'cursor', 'copilot'],
            memory: {
                type: 'obsidian-vault',
                path: '.harness',
                shared: true
            }
        };
        fs.writeFileSync(path.join(harnessDir, 'vault-manifest.json'), JSON.stringify(manifest, null, 2));

        // Create initial session log
        const sessionLog = `---
date: ${new Date().toISOString()}
agent: harness-cli
event: project-initialized
language: ${langConfig.name}
isMonorepo: ${detection.isMonorepo}
---

# Project Initialized

- Harness version: 1.0.0
- Project: ${path.basename(cwd)}
- Language: ${langConfig.name}
- Monorepo: ${detection.isMonorepo}
- Languages detected: ${detection.all.map(r => r.config.name).join(', ')}
- AI Tools configured: Claude, Codex, OpenCode, Kimi, Qwen, DeepSeek, Cursor, Copilot

## Next Steps

1. Run \`harness interview\` to gather requirements
2. Or run \`harness new-change <feature-name>\` to start a feature
3. For monorepos: run \`harness new-change <name> --lang <lang>\` for other languages
`;
        fs.writeFileSync(path.join(harnessDir, 'memory', 'session-logs', `init-${Date.now()}.md`), sessionLog);

        console.log(`
✅ Harness initialized successfully!

📁 Structure created at: ${harnessDir}
📄 Root references: AGENTS.md, .harnessrc, .obsidian
🔧 Primary language: ${langConfig.name}
${detection.isMonorepo ? `📦 Monorepo: ${detection.totalLanguages} languages detected` : ''}

🚀 Next steps:
   harness interview          → Start requirement gathering
   harness new-change auth    → Create your first feature
   ${detection.isMonorepo ? 'harness new-change api --lang go    → Create feature in Go subproject' : ''}

🤖 Any AI tool can now read AGENTS.md and .harnessrc to understand the project.
`);

    } catch (error) {
        console.error(`\n❌ Error initializing harness: ${error.message}`);
        console.error('Stack trace:', error.stack);

        // Cleanup on failure
        if (fs.existsSync(harnessDir) && !force) {
            console.log('🧹 Cleaning up incomplete initialization...');
            try {
                fs.rmSync(harnessDir, { recursive: true, force: true });
            } catch (cleanupError) {
                console.error('Failed to cleanup:', cleanupError.message);
            }
        }

        process.exit(1);
    }
}

module.exports = { initProject };
