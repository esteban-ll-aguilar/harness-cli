const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { getHarnessDir } = require('./fileUtils.js');

function command(cwd, value) {
    const r = spawnSync(value, { cwd, shell: true, encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
    return { command: value, ok: !r.error && r.status === 0, exitCode: r.status, stdout: String(r.stdout || ''), output: String(r.error?.message || r.stderr || r.stdout || '').trim().slice(0, 1000) };
}
function sha512(file) { return crypto.createHash('sha512').update(fs.readFileSync(file)).digest('hex'); }
function sbom(cwd) {
    const lockPath = path.join(cwd, 'package-lock.json'); const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    return { bomFormat: 'CycloneDX', specVersion: '1.5', metadata: { component: { name: lock.name, version: lock.version, type: 'application' } }, components: Object.entries(lock.packages || {}).filter(([name]) => name.startsWith('node_modules/')).map(([name, pkg]) => ({ type: 'library', name: name.slice('node_modules/'.length), version: pkg.version, licenses: pkg.license ? [{ license: { id: pkg.license } }] : [], hashes: pkg.integrity ? [{ alg: 'SHA-512', content: pkg.integrity.replace(/^sha512-/, '') }] : [] })) };
}
function releaseCheck(cwd) {
    const results = [command(cwd, 'npm test'), command(cwd, 'npm audit --audit-level=moderate'), command(cwd, 'npm pack --json')];
    let pack;
    try { pack = JSON.parse(results[2].stdout)[0]; } catch (_) { pack = null; }
    const tarball = pack?.filename ? path.join(cwd, pack.filename) : null;
    const reports = path.join(getHarnessDir(cwd), 'reports', 'release'); fs.mkdirSync(reports, { recursive: true });
    const evidence = { generatedAt: new Date().toISOString(), results, artifact: tarball && fs.existsSync(tarball) ? { path: path.relative(cwd, tarball), sha512: sha512(tarball), bytes: fs.statSync(tarball).size } : null };
    fs.writeFileSync(path.join(reports, 'sbom.json'), JSON.stringify(sbom(cwd), null, 2));
    fs.writeFileSync(path.join(reports, 'integrity.json'), JSON.stringify(evidence.artifact, null, 2));
    fs.writeFileSync(path.join(reports, 'release-report.json'), JSON.stringify(evidence, null, 2));
    evidence.ok = results.every(result => result.ok) && Boolean(evidence.artifact);
    return evidence;
}
module.exports = { command, sbom, releaseCheck };
