const pkg = require('../../package.json');

function showHelp() {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  🤖 HARNESS SDD-BDD-TDD — Multi-Agent Production Harness            ║
║  v${pkg.version}                                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  COMMANDS:                                                           ║
║                                                                      ║
║  harness init [--force] [--auto]      Initialize .harness/           ║
║                      [--tools=ID,..]  Select AI tools (checkbox: ␣,↑↓) ║
║  harness new-change <name> [--lang=]  Create SDD-BDD-TDD flow        ║
║  harness interview                    Interactive requirement session║
║  harness spec <name>                  Spec template only             ║
║  harness status                       Project health & progress        ║
║  harness review [--skip-tests]        Guardian gates + REAL test run   ║
║  harness test <id> [--cmd=] [--skip]  Execute the spec tests           ║
║  harness advance <id> [--to=<agent>]  Walk spec through 6 agents       ║
║  harness agent list|new|run <name>    Manage & run AI agents         ║
║  harness rules list|add|remove        Project rules (synced AGENTS)  ║
║  harness memory search|index|stats    RAG over the .harness vault    ║
║  harness memory obsidian              Regenerate Obsidian MOC        ║
║  harness context [--spec] [--query]   Full optimized context bundle  ║
║                                                                      ║
║  AI INTEGRATION:                                                     ║
║  harness-mcp                         MCP server (13 tools) for any   ║
║                                      MCP-compatible agent           ║
║                                                                      ║
║  MONOREPO: init auto-detects all languages; --lang=<lang> per change ║
║  MEMORY:  Obsidian vault (.harness/) + BM25 retrieval (zero deps)    ║
║  FLOW:    stages followed by default; --to= records omissions in logs ║
║                                                                      ║
║  WORKFLOW: Interview → Spec → Plan → Tasks → BDD → TDD → Review     ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
`);
}

function showVersion() {
    console.log(`harness v${pkg.version}`);
}

module.exports = { showHelp, showVersion };
