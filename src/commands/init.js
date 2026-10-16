const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { ensureDir, copyDir, copyTemplate, writeHarnessRC, getHarnessDir } = require('../utils/fileUtils.js');
const { detectLanguages, getLanguageConfig } = require('../utils/languageDetector.js');
const { parseToolsFlag, ALL_TOOL_IDS, writeToolConfigs } = require('../utils/toolSetup.js');
const { repairAgentLayout } = require('../utils/projectLayout.js');

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
    const repair = args.includes('--repair');
    const semanticMemory = !args.includes('--no-semantic-memory');

    if (fs.existsSync(harnessDir) && repair && !force) {
        repairAgentLayout(cwd, harnessDir);
        const { ensureAgents } = require('./agent.js');
        ensureAgents(cwd);
        console.log('✅ Harness layout repaired: root AGENTS.md and .agents/ projection are current.');
        return;
    }

    if (fs.existsSync(harnessDir) && !force) {
        console.log('⚠️  .harness/ already exists. Use --repair to restore entry points or --force to reinitialize.');
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

    // 🔌 Select AI tools (interactive checkbox, unless --auto / --tools=...)
    const toolsFlag = args.find(a => a.startsWith('--tools='));
    const toolsOverride = toolsFlag ? toolsFlag.split('=')[1] : null;
    const skipToolsPrompt = args.includes('--auto') || !process.stdin.isTTY;

    let selectedTools = toolsOverride
        ? (parseToolsFlag(toolsOverride) || ALL_TOOL_IDS.slice())
        : ALL_TOOL_IDS.slice();

    if (!toolsOverride && !skipToolsPrompt) {
        console.log('\n🔌 Select your AI tools (Espacio = marcar, ↑↓ = mover, Enter = confirmar):');
        const { showCheckboxPrompt } = require('../utils/checkbox.js');
        const { AI_TOOLS } = require('../utils/toolSetup.js');
        const chosen = await showCheckboxPrompt(
            '',
            AI_TOOLS.map(t => t.label),
            { checked: AI_TOOLS.map((_, i) => i) }
        );
        selectedTools = chosen.map(i => AI_TOOLS[i].id);
    }

    console.log(`\n🏗️  Initializing Harness SDD-BDD-TDD...`);
    console.log(`🔧 Primary language: ${langConfig.name}`);
    console.log(`🔌 AI tools: ${selectedTools.join(', ')}`);
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
            'memory/obsidian',
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
                guardian: { enabled: true, model: 'fast' },
                'memory-steward': { enabled: true, model: 'fast' },
                'backend-engineer': { enabled: true, model: 'capable' },
                'frontend-engineer': { enabled: true, model: 'capable' },
                'security-reviewer': { enabled: true, model: 'capable' }
            },
            tools: {
                selected: selectedTools,
                all: ALL_TOOL_IDS.slice()
            },
            quality: {
                minCoverage: 80,
                maxFileLines: 200,
                requireAdr: true,
                requireSpec: true,
                requireBdd: true,
                requireTdd: true,
                approvalGates: ['architect'],
                traceabilityMode: 'warn',
                requireAdversarialTests: true,
                contextBudgetTokens: 1200
            }
        });

        // Create root-level references
        const rootHarnessIgnore = path.join(cwd, '.harnessignore');
        repairAgentLayout(cwd, harnessDir);

        fs.writeFileSync(rootHarnessIgnore, `# Harness ignore patterns
node_modules/
.harness/memory/session-logs/
.harness/memory/obsidian/
.harness/.index/
.harness/.models/
*.log
.env
`);

        // Keep canonical Markdown memory versionable, while preventing large,
        // model-specific derived artifacts from creating Git conflicts.
        const gitignorePath = path.join(cwd, '.gitignore');
        const semanticIgnores = ['.harness/.index/', '.harness/.models/', '.harness/memory/session-logs/'];
        const existingGitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
        const missingIgnores = semanticIgnores.filter(rule => !existingGitignore.split('\n').includes(rule));
        if (missingIgnores.length) {
            fs.writeFileSync(gitignorePath, `${existingGitignore}${existingGitignore && !existingGitignore.endsWith('\n') ? '\n' : ''}# Harness derived indexes and local embedding model\n${missingIgnores.join('\n')}\n`);
        }

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
            aiTools: selectedTools,
            memory: {
                type: 'obsidian-vault',
                path: '.harness',
                shared: true
            }
        };
        fs.writeFileSync(path.join(harnessDir, 'vault-manifest.json'), JSON.stringify(manifest, null, 2));

        // Write per-tool configs at the PROJECT ROOT (real MCP/CLI integration)
        const toolSummary = writeToolConfigs(cwd, selectedTools);

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

        // Build the retrieval index + Obsidian MOC so the vault works immediately
        const { buildIndex, saveIndex } = require('../utils/retrieval.js');
        const { generateObsidian } = require('./memory.js');
        const index = buildIndex(harnessDir);
        saveIndex(harnessDir, index);
        generateObsidian(cwd, harnessDir);

        // Semantic long-term memory is local to Node. The embedding model is
        // provisioned once into .harness/.models and the derived vector index
        // stays beside the other rebuildable indexes (never a cloud service).
        let semanticResult = null;
        if (semanticMemory) {
            try {
                const { buildSemanticIndex } = require('../utils/semanticMemory.js');
                semanticResult = buildSemanticIndex(harnessDir);
            } catch (e) {
                semanticResult = { error: e.message };
            }
        }

        // Auto-generate the built-in lifecycle, specialist and memory scripts.
        const { ensureAgents } = require('./agent.js');
        ensureAgents(cwd);

        // Seed the curated senior-engineer default rule pack (opt out with --no-default-rules)
        let rulesResult = null;
        if (!args.includes('--no-default-rules')) {
            const { applyPreset } = require('./rules.js');
            rulesResult = applyPreset(cwd, harnessDir, 'senior');
        }

        console.log(`
✅ Harness initialized successfully!

📁 Structure created at: ${harnessDir}
📄 Root references: AGENTS.md, .harnessrc, .obsidian
🔧 Primary language: ${langConfig.name}
🔌 AI tools configured: ${selectedTools.join(', ')}
${detection.isMonorepo ? `📦 Monorepo: ${detection.totalLanguages} languages detected` : ''}

🛠️  Tool configs written:
${toolSummary.map(t => `   ${t.file.padEnd(28)} → ${t.label}`).join('\n')}
${rulesResult && rulesResult.ok ? `
📜 Default rules seeded: ${rulesResult.added} senior-engineer rules (data modeling, propose-before-build UI/UX, reuse, verification, security, performance, honesty…)
   harness rules list          → see them all
   harness rules preset senior → re-apply/retrofit on any project` : ''}
${!semanticMemory ? `
ℹ️  Semantic memory skipped (--no-semantic-memory).
   BM25 + graph retrieval remain active; enable later with: harness memory semantic setup` : semanticResult?.error ? `
⚠️  Semantic memory setup could not complete: ${semanticResult.error}
   BM25 + graph retrieval remain active. Re-run: harness memory semantic setup` : `
🧠 Semantic long-term memory ready: ${semanticResult?.documents?.length || 0} indexed chunks
   Model cache: .harness/.models/embeddings (local Node inference)`}

🚀 Next steps:
   harness interview          → Start requirement gathering
   harness new-change auth    → Create your first feature
   ${detection.isMonorepo ? 'harness new-change api --lang go    → Create feature in Go subproject' : ''}

🤖 Your AI tool can now talk to the harness via MCP (harness-mcp) and AGENTS.md.
`);

    } catch (error) {
        console.error(`\n❌ Error initializing harness: ${error.message}`);
        console.error('Stack trace:', error.stack);

        // Cleanup on failure (even with --force: a partial init must not stay)
        if (fs.existsSync(harnessDir)) {
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
