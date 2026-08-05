const fs = require('fs');
const path = require('path');
const { getHarnessDir, ensureDir, nextSpecId, slugify } = require('../utils/fileUtils.js');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

function spec(cwd, args) {
    const name = args[0];
    if (!name) {
        console.log('❌ Usage: harness spec <feature-name>');
        return;
    }

    const harnessDir = getHarnessDir(cwd);
    const specId = nextSpecId(cwd);
    const slug = slugify(name);
    const specDir = path.join(harnessDir, 'specs', `${specId}-${slug}`);

    ensureDir(specDir);

    const vars = {
        id: specId,
        name: name,
        slug: slug,
        date: new Date().toISOString().split('T')[0]
    };

    const { copyTemplate } = require('../utils/fileUtils.js');
    copyTemplate(
        path.join(TEMPLATES_DIR, 'specs', '_template', 'spec.md'),
        path.join(specDir, 'spec.md'),
        vars
    );

    console.log(`✅ Spec template created: specs/${specId}-${slug}/spec.md`);
}

module.exports = { spec };
