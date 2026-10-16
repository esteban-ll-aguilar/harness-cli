const fs = require('fs');
const path = require('path');
const { getHarnessDir, ensureDir, listFiles, parseFrontmatter, timestamp } = require('../utils/fileUtils.js');
const { buildIndex, search, loadIndex, saveIndex } = require('../utils/retrieval.js');
const { buildSymbolIndex, saveSymbolIndex, getSymbolIndex, findSymbol, findReferences } = require('../utils/symbolIndex.js');
const { buildGraph, saveGraph, loadGraph, queryGraph } = require('../utils/graphIndex.js');
const { submitObservation, processInbox } = require('../utils/memorySteward.js');
const { memoryHealth } = require('../utils/memoryHealth.js');
const { buildSemanticIndex, getSemanticIndex, querySemanticIndex } = require('../utils/semanticMemory.js');
const { runMemoryEvaluation } = require('../utils/memoryEval.js');

/**
 * `harness memory` — retrieval over the .harness vault.
 *
 *   harness memory index             → (re)build the BM25 + symbol index
 *   harness memory search <query>    → retrieve relevant knowledge
 *   harness memory symbol <name>     → find where a function/class is defined
 *   harness memory obsidian          → regenerate Obsidian MOC (Map of Content)
 *   harness memory stats             → corpus statistics
 *   harness memory compact [--days=] → archive old session logs into a digest
 */

function memory(cwd, args) {
    const harnessDir = getHarnessDir(cwd);
    if (!fs.existsSync(harnessDir)) {
        console.log('❌ No .harness/ found. Run: harness init');
        return;
    }

    const sub = args[0];
    switch (sub) {
        case 'index':
            rebuild(cwd, harnessDir);
            break;
        case 'search':
            if (!args[1]) {
                console.log('❌ Usage: harness memory search <query>');
                console.log('   Example: harness memory search "rate limiting auth"');
                return;
            }
            doSearch(harnessDir, args.slice(1).join(' '));
            break;
        case 'obsidian':
            generateObsidian(cwd, harnessDir);
            break;
        case 'stats':
            stats(harnessDir);
            break;
        case 'compact':
            compactCmd(cwd, harnessDir, args.slice(1));
            break;
        case 'symbol':
        case 'symbols':
            symbolCmd(cwd, harnessDir, args.slice(1));
            break;
        case 'graph':
            graphCmd(harnessDir, args.slice(1));
            break;
        case 'observe':
            observeCmd(harnessDir, args.slice(1));
            break;
        case 'steward':
            stewardCmd(harnessDir, args.slice(1));
            break;
        case 'health':
            healthCmd(harnessDir);
            break;
        case 'semantic':
            semanticCmd(harnessDir, args.slice(1));
            break;
        case 'eval':
            evalCmd(harnessDir, args.slice(1));
            break;
        default:
            console.log(`
📦 HARNESS MEMORY — retrieval over the .harness vault

  harness memory index              Rebuild the BM25 + symbol + graph indexes
  harness memory search <query>     Search the whole vault (brain + specs + memory)
  harness memory graph [query]      Inspect the graph memory, or query it directly
  harness memory symbol <name>      Find where a function/class is defined in your source
  harness memory obsidian           Regenerate the Obsidian Map of Content
  harness memory stats              Show corpus statistics
  harness memory compact [--days=N] Archive session logs older than N days (default 30)
                                    into a digest — keeps search relevant, never deletes data
  harness memory observe --claim= --source= --scope= --evidence=
                                    Submit evidence for the Memory Steward
  harness memory steward [--actor=memory-steward]
                                    Validate and promote durable observations
  harness memory health             Check graph provenance and dangling references
  harness memory semantic setup|search|status
                                    Manage local, repo-backed semantic retrieval
`);
    }
}

