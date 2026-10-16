const fs = require('fs');
// A receipt is evidence, not prose. Empty / placeholder values cannot close work.
const REQUIRED = ['Touched files:', 'Tests executed:', 'Traceability delta:', 'Adversarial cases:', 'Unresolved risks:', 'Memory observations submitted:'];
function validateCompletionReceipt(file) {
    if (!fs.existsSync(file)) return { valid: false, errors: ['receipt file is missing'] };
    const content = fs.readFileSync(file, 'utf8'); const errors = [];
    for (const field of REQUIRED) {
        const line = content.split('\n').find(l => l.includes(field));
        if (!line || /\[(explicit paths|exact command and result|REQ IDs|malformed DTO|none or explicit risks|inbox paths)/i.test(line) || /:\s*(\[.*\]|)$/i.test(line)) errors.push(`${field} is missing concrete evidence`);
    }
    return { valid: errors.length === 0, errors };
}
module.exports = { validateCompletionReceipt };
