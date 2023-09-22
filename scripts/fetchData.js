// nodejs script that downloads data via given rest url and stores it in a file
// usage: node fetchData.js <rest url> <output file>
// example: node fetchData.js http://localhost:8080/api/v1/elements data.json
// example: node fetchData.js http://localhost:8080/api/v1/elements data.json

const https = require('https');
const fs = require('fs');
const path = require('path');

const fields = ['title', 'year', 'authors', 'authors.name', 'fieldsOfStudy', 'tldr', 'isOpenAccess', 'openAccessPdf', 'references', 'references.paperId', 'citations', 'citations.paperId'] // process.argv[2].split(',') :'];
const outputFile = path.resolve(__dirname, '../src/server/data/ai-papers.json'); // process.argv[3]';

let dataSet = [];

const MAX_LEVELS = 50;
const MAX_CITATIONS_PER_LEVEL = 25;
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

// fetch a citation tree
async function fetch(paperId, lvl, kind = 'both') {
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
                console.log(count, kind);
                // if kind is both we fetch both citations and references
                if (kind === 'both' || kind === 'references') {
                    if (dataBlock.references && dataBlock.references.length > 0) {
                        if (count < MAX_FETCHES) {
                            lvl += 1;
                            for (let i = 0; i < Math.min(dataBlock.references.length, MAX_CITATIONS_PER_LEVEL); i++) {
                                const reference = dataBlock.references[i];
                                if (reference.paperId && !alreadyFetched(reference.paperId)) {
                                    dataBlock.references[i] = await fetch(dataBlock.references[i].paperId, lvl, 'references');
                                }
                            }
                        }
                    }
                }
                if (kind === 'both' || kind === 'citations') {
                    if (dataBlock.citations && dataBlock.citations.length > 0) {
                        if (count < MAX_FETCHES) {
                            lvl += 1;
                            for (let i = 0; i < Math.min(dataBlock.citations.length, MAX_CITATIONS_PER_LEVEL); i++) {
                                const citation = dataBlock.citations[i];
                                if (citation.paperId && !alreadyFetched(citation.paperId)) {
                                    dataBlock.citations[i] = await fetch(dataBlock.citations[i].paperId, lvl, 'citations');
                                }
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
    const dataSet = await fetch('2d5673caa9e6af3a7b82a43f19ee920992db07ad', level);
    console.log("done", outputFile);
    fs.writeFileSync(outputFile, JSON.stringify(dataSet), {}, (err) => {});
}
doFetch();