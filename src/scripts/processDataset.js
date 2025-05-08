const fs = require('fs');
const path = require('path');

// Function to process the dataset
async function processDataset() {
    try {
        // Read the original dataset
        const datasetPath = path.join(__dirname, '../../dataverse_files');
        const rawData = JSON.parse(fs.readFileSync(path.join(datasetPath, 'raw_data.json'), 'utf8'));

        // Extract unique knowledge components
        const kcs = new Set();
        const kcDependencies = new Map();

        rawData.forEach(item => {
            item.kcs.forEach(kc => {
                kcs.add(kc);
                // You might want to add logic here to determine dependencies between KCs
                // For now, we'll assume no dependencies
                if (!kcDependencies.has(kc)) {
                    kcDependencies.set(kc, []);
                }
            });
        });

        // Create knowledge components data
        const kcsData = Array.from(kcs).map(kc => ({
            id: kc,
            name: kc, // You might want to add more descriptive names
            dependencies: kcDependencies.get(kc)
        }));

        // Create questions data
        const questionsData = rawData.map((item, index) => ({
            id: `q${index + 1}`,
            text: item.question_text,
            options: item.options || ['True', 'False'], // Assuming binary questions if no options provided
            correct_answer: item.correct_answer,
            kcs: item.kcs
        }));

        // Save processed data
        const outputPath = path.join(__dirname, '../../dataverse_files');
        fs.writeFileSync(
            path.join(outputPath, 'knowledge_components.json'),
            JSON.stringify(kcsData, null, 2)
        );
        fs.writeFileSync(
            path.join(outputPath, 'questions.json'),
            JSON.stringify(questionsData, null, 2)
        );

        console.log('Dataset processing completed successfully');
        console.log(`Processed ${kcsData.length} knowledge components`);
        console.log(`Processed ${questionsData.length} questions`);

    } catch (error) {
        console.error('Error processing dataset:', error);
        process.exit(1);
    }
}

processDataset(); 