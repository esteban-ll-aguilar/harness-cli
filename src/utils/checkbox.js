const readline = require('readline');

/**
 * Interactive checkbox multi-select for the terminal.
 *
 *   showCheckboxPrompt(title, options) → Promise<number[]>
 *
 * Navigation: ↑/↓ or j/k to move, Space to toggle, Enter to confirm, q/Esc to cancel.
 * Zero dependencies — built on readline keypress events + raw mode.
 */

function showCheckboxPrompt(title, options, { checked = [] } = {}) {
    return new Promise((resolve) => {
        if (!process.stdin.isTTY) {
            // Non-interactive: default to everything checked
            resolve(options.map((_, i) => i));
            return;
        }

        const selected = options.map((_, i) => checked.includes(i));
        let cursor = 0;
        let rendered = 0;
        let done = false;

        const render = () => {
            if (rendered > 0) {
                process.stdout.write(`\x1B[${rendered}A`); // move up
                process.stdout.write('\x1B[J');            // clear below
            }
            const lines = [title];
            options.forEach((opt, i) => {
                const marker = i === cursor ? '›' : ' ';
                const box = selected[i] ? '☑' : '☐';
                lines.push(`  ${marker} ${box} ${opt}`);
            });
            lines.push('  (↑/↓ mover · Espacio seleccionar · Enter confirmar · q cancelar)');
            rendered = lines.length;
            process.stdout.write(lines.join('\n') + '\n');
        };

        const cleanup = (result) => {
            if (done) return;
            done = true;
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener('keypress', onKeypress);
            process.stdout.write(`\x1B[${rendered}A\x1B[J`); // clear the prompt
            resolve(result);
        };

        const onKeypress = (str, key) => {
            if (key && key.ctrl && key.name === 'c') {
                process.stdout.write('\n');
                process.exit(130);
            }
            const isEnter = (key && key.name === 'return') || str === '\r' || str === '\n';
            if (isEnter) {
                cleanup(selected.map((s, i) => s ? i : -1).filter(i => i !== -1));
                return;
            }
            if (key && (key.name === 'up' || key.name === 'k')) {
                cursor = (cursor - 1 + options.length) % options.length;
                render();
                return;
            }
            if (key && (key.name === 'down' || key.name === 'j')) {
                cursor = (cursor + 1) % options.length;
                render();
                return;
            }
            if (key && (key.name === 'q' || key.name === 'escape')) {
                cleanup(options.map((_, i) => i)); // cancel → all
                return;
            }
            if (key && (key.name === 'space' || key.name === ' ') || str === ' ') {
                selected[cursor] = !selected[cursor];
                render();
                return;
            }
        };

        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('keypress', onKeypress);
        render();
    });
}

module.exports = { showCheckboxPrompt };
