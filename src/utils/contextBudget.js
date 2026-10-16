function estimateTokens(text) { return Math.ceil(String(text || '').length / 4); }

class ContextBudget {
    constructor(totalTokens = 1200, ratios = { working: 0.21, episodic: 0.17, semantic: 0.5, reserve: 0.12 }) {
        this.totalTokens = Math.max(1, Number(totalTokens) || 1200);
        this.ratios = ratios;
        this.used = 0;
        this.tierUsed = {};
        this.included = [];
        this.omitted = [];
    }

    tierLimit(tier) { return Math.floor(this.totalTokens * (this.ratios[tier] || 0)); }

    add(tier, item) {
        const cost = estimateTokens(item.text);
        const tierUsed = this.tierUsed[tier] || 0;
        const tierLimit = this.tierLimit(tier);
        if (cost > tierLimit - tierUsed) {
            this.omitted.push({ ...item, tier, estimatedTokens: cost, reason: 'tier-budget' });
            return false;
        }
        if (cost > this.totalTokens - this.used) {
            this.omitted.push({ ...item, tier, estimatedTokens: cost, reason: 'total-budget' });
            return false;
        }
        this.used += cost;
        this.tierUsed[tier] = tierUsed + cost;
        this.included.push({ ...item, tier, estimatedTokens: cost });
        return true;
    }

    receipt() { return { budgetTokens: this.totalTokens, tokensUsed: this.used, included: this.included, omitted: this.omitted }; }
}

module.exports = { ContextBudget, estimateTokens };
