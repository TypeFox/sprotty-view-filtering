// node function that loads the data.json and creates a json object without citationCount and authorsId
// usage: node prepareData.js <input file> <output file>
// example: node prepareData.js data.json data2.json
import * as fs from 'fs';
import * as path from 'path';

type Paper = {
    paperId: string,
    title: string,
    year: number,
    citationCount: number,
    authors: {
        authorId: string,
        name: string
    }[],
    fieldsOfStudy: string[],
    isOpenAccess: boolean,
    citations: Paper[],
}

type PaperIdHierarchy = {
    [paperId: string]: PaperIdHierarchy
}

const inputFile = path.resolve(__dirname, '../data/data260723.json'); // process.argv[2];
const outputFile = path.resolve(__dirname, '../data/data260723-prep.json');; // process.argv[2];

const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// function that does the following:
// 1. removes all duplicates by paperId
// 2. creates a flat array of all papers
// 3. creates an object with the original citation hierarchy of the data but only with the paperIds
function flattenData(data: Paper) {
    const papers = {};
    const citationHierarchy: PaperIdHierarchy = {};
    function flatten(data: Paper) {
        if (!papers[data.paperId]) {
            papers[data.paperId] = data;
        }
        if (data.citations) {
            data.citations.forEach(citation => flatten(citation));
        }
    }
    flatten(data);

    // create citation hierarchy
    function createCitationHierarchy(data: Paper, citationHierarchy: PaperIdHierarchy) {
        citationHierarchy[data.paperId] = {};
        if (data.citations) {
            for (const citation of data.citations) {
                createCitationHierarchy(citation, citationHierarchy[data.paperId]);
            }
        }
    }
    createCitationHierarchy(data, citationHierarchy);

    Object.entries(papers).forEach(([paperId, paper]) => {
        delete (paper as Paper).citations;
    });

    return {papers, citationHierarchy};
}
const flattenedData = flattenData(data);

fs.writeFileSync(outputFile, JSON.stringify(flattenedData));