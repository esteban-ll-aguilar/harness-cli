const fs = require('fs');
const path = require('path');
const { ensureDir, copyDir, copyTemplate, writeHarnessRC, getHarnessDir } = require('../utils/fileUtils.js');
const { detectLanguage, getLanguageConfig } = require('../utils/languageDetector.js');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

function initProject(cwd, args) {
    const harnessDir = path.join(cwd, '.harness');

    if (fs.existsSync(harnessDir) && !args.includes('--force')) {
        console.log('⚠️  .harness/ already exists. Use --force to reinitialize.');
        return;
    }

    // 🔍 AUTO-DETECT LANGUAGE
    const langDetection = detectLanguage(cwd);
    const langConfig = getLanguageConfig(langDetection.language);

    console.log(`🏗️  Initializing Harness SDD-BDD-TDD...`);
    console.log(`🔍 Detected language: ${langConfig.name} (confidence: ${langDetection.confidence})`);

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
    copyDir(path.join(TEMPLATES_DIR, '.vscode'), path.join(harnessDir, '.vscode'));
    copyDir(path.join(TEMPLATES_DIR, '.github'), path.join(harnessDir, '.github'));
    copyDir(path.join(TEMPLATES_DIR, 'scripts'), path.join(harnessDir, 'scripts'));

    // Create .harnessrc in project root with language config
    writeHarnessRC(cwd, {
        version: '1.0.0',
        harnessDir: '.harness',
        projectName: path.basename(cwd),
        createdAt: new Date().toISOString(),
        language: {
            detected: langDetection.language,
            name: langConfig.name,
            confidence: langDetection.confidence,
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

    // Create root-level references (symlinks or copies for compatibility)
    const rootAgents = path.join(cwd, 'AGENTS.md');
    const rootHarnessIgnore = path.join(cwd, '.harnessignore');

    // Create AGENTS.md in root (copy, not symlink, for Windows compatibility)
    const agentsContent = fs.readFileSync(path.join(harnessDir, 'brain', 'AGENTS.md'), 'utf8');
    fs.writeFileSync(rootAgents, agentsContent);

    // Create .harnessignore
    fs.writeFileSync(rootHarnessIgnore, `# Harness ignore patterns
node_modules/
.harness/memory/session-logs/
*.log
.env
`);

    // Create .obsidian symlink/reference in root for Obsidian app
    const rootObsidian = path.join(cwd, '.obsidian');
    if (!fs.existsSync(rootObsidian)) {
        try {
            fs.symlinkSync(path.join(harnessDir, '.obsidian'), rootObsidian, 'junction');
        } catch (e) {
            // Windows may need junction, fallback to copy
            copyDir(path.join(harnessDir, '.obsidian'), rootObsidian);
        }
    }

    // Create vault-manifest.json
    const manifest = {
        id: `harness-${Date.now()}`,
        name: path.basename(cwd),
        version: '1.0.0',
        harnessVersion: '1.0.0',
        language: langDetection.language,
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
---

# Project Initialized

- Harness version: 1.0.0
- Project: ${path.basename(cwd)}
- Language: ${langConfig.name}
- AI Tools configured: Claude, Codex, OpenCode, Kimi, Qwen, DeepSeek, Cursor, Copilot

## Next Steps

1. Run \`harness interview\` to gather requirements
2. Or run \`harness new-change <feature-name>\` to start a feature
`;
    fs.writeFileSync(path.join(harnessDir, 'memory', 'session-logs', `init-${Date.now()}.md`), sessionLog);

    console.log(`
✅ Harness initialized successfully!

📁 Structure created at: ${harnessDir}
📄 Root references: AGENTS.md, .harnessrc, .obsidian
🔧 Language: ${langConfig.name}
   Test framework: ${langConfig.testFramework}
   BDD framework: ${langConfig.bddFramework}
   Lint: ${langConfig.lint}

🚀 Next steps:
   harness interview          → Start requirement gathering
   harness new-change auth    → Create your first feature

🤖 Any AI tool can now read AGENTS.md and .harnessrc to understand the project.
`);
}

module.exports = { initProject };
