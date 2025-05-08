const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Question = require('../models/Question');
const KnowledgeComponent = require('../models/KnowledgeComponent');
const Transaction = require('../models/Transaction');

describe('API Tests', () => {
    // Test data
    const testStudentId = 'student123';
    const testQuestionId = 1;
    const testKcId = 10;

    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect(process.env.MONGODB_URI_TEST);
        
        // Clear test data
        await Question.deleteMany({});
        await KnowledgeComponent.deleteMany({});
        await Transaction.deleteMany({});

        // Insert test data
        await KnowledgeComponent.create({
            id: 10,
            name: 'Đạo hàm',
            description: 'Kiến thức về đạo hàm'
        });

        await KnowledgeComponent.create({
            id: 20,
            name: 'Tích phân',
            description: 'Kiến thức về tích phân'
        });

        await Question.create({
            id: 1,
            content: 'Tính đạo hàm của hàm số y = x^2',
            kcs: [10],
            difficulty: 0.5
        });

        await Question.create({
            id: 2,
            content: 'Tính tích phân của hàm số y = 2x',
            kcs: [20],
            difficulty: 0.7
        });

        // Create some transactions
        await Transaction.create({
            user_id: testStudentId,
            question_id: 1,
            timestamp: new Date(),
            correct: true,
            time_taken: 30
        });

        await Transaction.create({
            user_id: testStudentId,
            question_id: 2,
            timestamp: new Date(),
            correct: false,
            time_taken: 45
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    // Test Knowledge Components API
    describe('Knowledge Components API', () => {
        test('GET /api/kcs should return all KCs', async () => {
            const res = await request(app).get('/api/kcs');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBeTruthy();
            expect(res.body.length).toBeGreaterThan(0);
        });

        test('GET /api/kcs/:id should return specific KC', async () => {
            const res = await request(app).get(`/api/kcs/${testKcId}`);
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(testKcId);
        });
    });

    // Test Questions API
    describe('Questions API', () => {
        test('GET /api/questions should return all questions', async () => {
            const res = await request(app).get('/api/questions');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBeTruthy();
            expect(res.body.length).toBeGreaterThan(0);
        });

        test('GET /api/questions/:id should return specific question', async () => {
            const res = await request(app).get(`/api/questions/${testQuestionId}`);
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(testQuestionId);
        });
    });

    // Test Student Performance API
    describe('Student Performance API', () => {
        test('GET /api/students/:studentId/performance should return performance data', async () => {
            const res = await request(app).get(`/api/students/${testStudentId}/performance`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('total_questions');
            expect(res.body).toHaveProperty('correct_answers');
            expect(res.body).toHaveProperty('kc_performance');
            expect(res.body).toHaveProperty('weak_kcs');
        });

        test('GET /api/students/:studentId/weaknesses should return weak KCs', async () => {
            const res = await request(app).get(`/api/students/${testStudentId}/weaknesses`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.weak_kcs)).toBeTruthy();
        });
    });

    // Test Next Question API
    describe('Next Question API', () => {
        test('POST /api/students/:studentId/next-question with random algorithm', async () => {
            const res = await request(app)
                .post(`/api/students/${testStudentId}/next-question`)
                .send({ algorithm: 'random' });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('question');
        });

        test('POST /api/students/:studentId/next-question with thompson algorithm', async () => {
            const res = await request(app)
                .post(`/api/students/${testStudentId}/next-question`)
                .send({ algorithm: 'thompson' });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('question');
        });

        test('POST /api/students/:studentId/next-question with hdoc algorithm', async () => {
            const res = await request(app)
                .post(`/api/students/${testStudentId}/next-question`)
                .send({ algorithm: 'hdoc' });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('question');
        });
    });

    // Test Feedback API
    describe('Feedback API', () => {
        test('POST /api/students/:studentId/feedback should return personalized feedback', async () => {
            const res = await request(app)
                .post(`/api/students/${testStudentId}/feedback`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('feedback');
        });
    });

    // Test Transaction API
    describe('Transaction API', () => {
        test('POST /api/transactions should create new transaction', async () => {
            const newTransaction = {
                user_id: testStudentId,
                question_id: 1,
                correct: true,
                time_taken: 25
            };

            const res = await request(app)
                .post('/api/transactions')
                .send(newTransaction);
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('user_id', testStudentId);
        });
    });
}); 