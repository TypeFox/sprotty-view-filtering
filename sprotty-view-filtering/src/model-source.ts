import { SEdge, SGraph, SNode, SLabel } from "sprotty-protocol";
import { PaperNode, TaskNode } from "./model";
import data from "./data/data270723.json";

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

type FlattenedData = {papers: PaperNode[], citationHierarchy: SEdge[]};

function flattenData(data: Paper): FlattenedData {
    const papers: PaperNode[] = [];
    const edges: SEdge[] = [];
    function flatten(paper: Paper) {
        if (papers.findIndex(p => p.paperId === paper.paperId) === -1) {
            if(!!paper.title) {
                papers.push(createPaperNode(paper));
            }
        }
        if (paper.citations) {
            paper.citations.forEach(citation => flatten(citation));
        }
    }
    flatten(data);

    // create citation hierarchy
    function createCitationHierarchy(data: Paper) {
        if (data.citations) {
            for (const citation of data.citations) {
                if (edges.findIndex(e => e.sourceId === data.paperId && e.targetId === citation.paperId) === -1) {
                    if(!!citation.title && !!data.title) {
                        edges.push(createEdge(data.paperId, citation.paperId));
                    }
                }
                createCitationHierarchy(citation);
            }
        }
    }
    createCitationHierarchy(data);

    return {papers, citationHierarchy: edges};
}

function createPaperNode(paper: Paper): PaperNode {
    return {
        type: 'node:paper',
        id: paper.paperId,
        paperId: paper.paperId,
        // position: {x: Math.random() * 15000, y: Math.random() * 15000},
        size: {width: 100, height: 50},
        children: [
            <SLabel>{
                type: 'label',
                id: paper.paperId + '-title',
                text: paper.title ?? paper.paperId ?? 'no title',
                // position: {x: 10, y: 20},
            }
        ]
    }
}

function createEdge(source: string, target: string): SEdge {
    return {
        type: 'edge',
        id: source + '-' + target,
        sourceId: source,
        targetId: target
    }
}

export function generateGraph(): SGraph {
    const flattenedData: FlattenedData = flattenData(data as Paper);

    const graph: SGraph = {
        type: 'graph',
        id: 'graph',
        children: [...flattenedData.papers, ...flattenedData.citationHierarchy]
    };

    return graph;
}