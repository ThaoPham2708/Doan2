const jstat = require('jstat');

// Calculate mean of Beta distribution
const betaMean = (alpha, beta) => {
    return alpha / (alpha + beta);
};

// Sample from Beta distribution
const betaSample = (alpha, beta) => {
    return jstat.beta.sample(alpha, beta);
};

// Calculate CDF of Beta distribution
const betaCDF = (x, alpha, beta) => {
    return jstat.beta.cdf(x, alpha, beta);
};

// Calculate confidence interval for Beta distribution
const betaConfidenceInterval = (alpha, beta, confidence = 0.95) => {
    const mean = betaMean(alpha, beta);
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
    const stdDev = Math.sqrt(variance);
    const zScore = jstat.normal.inv(1 - (1 - confidence) / 2, 0, 1);
    
    return {
        lower: mean - zScore * stdDev,
        upper: mean + zScore * stdDev
    };
};

module.exports = {
    betaMean,
    betaSample,
    betaCDF,
    betaConfidenceInterval
}; 