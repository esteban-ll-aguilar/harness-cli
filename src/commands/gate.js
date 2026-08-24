const { clarify } = require('./clarify.js');
const { approve } = require('./approve.js');

/**
 * `harness gate` — the two lifecycle checkpoints that work hand-in-hand
 * with `harness advance`: clarify (ambiguity check, blocks architect→tester)
 * and approve (human sign-off, blocks a configured stage). Grouped under one
 * verb — same pattern as `rules`/`memory`/`orchestrate`/`judge` — instead of
 * two easy-to-confuse top-level commands.
 *
 *   harness gate clarify <specId>              Check spec.md for unresolved ambiguities
 *   harness gate approve <specId> [--stage=]   Record human approval for a gated stage
 */
function gate(cwd, args) {
    const sub = args[0];
    switch (sub) {
        case 'clarify':
            clarify(cwd, args.slice(1));
            break;
        case 'approve':
            approve(cwd, args.slice(1));
            break;
        default:
            console.log(`
🚦 HARNESS GATE — lifecycle checkpoints that work with \`harness advance\`

  harness gate clarify <specId>              Check spec.md for unresolved ambiguities
  harness gate approve <specId> [--stage=]   Record human approval for a gated stage

  \`harness advance\` blocks at architect→tester until clarify passes (override with
  --force, logged) and before a gated stage (default: architect) until approved.
`);
    }
}

module.exports = { gate };