function evalCmd(harnessDir, args) {
    const report = runMemoryEvaluation();
    fs.mkdirSync(path.join(harnessDir, 'memory', 'session-logs'), { recursive: true });
    fs.writeFileSync(path.join(harnessDir, 'memory', 'session-logs', `memory-eval-${Date.now()}.json`), JSON.stringify(report, null, 2));
    if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
    else console.log(`🧪 Memory eval: ${report.pass ? 'PASS' : 'FAIL'} · recall@k ${report.recallAtK} · stale-hit ${report.staleHitRate} · traceability ${report.traceabilityCoverage}`);
    return report;
}

function observeCmd(harnessDir, args) {
    const flags = Object.fromEntries(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)]; }));
    try {
        submitObservation(harnessDir, flags);
        console.log('🧠 Observation submitted to memory/inbox/. The Memory Steward is the only role that can promote it.');
    } catch (e) { console.log(`❌ ${e.message}`); }
}

function stewardCmd(harnessDir, args) {
    const actor = args.find(a => a.startsWith('--actor='))?.slice(8) || 'memory-steward';
    const result = processInbox(harnessDir, { actor });
    console.log(`🧠 Memory Steward — promoted: ${result.promoted}, duplicates: ${result.duplicates}, rejected: ${result.rejected}`);
}

function healthCmd(harnessDir) {
    const report = memoryHealth(loadGraph(harnessDir));
    console.log(`\n🩺 MEMORY HEALTH — ${report.status.toUpperCase()}`);
    console.log(`   Nodes: ${report.nodeCount} · edges: ${report.edgeCount} · superseded: ${report.supersededNodes.length}`);
    if (report.danglingEdges.length) {
        console.log(`   ⚠️  Dangling references: ${report.danglingEdges.length}`);
        for (const edge of report.danglingEdges.slice(0, 5)) console.log(`      ${edge.from} → ${edge.to}`);
    }
    if (report.orphanedEdges.length) console.log(`   ⚠️  Orphaned edges: ${report.orphanedEdges.length}`);
    if (report.status === 'pass') console.log('   ✅ No dangling or orphaned graph evidence.');
    console.log('');
    return report;
}

function semanticCmd(harnessDir, args) {
    const sub = args[0] || 'status';
    try {
        if (sub === 'setup' || sub === 'index') {
            const index = buildSemanticIndex(harnessDir);
            console.log(`🧠 Semantic index ready: ${index.documents.length} chunks · ${index.dimensions} dimensions · ${index.model}`);
            return index;
        }
        if (sub === 'search') {
            const query = args.slice(1).join(' ').trim();
            if (!query) { console.log('❌ Usage: harness memory semantic search <query>'); return; }
            const hits = querySemanticIndex(harnessDir, query, { topN: 5 });
            if (!hits.length) { console.log('⚠️  Semantic index is missing. Run: harness memory semantic setup'); return; }
            console.log(`🧠 Semantic results for "${query}":`);
            for (const hit of hits) console.log(`   ${hit.score.toFixed(3)}  ${hit.source}`);
            return hits;
        }
        const index = getSemanticIndex(harnessDir, { rebuildIfMissing: false });
        console.log(index ? `🧠 Semantic memory: ${index.documents.length} chunks · ${index.model} · built ${index.builtAt}` : '⚠️  Semantic memory not initialized. Run: harness memory semantic setup');
        return index;
    } catch (e) {
        console.log(`❌ Semantic memory failed: ${e.message}`);
        return null;
    }
}

/**
 * `harness memory graph` — inspect or query the section-level graph memory
 * (see utils/graphIndex.js). Without a query, prints corpus shape (nodes by
 * type, edge counts); with one, runs the same budgeted retrieval that feeds
 * `harness context` / `new-change` / `agent run`, so you can see exactly
 * what an agent would be handed for that query.
 */
