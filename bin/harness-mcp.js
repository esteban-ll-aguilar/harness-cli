#!/usr/bin/env node
/**
 * Harness MCP Server — exposes harness tools to ANY MCP-compatible AI agent
 * (Claude Code, Codex, OpenCode, Cursor, Windsurf, etc.).
 *
 * Zero-dependency stdio transport speaking the Model Context Protocol
 * (JSON-RPC 2.0 over stdin/stdout).
 *
 *   Tools: harness_init, harness_new_change, harness_status, harness_review,
 *          harness_context (the automatic entry point — bundles search,
 *          symbol lookup, rules, project state, and spec artifacts in one
 *          call, so nobody has to remember which lookup command to use),
 *          harness_agent_run, harness_rules_add, harness_rules_preset,
 *          harness_advance, harness_test, harness_approve (a deliberate
 *          human action, not automated away), harness_orchestrate_status,
 *          harness_orchestrate_claim, harness_orchestrate_release,
 *          harness_memory_compact, harness_judge, harness_judge_record
 *
 *   Deliberately NOT exposed as separate tools (folded into harness_context,
 *   which an agent should call automatically instead of remembering a
 *   specific lookup command by name): harness_memory_search,
 *   harness_memory_symbol, harness_rules_list. Also not exposed:
 *   harness_clarify — `harness_advance` already runs that check internally
 *   and reports it, so a separate pre-check call is redundant. All of these
 *   remain available as CLI commands for a human exploring the vault
 *   directly (`harness memory search`, `harness memory symbol`, `harness
 *   rules list`, `harness gate clarify`).
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
    harness_memory_index: ['memory', 'index'],
    harness_agent_run: ['agent', 'run'],
    harness_agent_list: ['agent', 'list'],
    harness_rules_add: ['rules', 'add'],
    harness_rules_preset: ['rules', 'preset'],
    harness_advance: ['advance'],
    harness_test: ['test'],
    harness_approve: ['gate', 'approve'],
    harness_orchestrate_status: ['orchestrate', 'status'],
    harness_orchestrate_claim: ['orchestrate', 'claim'],
    harness_orchestrate_release: ['orchestrate', 'release'],
    harness_memory_compact: ['memory', 'compact'],
    harness_judge: ['judge'],
    harness_judge_record: ['judge', 'record']
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
        description: 'THE tool to call automatically before/while working — bundles AGENTS.md (which already includes every project rule, so there is no separate "list rules" step), constitution, project state, and — when given — BM25 retrieval (query), symbol lookup (symbol), spec artifacts (spec), and file-scoped rules (forFile). Call this proactively; do not wait to be asked to search or look something up.',
        inputSchema: {
            type: 'object',
            properties: {
                spec: { type: 'string', description: 'Optional spec id, e.g. 001' },
                query: { type: 'string', description: 'Optional free-text retrieval query (BM25 over brain+specs+memory)' },
                symbol: { type: 'string', description: 'Optional symbol name — finds where a function/class is defined in the project source' },
                forFile: { type: 'string', description: 'Optional file path — includes only the rules scoped to it (via --glob)' }
            },
            required: []
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
        name: 'harness_rules_preset',
        description: 'Apply a curated senior-engineer rule pack (default: senior) — data modeling, propose-before-build UI/UX, reuse-before-create, real verification, security, performance and honesty rules. Idempotent; synced into AGENTS.md.',
        inputSchema: {
            type: 'object',
            properties: { name: { type: 'string', description: 'Preset name (default: senior)' } },
            required: []
        }
    },
    {
        name: 'harness_advance',
        description: 'Advance a spec through the 6-agent lifecycle. Jumping with to= records intermediate stages as omitted. Blocked by the approval gate (architect, by default) and the clarify gate (architect->tester) unless force=true.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Spec id, e.g. 001' },
                to: { type: 'string', description: 'Jump to a stage: interviewer..guardian' },
                force: { type: 'boolean', description: 'Override the clarify gate (unresolved spec.md ambiguities) — logged, not silent' }
            },
            required: ['id']
        }
    },
    {
        name: 'harness_approve',
        description: 'Record explicit human approval for a stage (default: architect), unblocking harness_advance past it. Idempotent.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Spec id, e.g. 001' },
                stage: { type: 'string', description: 'Stage to approve (default: the first configured approval gate)' }
            },
            required: ['id']
        }
    },
    {
        name: 'harness_orchestrate_status',
        description: 'List active specs with their stage and claim state, for dispatching parallel work across independent agent sessions.',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'harness_orchestrate_claim',
        description: 'Reserve a spec so another parallel agent session does not duplicate the work. Idempotent for the same owner; refuses a fresh claim held by someone else; takes over a stale (>2h) claim.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Spec id, e.g. 001' },
                owner: { type: 'string', description: 'Claim owner id (default: hostname:pid)' }
            },
            required: ['id']
        }
    },
    {
        name: 'harness_orchestrate_release',
        description: 'Release a spec claim. Idempotent — releasing an unclaimed spec succeeds as a no-op.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string', description: 'Spec id, e.g. 001' } },
            required: ['id']
        }
    },
    {
        name: 'harness_memory_compact',
        description: 'Archive session logs older than N days (default 30) into a digest — keeps memory search relevant, never deletes data.',
        inputSchema: {
            type: 'object',
            properties: { days: { type: 'number', description: 'Age threshold in days (default 30)' } },
            required: []
        }
    },
    {
        name: 'harness_judge',
        description: 'Build a self-assessment prompt (up to 3 enabled "must" rules + the spec diff) for the calling agent to answer. harness-cli never calls an LLM itself.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string', description: 'Spec id, e.g. 001' } },
            required: ['id']
        }
    },
    {
        name: 'harness_judge_record',
        description: 'Record a self-assessment verdict for a rule on a spec. A recorded "fail" will FAIL harness_review\'s Guardian check until re-judged as pass.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Spec id, e.g. 001' },
                rule: { type: 'string', description: 'Rule id (from harness_judge\'s output)' },
                verdict: { type: 'string', description: 'pass, fail, or partial' },
                note: { type: 'string', description: 'Optional justification' }
            },
            required: ['id', 'rule', 'verdict']
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
        } else if (tool === 'harness_agent_run') {
            if (input.name) args.push(input.name);
            if (input.spec) args.push(input.spec);
        } else if (tool === 'harness_context') {
            if (input.spec) args.push(`--spec=${input.spec}`);
            if (input.query) args.push(`--query=${input.query}`);
            if (input.symbol) args.push(`--symbol=${input.symbol}`);
            if (input.forFile) args.push(`--for-file=${input.forFile}`);
        } else if (tool === 'harness_rules_add') {
            args.push(input.text);
            if (input.severity) args.push(`--severity=${input.severity}`);
            if (input.tag) args.push(`--tag=${input.tag}`);
        } else if (tool === 'harness_rules_preset') {
            if (input.name) args.push(input.name);
        } else if (tool === 'harness_advance') {
            args.push(input.id);
            if (input.to) args.push(`--to=${input.to}`);
            if (input.force) args.push('--force');
        } else if (tool === 'harness_test') {
            args.push(input.id);
            if (input.skip) args.push('--skip');
            if (input.cmd) args.push(`--cmd=${input.cmd}`);
        } else if (tool === 'harness_review') {
            if (input.skipTests) args.push('--skip-tests');
        } else if (tool === 'harness_approve') {
            args.push(input.id);
            if (input.stage) args.push(`--stage=${input.stage}`);
        } else if (tool === 'harness_orchestrate_claim' || tool === 'harness_orchestrate_release') {
            args.push(input.id);
            if (input.owner) args.push(`--owner=${input.owner}`);
        } else if (tool === 'harness_memory_compact') {
            if (input.days) args.push(`--days=${input.days}`);
        } else if (tool === 'harness_judge') {
            args.push(input.id);
        } else if (tool === 'harness_judge_record') {
            args.push(input.id);
            args.push(`--rule=${input.rule}`);
            args.push(`--verdict=${input.verdict}`);
            if (input.note) args.push(`--note=${input.note}`);
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
