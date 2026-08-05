const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getHarnessDir, ensureDir, timestamp } = require('../utils/fileUtils.js');

const QUESTIONS = [
    {
        phase: 'VISION',
        questions: [
            'What problem does this software solve?',
            'Who is the end user? Describe them in detail.',
            'What is the measurable success outcome?'
        ]
    },
    {
        phase: 'FUNCTIONAL',
        questions: [
            'List the 3-5 CRITICAL features (must-have for MVP).',
            'Are there external system integrations? (APIs, databases, services)',
            'What are the main user flows? (e.g., login → dashboard → action)'
        ]
    },
    {
        phase: 'USE_CASES',
        questions: [
            'Describe the MOST IMPORTANT use case step-by-step.',
            'What happens if something fails at each step?',
            'Are there alternative or exception paths?'
        ]
    },
    {
        phase: 'DATA_FLOW',
        questions: [
            'Describe the main data flow (input → processing → output).',
            'What decisions does the system make automatically?',
            'Where does a human need to intervene or approve?'
        ]
    },
    {
        phase: 'CONSTRAINTS',
        questions: [
            'Any compliance regulations? (GDPR, HIPAA, SOX, etc.)',
            'Performance limits? (concurrent users, response time)',
            'Technology constraints? (mandatory stack, forbidden libs)'
        ]
    },
    {
        phase: 'DEFINITION_OF_DONE',
        questions: [
            'What does "done" mean for a feature?',
            'Who approves the work? (role, not name)',
            'What is the minimum test coverage required?'
        ]
    },
    {
        phase: 'OUT_OF_SCOPE',
        questions: [
            'What should this system NOT do? (explicit exclusions)',
            'What features are deferred to future versions?',
            'What assumptions are we making?'
        ]
    }
];

async function interview(cwd) {
    const harnessDir = getHarnessDir(cwd);
    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  🎙️  HARNESS INTERVIEWER AGENT                                      ║
║  Requirement Gathering Session                                       ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  This interview will generate a structured specification.            ║
║  Answer each question. Press ENTER to skip if not applicable.        ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const ask = (q) => new Promise(resolve => rl.question(q, resolve));

    const answers = {};

    for (const phase of QUESTIONS) {
        console.log(`\n📋 PHASE: ${phase.phase}`);
        console.log('─'.repeat(50));

        for (const question of phase.questions) {
            const answer = await ask(`  ${question}\n  > `);
            if (answer.trim()) {
                if (!answers[phase.phase]) answers[phase.phase] = [];
                answers[phase.phase].push({ question, answer });
            }
        }
    }

    rl.close();

    // Generate interview report
    const report = `---
date: ${timestamp()}
agent: interviewer
event: requirement-interview
status: completed
---

# Requirement Interview Report

## Summary

Interview completed with structured requirement gathering across 7 phases.

## Detailed Responses

${Object.entries(answers).map(([phase, items]) => `
### ${phase}

${items.map(i => `**Q:** ${i.question}\n**A:** ${i.answer}`).join('\n\n')}
`).join('\n')}

## Ambiguities Detected

${detectAmbiguities(answers)}

## Next Steps

1. Architect Agent: Convert responses to formal spec.md (EARS notation)
2. Review with stakeholder for approval
3. Proceed to BDD scenario generation
`;

    const reportPath = path.join(harnessDir, 'memory', 'session-logs', `interview-${timestamp()}.md`);
    fs.writeFileSync(reportPath, report);

    console.log(`
✅ Interview completed!

📄 Report saved: ${reportPath}

🔍 Ambiguities detected: ${detectAmbiguities(answers).split('\n').length - 1}

🚀 Next: Run \`harness new-change <name>\` to create the spec
   or let the Architect Agent read this interview and generate spec.md
`);
}

function detectAmbiguities(answers) {
    const ambiguities = [];

    // Simple heuristics for ambiguity detection
    const allText = JSON.stringify(answers).toLowerCase();

    if (!allText.includes('performance') && !allText.includes('speed') && !allText.includes('latency')) {
        ambiguities.push('- **Performance requirements not specified.** What are the acceptable response times?');
    }
    if (!allText.includes('error') && !allText.includes('fail') && !allText.includes('exception')) {
        ambiguities.push('- **Error handling not specified.** What happens when operations fail?');
    }
    if (!allText.includes('security') && !allText.includes('auth') && !allText.includes('password')) {
        ambiguities.push('- **Security requirements not specified.** How is access controlled?');
    }
    if (!allText.includes('scale') && !allText.includes('concurrent') && !allText.includes('user')) {
        ambiguities.push('- **Scale requirements not specified.** How many concurrent users?');
    }

    if (ambiguities.length === 0) {
        return '- No obvious ambiguities detected. Review recommended before proceeding.';
    }

    return ambiguities.join('\n');
}

module.exports = { interview };
