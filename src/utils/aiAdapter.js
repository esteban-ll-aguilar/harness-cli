const fs = require('fs');
const path = require('path');

/**
 * AI Tool Adapter
 * Detects which AI tool is being used and returns the appropriate
 * configuration and instructions.
 * Compatible with: Claude Code, Codex CLI, OpenCode, Kimi, Qwen, DeepSeek, Cursor, Copilot
 */

const TOOLS = {
    CLAUDE: 'claude',
    CODEX: 'codex',
    OPENCODE: 'opencode',
    KIMI: 'kimi',
    QWEN: 'qwen',
    DEEPSEEK: 'deepseek',
    CURSOR: 'cursor',
    COPILOT: 'copilot',
    GENERIC: 'generic'
};

function detectTool() {
    // Environment-based detection
    if (process.env.CLAUDE_CODE) return TOOLS.CLAUDE;
    if (process.env.OPENAI_API_KEY && process.argv.some(a => a.includes('codex'))) return TOOLS.CODEX;
    if (process.env.OPENCODE_API_KEY) return TOOLS.OPENCODE;
    if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) return TOOLS.KIMI;
    if (process.env.QWEN_API_KEY) return TOOLS.QWEN;
    if (process.env.DEEPSEEK_API_KEY) return TOOLS.DEEPSEEK;
    if (process.env.CURSOR_TRACE_ID) return TOOLS.CURSOR;
    if (process.env.GITHUB_COPILOT_TOKEN) return TOOLS.COPILOT;

    // File-based detection
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, '.claude'))) return TOOLS.CLAUDE;
    if (fs.existsSync(path.join(cwd, '.codex'))) return TOOLS.CODEX;
    if (fs.existsSync(path.join(cwd, '.kimi'))) return TOOLS.KIMI;
    if (fs.existsSync(path.join(cwd, '.deepseek'))) return TOOLS.DEEPSEEK;
    if (fs.existsSync(path.join(cwd, '.qwen'))) return TOOLS.QWEN;
    if (fs.existsSync(path.join(cwd, '.vscode', 'settings.json'))) {
        const settings = fs.readFileSync(path.join(cwd, '.vscode', 'settings.json'), 'utf8');
        if (settings.includes('cursor')) return TOOLS.CURSOR;
    }

    return TOOLS.GENERIC;
}

function getAgentInstructions(harnessDir, tool) {
    const agentsDir = path.join(harnessDir, 'brain');
    const specificFile = path.join(agentsDir, `AGENTS_${tool.toUpperCase()}.md`);
    const genericFile = path.join(agentsDir, 'AGENTS.md');

    if (fs.existsSync(specificFile)) {
        return fs.readFileSync(specificFile, 'utf8');
    }
    if (fs.existsSync(genericFile)) {
        return fs.readFileSync(genericFile, 'utf8');
    }
    return null;
}

function getToolConfig(harnessDir, tool) {
    const configMap = {
        [TOOLS.CLAUDE]: '.claude/scripts/session-start.js',
        [TOOLS.CODEX]: '.codex/hooks.json',
        [TOOLS.KIMI]: '.kimi/kimi-config.json',
        [TOOLS.DEEPSEEK]: '.deepseek/deepseek-config.json',
        [TOOLS.QWEN]: '.qwen/qwen-config.json',
        [TOOLS.OPENCODE]: '.opencode/opencode-config.json',
        [TOOLS.CURSOR]: '.vscode/settings.json',
    };

    const configPath = path.join(harnessDir, configMap[tool] || '');
    if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return null;
}

module.exports = {
    TOOLS, detectTool, getAgentInstructions, getToolConfig
};
