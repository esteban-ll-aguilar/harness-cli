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
║                                       --force: overwrite existing    ║
║                                       --auto: skip interactive mode  ║
║                                                                      ║
║  harness new-change <name> [opts]     Create SDD-BDD-TDD flow      ║
║                                       --lang=<lang>: override lang   ║
║                                       (typescript/python/go/rust/    ║
║                                        java/csharp/ruby/php/swift/   ║
║                                        kotlin/dart)                  ║
║                                                                      ║
║  harness spec <name>                  Generate spec template only    ║
║                                                                      ║
║  harness status                       Show project health & progress ║
║                                                                      ║
║  harness review                       Run guardian review gates      ║
║                                                                      ║
║  harness interview                    Start interactive requirements ║
║                                                                      ║
║  harness help                         Show this message              ║
║                                                                      ║
║  AI TOOL COMMANDS (recognized by any AI):                          ║
║                                                                      ║
║  /harness-new-change <name>           Same as: harness new-change    ║
║  /harness-status                      Same as: harness status        ║
║  /harness-review                      Same as: harness review        ║
║  /harness-interview                   Same as: harness interview     ║
║                                                                      ║
║  WORKFLOW:                                                           ║
║  Interview → Spec (SDD) → Plan → Tasks → BDD → TDD → Review        ║
║                                                                      ║
║  MONOREPO SUPPORT:                                                   ║
║  harness init auto-detects ALL languages (up to 3 levels deep)      ║
║  harness new-change <name> --lang=go  Create feature in Go module   ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
`);
}

function showVersion() {
    console.log(`harness v${pkg.version}`);
}

module.exports = { showHelp, showVersion };