function graphCmd(harnessDir, args) {
    const graph = loadGraph(harnessDir);
    if (!graph || graph.numNodes === 0) {
        console.log('⚠️  No graph memory built yet. Run: harness memory index');
        return;
    }

    const query = args.join(' ').trim();
    if (!query) {
        const byType = {};
        for (const node of Object.values(graph.nodes)) byType[node.type] = (byType[node.type] || 0) + 1;
        const superseded = Object.values(graph.nodes).filter(n => n.validUntil !== null).length;

        console.log(`\n🕸️  GRAPH MEMORY`);
        console.log(`   Nodes: ${graph.numNodes}   Edges: ${graph.numEdges}   Superseded: ${superseded}`);
        for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
            console.log(`   ${type.padEnd(10)} ${count}`);
        }
        console.log(`\n💡 harness memory graph "<query>" — see what an agent would be handed for that query\n`);
        return;
    }

    const { nodes, tokensUsed, truncated } = queryGraph(graph, query, { budgetTokens: 600 });
    console.log(`\n🕸️  Query: "${query}"  (~${tokensUsed} tokens${truncated ? ', budget-truncated' : ''})\n`);
    if (nodes.length === 0) {
        console.log('   No matches.');
        return;
    }
    for (const n of nodes) {
        const label = n.heading ? `${n.file}#${n.heading}` : n.file;
        const validity = n.validUntil !== null ? ` [superseded ${new Date(n.validUntil).toISOString().slice(0, 10)}]` : '';
        console.log(`   ${n.score.toFixed(2).padStart(6)}  ${label}  (${n.type}, conf ${n.confidence})${validity}`);
    }
    console.log('');
}

function symbolCmd(cwd, harnessDir, args) {
    const name = args[0];
    if (!name) {
        console.log('❌ Usage: harness memory symbol <name>');
        return;
    }
    const index = getSymbolIndex(cwd, harnessDir);
    const { exact, partial } = findSymbol(index, name);
    if (exact.length > 0) {
        console.log(`\n🔎 "${name}" — ${exact.length} definition(s):`);
        for (const o of exact) console.log(`   ${o.file}:${o.line}  (${o.kind})`);

        const refs = findReferences(cwd, name, exact);
        if (refs.length > 0) {
            console.log(`\n📎 Referenced in ${refs.length} other place(s):`);
            for (const r of refs.slice(0, 15)) console.log(`   ${r.file}:${r.line}`);
            if (refs.length > 15) console.log(`   … (+${refs.length - 15} more)`);
        } else {
            console.log('\n📎 No other references found (dead code, or only called dynamically).');
        }
        console.log('');
        return;
    }
    if (partial.length > 0) {
        console.log(`\n🔎 No exact match for "${name}". Closest matches:`);
        for (const o of partial.slice(0, 10)) console.log(`   ${o.symbol}  →  ${o.file}:${o.line}  (${o.kind})`);
        console.log('');
        return;
    }
    console.log(`\n🔎 No symbol matching "${name}" found.\n`);
}

function compactCmd(cwd, harnessDir, args) {
    const daysFlag = args.find(a => a.startsWith('--days='));
    const days = daysFlag ? parseInt(daysFlag.slice(7), 10) : 30;
    const result = compactSessionLogs(cwd, harnessDir, { days });

    if (result.archived === 0) {
        console.log(`✅ Nothing to compact — no session logs older than ${days} day(s).`);
        return;
    }

    console.log(`🗜️  Compacted ${result.archived} log(s) older than ${days} day(s).`);
    console.log(`   Archived to: .harness/.archive/session-logs/`);
    console.log(`   Digest written: ${path.relative(cwd, result.digestPath)}`);
    console.log(`   BM25 + graph indexes rebuilt.`);
}

/**
 * Archive session logs older than `days` into `.harness/.archive/session-logs/`
 * (deliberately OUTSIDE buildIndex's brain/specs/memory roots, so search stays
 * relevant) and write one grouped digest back into `memory/session-logs/`.
 * Never deletes data. Idempotent: nothing eligible → { archived: 0 }.
 */
