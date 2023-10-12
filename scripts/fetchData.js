// nodejs script that downloads data via given rest url and stores it in a file
// usage: node fetchData.js <rest url> <output file>
// example: node fetchData.js http://localhost:8080/api/v1/elements data.json
// example: node fetchData.js http://localhost:8080/api/v1/elements data.json

const https = require('https');
const fs = require('fs');
const path = require('path');

const fields = ['title', 'year', 'authors', 'authors.name', 'fieldsOfStudy', 'tldr', 'isOpenAccess', 'openAccessPdf', 'references', 'references.paperId', 'citations', 'citations.paperId'] // process.argv[2].split(',') :'];
const outputFile = path.resolve(__dirname, '../packages/app/src/server/data/ai-papers_v3.json'); // process.argv[3]';

let dataSet = [];

const MAX_LEVELS = 50;
const MAX_CITATIONS_PER_LEVEL = 10;
const MAX_CITATION_FETCHES = 200;
const MAX_REFERENCE_FETCHES = 200;

let citationCount = 0;
let referenceCount = 0;

const fetched = [];
const didFetch = (paper, kind) => {
    if (kind === 'citations' || kind === 'both') citationCount++;
    if (kind === 'references' || kind === 'both') referenceCount++;
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
                didFetch(dataBlock, kind);
                if (kind === 'both' || kind === 'citations') {
                    console.log(citationCount, kind);
                }
                if (kind === 'both' || kind === 'references') {
                    console.log(referenceCount, kind);
                }
                // if kind is both we fetch both citations and references
                if (kind === 'both' || kind === 'citations') {
                    if (dataBlock.citations && dataBlock.citations.length > 0) {
                        if (citationCount < MAX_CITATION_FETCHES) {
                            lvl += 1;
                            for (let i = dataBlock.citations.length - 1; i >= Math.max(dataBlock.citations.length - MAX_CITATIONS_PER_LEVEL, 0); i--) {
                                const citation = dataBlock.citations[i];
                                if (citation.paperId && !alreadyFetched(citation.paperId)) {
                                    dataBlock.citations[i] = await fetch(dataBlock.citations[i].paperId, lvl, 'citations');
                                }
                            }
                        }
                    }
                }
                if (kind === 'both' || kind === 'references') {
                    if (dataBlock.references && dataBlock.references.length > 0) {
                        if (referenceCount < MAX_REFERENCE_FETCHES) {
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
    const dataSet = await fetch('d755f461dddae76068f401409ba59c85a2436305', level);
    console.log("done", outputFile);
    fs.writeFileSync(outputFile, JSON.stringify(dataSet), {}, (err) => {});
}
doFetch();