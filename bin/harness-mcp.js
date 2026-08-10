#!/usr/bin/env node
/**
 * Harness MCP Server — exposes harness tools to ANY MCP-compatible AI agent
 * (Claude Code, Codex, OpenCode, Cursor, Windsurf, etc.).
 *
 * Zero-dependency stdio transport speaking the Model Context Protocol
 * (JSON-RPC 2.0 over stdin/stdout).
 *
 *   Tools: harness_init, harness_new_change, harness_status,
 *          harness_review, harness_context, harness_memory_search,
 *          harness_agent_run, harness_rules_add, harness_advance,
 *          harness_test
 */

const path = require('path');

const readline = require('readline');
const { runCLI } = require('../src/cli.js');

const TOOL_NAME_TO_COMMAND = {
    harness_init: ['init', '--auto'],
    harness_new_change: ['new-change'],
    harness_status: ['status'],
    harness_review: ['review'],
    harness_spec: ['spec'],
    harness_context: ['context'],
    harness_memory_search: ['memory', 'search'],
    harness_memory_index: ['memory', 'index'],
    harness_agent_run: ['agent', 'run'],
    harness_agent_list: ['agent', 'list'],
    harness_rules_add: ['rules', 'add'],
    harness_rules_list: ['rules', 'list'],
    harness_advance: ['advance'],
    harness_test: ['test']
};

const TOOLS = [
    {
        name: 'harness_init',
        description: 'Initialize the .harness/ project structure (auto-detect language).',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'harness_new_change',
        description: 'Create a new SDD-BDD-TDD feature flow (spec, plan, tasks, BDD, TDD).',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Feature name, e.g. user-authentication' },
                lang: { type: 'string', description: 'Optional language override for monorepos' }
            },
            required: ['name']
        }
    },
    {
        name: 'harness_status',
        description: 'Show project health, specs and agent status.',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'harness_review',
        description: 'Run the Guardian review gates. Now executes the actual tests (pass/fail), checks real BDD scenarios. Pass skipTests=true to record an explicit omission.',
        inputSchema: {
            type: 'object',
            properties: {
                skipTests: { type: 'boolean', description: 'Record an explicit "tests not applicable" omission instead of running them' }
            },
            required: []
        }
    },
    {
        name: 'harness_spec',
        description: 'Generate a spec template for a feature name.',
        inputSchema: {
            type: 'object',
            properties: { name: { type: 'string', description: 'Feature name' } },
            required: ['name']
        }
    },
    {
        name: 'harness_context',
        description: 'Get the full tiered context bundle (AGENTS, constitution, state, optional spec/query).',
        inputSchema: {
            type: 'object',
            properties: {
                spec: { type: 'string', description: 'Optional spec id, e.g. 001' },
                query: { type: 'string', description: 'Optional retrieval query' }
            },
            required: []
        }
    },
    {
        name: 'harness_memory_search',
        description: 'Semantic search over the .harness vault (brain + specs + memory).',
        inputSchema: {
            type: 'object',
            properties: { query: { type: 'string', description: 'Search query' } },
            required: ['query']
        }
    },
    {
        name: 'harness_memory_index',
        description: 'Rebuild the BM25 retrieval index.',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'harness_agent_run',
        description: 'Build the full context prompt for an agent (optionally for a spec).',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Agent name: interviewer/architect/tester/coder/reviewer/guardian/custom' },
                spec: { type: 'string', description: 'Optional spec id' }
            },
            required: ['name']
        }
    },
    {
        name: 'harness_agent_list',
        description: 'List the agent roster.',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'harness_rules_list',
        description: 'List project + constitution rules.',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'harness_rules_add',
        description: 'Add a project rule (synced into AGENTS.md).',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'The rule text' },
                severity: { type: 'string', description: 'must or should' },
                tag: { type: 'string', description: 'Category tag' }
            },
            required: ['text']
        }
    },
    {
        name: 'harness_advance',
        description: 'Advance a spec through the 6-agent lifecycle. Jumping with to= records intermediate stages as omitted.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Spec id, e.g. 001' },
                to: { type: 'string', description: 'Jump to a stage: interviewer..guardian' }
            },
            required: ['id']
        }
    },
    {
        name: 'harness_test',
        description: 'Run the spec tests for real. Detects the language runner, reports pass/fail. Pass skip=true to record an explicit "tests not applicable" decision.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Spec id, e.g. 001' },
                skip: { type: 'boolean', description: 'Record an explicit omission instead of running' },
                cmd: { type: 'string', description: 'Override the test command (run from the spec dir)' }
            },
            required: ['id']
        }
    }
];

