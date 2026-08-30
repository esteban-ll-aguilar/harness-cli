const pkg = require('../../package.json');

function showHelp() {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  🤖 HARNESS SDD-BDD-TDD — Multi-Agent Production Harness            ║
║  v${pkg.version}                                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  CORE WORKFLOW                                                       ║
║  harness init [--force] [--auto] [--tools=ID,..] [--no-default-rules]║
║  harness interview                    Interactive requirement session║
║  harness new-change <name> [--lang=]  Create SDD-BDD-TDD flow        ║
║  harness spec <name>                  Template-only (see new-change) ║
║  harness advance <id> [--to=][--back][--force]  Walk the 6 agents    ║
║  harness status                       Project health & progress     ║
║  harness test <id> [--cmd=] [--skip]  Execute the spec tests         ║
║  harness review [specId] [--skip-tests]  Guardian gates + real tests ║
║                                                                      ║
║  LIFECYCLE GATES (work with advance)                                 ║
║  harness gate clarify <id>            Ambiguity check on spec.md     ║
║  harness gate approve <id> [--stage=] Human sign-off for a stage     ║
║  harness judge <id>                   Self-assess "must" rules       ║
║  harness judge record <id> --rule= --verdict=  Persist a verdict     ║
║                                                                      ║
║  PARALLEL / MULTI-SESSION                                            ║
║  harness orchestrate status|claim|release <id>  Coordinate specs     ║
║  (harness-cli never calls an LLM — this coordinates separate         ║
║   external agent sessions safely, not in-process model calls)        ║
║                                                                      ║
║  KNOWLEDGE & RULES                                                    ║
║  harness rules list|add|remove|preset|sync|check  Project rules      ║
║  harness memory search|graph|symbol|index|compact|stats|obsidian     ║
║  harness context [--spec=][--query=][--for-file=]  Context bundle    ║
║  harness agent list|new|run <name>    Manage & run AI agents         ║
║                                                                      ║
║  AI INTEGRATION                                                      ║
║  harness-mcp                          MCP server (20 tools) for any  ║
║                                       MCP-compatible agent           ║
║                                                                      ║
║  MONOREPO: init auto-detects all languages; --lang=<lang> per change ║
║  MEMORY:  Obsidian vault (.harness/) + BM25 + graph + symbol (0 deps)║
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
