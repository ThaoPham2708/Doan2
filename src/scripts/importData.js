require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Question = require('../models/Question');
const KnowledgeComponent = require('../models/KnowledgeComponent');
const Transaction = require('../models/Transaction');
const csv = require('csv-parse');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

const DATA_DIR = path.join(__dirname, '../../dataverse_files/2_DBE_KT22_datafiles_100102_csv');

// Helper function to read CSV files
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

// Helper function to process large CSV files in chunks
const processLargeCSV = async (filename, chunkCallback) => {
  return new Promise((resolve, reject) => {
    let processedRows = 0;
    const chunkSize = 500; // Process 500 rows at a time
    let chunk = [];
    
    fs.createReadStream(path.join(DATA_DIR, filename))
      .pipe(csv.parse({ columns: true, skip_empty_lines: true }))
      .on('data', async (data) => {
        chunk.push(data);
        processedRows++;
        
        if (chunk.length >= chunkSize) {
          await chunkCallback(chunk);
          chunk = [];
        }
      })
      .on('end', async () => {
        if (chunk.length > 0) {
          await chunkCallback(chunk);
        }
        resolve(processedRows);
      })
      .on('error', (error) => reject(error));
  });
};

// Helper function to safely parse number
const safeParseInt = (value) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? null : parsed;
};

async function main() {
  try {
    console.log('Starting data import...');
    console.log('Data directory:', DATA_DIR);

    // First verify the data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      throw new Error(`Data directory not found: ${DATA_DIR}`);
    }

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      KnowledgeComponent.deleteMany({}),
      Question.deleteMany({}),
      Transaction.deleteMany({})
    ]);

    // Import Knowledge Components
    console.log('Importing Knowledge Components...');
    const kcs = await readCSV('KCs.csv');
    const validKcs = kcs.map(kc => ({
      id: safeParseInt(kc.id),
      name: kc.name,
      description: kc.description
    })).filter(kc => kc.id !== null);
    
    await KnowledgeComponent.insertMany(validKcs);
    console.log(`Imported ${validKcs.length} knowledge components`);

    // Import Questions
    console.log('Importing Questions...');
    const questions = await readCSV('Questions.csv');
    const validQuestions = questions.map(q => ({
      id: safeParseInt(q.id),
      question_rich_text: q.question_rich_text,
      question_title: q.question_title,
      explanation: q.explanation,
      hint_text: q.hint_text,
      question_text: q.question_text,
      difficulty: safeParseInt(q.difficulty)
    })).filter(q => q.id !== null);

    await Question.insertMany(validQuestions);
    console.log(`Imported ${validQuestions.length} questions`);

    // Import Question-KC Relationships
    console.log('Importing Question-KC Relationships...');
    const questionKCRelationships = await readCSV('Question_KC_Relationships.csv');
    let validRelationships = 0;
    
    for (const rel of questionKCRelationships) {
      const questionId = safeParseInt(rel.question_id);
      const kcId = safeParseInt(rel.kc_id);
      
      if (questionId !== null && kcId !== null) {
        await Question.updateOne(
          { id: questionId },
          { $addToSet: { kcs: kcId } }
        );
        validRelationships++;
      }
    }
    console.log(`Imported ${validRelationships} valid question-KC relationships`);

    // Process transactions in chunks
    console.log('Processing Transactions...');
    let transactionCount = 0;
    await processLargeCSV('Transaction.csv', async (chunk) => {
      const transactions = chunk.map(t => {
        // Lấy user_id từ user_id hoặc student_id
        const userId = t.user_id || t.student_id;
        // Parse timestamp safely
        let timestamp;
        try {
          timestamp = new Date(t.timestamp);
          if (isNaN(timestamp.getTime())) {
            timestamp = new Date(); // Use current date if invalid
          }
        } catch (e) {
          timestamp = new Date(); // Use current date if parsing fails
        }

        // Ensure user_id exists
        if (!userId) {
          console.warn('Skipping transaction with missing user_id');
          return null;
        }

        return {
          user_id: userId,
          question_id: safeParseInt(t.question_id),
          timestamp: timestamp,
          correct: t.correct === 'true',
          time_taken: parseFloat(t.time_taken) || 0,
          attempt_count: safeParseInt(t.attempt_count) || 1,
          hint_used: t.hint_used === 'true',
          hint_count: safeParseInt(t.hint_count) || 0
        };
      }).filter(t => t !== null && t.question_id !== null);

      if (transactions.length > 0) {
        try {
          await Transaction.insertMany(transactions);
          transactionCount += transactions.length;
          console.log(`Processed ${transactionCount} transactions so far...`);
        } catch (error) {
          console.error('Error inserting transactions:', error);
          // Continue processing other chunks even if one fails
        }
      }
    });

    console.log('Data import completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
}

// Run the import
main(); 