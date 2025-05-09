const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const KnowledgeComponent = require('../models/KnowledgeComponent');
const Transaction = require('../models/Transaction');

// Get all knowledge components
router.get('/kcs', async (req, res) => {
    try {
        const kcs = await KnowledgeComponent.find();
        res.json(kcs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get knowledge component by ID
router.get('/kcs/:id', async (req, res) => {
    try {
        const kc = await KnowledgeComponent.findOne({ id: req.params.id });
        if (!kc) {
            return res.status(404).json({ message: 'Knowledge component not found' });
        }
        res.json(kc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all questions
router.get('/questions', async (req, res) => {
    try {
        const questions = await Question.find();
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get question by ID
router.get('/questions/:id', async (req, res) => {
    try {
        const question = await Question.findOne({ id: req.params.id });
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }
        res.json(question);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get questions by KC ID
router.get('/kcs/:kcId/questions', async (req, res) => {
    try {
        const questions = await Question.find({ kcs: req.params.kcId });
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get student performance
router.get('/students/:studentId/performance', async (req, res) => {
    try {
        // Lấy tất cả transaction của học sinh
        const transactions = await Transaction.find({ user_id: req.params.studentId })
            .sort({ timestamp: 1 });

        // Lấy danh sách question_id duy nhất
        const questionIds = [...new Set(transactions.map(t => t.question_id))];
        // Lấy thông tin các câu hỏi liên quan
        const questions = await Question.find({ id: { $in: questionIds } });
        // Tạo map questionId -> kcs
        const questionKcMap = {};
        questions.forEach(q => {
            questionKcMap[q.id] = q.kcs || [];
        });

        // Tính toán performance
        const performance = {
            total_questions: transactions.length,
            correct_answers: transactions.filter(t => t.correct).length,
            average_time: transactions.length > 0 ? (transactions.reduce((acc, t) => acc + (t.time_taken || 0), 0) / transactions.length) : 0,
            kc_performance: {},
            weak_kcs: [] // Danh sách KC yếu
        };

        // Tính performance cho từng KC
        for (const transaction of transactions) {
            const kcs = questionKcMap[transaction.question_id] || [];
            for (const kcId of kcs) {
                if (!performance.kc_performance[kcId]) {
                    performance.kc_performance[kcId] = { total: 0, correct: 0 };
                }
                performance.kc_performance[kcId].total++;
                if (transaction.correct) {
                    performance.kc_performance[kcId].correct++;
                }
            }
        }

        // Lọc ra các KC yếu (tỷ lệ đúng < 60%)
        for (const [kcId, stat] of Object.entries(performance.kc_performance)) {
            const ratio = stat.total > 0 ? stat.correct / stat.total : 0;
            if (ratio < 0.6) {
                performance.weak_kcs.push({ kc_id: kcId, correct: stat.correct, total: stat.total, ratio });
            }
        }

        // Thêm trường weakness_summary và suggestion
        if (performance.weak_kcs.length === 0) {
            performance.weakness_summary = "Học sinh không có điểm yếu rõ rệt theo dữ liệu hiện tại.";
            performance.suggestion = "Tiếp tục duy trì phong độ học tập hiện tại và thử thách với các kiến thức nâng cao hơn.";
        } else {
            const weakKcList = performance.weak_kcs.map(w => w.kc_id).join(', ');
            performance.weakness_summary = `Học sinh còn yếu ở các kiến thức: ${weakKcList}. Cần luyện tập thêm các chủ đề này.`;
            performance.suggestion = "Ôn tập lại lý thuyết và làm thêm bài tập thực hành liên quan đến các kiến thức yếu. Có thể tham khảo tài liệu, hỏi giáo viên hoặc bạn bè để củng cố kiến thức.";
        }

        res.json(performance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Record a new transaction
router.post('/transactions', async (req, res) => {
    try {
        const transaction = new Transaction({
            user_id: req.body.user_id,
            question_id: req.body.question_id,
            timestamp: new Date(),
            correct: req.body.correct,
            time_taken: req.body.time_taken,
            attempt_count: req.body.attempt_count,
            hint_used: req.body.hint_used,
            hint_count: req.body.hint_count
        });

        const newTransaction = await transaction.save();
        res.status(201).json(newTransaction);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Lấy quan hệ phụ thuộc giữa các KC (giả lập)
router.get('/domain/kc-dependencies', async (req, res) => {
    // Giả lập: KC 20 (Tích phân) phụ thuộc KC 10 (Đạo hàm)
    res.json({ dependencies: [
        { kc_id: 20, prerequisite: 10, description: 'Tích phân phụ thuộc Đạo hàm' },
        { kc_id: 30, prerequisite: 20, description: 'Ứng dụng tích phân phụ thuộc Tích phân' }
    ] });
});

// Trả về các KC yếu và các KC tiền đề liên quan
router.get('/students/:studentId/weaknesses', async (req, res) => {
    // Lấy performance như cũ
    const transactions = await Transaction.find({ user_id: req.params.studentId });
    const questionIds = [...new Set(transactions.map(t => t.question_id))];
    const questions = await Question.find({ id: { $in: questionIds } });
    const questionKcMap = {};
    questions.forEach(q => { questionKcMap[q.id] = q.kcs || []; });
    const kcStats = {};
    transactions.forEach(t => {
        const kcs = questionKcMap[t.question_id] || [];
        kcs.forEach(kc => {
            if (!kcStats[kc]) kcStats[kc] = { total: 0, correct: 0 };
            kcStats[kc].total++;
            if (t.correct) kcStats[kc].correct++;
        });
    });
    // Lọc KC yếu
    const weakKCs = Object.entries(kcStats).filter(([kc, stat]) => stat.total > 0 && stat.correct / stat.total < 0.6).map(([kc, stat]) => ({ kc_id: kc, ...stat }));
    // Giả lập dependencies
    const dependencies = [
        { kc_id: 20, prerequisite: 10 },
        { kc_id: 30, prerequisite: 20 }
    ];
    // Lấy các KC tiền đề liên quan
    const related = weakKCs.map(wkc => {
        const dep = dependencies.find(d => d.kc_id == wkc.kc_id);
        return dep ? { ...wkc, prerequisite: dep.prerequisite } : wkc;
    });
    res.json({ weak_kcs: related });
});

// Chọn câu hỏi tiếp theo cho học sinh dựa trên thuật toán
router.post('/students/:studentId/next-question', async (req, res) => {
    const { algorithm } = req.body;
    const studentId = req.params.studentId;
    const transactions = await Transaction.find({ user_id: studentId });
    const doneQuestionIds = new Set(transactions.map(t => t.question_id));
    // Lấy các KC yếu
    const questionIds = [...new Set(transactions.map(t => t.question_id))];
    const questions = await Question.find({ id: { $in: questionIds } });
    const questionKcMap = {};
    questions.forEach(q => { questionKcMap[q.id] = q.kcs || []; });
    const kcStats = {};
    transactions.forEach(t => {
        const kcs = questionKcMap[t.question_id] || [];
        kcs.forEach(kc => {
            if (!kcStats[kc]) kcStats[kc] = { total: 0, correct: 0 };
            kcStats[kc].total++;
            if (t.correct) kcStats[kc].correct++;
        });
    });
    // Lấy danh sách tất cả KC
    const allKCs = await KnowledgeComponent.find();
    // Lấy danh sách câu hỏi chưa làm
    const candidateQuestions = await Question.find({
        id: { $nin: Array.from(doneQuestionIds) }
    });
    let selected = null;
    if (algorithm === 'random') {
        // Chọn ngẫu nhiên
        if (candidateQuestions.length > 0) {
            selected = candidateQuestions[Math.floor(Math.random() * candidateQuestions.length)];
        }
    } else if (algorithm === 'thompson') {
        // Thompson Sampling: Ưu tiên KC có tỷ lệ đúng thấp nhất
        let minRatio = 1;
        let minKc = null;
        for (const [kc, stat] of Object.entries(kcStats)) {
            const ratio = stat.total > 0 ? stat.correct / stat.total : 0;
            if (ratio < minRatio) {
                minRatio = ratio;
                minKc = parseInt(kc);
            }
        }
        const kcQuestions = candidateQuestions.filter(q => q.kcs.includes(minKc));
        if (kcQuestions.length > 0) {
            selected = kcQuestions[Math.floor(Math.random() * kcQuestions.length)];
        }
    } else if (algorithm === 'hdoc') {
        // --- HDoC nâng cấp ---
        const w1 = 0.7, w2 = 0.3, delta = 0.05;
        const total = transactions.length;
        const correct = transactions.filter(t => t.correct).length;
        const aptitude = total > 0 ? correct / total : 0.5;
        const dependencies = [
            { kc_id: 20, prerequisite: 10 },
            { kc_id: 30, prerequisite: 20 }
        ];
        const kcPrereqMap = {};
        dependencies.forEach(dep => {
            if (!kcPrereqMap[dep.kc_id]) kcPrereqMap[dep.kc_id] = [];
            kcPrereqMap[dep.kc_id].push(dep.prerequisite);
        });
        const muKC = {};
        allKCs.forEach(kc => {
            let preKC = 1;
            if (kcPrereqMap[kc.id]) {
                let sum = 0, count = 0;
                kcPrereqMap[kc.id].forEach(prereq => {
                    const stat = kcStats[prereq] || { total: 0, correct: 0 };
                    sum += stat.total > 0 ? stat.correct / stat.total : 0.5;
                    count++;
                });
                preKC = count > 0 ? sum / count : 1;
            }
            muKC[kc.id] = w1 * aptitude + w2 * preKC;
        });
        let minMu = 1, minKc = null;
        for (const kc of allKCs) {
            const stat = kcStats[kc.id] || { total: 0, correct: 0 };
            const N = stat.total;
            const K = allKCs.length;
            if (N > 0) {
                const muHat = stat.correct / N;
                const cb = Math.sqrt(Math.log(4 * K * N * N / delta) / (2 * N * N));
                const muConf = muHat + cb;
                if (muConf < 0.3 && N >= 5) {
                    return res.json({
                        message: 'Học viên có dấu hiệu yếu rõ rệt ở KC ' + kc.id + ', dừng sớm để phản hồi.',
                        weak_kc: kc.id,
                        mu_conf: muConf
                    });
                }
            }
            if (muKC[kc.id] < minMu) {
                minMu = muKC[kc.id];
                minKc = kc.id;
            }
        }
        const kcQuestions = candidateQuestions.filter(q => q.kcs.includes(minKc));
        if (kcQuestions.length > 0) {
            selected = kcQuestions[Math.floor(Math.random() * kcQuestions.length)];
        }
    }
    if (selected) {
        res.json({ question: selected });
    } else if (!res.headersSent) {
        res.status(404).json({ message: 'Không tìm thấy câu hỏi phù hợp.' });
    }
});

// Phản hồi cá nhân hóa dựa trên kết quả trả lời gần nhất
router.post('/students/:studentId/feedback', async (req, res) => {
    const studentId = req.params.studentId;
    const lastTransaction = await Transaction.findOne({ user_id: studentId }).sort({ timestamp: -1 });
    if (!lastTransaction) return res.json({ feedback: 'Chưa có dữ liệu.' });
    const question = await Question.findOne({ id: lastTransaction.question_id });
    if (!question || !question.kcs || question.kcs.length === 0) return res.json({ feedback: 'Không xác định được KC.' });
    // Giả lập: Nếu trả lời sai, gợi ý ôn lại KC tiền đề
    if (!lastTransaction.correct) {
        // Giả lập dependencies
        const dependencies = [
            { kc_id: 20, prerequisite: 10, description: 'Tích phân phụ thuộc Đạo hàm' },
            { kc_id: 30, prerequisite: 20, description: 'Ứng dụng tích phân phụ thuộc Tích phân' }
        ];
        const feedbacks = [];
        for (const kc of question.kcs) {
            const dep = dependencies.find(d => d.kc_id == kc);
            if (dep) {
                feedbacks.push(`Bạn nên ôn tập lại kiến thức về KC ${dep.prerequisite} trước khi tiếp tục với KC ${kc}`);
            } else {
                feedbacks.push(`Bạn nên luyện tập thêm về KC ${kc}`);
            }
        }
        return res.json({ feedback: feedbacks });
    } else {
        return res.json({ feedback: 'Bạn đã làm tốt! Hãy tiếp tục luyện tập.' });
    }
});

// Get all transactions
router.get('/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find();
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all transactions of a student
router.get('/students/:studentId/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find({ user_id: req.params.studentId });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Tạo mới một Knowledge Component
router.post('/kcs', async (req, res) => {
    try {
        const { id, name, description } = req.body;
        if (!id || !name || !description) {
            return res.status(400).json({ message: 'Thiếu trường id, name hoặc description' });
        }
        const kc = new KnowledgeComponent({ id, name, description });
        await kc.save();
        res.status(201).json(kc);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Lấy tất cả KC của một lớp
router.get('/kcs/grade/:grade', async (req, res) => {
    try {
        const kcs = await KnowledgeComponent.find({ grade: Number(req.params.grade) });
        res.json(kcs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 