class HarnessExit extends Error {}

const originalExit = process.exit;

/**
 * Capture console output from a CLI call.
 */
function runInMemory(args) {
    const lines = [];
    const originalLog = console.log;
    const originalError = console.error;
    let exitCode = 0;

    console.log = (...a) => lines.push(a.map(String).join(' '));
    console.error = (...a) => lines.push(a.map(String).join(' '));

    try {
        process.exit = (code) => { exitCode = code || 0; throw new HarnessExit(); };
        runCLI(args, { cwd: process.cwd() });
    } catch (e) {
        if (!(e instanceof HarnessExit)) {
            lines.push(`ERROR: ${e.message}`);
            exitCode = 1;
        }
    } finally {
        console.log = originalLog;
        console.error = originalError;
        process.exit = originalExit;
    }
    return { output: lines.join('\n').trim(), exitCode };
}

let nextId = 1;

function respond(id, result) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function respondError(id, message) {
    process.stdout.write(JSON.stringify({
        jsonrpc: '2.0', id, error: { code: -32000, message }
    }) + '\n');
}

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', (line) => {
    let msg;
    try {
        msg = JSON.parse(line);
    } catch (e) {
        return; // ignore malformed frames
    }

    if (msg.method === 'initialize') {
        respond(msg.id, {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'harness-mcp', version: '1.0.0' }
        });
        return;
    }

    if (msg.method === 'tools/list') {
        respond(msg.id, { tools: TOOLS });
        return;
    }

    if (msg.method === 'tools/call') {
        const tool = msg.params && msg.params.name;
        const input = (msg.params && msg.params.arguments) || {};
        const spec = TOOL_NAME_TO_COMMAND[tool];
        if (!spec) {
            respondError(msg.id, `Unknown tool: ${tool}`);
            return;
        }

        const args = spec.slice();
        if (tool === 'harness_new_change') {
            args.push(input.name);
            if (input.lang) args.push(`--lang=${input.lang}`);
        } else if (tool === 'harness_spec') {
            args.push(input.name);
        } else if (tool === 'harness_memory_search' || tool === 'harness_agent_run') {
            if (input.query) args.push(input.query);
            if (input.name) args.push(input.name);
            if (input.spec) args.push(input.spec);
        } else if (tool === 'harness_context') {
            if (input.spec) args.push(`--spec=${input.spec}`);
            if (input.query) args.push(`--query=${input.query}`);
        } else if (tool === 'harness_rules_add') {
            args.push(input.text);
            if (input.severity) args.push(`--severity=${input.severity}`);
            if (input.tag) args.push(`--tag=${input.tag}`);
        } else if (tool === 'harness_advance') {
            args.push(input.id);
            if (input.to) args.push(`--to=${input.to}`);
        } else if (tool === 'harness_test') {
            args.push(input.id);
            if (input.skip) args.push('--skip');
            if (input.cmd) args.push(`--cmd=${input.cmd}`);
        } else if (tool === 'harness_review') {
            if (input.skipTests) args.push('--skip-tests');
        }

        const { output, exitCode } = runInMemory(args);
        respond(msg.id, {
            content: [{ type: 'text', text: output || '(no output)' }],
            isError: exitCode !== 0
        });
        return;
    }

    if (msg.method === 'ping') {
        respond(msg.id, {});
        return;
    }

    // Notifications and anything else
    if (msg.id !== undefined) {
        respond(msg.id, {});
    }
});

process.stderr.write('harness-mcp: started\n');