function compactSessionLogs(cwd, harnessDir, { days = 30 } = {}) {
    const logsDir = path.join(harnessDir, 'memory', 'session-logs');
    if (!fs.existsSync(logsDir)) return { archived: 0 };

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.md') && !f.startsWith('digest-'));

    const eligible = [];
    for (const f of files) {
        const fp = path.join(logsDir, f);
        const content = fs.readFileSync(fp, 'utf8');
        const { meta } = parseFrontmatter(content);
        let ts = meta.date ? Date.parse(meta.date) : NaN;
        if (Number.isNaN(ts)) {
            try { ts = fs.statSync(fp).mtimeMs; } catch (e) { continue; }
        }
        if (ts < cutoff) eligible.push({ file: f, fp, meta, ts });
    }

    if (eligible.length === 0) return { archived: 0 };

    const groups = {};
    for (const e of eligible) {
        const key = `${e.meta.event || 'unknown'}::${e.meta.spec || '-'}`;
        if (!groups[key]) groups[key] = { event: e.meta.event || 'unknown', spec: e.meta.spec || '-', count: 0, min: e.ts, max: e.ts };
        groups[key].count++;
        groups[key].min = Math.min(groups[key].min, e.ts);
        groups[key].max = Math.max(groups[key].max, e.ts);
    }

    const archiveDir = path.join(harnessDir, '.archive', 'session-logs');
    ensureDir(archiveDir);
    for (const e of eligible) {
        fs.renameSync(e.fp, path.join(archiveDir, e.file));
    }

    const fromTs = Math.min(...eligible.map(e => e.ts));
    const toTs = Math.max(...eligible.map(e => e.ts));
    const fromDate = new Date(fromTs).toISOString().slice(0, 10);
    const toDate = new Date(toTs).toISOString().slice(0, 10);

    const lines = [
        '---',
        `date: ${timestamp()}`,
        'agent: harness-cli',
        'event: memory-compacted',
        '---',
        '',
        `# Session log digest — ${fromDate} to ${toDate}`,
        '',
        `Archived ${eligible.length} log(s) older than ${days} day(s) into \`.harness/.archive/session-logs/\` (kept on disk, out of the search index).`,
        '',
        '| Event | Spec | Count | Date range |',
        '|---|---|---|---|',
        ...Object.values(groups).map(g =>
            `| ${g.event} | ${g.spec} | ${g.count} | ${new Date(g.min).toISOString().slice(0, 10)} → ${new Date(g.max).toISOString().slice(0, 10)} |`)
    ];

    const digestPath = path.join(logsDir, `digest-${fromDate}-${toDate}.md`);
    fs.writeFileSync(digestPath, lines.join('\n') + '\n');

    const index = buildIndex(harnessDir);
    saveIndex(harnessDir, index);
    saveGraph(harnessDir, buildGraph(harnessDir));

    return { archived: eligible.length, digestPath, groups: Object.values(groups) };
}

function rebuild(cwd, harnessDir) {
    const index = buildIndex(harnessDir);
    saveIndex(harnessDir, index);
    console.log(`🧠 Index rebuilt: ${index.numDocs} documents, ${Object.keys(index.df).length} unique terms`);
    console.log(`📁 ${path.join(harnessDir, '.index', 'harness-index.json')}`);

    const symbolIndex = buildSymbolIndex(cwd);
    saveSymbolIndex(harnessDir, symbolIndex);
    console.log(`🔎 Symbol index rebuilt: ${symbolIndex.numSymbols} symbols`);

    const graph = buildGraph(harnessDir);
    saveGraph(harnessDir, graph);
    console.log(`🕸️  Graph memory rebuilt: ${graph.numNodes} nodes, ${graph.numEdges} edges`);
    console.log('💡 Tip: open this folder as an Obsidian vault, use `harness memory search`, or `harness memory symbol <name>`.');
}

