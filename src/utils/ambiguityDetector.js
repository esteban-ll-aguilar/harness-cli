/**
 * Reusable ambiguity heuristic — originally lived only inside interview.js
 * (single-use, over the interview's structured answers). Extracted so it can
 * also run against a spec.md's free text as a blocking "clarify" gate
 * between the Architect and Tester stages (see advance.js / clarify.js).
 */

const CHECKS = [
    {
        keywords: ['performance', 'speed', 'latency'],
        message: '- **Performance requirements not specified.** What are the acceptable response times?'
    },
    {
        keywords: ['error', 'fail', 'exception'],
        message: '- **Error handling not specified.** What happens when operations fail?'
    },
    {
        keywords: ['security', 'auth', 'password'],
        message: '- **Security requirements not specified.** How is access controlled?'
    },
    {
        keywords: ['scale', 'concurrent', 'user'],
        message: '- **Scale requirements not specified.** How many concurrent users?'
    }
];

/**
 * Returns an array of finding strings (empty when nothing looks missing).
 */
function detectAmbiguities(text) {
    const lower = String(text || '').toLowerCase();
    return CHECKS
        .filter(check => !check.keywords.some(k => lower.includes(k)))
        .map(check => check.message);
}

module.exports = { detectAmbiguities };
