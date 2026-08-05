const fs = require('fs');
const path = require('path');
const { ensureDir, copyTemplate, getHarnessDir, nextSpecId, slugify, timestamp } = require('../utils/fileUtils.js');
const { buildPrompt, TIERS } = require('../utils/tokenOptimizer.js');
const { getLanguageConfig } = require('../utils/languageDetector.js');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

function newChange(cwd, args) {
    const name = args[0];
    if (!name) {
        console.log('❌ Usage: harness new-change <feature-name>');
        console.log('   Example: harness new-change user-authentication');
        return;
    }

    const harnessDir = getHarnessDir(cwd);
    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    // Get language from .harnessrc
    const rcPath = path.join(cwd, '.harnessrc');
    const rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
    const lang = rc.language?.detected || 'typescript';
    const langConfig = getLanguageConfig(lang);

    const specId = nextSpecId(cwd);
    const slug = slugify(name);
    const specDirName = `${specId}-${slug}`;
    const specDir = path.join(harnessDir, 'specs', specDirName);

    ensureDir(specDir);
    ensureDir(path.join(specDir, 'features'));
    ensureDir(path.join(specDir, 'tests'));
    ensureDir(path.join(specDir, 'docs'));

    const vars = {
        id: specId,
        name: name,
        slug: slug,
        date: new Date().toISOString().split('T')[0],
        timestamp: timestamp(),
        specDir: specDirName,
        language: langConfig.name,
        testFramework: langConfig.testFramework,
        testExt: langConfig.testExt,
        bddFramework: langConfig.bddFramework
    };

    // Determine template subdirectory based on language
    const langTemplateDir = path.join(TEMPLATES_DIR, 'specs', lang);
    const defaultTemplateDir = path.join(TEMPLATES_DIR, 'specs', '_template');
    const templateDir = fs.existsSync(langTemplateDir) ? langTemplateDir : defaultTemplateDir;

    // 1. Create SPEC (SDD) — language agnostic
    copyTemplate(
        path.join(defaultTemplateDir, 'spec.md'),
        path.join(specDir, 'spec.md'),
        vars
    );

    // 2. Create PLAN
    copyTemplate(
        path.join(defaultTemplateDir, 'plan.md'),
        path.join(specDir, 'plan.md'),
        vars
    );

    // 3. Create TASKS
    copyTemplate(
        path.join(defaultTemplateDir, 'tasks.md'),
        path.join(specDir, 'tasks.md'),
        vars
    );

    // 4. Create BDD Feature — language agnostic
    copyTemplate(
        path.join(defaultTemplateDir, 'features', 'feature.feature'),
        path.join(specDir, 'features', `${slug}.feature`),
        vars
    );

    // 5. Create TDD Test Stub — LANGUAGE SPECIFIC
    const testTemplateName = `test${langConfig.testExt}`;
    const testTemplatePath = path.join(templateDir, 'tests', testTemplateName);
    const fallbackTestPath = path.join(defaultTemplateDir, 'tests', 'test.spec.js');

    if (fs.existsSync(testTemplatePath)) {
        copyTemplate(testTemplatePath, path.join(specDir, 'tests', `${slug}${langConfig.testExt}`), vars);
    } else {
        copyTemplate(fallbackTestPath, path.join(specDir, 'tests', `${slug}.test.js`), vars);
    }

    // 6. Create ADR stub
    copyTemplate(
        path.join(TEMPLATES_DIR, 'brain', 'decisions', 'adr-template.md'),
        path.join(harnessDir, 'brain', 'decisions', `${specId}-${slug}-adr.md`),
        vars
    );

    // 7. Update .harnessrc
    rc.activeSpecs.push({
        id: specId,
        name: name,
        slug: specDirName,
        status: 'spec-drafting',
        createdAt: new Date().toISOString(),
        language: lang,
        agents: {
            interviewer: 'pending',
            architect: 'pending',
            tester: 'pending',
            coder: 'pending',
            reviewer: 'pending',
            guardian: 'pending'
        }
    });
    fs.writeFileSync(rcPath, JSON.stringify(rc, null, 2));

    // 8. Create session log entry
    const logEntry = `---
date: ${timestamp()}
agent: harness-cli
event: new-change-created
spec: ${specDirName}
language: ${langConfig.name}
---

# New Change: ${name}

- Spec ID: ${specId}
- Directory: specs/${specDirName}/
- Language: ${langConfig.name}
- Status: spec-drafting

## Artifacts Created

1. \`specs/${specDirName}/spec.md\` — SDD Specification (EARS notation)
2. \`specs/${specDirName}/plan.md\` — Technical Plan
3. \`specs/${specDirName}/tasks.md\` — Atomic Tasks
4. \`specs/${specDirName}/features/${slug}.feature\` — BDD Scenarios (${langConfig.bddFramework})
5. \`specs/${specDirName}/tests/${slug}${langConfig.testExt}\` — TDD Test Stubs (${langConfig.testFramework})
6. \`brain/decisions/${specId}-${slug}-adr.md\` — Architecture Decision Record

## Next Steps (Agent Workflow)

### 🎙️ Interviewer Agent
- Review spec.md for ambiguities
- Run \`/clarify\` if requirements are incomplete
- Output: Validated requirements

### 📐 Architect Agent
- Read spec.md + constitution.md
- Complete plan.md with architecture decisions
- Output: Approved technical plan

### 🧪 Tester Agent
- Read spec.md + plan.md
- Complete BDD scenarios in features/
- Write TDD test stubs in tests/
- Output: Executable test suite

### 💻 Coder Agent
- Read tasks.md + spec.md + tests/
- Implement Red-Green-Refactor for each task
- Output: Production code

### 🔍 Reviewer Agent
- Compare code against spec.md
- Verify all acceptance criteria are met
- Output: Review report

### 🛡️ Guardian Agent
- Run ${langConfig.lint}, security scan, coverage check
- Verify CI gates pass
- Output: Production-ready approval
`;

    fs.writeFileSync(
        path.join(harnessDir, 'memory', 'session-logs', `change-${specId}-${slug}.md`),
        logEntry
    );

    // Show optimized context for AI
    const { prompt, tokens } = buildPrompt(harnessDir, TIERS.ON_DEMAND, name);

    console.log(`
✅ New change created: ${specDirName}

📁 Location: .harness/specs/${specDirName}/
🔧 Language: ${langConfig.name}

📋 SDD-BDD-TDD Artifacts:
   spec.md      → Specification (EARS notation)
   plan.md      → Technical architecture plan
   tasks.md     → Atomic implementation tasks
   features/    → BDD Given-When-Then scenarios
   tests/       → TDD test stubs (${langConfig.testFramework})

🤖 AI Context (optimized):
   Tokens loaded: ~${tokens}
   Tier: ON_DEMAND
   Query: "${name}"

🚀 Start the workflow:
   1. Open spec.md and fill requirements
   2. Run: harness review ${specId}
   3. Or let your AI read AGENTS.md and continue
`);
}

module.exports = { newChange };
