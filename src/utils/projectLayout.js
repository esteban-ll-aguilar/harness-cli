const fs = require('fs');
const path = require('path');

function repairAgentLayout(cwd, harnessDir) {
    const canonical = path.join(harnessDir, 'brain', 'AGENTS.md');
    if (!fs.existsSync(canonical)) throw new Error('Canonical .harness/brain/AGENTS.md is missing');
    const root = `# Harness agent entry point\n\nRead and follow \`.harness/brain/AGENTS.md\` before working. It is the canonical project instruction set.\n\n- Run \`harness context\` before a task; it returns a bounded, relevant context packet.\n- Durable project memory lives only in \`.harness/\`; use the Memory Steward workflow for promotion.\n- \`.agents/\` is a compatibility projection, not another source of truth.\n`;
    fs.writeFileSync(path.join(cwd, 'AGENTS.md'), root);
    const agentsDir = path.join(cwd, '.agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, 'AGENTS.md'), '# Compatibility projection\n\nThe canonical instructions are at `../AGENTS.md` and `.harness/brain/AGENTS.md`. Do not store state here.\n');
    fs.writeFileSync(path.join(agentsDir, 'README.md'), '# .agents compatibility projection\n\nThis folder supports tools that conventionally discover `.agents/`. Canonical durable state is `.harness/`; Codex-compatible agents automatically read the root `AGENTS.md`.\n');
    return { rootAgents: path.join(cwd, 'AGENTS.md'), agentsDir };
}

module.exports = { repairAgentLayout };
