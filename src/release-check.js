#!/usr/bin/env node
const { releaseCheck } = require('./utils/releaseVerifier.js');
const result = releaseCheck(process.cwd());
console.log(`Release check: ${result.ok ? 'PASS' : 'FAIL'} · ${result.artifact?.path || 'no package artifact'}`);
process.exitCode = result.ok ? 0 : 1;
