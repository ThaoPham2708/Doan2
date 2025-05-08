const { betaSample, betaMean, betaCDF } = require('../utils/mathUtils');

class ThompsonSampling {
    constructor(xi = 0.7, delta = 0.15) {
        this.xi = xi; // Mastery threshold
        this.delta = delta; // Error rate
    }

    async selectKC(userStats) {
        let minSample = Infinity;
        let selectedKC = null;

        for (const stat of userStats) {
            const sample = betaSample(stat.alpha, stat.beta);
            if (sample < minSample) {
                minSample = sample;
                selectedKC = stat.kc_id;
            }
        }

        return selectedKC;
    }

    isWeakKC(stat) {
        const cdf = betaCDF(this.xi, stat.alpha, stat.beta);
        return 1 - cdf < this.delta;
    }

    isMasteredKC(stat) {
        const cdf = betaCDF(this.xi, stat.alpha, stat.beta);
        return 1 - cdf >= 1 - this.delta;
    }
}

module.exports = ThompsonSampling; 