function doSearch(harnessDir, query) {
    const index = loadIndex(harnessDir);
    if (!index || index.numDocs === 0) {
        console.log('⚠️  No indexed documents. Run: harness memory index');
        return;
    }
    console.log(`🔎 Query: "${query}"`);
    console.log(`   Corpus: ${index.numDocs} docs · indexed at ${index.builtAt.slice(0, 10)}\n`);

    const results = search(index, harnessDir, query, 5);
    if (results.length === 0) {
        console.log('   No matches. Try different keywords or run `harness memory index`.');
        return;
    }
    for (const r of results) {
        console.log(`   ${r.score.toFixed(2).padStart(6)}  ${r.rel}`);
        console.log(`          ${r.snippet.trim()}`);
        console.log('');
    }
}

function stats(harnessDir) {
    const index = loadIndex(harnessDir);
    const graph = loadGraph(harnessDir, { rebuild: false });
    const countIn = (root) => {
        const dir = path.join(harnessDir, root);
        if (!fs.existsSync(dir)) return 0;
        return listFiles(dir).filter(f => /\.(md|feature)$/i.test(f)).length;
    };
    console.log(`
🧠 MEMORY CORPUS
   Brain files:   ${countIn('brain')}
   Specs files:   ${countIn('specs')}
   Memory logs:   ${countIn('memory')}
   Indexed docs:  ${index ? index.numDocs : 0} (${index ? Object.keys(index.df).length : 0} terms)
   Graph memory:  ${graph ? graph.numNodes : 0} nodes, ${graph ? graph.numEdges : 0} edges
`);
}

/**
 * Generate an Obsidian Map of Content so the vault is actually navigable.
 * Wikilinks connect specs, ADRs and session logs.
 */
function generateObsidian(cwd, harnessDir) {
    const vaultDir = path.join(harnessDir, 'memory', 'obsidian');
    ensureDir(vaultDir);

    const specsDir = path.join(harnessDir, 'specs');
    const specs = fs.existsSync(specsDir)
        ? fs.readdirSync(specsDir).filter(d => /^\d{3}-/.test(d)).sort()
        : [];

    const decisionsDir = path.join(harnessDir, 'brain', 'decisions');
    const adrs = fs.existsSync(decisionsDir)
        ? fs.readdirSync(decisionsDir).filter(f => f.endsWith('.md'))
        : [];

    const lines = [];
    lines.push(`# MOC — ${path.basename(cwd)}`);
    lines.push('');
    lines.push('> Generated by `harness memory obsidian`. Do not edit by hand.');
    lines.push('');
    lines.push('## 🎯 Specs');
    lines.push('');
    if (specs.length === 0) {
        lines.push('- _No specs yet. Run `harness new-change <name>`._');
    }
    for (const spec of specs) {
        const title = spec.replace(/^\d{3}-/, '').replace(/-/g, ' ');
        lines.push(`- [[${spec}/spec|${title}]]`);
    }
    lines.push('');
    lines.push('## 🧭 Architecture Decision Records');
    lines.push('');
    if (adrs.length === 0) {
        lines.push('- _No ADRs yet._');
    }
    for (const adr of adrs) {
        const name = adr.replace(/\.md$/, '');
        lines.push(`- [[${path.join('brain', 'decisions', name)}|${name}]]`);
    }
    lines.push('');
    lines.push('## 🗂️ Knowledge');
    lines.push('');
    lines.push('- [[brain/AGENTS|AGENTS.md]]');
    lines.push('- [[brain/constitution|Constitution]]');
    lines.push('- [[brain/north-star|North Star]]');
    lines.push('');

    const mocPath = path.join(vaultDir, 'MOC.md');
    fs.writeFileSync(mocPath, lines.join('\n'));

    // Ensure the MOC is inside the Obsidian vault scope
    const obsidianTemplates = path.join(harnessDir, '.obsidian', 'templates');
    ensureDir(obsidianTemplates);

    console.log(`🗂️  Obsidian MOC generated: memory/obsidian/MOC.md`);
    console.log(`   Open ${harnessDir} as an Obsidian vault to browse specs, ADRs and memory as a graph.`);
    console.log(`   Regenerate with: harness memory obsidian`);
}

module.exports = { memory, generateObsidian, compactSessionLogs, healthCmd, semanticCmd };
