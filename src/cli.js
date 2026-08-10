const fs = require('fs');
const path = require('path');
const { initProject } = require('./commands/init.js');
const { newChange } = require('./commands/new-change.js');
const { status } = require('./commands/status.js');
const { review } = require('./commands/review.js');
const { interview } = require('./commands/interview.js');
const { spec } = require('./commands/spec.js');
const { memory } = require('./commands/memory.js');
const { agent } = require('./commands/agent.js');
const { rules } = require('./commands/rules.js');
const { context } = require('./commands/context.js');
const { advance } = require('./commands/advance.js');
const { testCmd } = require('./commands/test.js');
const { showHelp, showVersion } = require('./utils/help.js');

function runCLI(args, ctx) {
    const command = args[0];
    const subArgs = args.slice(1);

    switch (command) {
        case 'init':
            initProject(ctx.cwd, subArgs);
            break;
        case 'new-change':
        case 'change':
            newChange(ctx.cwd, subArgs);
            break;
        case 'status':
            status(ctx.cwd);
            break;
        case 'review':
            review(ctx.cwd, subArgs);
            break;
        case 'interview':
            interview(ctx.cwd);
            break;
        case 'spec':
            spec(ctx.cwd, subArgs);
            break;
        case 'memory':
            memory(ctx.cwd, subArgs);
            break;
        case 'agent':
            agent(ctx.cwd, subArgs);
            break;
        case 'rules':
            rules(ctx.cwd, subArgs);
            break;
        case 'context':
            context(ctx.cwd, subArgs);
            break;
        case 'advance':
            advance(ctx.cwd, subArgs);
            break;
        case 'test':
            testCmd(ctx.cwd, subArgs);
            break;
        case 'version':
        case '-v':
        case '--version':
            showVersion();
            break;
        case 'help':
        case '-h':
        case '--help':
        default:
            showHelp();
            break;
    }
}

module.exports = { runCLI };
