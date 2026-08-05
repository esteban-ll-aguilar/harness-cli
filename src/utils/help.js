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
║  harness init                        Initialize .harness/ in project ║
║  harness new-change <name>           Create SDD-BDD-TDD feature flow ║
║  harness spec <name>                 Generate spec template only     ║
║  harness status                      Show project health & progress  ║
║  harness review                      Run guardian review gates       ║
║  harness interview                   Start interactive requirement     ║
║                                      gathering session               ║
║  harness help                        Show this message               ║
║                                                                      ║
║  AI TOOL COMMANDS (recognized by any AI):                          ║
║                                                                      ║
║  /harness-new-change <name>          Same as: harness new-change     ║
║  /harness-status                     Same as: harness status         ║
║  /harness-review                     Same as: harness review         ║
║  /harness-interview                  Same as: harness interview      ║
║                                                                      ║
║  WORKFLOW:                                                           ║
║  Interview → Spec (SDD) → Plan → Tasks → BDD → TDD → Review        ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
`);
}

function showVersion() {
    console.log(`harness v${pkg.version}`);
}

module.exports = { showHelp, showVersion };
