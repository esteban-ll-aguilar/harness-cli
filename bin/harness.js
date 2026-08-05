#!/usr/bin/env node
/**
 * Harness CLI — Multi-Agent SDD-BDD-TDD Harness
 * Compatible with: Claude Code, Codex CLI, OpenCode, Kimi, Qwen, DeepSeek, Cursor, Copilot, etc.
 */

const path = require('path');
const { runCLI } = require('../src/cli.js');

// Detect if running via npx or global install
const isGlobal = !process.env.npm_execpath || process.env.npm_execpath.includes('npx');

runCLI(process.argv.slice(2), { cwd: process.cwd(), isGlobal });
