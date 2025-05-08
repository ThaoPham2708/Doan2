const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Function to download file
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

// Function to create directory if it doesn't exist
function createDirIfNotExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Main function to setup dataset
async function setupDataset() {
    try {
        console.log('Starting dataset setup...');

        // Create dataverse_files directory
        const dataversePath = path.join(__dirname, '../../dataverse_files');
        createDirIfNotExists(dataversePath);

        // Download dataset files
        const datasetFiles = [
            {
                url: 'https://raw.githubusercontent.com/spneshaei/ml-project-2-chili-project/main/dataverse_files/assistments_skill_builder_data.csv',
                dest: path.join(dataversePath, 'assistments_skill_builder_data.csv')
            }
        ];

        console.log('Downloading dataset files...');
        for (const file of datasetFiles) {
            console.log(`Downloading ${file.url}...`);
            await downloadFile(file.url, file.dest);
        }

        // Process the CSV file into our required format
        console.log('Processing dataset...');
        const csvData = fs.readFileSync(path.join(dataversePath, 'assistments_skill_builder_data.csv'), 'utf8');
        const lines = csvData.split('\n');
        const headers = lines[0].split(',');

        // Extract unique skills (knowledge components)
        const skills = new Set();
        const questions = new Map();
        const skillQuestions = new Map();

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = lines[i].split(',');
            const skill = values[headers.indexOf('skill_id')];
            const question = values[headers.indexOf('problem_id')];
            const correct = values[headers.indexOf('correct')];

            skills.add(skill);
            
            if (!questions.has(question)) {
                questions.set(question, {
                    id: question,
                    text: `Question ${question}`,
                    options: ['0', '1'],
                    correct_answer: correct,
                    kcs: [skill]
                });
            }

            if (!skillQuestions.has(skill)) {
                skillQuestions.set(skill, new Set());
            }
            skillQuestions.get(skill).add(question);
        }

        // Create knowledge components data
        const kcsData = Array.from(skills).map(skill => ({
            id: skill,
            name: `Skill ${skill}`,
            dependencies: [] // You can add logic here to determine dependencies
        }));

        // Create questions data
        const questionsData = Array.from(questions.values());

        // Save processed data
        fs.writeFileSync(
            path.join(dataversePath, 'knowledge_components.json'),
            JSON.stringify(kcsData, null, 2)
        );
        fs.writeFileSync(
            path.join(dataversePath, 'questions.json'),
            JSON.stringify(questionsData, null, 2)
        );

        console.log('Dataset setup completed successfully');
        console.log(`Processed ${kcsData.length} knowledge components`);
        console.log(`Processed ${questionsData.length} questions`);

    } catch (error) {
        console.error('Error setting up dataset:', error);
        process.exit(1);
    }
}

setupDataset(); 