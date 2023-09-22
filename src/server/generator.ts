import { SEdge, SGraph, SModelElement, SLabel, SNode, SCompartment } from "sprotty-protocol";
import { Paper, PaperAuthor, PaperLabel, PaperMetaData, PaperNode } from "../common/model";
import data from "./data/data270723.json";
import { FilterData } from "../common/actions";

type PaperAsTree = { citations: PaperAsTree[] } & Paper;
type PaperFlat = { citations: string[] } & Paper;
type FlattenPaperData = { papers: PaperFlat[], authors: PaperAuthor[], fieldsOfStudy: string[] };

function flattenData(data: PaperAsTree): FlattenPaperData {
    const papers: PaperFlat[] = [];
    const authors: PaperAuthor[] = [];
    const fieldsOfStudy: string[] = [];
    function transformCitations(paper: PaperAsTree): PaperFlat {
        return {
            ...paper,
            citations: paper.citations.map(citation => citation.paperId)
        }
    }
    function flatten(paper: PaperAsTree) {
        if (papers.findIndex(p => p.paperId === paper.paperId) === -1) {
            if (!!paper.title) {
                papers.push(transformCitations(paper));
                if (paper.citations) {
                    paper.citations.forEach(citation => flatten(citation));
                }
                paper.authors.forEach(author => {
                    if (authors.findIndex(a => a === author) === -1) {
                        authors.push(author);
                    }
                });
                paper.fieldsOfStudy?.forEach(fieldOfStudy => {
                    if (fieldsOfStudy.findIndex(f => f === fieldOfStudy) === -1) {
                        fieldsOfStudy.push(fieldOfStudy);
                    }
                });
            }
        }
    }
    flatten(data);

    return { papers, authors, fieldsOfStudy };
}

