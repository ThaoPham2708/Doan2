const DataImporter = require('./importData');

async function main() {
  const importer = new DataImporter();

  try {
    // Import all data
    console.log('Starting data import...');
    const data = await importer.importAll();
    
    // Example of accessing the imported data
    console.log(`Imported ${data.kcs.length} knowledge components`);
    console.log(`Imported ${data.questions.length} questions`);
    console.log(`Imported ${data.questionKCRelationships.length} question-KC relationships`);
    console.log(`Imported ${data.kcRelationships.length} KC relationships`);
    console.log(`Imported ${data.questionChoices.length} question choices`);

    // Example of processing transactions in chunks
    await importer.processTransactions(async (chunk) => {
      // Example: Process each transaction in the chunk
      for (const transaction of chunk) {
        // Here you would typically:
        // 1. Transform the transaction data if needed
        // 2. Save to database
        // 3. Update learning models
        // 4. etc.
      }
    });

  } catch (error) {
    console.error('Error in import process:', error);
    process.exit(1);
  }
}

// Run the import
main(); 