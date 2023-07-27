// nodejs script that downloads data via given rest url and stores it in a file
// usage: node fetchData.js <rest url> <output file>
// example: node fetchData.js http://localhost:8080/api/v1/elements data.json
// example: node fetchData.js http://localhost:8080/api/v1/elements data.json

const https = require('https');
const fs = require('fs');
const path = require('path');

const fields = ['title', 'year', 'authors', 'authors.name', 'fieldsOfStudy', 'isOpenAccess', 'citations', 'citations.paperId'] // process.argv[2].split(',') :'];
const outputFile = path.resolve(__dirname, '../src/data/data260723.json'); // process.argv[3]';

let dataSet = [];

const MAX_LEVELS = 20;
const MAX_CITATIONS_PER_LEVEL = 20;
const MAX_FETCHES = 100;

let count = 0;
const fetched = [];
const didFetch = (paper) => {
    count++;
    const isFetched = fetched.includes(paper.paperId);
    if (!isFetched) {
        fetched.push(paper.paperId);
    }
} 
const alreadyFetched = (pid) => {
    return fetched.includes(pid);
}

async function fetch(paperId, lvl) {
    return new Promise((resolve, reject) => {
        const restUrl = `https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=${fields.join(',')}`;
        https.get(restUrl, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', async () => {
                const dataBlock = JSON.parse(data);
                didFetch(dataBlock);
                console.log(count);
                if (dataBlock.citations && dataBlock.citations.length > 0) {
                    if (lvl < MAX_LEVELS && count < MAX_FETCHES) {
                        lvl += 1;
                        for (let i = 0; i < Math.min(dataBlock.citations.length, MAX_CITATIONS_PER_LEVEL); i++) {
                            const citation = dataBlock.citations[i];
                            if (!alreadyFetched(citation.paperId)) {
                                dataBlock.citations[i] = await fetch(dataBlock.citations[i].paperId, lvl);
                            }
                        }
                    }
                }
                resolve(dataBlock);
            }).on('error', (err) => {
                console.log('Error: ' + err.message);
                reject(err);
            });
        });
    });
}

async function doFetch() {
    let level = 0;
    const dataSet = await fetch('d1599e9ecd7f6d540c250b62c5c2b644c8a408d4', level);
    console.log("done");
    fs.writeFileSync(outputFile, JSON.stringify(dataSet));
}
doFetch();