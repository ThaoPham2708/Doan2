const experimentConfig = require('../config/experimentConfig');
const KnowledgeComponent = require('../models/KnowledgeComponent');
const Transaction = require('../models/Transaction');
const Question = require('../models/Question');

class ExperimentController {
    // 4.2.1 Thử nghiệm với số lượng KC khác nhau
    async experimentKCCount(req, res) {
        try {
            const { studentId } = req.params;
            const results = [];

            for (let kcCount = experimentConfig.kcCount.min; kcCount <= experimentConfig.kcCount.max; kcCount++) {
                // Lấy ngẫu nhiên kcCount KC
                const kcs = await KnowledgeComponent.find().limit(kcCount);
                const kcIds = kcs.map(kc => kc.id);

                // Lấy transactions liên quan đến các KC này
                const questions = await Question.find({ kcs: { $in: kcIds } });
                const questionIds = questions.map(q => q.id);
                const transactions = await Transaction.find({
                    user_id: studentId,
                    question_id: { $in: questionIds }
                });

                // Tính toán độ chính xác và số lượng câu hỏi
                const accuracy = ExperimentController.calculateAccuracy(transactions);
                const questionCount = transactions.length;

                results.push({
                    kcCount,
                    accuracy,
                    questionCount
                });
            }

            res.json(results);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // 4.2.2 Thử nghiệm với ngưỡng làm chủ khác nhau
    async experimentMasteryThreshold(req, res) {
        try {
            const { studentId } = req.params;
            const results = [];

            for (let threshold = experimentConfig.masteryThreshold.min; 
                 threshold <= experimentConfig.masteryThreshold.max; 
                 threshold += experimentConfig.masteryThreshold.step) {
                
                const transactions = await Transaction.find({ user_id: studentId });
                const kcStats = ExperimentController.calculateKCStats(transactions);
                
                // Phân loại KC dựa trên ngưỡng
                const weakKCs = Object.entries(kcStats)
                    .filter(([_, stat]) => stat.ratio < threshold)
                    .map(([kcId, stat]) => ({
                        kcId,
                        ratio: stat.ratio,
                        questionCount: stat.total
                    }));

                results.push({
                    threshold,
                    weakKCCount: weakKCs.length,
                    averageQuestionsPerKC: ExperimentController.calculateAverageQuestions(weakKCs)
                });
            }

            res.json(results);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // 4.2.3 Thử nghiệm với năng lực học sinh khác nhau
    async experimentAptitude(req, res) {
        try {
            const { studentId } = req.params;
            const transactions = await Transaction.find({ user_id: studentId });
            const aptitude = ExperimentController.calculateAptitude(transactions);
            
            // Xác định mức năng lực
            let level;
            if (aptitude >= experimentConfig.aptitude.levels.high.min) {
                level = 'high';
            } else if (aptitude >= experimentConfig.aptitude.levels.medium.min) {
                level = 'medium';
            } else {
                level = 'low';
            }

            // Phân tích độ chính xác theo mức năng lực
            const kcStats = ExperimentController.calculateKCStats(transactions);
            const accuracyByLevel = ExperimentController.analyzeAccuracyByLevel(kcStats, level);

            res.json({
                aptitude,
                level,
                accuracyByLevel,
                totalQuestions: transactions.length
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // 4.2.4 Thử nghiệm với tỷ lệ sai số khác nhau
    async experimentErrorRate(req, res) {
        try {
            const { studentId } = req.params;
            const results = [];

            for (let errorRate = experimentConfig.errorRate.min; 
                 errorRate <= experimentConfig.errorRate.max; 
                 errorRate += experimentConfig.errorRate.step) {
                
                const transactions = await Transaction.find({ user_id: studentId });
                const kcStats = ExperimentController.calculateKCStats(transactions);
                
                // Mô phỏng sai số
                const simulatedStats = ExperimentController.simulateError(kcStats, errorRate);
                const accuracy = ExperimentController.calculateAccuracyWithError(simulatedStats);
                const questionCount = transactions.length;

                results.push({
                    errorRate,
                    accuracy,
                    questionCount
                });
            }

            res.json(results);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Các phương thức hỗ trợ - chuyển thành static
    static calculateAccuracy(transactions) {
        if (transactions.length === 0) return 0;
        const correct = transactions.filter(t => t.correct).length;
        return correct / transactions.length;
    }

    static calculateKCStats(transactions) {
        const stats = {};
        transactions.forEach(t => {
            if (!stats[t.kc_id]) {
                stats[t.kc_id] = { total: 0, correct: 0, ratio: 0 };
            }
            stats[t.kc_id].total++;
            if (t.correct) stats[t.kc_id].correct++;
            stats[t.kc_id].ratio = stats[t.kc_id].correct / stats[t.kc_id].total;
        });
        return stats;
    }

    static calculateAptitude(transactions) {
        if (transactions.length === 0) return 0.5;
        const correct = transactions.filter(t => t.correct).length;
        return correct / transactions.length;
    }

    static calculateAverageQuestions(weakKCs) {
        if (weakKCs.length === 0) return 0;
        const total = weakKCs.reduce((sum, kc) => sum + kc.questionCount, 0);
        return total / weakKCs.length;
    }

    static analyzeAccuracyByLevel(kcStats, level) {
        const stats = Object.values(kcStats);
        const accuracy = stats.reduce((sum, stat) => sum + stat.ratio, 0) / stats.length;
        
        return {
            level,
            accuracy,
            kcCount: stats.length
        };
    }

    static simulateError(kcStats, errorRate) {
        const simulated = {};
        Object.entries(kcStats).forEach(([kcId, stat]) => {
            simulated[kcId] = {
                ...stat,
                ratio: stat.ratio * (1 - errorRate) + (Math.random() * errorRate)
            };
        });
        return simulated;
    }

    static calculateAccuracyWithError(simulatedStats) {
        const stats = Object.values(simulatedStats);
        return stats.reduce((sum, stat) => sum + stat.ratio, 0) / stats.length;
    }
}

module.exports = new ExperimentController(); 