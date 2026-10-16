const { review } = require('./review.js');
const { testCmd } = require('./test.js');
const { gate } = require('./gate.js');
const { judge } = require('./judge.js');
const { trace } = require('./trace.js');
const { qualityReport, qualityTrend } = require('./report.js');

function quality(cwd, args) {
    const sub = args[0];
    switch (sub) {
        case 'review': return review(cwd, args.slice(1));
        case 'test': return testCmd(cwd, args.slice(1));
        case 'gate': return gate(cwd, args.slice(1));
        case 'judge': return judge(cwd, args.slice(1));
        case 'trace': return trace(cwd, args.slice(1));
        case 'report': return qualityReport(cwd, args.slice(1));
        case 'trend': {
            const trend = qualityTrend(require('../utils/fileUtils.js').getHarnessDir(cwd));
            if (args.includes('--json')) console.log(JSON.stringify(trend, null, 2));
            else console.log(`📈 Quality trend: ${trend.snapshots} snapshot(s)${trend.delta ? ` · coverage ${trend.delta.coveredRequirements >= 0 ? '+' : ''}${trend.delta.coveredRequirements} · dangling ${trend.delta.danglingEdges >= 0 ? '+' : ''}${trend.delta.danglingEdges}` : ''}`);
            return trend;
        }
        case 'release': {
            const result = require('../utils/releaseVerifier.js').releaseCheck(cwd);
            console.log(`📦 Release check: ${result.ok ? 'PASS' : 'FAIL'} · evidence: .harness/reports/release/`);
            if (!result.ok) process.exitCode = 1;
            return result;
        }
        default:
            console.log('\n✅ HARNESS QUALITY\n\n  harness quality trace <id>       SDD→BDD→TDD coverage\n  harness quality report [--json] [--snapshot]  CI-friendly report\n  harness quality trend [--json]   Local quality deltas\n  harness quality release           Complete local release check\n  harness quality gate <subcommand> Lifecycle approval/clarity\n  harness quality test <id>        Run actual tests\n  harness quality review [id]      Guardian checks\n  harness quality judge <id>       Record must-rule evidence\n');
    }
}
module.exports = { quality };
