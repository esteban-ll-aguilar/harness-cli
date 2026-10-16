const { interview } = require('./interview.js');
const { newChange } = require('./new-change.js');
const { advance } = require('./advance.js');
const { agent } = require('./agent.js');
const { preflight } = require('./preflight.js');

function work(cwd, args) {
    const sub = args[0];
    switch (sub) {
        case 'interview': return interview(cwd, args.slice(1));
        case 'new':
        case 'change': return newChange(cwd, args.slice(1));
        case 'advance': return advance(cwd, args.slice(1));
        case 'agent': return agent(cwd, args.slice(1));
        case 'start': return preflight(cwd, args.slice(1));
        default:
            console.log('\n🛠️  HARNESS WORK\n\n  harness work start <id> [--task=] Mandatory preflight before implementation\n  harness work interview          Gather requirements\n  harness work new <name>         Create an SDD→BDD→TDD change\n  harness work advance <id>        Progress the lifecycle\n  harness work agent <role> [id]   Build a specialist handoff prompt\n');
    }
}
module.exports = { work };
