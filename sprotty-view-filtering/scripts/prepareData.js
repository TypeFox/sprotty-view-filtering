"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// node function that loads the data.json and creates a json object without citationCount and authorsId
// usage: node prepareData.js <input file> <output file>
// example: node prepareData.js data.json data2.json
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const inputFile = path.resolve(__dirname, '../data/data260723.json'); // process.argv[2];
const outputFile = path.resolve(__dirname, '../data/data260723-prep.json');
; // process.argv[2];
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
// function that does the following:
// 1. removes all duplicates by paperId
// 2. creates a flat array of all papers
// 3. creates an object with the original citation hierarchy of the data but only with the paperIds
function flattenData(data) {
    const papers = {};
    const citationHierarchy = {};
    function flatten(data) {
        if (!papers[data.paperId]) {
            papers[data.paperId] = data;
        }
        if (data.citations) {
            data.citations.forEach(citation => flatten(citation));
        }
    }
    flatten(data);
    // create citation hierarchy
    function createCitationHierarchy(data, citationHierarchy) {
        citationHierarchy[data.paperId] = {};
        if (data.citations) {
            for (const citation of data.citations) {
                createCitationHierarchy(citation, citationHierarchy[data.paperId]);
            }
        }
    }
    createCitationHierarchy(data, citationHierarchy);
    Object.entries(papers).forEach(([paperId, paper]) => {
        delete paper.citations;
    });
    return { papers, citationHierarchy };
}
const flattenedData = flattenData(data);
fs.writeFileSync(outputFile, JSON.stringify(flattenedData));
//# sourceMappingURL=prepareData.js.map