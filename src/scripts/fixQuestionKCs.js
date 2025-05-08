require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Question = require('../models/Question');
const csv = require('csv-parse');

const DATA_DIR = path.join(__dirname, '../../dataverse_files/2_DBE_KT22_datafiles_100102_csv');

const readCSV = async (filename) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path.join(DATA_DIR, filename))
      .pipe(csv.parse({ columns: true, skip_empty_lines: true }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

const safeParseInt = (value) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? null : parsed;
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const questionKCRelationships = await readCSV('Question_KC_Relationships.csv');
  // Map: question_id -> [kc_id, ...]
  const questionKcMap = {};
  for (const rel of questionKCRelationships) {
    const questionId = safeParseInt(rel.question_id);
    const kcId = safeParseInt(rel.knowledgecomponent_id);
    if (questionId !== null && kcId !== null) {
      if (!questionKcMap[questionId]) questionKcMap[questionId] = [];
      questionKcMap[questionId].push(kcId);
    }
  }

  let updated = 0;
  for (const [questionId, kcIds] of Object.entries(questionKcMap)) {
    const result = await Question.updateOne(
      { id: parseInt(questionId) },
      { $set: { kcs: kcIds } }
    );
    if (result.modifiedCount > 0) {
      updated++;
      console.log(`Updated question id ${questionId} with kcs: ${kcIds}`);
    }
  }
  console.log(`Đã cập nhật ${updated} câu hỏi!`);
  process.exit(0);
}

main(); 