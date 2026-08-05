const fs = require('fs');
const path = require('path');
const { initProject } = require('./commands/init.js');
const { newChange } = require('./commands/new-change.js');
const { status } = require('./commands/status.js');
const { review } = require('./commands/review.js');
const { interview } = require('./commands/interview.js');
const { spec } = require('./commands/spec.js');
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
            review(ctx.cwd);
            break;
        case 'interview':
            interview(ctx.cwd);
            break;
        case 'spec':
            spec(ctx.cwd, subArgs);
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
