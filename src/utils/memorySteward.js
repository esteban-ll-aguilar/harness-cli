const fs = require('fs');
const path = require('path');
const { slugify, timestamp } = require('./fileUtils.js');

function inboxDir(harnessDir) { return path.join(harnessDir, 'memory', 'inbox'); }

function submitObservation(harnessDir, observation) {
    const required = ['claim', 'source', 'scope', 'evidence'];
    if (!required.every(key => String(observation[key] || '').trim())) throw new Error('Observation requires claim, source, scope and evidence');
    fs.mkdirSync(inboxDir(harnessDir), { recursive: true });
    const record = { ...observation, submittedAt: timestamp(), normalizedClaim: String(observation.claim).trim().toLowerCase() };
    const fp = path.join(inboxDir(harnessDir), `observation-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    fs.writeFileSync(fp, JSON.stringify(record, null, 2));
    return fp;
}

function processInbox(harnessDir, { actor } = {}) {
    const files = fs.existsSync(inboxDir(harnessDir)) ? fs.readdirSync(inboxDir(harnessDir)).filter(f => f.endsWith('.json')) : [];
    if (actor !== 'memory-steward') return { promoted: 0, duplicates: 0, rejected: files.length, reason: 'memory-steward-required' };
    const patterns = path.join(harnessDir, 'brain', 'patterns');
    fs.mkdirSync(patterns, { recursive: true });
    let promoted = 0, duplicates = 0, rejected = 0;
    for (const file of files) {
        const fp = path.join(inboxDir(harnessDir), file);
        let item;
        try { item = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (e) { rejected++; fs.unlinkSync(fp); continue; }
        if (!item.claim || !item.source || !item.evidence) { rejected++; fs.unlinkSync(fp); continue; }
        const dest = path.join(patterns, `observation-${slugify(item.claim)}.md`);
        if (fs.existsSync(dest)) { duplicates++; fs.unlinkSync(fp); continue; }
        fs.writeFileSync(dest, `---\nid: memory-${slugify(item.claim)}\nkind: pattern\ncreated_at: ${timestamp()}\nsource: ${item.source}\nscope: ${item.scope || '-'}\nevidence: ${item.evidence}\nowner: memory-steward\n---\n\n# ${item.claim}\n\nPromoted from a provenance-bearing agent observation.\n`);
        promoted++;
        fs.unlinkSync(fp);
    }
    return { promoted, duplicates, rejected };
}

module.exports = { inboxDir, submitObservation, processInbox };
