const { review } = require('./review.js');
const { testCmd } = require('./test.js');
const { gate } = require('./gate.js');
const { judge } = require('./judge.js');
const { trace } = require('./trace.js');
const { qualityReport } = require('./report.js');

function quality(cwd, args) {
    const sub = args[0];
    switch (sub) {
        case 'review': return review(cwd, args.slice(1));
        case 'test': return testCmd(cwd, args.slice(1));
        case 'gate': return gate(cwd, args.slice(1));
        case 'judge': return judge(cwd, args.slice(1));
        case 'trace': return trace(cwd, args.slice(1));
        case 'report': return qualityReport(cwd, args.slice(1));
        default:
            console.log('\n✅ HARNESS QUALITY\n\n  harness quality trace <id>       SDD→BDD→TDD coverage\n  harness quality report [--json]  CI-friendly quality and memory report\n  harness quality gate <subcommand> Lifecycle approval/clarity\n  harness quality test <id>        Run actual tests\n  harness quality review [id]      Guardian checks\n  harness quality judge <id>       Record must-rule evidence\n');
    }
}
module.exports = { quality };
