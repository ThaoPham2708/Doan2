const { betaMean } = require('../utils/mathUtils');

class HDoC {
    constructor(xi = 0.7, delta = 0.15) {
        this.xi = xi; // Mastery threshold
        this.delta = delta; // Error rate
    }

    async selectKC(userStats, t) {
        let minScore = Infinity;
        let selectedKC = null;

        for (const stat of userStats) {
            const mu = betaMean(stat.alpha, stat.beta);
            const N = stat.alpha + stat.beta;
            const score = mu + Math.sqrt(Math.log(t) / (2 * N));

            if (score < minScore) {
                minScore = score;
                selectedKC = stat.kc_id;
            }
        }

        return selectedKC;
    }

    isWeakKC(stat) {
        const mu = betaMean(stat.alpha, stat.beta);
        const N = stat.alpha + stat.beta;
        const score = mu + Math.sqrt(Math.log(N) / (2 * N));
        return score < this.xi;
    }

    isMasteredKC(stat) {
        const mu = betaMean(stat.alpha, stat.beta);
        return mu >= this.xi;
    }
}

module.exports = HDoC; 