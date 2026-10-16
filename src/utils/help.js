const pkg = require('../../package.json');

function showHelp() {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  🤖 HARNESS SDD-BDD-TDD — Multi-Agent Production Harness            ║
║  v${pkg.version}                                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  PRIMARY WORKFLOW                                                     ║
║  harness init [--auto] [--repair]     Create or repair all entrypoints║
║  harness work start|interview|new|advance|handoff  Delivery lifecycle  ║
║  harness quality trace|report|gate|test|review  Prove quality evidence║
║  harness memory search|semantic|graph|steward  Long-term memory      ║
║  harness context [--spec=][--query=]   Bounded context for an agent  ║
║  harness status                       Project health & progress      ║
║                                                                      ║
║  COMPATIBILITY ALIASES                                             ║
║  interview, new-change, advance, test, review, gate, judge, agent, ║
║  rules and orchestrate remain available but are intentionally hidden║
║  from the primary workflow.                                         ║
║                                                                      ║
║  AI INTEGRATION                                                      ║
║  harness-mcp                          MCP server (8 tools) — composite ║
║                                       MCP-compatible agent           ║
║                                                                      ║
║  MONOREPO: init auto-detects all languages; --lang=<lang> per change ║
║  MEMORY:  Vault + BM25 + graph + local semantic vectors             ║
║  FLOW:    stages followed by default; --to= records omissions in logs║
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
