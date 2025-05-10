// Cấu hình tham số thử nghiệm
module.exports = {
    // 4.2.1 Số lượng thành phần kiến thức (KC Count)
    kcCount: {
        min: 2,
        max: 16,
        default: 8
    },

    // 4.2.2 Ngưỡng làm chủ (Mastery Threshold)
    masteryThreshold: {
        min: 0.2,
        max: 0.9,
        default: 0.6,
        step: 0.1
    },

    // 4.2.3 Năng lực học sinh (Aptitude)
    aptitude: {
        levels: {
            low: { min: 0.0, max: 0.3 },
            medium: { min: 0.3, max: 0.7 },
            high: { min: 0.7, max: 1.0 }
        }
    },

    // 4.2.4 Tỷ lệ sai số (Error Rate)
    errorRate: {
        min: 0.05,
        max: 0.35,
        default: 0.1,
        step: 0.05
    }
}; 