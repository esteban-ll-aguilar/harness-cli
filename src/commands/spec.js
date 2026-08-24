const fs = require('fs');
const path = require('path');
const { getHarnessDir, ensureDir, nextSpecId, slugify } = require('../utils/fileUtils.js');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * `harness spec <name>` — a bare spec.md template only. It does NOT register
 * the feature in `.harnessrc.activeSpecs`, so `harness advance`/`harness
 * status`/`harness review` won't see it. For the full SDD-BDD-TDD flow
 * (spec + plan + tasks + BDD/TDD scaffolding, registered as active), use
 * `harness new-change <name>` instead — this command is only for a quick,
 * throwaway spec draft outside the tracked lifecycle.
 */
function spec(cwd, args) {
    const name = args[0];
    if (!name) {
        console.log('❌ Usage: harness spec <feature-name>');
        console.log('   Template-only, not tracked by advance/status/review — for the full flow use: harness new-change <feature-name>');
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
    console.log('   (template-only — not registered as an active spec; use `harness new-change` for the tracked flow)');
}

module.exports = { spec };