function createPaperNode(paper: Paper): PaperNode {
    let text = paper.title ?? paper.paperId ?? 'no title';
    if (text.length > 50) {
        text = text.substring(0, 50) + '...';
    }
    return <SNode & Paper>{
        type: 'node:paper',
        id: paper.paperId,
        paperId: paper.paperId,
        layout: 'vbox',
        fieldsOfStudy: paper.fieldsOfStudy,
        year: paper.year,
        added: paper.added,
        children: [
            <SCompartment>{
                type: 'compartment',
                id: paper.paperId + '-info',
                layout: 'vbox',
                children: [
                    <SNode>{
                        type: 'node:details',
                        id: paper.paperId + '-title-container',
                        layout: 'vbox',
                        children: [
                            <SLabel & PaperLabel>{
                                type: 'label',
                                id: paper.paperId + '-title',
                                text,
                                minZoomLevel: 0.3
                            }
                        ]
                    },
                    <SNode>{
                        type: 'node:details',
                        id: paper.paperId + '-authorsAndFieldsOfStudy',
                        layout: 'vbox',
                        children: [
                            <SCompartment>{
                                type: 'compartment',
                                layout: 'vbox',
                                id: paper.paperId + '-fieldsOfStudy',
                                children: paper.fieldsOfStudy?.map(fieldOfStudy => {
                                    return <SLabel & PaperLabel>{
                                        type: 'label',
                                        id: paper.paperId + '-fieldOfStudy-' + fieldOfStudy,
                                        text: fieldOfStudy,
                                        minZoomLevel: 0.5
                                    }
                                })
                            },
                            <SCompartment>{
                                type: 'compartment',
                                id: paper.paperId + '-authors',
                                layout: 'vbox',
                                children: paper.authors.map((author, idx) => {
                                    return <SLabel>{
                                        type: 'label',
                                        id: paper.paperId + '-author-' + idx,
                                        text: author.name,
                                        minZoomLevel: 0.7
                                    }
                                })
                            }
                        ]
                    }
                ]
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

function generateChildren(papers: PaperFlat[]): SModelElement[] {
    const nodes: SModelElement[] = [];
    const edges: SEdge[] = [];
    papers.forEach(paper => {
        nodes.push(createPaperNode(paper));
        paper.citations.forEach(citation => {
            if (papers.findIndex(p => p.paperId === citation) !== -1) {
                if (edges.findIndex(edge => edge.sourceId === paper.paperId && edge.targetId === citation) === -1) {
                    edges.push(createEdge(paper.paperId, citation));
                }
            }
        });
    });
    return [...nodes, ...edges];
}

function filterData(data: PaperFlat[], filter?: FilterData): PaperFlat[] {
    if (!filter) {
        return data;
    }

    const { paperIds, titleFilter, authorFilter, yearFilter, fieldsOfStudyFilter, isOpenAccess, hideWires, additionalChildLevels, additionalParentLevels } = filter;

    let filteredData = data.map<PaperFlat>(paper => ({ ...paper, added: false }));

    if (paperIds && paperIds.length > 0) {
        filteredData = filteredData.filter(paper => paperIds.findIndex(id => id === paper.paperId) !== -1);
    }

    if (titleFilter) {
        filteredData = filteredData.filter(paper => paper.title?.toLowerCase().includes(titleFilter.toLowerCase()));
    }

    if (authorFilter) {
        filteredData = filteredData.filter(paper => paper.authors.some(author => author.name.toLowerCase().includes(authorFilter.toLowerCase())));
    }

    if (yearFilter && yearFilter.to) {
        filteredData = filteredData.filter(paper => paper.year >= yearFilter.from && paper.year <= yearFilter.to);
    }

    if (fieldsOfStudyFilter && fieldsOfStudyFilter !== 'all' && fieldsOfStudyFilter !== 'unknown') {
        filteredData = filteredData.filter(paper => paper.fieldsOfStudy && paper.fieldsOfStudy.some(fieldOfStudy => fieldsOfStudyFilter.includes(fieldOfStudy)));
    } else if (fieldsOfStudyFilter === 'unknown') {
        filteredData = filteredData.filter(paper => !paper.fieldsOfStudy || paper.fieldsOfStudy.length === 0);
    }

    if (isOpenAccess !== undefined) {
        filteredData = filteredData.filter(paper => paper.isOpenAccess === isOpenAccess);
    }

    if (additionalChildLevels || additionalParentLevels) {
        const filteredPapers: PaperFlat[] = [];
        const filteredPapersIds: string[] = [];
        const filterChildPapers = (paper: PaperFlat, level: number) => {
            if (level <= additionalChildLevels) {
                if (filteredPapersIds.findIndex(id => id === paper.paperId) === -1) {
                    filteredPapers.push({ ...paper, added: level > 0 ? true : false });
                    filteredPapersIds.push(paper.paperId);
                }
                paper.citations.forEach(citation => {
                    const citationPaper = data.find(p => p.paperId === citation);
                    if (citationPaper) {
                        filterChildPapers(citationPaper, level + 1);
                    }
                });
            }
        }
        const filterParentPapers = (paper: PaperFlat, level: number) => {
            if (level <= additionalParentLevels) {
                if (filteredPapersIds.findIndex(id => id === paper.paperId) === -1) {
                    filteredPapers.push({ ...paper, added: level > 0 ? true : false });
                    filteredPapersIds.push(paper.paperId);
                }
                data.forEach(p => {
                    if (p.citations.findIndex(c => c === paper.paperId) !== -1) {
                        filterParentPapers(p, level + 1);
                    }
                });
            }
        }
        filteredData.forEach(paper => filterChildPapers(paper, 0));
        filteredData.forEach(paper => filterParentPapers(paper, 0));
        filteredData = filteredPapers;
    }

    if (hideWires) {
        filteredData = filteredData.map(paper => ({ ...paper, citations: [] }));
    }

    return filteredData;
}

export function generateGraph(filter?: FilterData): SGraph {
    const flattenedData: FlattenPaperData = flattenData(data as PaperAsTree);
    // filter = !filter ? {...filter, titleFilter: 'enhancing smart farming'} : undefined;
    const filteredData = filterData(flattenedData.papers, filter);

    // sort filtered data by year
    // filteredData.sort((a, b) => b.year - a.year);

    // const graph: SGraph = {
    //     type: 'graph',
    //     id: 'graph',
    //     children: generateChildren(filteredData),
    // };

    const graph: SGraph & PaperMetaData = {
        type: 'graph',
        id: 'graph',
        children: generateChildren(filteredData),
        authors: flattenedData.authors,
        fieldsOfStudy: flattenedData.fieldsOfStudy
    };

    return graph;
}