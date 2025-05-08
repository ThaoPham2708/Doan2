const fs = require('fs');
const csv = require('csv-parse');
const path = require('path');

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
    const chunkSize = 1000; // Process 1000 rows at a time
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

class DataImporter {
  constructor() {
    this.kcs = [];
    this.questions = [];
    this.questionKCRelationships = [];
    this.kcRelationships = [];
    this.questionChoices = [];
  }

  async importKCs() {
    console.log('Importing Knowledge Components...');
    this.kcs = await readCSV('KCs.csv');
    return this.kcs;
  }

  async importQuestions() {
    console.log('Importing Questions...');
    this.questions = await readCSV('Questions.csv');
    return this.questions;
  }

  async importQuestionKCRelationships() {
    console.log('Importing Question-KC Relationships...');
    this.questionKCRelationships = await readCSV('Question_KC_Relationships.csv');
    return this.questionKCRelationships;
  }

  async importKCRelationships() {
    console.log('Importing KC Relationships...');
    this.kcRelationships = await readCSV('KC_Relationships.csv');
    return this.kcRelationships;
  }

  async importQuestionChoices() {
    console.log('Importing Question Choices...');
    this.questionChoices = await readCSV('Question_Choices.csv');
    return this.questionChoices;
  }

  async processTransactions(chunkCallback) {
    console.log('Processing Transactions...');
    const totalRows = await processLargeCSV('Transaction.csv', chunkCallback);
    console.log(`Processed ${totalRows} transactions`);
    return totalRows;
  }

  // Main import function
  async importAll() {
    try {
      await Promise.all([
        this.importKCs(),
        this.importQuestions(),
        this.importQuestionKCRelationships(),
        this.importKCRelationships(),
        this.importQuestionChoices()
      ]);

      // Process transactions last since it's the largest file
      await this.processTransactions(async (chunk) => {
        // Here you can implement your chunk processing logic
        // For example, saving to database in batches
        console.log(`Processing chunk of ${chunk.length} transactions...`);
      });

      return {
        kcs: this.kcs,
        questions: this.questions,
        questionKCRelationships: this.questionKCRelationships,
        kcRelationships: this.kcRelationships,
        questionChoices: this.questionChoices
      };
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }
}

module.exports = DataImporter; 