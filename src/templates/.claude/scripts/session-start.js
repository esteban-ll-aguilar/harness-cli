#!/usr/bin/env node
/**
 * Claude Code Session Start Hook
 * Loads harness context automatically
 */

const fs = require('fs');
const path = require('path');

const harnessDir = path.resolve(process.cwd(), '.harness');

function loadFile(...parts) {
  const fp = path.join(harnessDir, ...parts);
  if (fs.existsSync(fp)) {
    console.log(`\n📄 Loading: ${path.relative(harnessDir, fp)}`);
    return fs.readFileSync(fp, 'utf8');
  }
  return '';
}

console.log('🏗️  HARNESS SESSION START');
console.log('═══════════════════════════════════════');

const agents = loadFile('brain', 'AGENTS.md');
const constitution = loadFile('brain', 'constitution.md');
const northStar = loadFile('brain', 'north-star.md');

process.stdout.write('\n--- HARNESS CONTEXT START ---\n');
process.stdout.write(agents);
process.stdout.write('\n--- CONSTITUTION ---\n');
process.stdout.write(constitution);
process.stdout.write('\n--- NORTH STAR ---\n');
process.stdout.write(northStar);
process.stdout.write('\n--- HARNESS CONTEXT END ---\n');

const specsDir = path.join(harnessDir, 'specs');
if (fs.existsSync(specsDir)) {
  const specs = fs.readdirSync(specsDir).filter(d => /^\d{3}-/.test(d));
  console.log(`\n📋 Active Specs: ${specs.length}`);
  specs.forEach(s => console.log(`   - ${s}`));
}

console.log('\n✅ Harness context loaded. Ready for SDD-BDD-TDD workflow.\n');
