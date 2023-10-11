import { SEdge, SGraph, SModelElement, SLabel, SNode, SCompartment } from "sprotty-protocol";
import { FilterData, Paper, PaperAuthor, PaperLabel, PaperMetaData, PaperNode } from "common";
// import data from "./data/ai-papers.json";
import data from "./data/data270723.json";

type PaperAsTree = { citations: PaperAsTree[], references: PaperAsTree[] } & Paper;
type PaperFlat = { citations: string[], references: string[] } & Paper;
type FlattenPaperData = { papers: PaperFlat[], authors: PaperAuthor[], fieldsOfStudy: string[] };

function flattenData(data: PaperAsTree): PaperFlat[] {
    const papers: PaperFlat[] = [];
    function transformCitations(paper: PaperAsTree): PaperFlat {
        return {
            ...paper,
            citations: paper.citations.map(citation => citation.paperId),
            references: paper.references?.map(reference => reference.paperId)
        }
    }
    function flatten(paper: PaperAsTree) {
        if (papers.findIndex(p => p.paperId === paper.paperId) === -1) {
            if (!!paper.title) {
                papers.push(transformCitations(paper));
                if (paper.citations && paper.citations.length > 0) {
                    paper.citations.forEach(citation => flatten(citation));
                }
                if (paper.references && paper.references.length > 0) {
                    paper.references.forEach(reference => flatten(reference));
                }
            }
        }
    }
    flatten(data);

    return papers;
}

function createPaperNode(paper: Paper): PaperNode {
    let text = paper.title ?? paper.paperId ?? 'no title';
    if (text.length > 50) {
        text = text.substring(0, 50) + '...';
    }
    return <SNode & PaperNode>{
        type: 'node:paper',
        id: paper.paperId,
        paperId: paper.paperId,
        fieldsOfStudy: paper.fieldsOfStudy,
        year: paper.year,
        added: paper.added,
        layout: 'vbox',
        layoutOptions: {
            hAlign: 'left',
        },
        children: [
            <SCompartment>{
                type: 'compartment',
                id: paper.paperId + '-header',
                layout: 'vbox',
                children: [
                    <SLabel & PaperLabel>{
                        type: 'label',
                        id: paper.paperId + '-title',
                        text,
                        minZoomLevel: 0.3
                    },
                    <SLabel & PaperLabel>{
                        type: 'label',
                        id: paper.paperId + '-year',
                        text: paper.year ? paper.year.toString() : '',
                        minZoomLevel: 0.3
                    }
                ]
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
                    };
                })
            },
            <SCompartment>{
                type: 'compartment',
                id: paper.paperId + '-fieldsOfStudy',
                layout: 'hbox',
                layoutOptions: {
                    hGap: 5,
                },
                children: paper.fieldsOfStudy?.map(fieldOfStudy => {
                    return <SCompartment>{
                        type: 'compartment:badge',
                        id: paper.paperId + '-fieldOfStudy-' + fieldOfStudy + '-badge',
                        layout: 'vbox',
                        layoutOptions: {
                            paddingLeft: 15,
                            paddingRight: 15
                        },
                        minZoomLevel: 0.5,
                        children: [
                            <SLabel & PaperLabel>{
                                type: 'label',
                                id: paper.paperId + '-fieldOfStudy-' + fieldOfStudy,
                                text: fieldOfStudy,
                                minZoomLevel: 0.5,
                                layoutOptions: {
                                    paddingLeft: 5,
                                    paddingRight: 5
                                }
                            }
                        ]
                    };

                })
            },
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
        paper.citations?.forEach(citation => {
            if (papers.findIndex(p => p.paperId === citation) !== -1) {
                if (edges.findIndex(edge => edge.sourceId === paper.paperId && edge.targetId === citation) === -1) {
                    edges.push(createEdge(paper.paperId, citation));
                }
            }
        });
        paper.references?.forEach(reference => {
            if (papers.findIndex(p => p.paperId === reference) !== -1) {
                if (edges.findIndex(edge => edge.sourceId === reference && edge.targetId === paper.paperId) === -1) {
                    edges.push(createEdge(reference, paper.paperId));
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

    if (fieldsOfStudyFilter && fieldsOfStudyFilter.length > 0) {
        filteredData = filteredData.filter(paper => 
            (paper.fieldsOfStudy && paper.fieldsOfStudy.some(fieldOfStudy => fieldsOfStudyFilter.includes(fieldOfStudy))) ||
            ((!paper.fieldsOfStudy || paper.fieldsOfStudy.length === 0) && fieldsOfStudyFilter.includes('unknown'))
        );
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
    const flattenedData = flattenData(data as PaperAsTree);
    // filter = !filter ? {...filter, titleFilter: 'enhancing smart farming'} : undefined;
    const filteredData = filterData(flattenedData, filter);

    const authors: PaperAuthor[] = [];
    const fieldsOfStudy: string[] = [];
    filteredData.forEach(paper => {
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
    });

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
        authors,
        fieldsOfStudy
    };

    return graph;
}