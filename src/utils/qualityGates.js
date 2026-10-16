const { spawnSync } = require('child_process');

const KNOWN_GATES = ['lint', 'typecheck', 'build', 'coverage', 'security'];

function normalizeQualityGates(quality = {}) {
    const configured = quality.gates || {};
    return KNOWN_GATES.map(name => {
        const value = configured[name];
        if (!value) return null;
        return typeof value === 'string' ? { name, command: value, required: false } : { name, required: false, ...value };
    }).filter(Boolean).filter(gate => typeof gate.command === 'string' && gate.command.trim());
}

function runQualityGate(cwd, gate, { timeout = 120000 } = {}) {
    const result = spawnSync(gate.command, { cwd, shell: true, encoding: 'utf8', timeout, maxBuffer: 1024 * 1024 });
    const unavailable = result.error || result.status === null;
    const ok = !unavailable && result.status === 0;
    return {
        name: `Quality gate: ${gate.name}`,
        gate: gate.name,
        command: gate.command,
        required: Boolean(gate.required),
        status: ok ? 'PASS' : gate.required ? 'FAIL' : 'WARN',
        exitCode: result.status,
        timedOut: result.error?.code === 'ETIMEDOUT',
        hint: ok ? '' : String(result.error?.message || result.stderr || result.stdout || `exit ${result.status}`).trim().slice(0, 300)
    };
}

function runQualityGates(cwd, quality, options) {
    return normalizeQualityGates(quality).map(gate => runQualityGate(cwd, gate, options));
}

module.exports = { KNOWN_GATES, normalizeQualityGates, runQualityGate, runQualityGates };
