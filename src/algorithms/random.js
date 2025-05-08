const { betaMean } = require('../utils/mathUtils');

class RandomSampling {
    constructor(xi = 0.7) {
        this.xi = xi; // Mastery threshold
    }

    async selectKC(userStats) {
        const availableStats = userStats.filter(stat => !this.isMasteredKC(stat));
        if (availableStats.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * availableStats.length);
        return availableStats[randomIndex].kc_id;
    }

    isWeakKC(stat) {
        const mu = betaMean(stat.alpha, stat.beta);
        return mu < this.xi;
    }

    isMasteredKC(stat) {
        const mu = betaMean(stat.alpha, stat.beta);
        return mu >= this.xi;
    }
}

module.exports = RandomSampling; 