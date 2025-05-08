const Question = require('../models/Question');
const KnowledgeComponent = require('../models/KnowledgeComponent');
const UserKCStat = require('../models/UserKCStat');
const Response = require('../models/Response');
const HDoC = require('../algorithms/hdoc');
const ThompsonSampling = require('../algorithms/thompson');
const RandomSampling = require('../algorithms/random');

class AssessmentController {
    constructor() {
        this.algorithms = {
            hdoc: new HDoC(),
            thompson: new ThompsonSampling(),
            random: new RandomSampling()
        };
    }

    async submitAnswer(req, res) {
        try {
            const { user_id, question_id, is_correct, algorithm } = req.body;

            // Validate input
            if (!user_id || !question_id || is_correct === undefined || !algorithm) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }

            // Save response
            await Response.create({ user_id, question_id, is_correct });

            // Get question and its KCs
            const question = await Question.findOne({ id: question_id });
            if (!question) {
                return res.status(404).json({ error: 'Question not found' });
            }

            // Update KC stats and handle pseudo-rewards
            for (const kc_id of question.kcs) {
                await this.updateKCStats(user_id, kc_id, is_correct);
            }

            // Get available KCs
            const kcs = await KnowledgeComponent.find();
            const availableKCIds = kcs.map(kc => kc.id);

            // Get user stats for available KCs
            const userStats = await UserKCStat.find({
                user_id,
                kc_id: { $in: availableKCIds }
            });

            // Check for weak KCs
            const selectedAlgorithm = this.algorithms[algorithm];
            if (!selectedAlgorithm) {
                return res.status(400).json({ error: 'Invalid algorithm' });
            }

            const weakKC = userStats.find(stat => selectedAlgorithm.isWeakKC(stat));
            if (weakKC) {
                return res.json({ weak_kc: weakKC.kc_id });
            }

            // Filter out mastered KCs
            const availableStats = userStats.filter(stat => !selectedAlgorithm.isMasteredKC(stat));
            if (availableStats.length === 0) {
                return res.status(404).json({ message: 'No more KCs to evaluate' });
            }

            // Select next KC
            const selectedKC = await selectedAlgorithm.selectKC(availableStats);
            if (!selectedKC) {
                return res.status(404).json({ message: 'No suitable KC found' });
            }

            // Get random question from selected KC
            const questions = await Question.find({ kcs: selectedKC });
            if (questions.length === 0) {
                return res.status(404).json({ message: 'No questions available for selected KC' });
            }

            const nextQuestion = questions[Math.floor(Math.random() * questions.length)];
            res.json({
                question_id: nextQuestion.id,
                text: nextQuestion.text,
                options: nextQuestion.options
            });

        } catch (error) {
            console.error('Error in submitAnswer:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getWeakKCs(req, res) {
        try {
            const { user_id } = req.params;
            const xi = process.env.MASTERY_THRESHOLD || 0.7;

            const stats = await UserKCStat.find({ user_id });
            const weakKCs = stats
                .filter(stat => stat.alpha / (stat.alpha + stat.beta) < xi)
                .map(stat => ({
                    kc_id: stat.kc_id,
                    mastery: stat.alpha / (stat.alpha + stat.beta)
                }));

            res.json(weakKCs);
        } catch (error) {
            console.error('Error in getWeakKCs:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async initialize(req, res) {
        try {
            const { user_id, pi = 3 } = req.body;

            // Get all KCs
            const kcs = await KnowledgeComponent.find();

            // Initialize stats for each KC
            for (const kc of kcs) {
                let stat = await UserKCStat.findOne({ user_id, kc_id: kc.id });
                if (!stat) {
                    stat = new UserKCStat({ user_id, kc_id: kc.id, alpha: 1, beta: 1 });
                    await stat.save();
                }

                // Simulate pi samples
                const questions = await Question.find({ kcs: kc.id });
                for (let i = 0; i < pi; i++) {
                    if (questions.length > 0) {
                        const question = questions[Math.floor(Math.random() * questions.length)];
                        const is_correct = Math.random() > 0.5; // Simulate response
                        
                        await Response.create({ user_id, question_id: question.id, is_correct });
                        
                        stat = await UserKCStat.findOne({ user_id, kc_id: kc.id });
                        if (is_correct) {
                            stat.alpha += 1;
                        } else {
                            stat.beta += 1;
                        }
                        await stat.save();
                        
                        // Update dependent KCs
                        await this.updateKCStats(user_id, kc.id, is_correct);
                    }
                }
            }

            res.json({ message: 'Initialization completed' });
        } catch (error) {
            console.error('Error in initialize:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateKCStats(user_id, kc_id, is_correct) {
        const kc = await KnowledgeComponent.findOne({ id: kc_id });
        const factor = 0.5; // Pseudo-reward factor

        // Update main KC
        let stat = await UserKCStat.findOne({ user_id, kc_id });
        if (!stat) {
            stat = new UserKCStat({ user_id, kc_id, alpha: 1, beta: 1 });
        }
        if (is_correct) {
            stat.alpha += 1;
        } else {
            stat.beta += 1;
        }
        await stat.save();

        // Update dependent KCs
        for (const dep_id of kc.dependencies) {
            let depStat = await UserKCStat.findOne({ user_id, kc_id: dep_id });
            if (!depStat) {
                depStat = new UserKCStat({ user_id, kc_id: dep_id, alpha: 1, beta: 1 });
            }
            if (is_correct) {
                depStat.alpha += factor;
            } else {
                depStat.beta += factor;
            }
            await depStat.save();
        }
    }
}

module.exports = new AssessmentController(); 