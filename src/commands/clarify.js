const fs = require('fs');
const path = require('path');
const { getHarnessDir } = require('../utils/fileUtils.js');
const { findSpecDir } = require('../utils/testRunner.js');
const { detectAmbiguities } = require('../utils/ambiguityDetector.js');

/**
 * `harness gate clarify <specId>` — run the ambiguity checker against a spec's
 * spec.md on demand, without mutating any state. The same checker gates
 * `harness advance` between the architect and tester stages (see advance.js).
 */
function clarify(cwd, args) {
    const specId = args[0];
    if (!specId) {
        console.log('❌ Usage: harness gate clarify <specId>');
        return;
    }

    const harnessDir = getHarnessDir(cwd);
    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    const specDir = findSpecDir(harnessDir, specId);
    if (!specDir) {
        console.log(`❌ Spec "${specId}" not found. Run: harness status`);
        return;
    }

    const specMdPath = path.join(specDir, 'spec.md');
    if (!fs.existsSync(specMdPath)) {
        console.log(`⚠️  No spec.md yet for ${specId}. Nothing to clarify.`);
        return;
    }

    const findings = detectAmbiguities(fs.readFileSync(specMdPath, 'utf8'));
    printClarifyFindings(specId, findings);
    return findings;
}

function printClarifyFindings(specId, findings) {
    console.log(`\n🔎 CLARIFY — spec ${specId}`);
    console.log('─'.repeat(60));
    if (findings.length === 0) {
        console.log('  ✅ No obvious ambiguities detected in spec.md.');
    } else {
        console.log(`  ⚠️  ${findings.length} area(s) may need clarification before planning:\n`);
        for (const f of findings) console.log('  ' + f);
    }
    console.log('');
}

module.exports = { clarify, printClarifyFindings };
