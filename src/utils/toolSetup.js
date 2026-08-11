const fs = require('fs');
const path = require('path');

/**
 * AI Tool setup — writes real config files at the PROJECT ROOT so the
 * selected AI tool actually picks up the harness (MCP server, instructions).
 *
 *   parseToolsFlag('claude,opencode') → ['claude','opencode']
 *   writeToolConfigs(cwd, tools)      → writes config files, returns summary
 *
 * Config targets (verified locations each tool reads):
 *   .mcp.json          → Claude Code, Cursor, and most MCP-capable CLIs
 *   opencode.json      → OpenCode
 *   .codex/config.toml → Codex CLI
 *   .cursor/mcp.json   → Cursor (project-scoped MCP)
 */

const AI_TOOLS = [
    { id: 'claude',   label: 'Claude Code' },
    { id: 'codex',    label: 'Codex CLI' },
    { id: 'opencode', label: 'OpenCode' },
    { id: 'cursor',   label: 'Cursor' },
    { id: 'copilot',  label: 'Copilot' },
    { id: 'kimi',     label: 'Kimi' },
    { id: 'qwen',     label: 'Qwen' },
    { id: 'deepseek', label: 'DeepSeek' }
];

const ALL_TOOL_IDS = AI_TOOLS.map(t => t.id);

function parseToolsFlag(value) {
    if (!value) return null;
    const ids = value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const valid = ids.filter(id => ALL_TOOL_IDS.includes(id));
    return valid.length > 0 ? valid : null;
}

function mcpJson() {
    return JSON.stringify({
        mcpServers: {
            harness: { command: 'harness-mcp' }
        }
    }, null, 2) + '\n';
}

function opencodeJson() {
    return JSON.stringify({
        $schema: 'https://opencode.ai/config.json',
        mcp: {
            harness: {
                type: 'local',
                command: ['harness-mcp'],
                enabled: true
            }
        },
        instructions: ['.harness/brain/AGENTS.md']
    }, null, 2) + '\n';
}

function codexToml() {
    return `# Harness MCP server (SDD-BDD-TDD)
[mcp_servers.harness]
command = "harness-mcp"
`;
}

function mergeJsonFile(filePath, mergeFn) {
    let existing = {};
    if (fs.existsSync(filePath)) {
        try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) { existing = {}; }
    }
    const merged = mergeFn(existing);
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
}

/**
 * Write the per-tool config files. Returns a list of { label, files } for display.
 */
function writeToolConfigs(cwd, tools) {
    const written = [];

    // .mcp.json — Claude Code and Cursor (project-scoped MCP standard).
    const mcpJsonTools = ['claude', 'cursor'];
    if (tools.some(t => mcpJsonTools.includes(t))) {
        mergeJsonFile(path.join(cwd, '.mcp.json'), (existing) => {
            existing.mcpServers = existing.mcpServers || {};
            existing.mcpServers.harness = existing.mcpServers.harness || { command: 'harness-mcp' };
            return existing;
        });
        written.push({ label: 'MCP (Claude Code / Cursor)', file: '.mcp.json' });
    }

    if (tools.includes('qwen')) {
        // Qwen Code reads mcpServers from .qwen/settings.json (project scope).
        const qwenDir = path.join(cwd, '.qwen');
        if (!fs.existsSync(qwenDir)) fs.mkdirSync(qwenDir, { recursive: true });
        mergeJsonFile(path.join(qwenDir, 'settings.json'), (existing) => {
            existing.mcpServers = existing.mcpServers || {};
            existing.mcpServers.harness = existing.mcpServers.harness || { command: 'harness-mcp' };
            return existing;
        });
        written.push({ label: 'Qwen Code', file: '.qwen/settings.json' });
    }

    if (tools.includes('opencode')) {
        mergeJsonFile(path.join(cwd, 'opencode.json'), (existing) => {
            existing.mcp = existing.mcp || {};
            existing.mcp.harness = {
                type: 'local',
                command: ['harness-mcp'],
                enabled: true
            };
            existing.instructions = existing.instructions || ['.harness/brain/AGENTS.md'];
            return existing;
        });
        written.push({ label: 'OpenCode', file: 'opencode.json' });
    }

    if (tools.includes('codex')) {
        const codexDir = path.join(cwd, '.codex');
        if (!fs.existsSync(codexDir)) fs.mkdirSync(codexDir, { recursive: true });
        const cfgPath = path.join(codexDir, 'config.toml');
        let content = '';
        if (fs.existsSync(cfgPath)) content = fs.readFileSync(cfgPath, 'utf8');
        if (!content.includes('mcp_servers.harness')) {
            content += (content.endsWith('\n') ? '' : '\n') + codexToml();
            fs.writeFileSync(cfgPath, content);
        }
        written.push({ label: 'Codex CLI', file: '.codex/config.toml' });
    }

    if (tools.includes('cursor')) {
        const cursorDir = path.join(cwd, '.cursor');
        if (!fs.existsSync(cursorDir)) fs.mkdirSync(cursorDir, { recursive: true });
        fs.writeFileSync(path.join(cursorDir, 'mcp.json'), mcpJson());
        written.push({ label: 'Cursor', file: '.cursor/mcp.json' });
    }

    if (tools.includes('kimi')) {
        // Kimi Code reads MCP servers from ~/.kimi/mcp.json (user scope).
        // Do NOT write a project file it won't read — notify the user instead.
        written.push({ label: 'Kimi Code (manual)', file: '~/.kimi/mcp.json — run: kimi mcp add harness --transport stdio -- harness-mcp' });
    }

    if (tools.includes('deepseek')) {
        // DeepSeek CLI has no documented project MCP config — nothing to write.
        written.push({ label: 'DeepSeek (MCP manual)', file: 'no config auto-generated — configure MCP in your DeepSeek client' });
    }

    if (tools.includes('copilot')) {
        // Copilot consumes AGENTS.md at root (already created by init) — nothing extra needed.
        written.push({ label: 'Copilot', file: 'AGENTS.md (ya creado)' });
    }

    return written;
}

module.exports = { AI_TOOLS, ALL_TOOL_IDS, parseToolsFlag, writeToolConfigs };
