import { SEdge, SGraph, SModelElement, SLabel, SNode, SCompartment, SPort } from "sprotty-protocol";
import { FilterData, Paper, PaperAuthor, PaperLabel, PaperMetaData, PaperNode } from "common";
// import data from "./data/ai-papers.json";
import data from "./data/ai-papers_v3.json";

let cachedFlattenedData: PaperFlat[] = [];

type PaperAsTree = { citations: PaperAsTree[], references: PaperAsTree[] } & Paper;
type PaperFlat = { citations: string[], references: string[] } & Paper;
// type FlattenPaperData = { papers: PaperFlat[], authors: PaperAuthor[], fieldsOfStudy: string[] };

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

    papers.forEach(paper => {
        const citationsCount = paper.citations?.filter(citation => papers.findIndex(p => p.paperId === citation) !== -1).length ?? 0;
        const referencesCount = paper.references?.filter(reference => papers.findIndex(p => p.paperId === reference) !== -1).length ?? 0;
        paper.citationsCount = citationsCount;
        paper.referencesCount = referencesCount;
    })

    return papers;
}

function createPaperNode(paper: Paper): PaperNode {
    let text = paper.title ?? paper.paperId ?? 'no title';
    if (text.length > 50) {
        text = text.substring(0, 50) + '...';
    }

    const citationsNumber = paper.citationsCount ?? 0;
    const referencesNumber = paper.referencesCount ?? 0;

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
            <SCompartment>{
                type: 'compartment',
                id: paper.paperId + '-citations-and-references',
                layout: 'hbox',
                layoutOptions: {
                    hGap: 325
                },
                children: [
                    <SCompartment>{
                        type: 'compartment:badge',
                        id: paper.paperId + '-references',
                        size: {width: 25, height: 25},
                        layout: 'vbox',
                        layoutOptions: {
                            hAlign: 'center',
                            vAlign: 'center',
                            resizeContainer: false
                        },
                        minZoomLevel: 0.5,
                        children: [
                            <SLabel & PaperLabel>{
                                type: 'label',
                                id: paper.paperId + '-references-count',
                                text: referencesNumber > 9 ? '9+' : referencesNumber.toString(),
                                minZoomLevel: 0.5,
                            }
                        ]
                    },
                    <SCompartment>{
                        type: 'compartment:badge',
                        id: paper.paperId + '-citations',
                        size: {width: 25, height: 25},
                        layout: 'vbox',
                        layoutOptions: {
                            hAlign: 'center',
                            vAlign: 'center',
                            resizeContainer: false
                        },
                        minZoomLevel: 0.5,
                        children: [
                            <SLabel & PaperLabel>{
                                type: 'label',
                                id: paper.paperId + '-citations-count',
                                text: citationsNumber > 9 ? '9+' : citationsNumber.toString(),
                                minZoomLevel: 0.5,
                            }
                        ]
                    },
                ]
            },
            // <SPort>{
            //     type: 'port:citations',
            //     id: paper.paperId + '-port-citations',
            // },
            // <SPort>{
            //     type: 'port:references',
            //     id: paper.paperId + '-port-references',
            // },
        ]
    }
}

function createEdge(source: string, target: string): SEdge {
    return {
        type: 'edge',
        id: source + '-' + target,
        sourceId: source, // + '-port-citations',
        targetId: target //+ '-port-references',
    }
}

function generateChildren(papers: PaperFlat[]): SModelElement[] {
    const nodes: SModelElement[] = [];
    const edges: SEdge[] = [];
    papers.forEach(paper => {
        nodes.push(createPaperNode(paper));
        paper.citations?.forEach(citation => {
            if (papers.findIndex(p => p.paperId === citation) !== -1) {
                if(!edges.find(e => e.id === citation + '-' + paper.paperId)) {
                    if (edges.findIndex(edge => edge.sourceId === paper.paperId && edge.targetId === citation) === -1 ) {
                        edges.push(createEdge(paper.paperId, citation));
                    }
                }
            }
        });
        paper.references?.forEach(reference => {
            if (papers.findIndex(p => p.paperId === reference) !== -1) {
                if(!edges.find(e => e.id === paper.paperId + '-' + reference)) {
                    if (edges.findIndex(edge => edge.sourceId === reference && edge.targetId === paper.paperId) === -1) {
                        edges.push(createEdge(reference, paper.paperId));
                    }
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

    let filteredData = data.map<PaperFlat>(paper => ({ ...paper, filtered: true, added: false }));

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

    if (isOpenAccess) {
        filteredData = filteredData.filter(paper => paper.isOpenAccess === isOpenAccess);
    }

    if (hideWires) {
        filteredData = filteredData.map(paper => ({ ...paper, citations: [], references: [] }));
    }

    if (additionalChildLevels || additionalParentLevels) {
        const filteredPapers: PaperFlat[] = [];
        const filteredPapersIds: string[] = [];
        const filterChildPapers = (paper: PaperFlat, level: number) => {
            if (level <= additionalChildLevels) {
                if (filteredPapersIds.findIndex(id => id === paper.paperId) === -1) {
                    filteredPapers.push({ ...paper, added: !paper.filtered ? true : false });
                    filteredPapersIds.push(paper.paperId);
                }
                paper.citations.forEach(citation => {
                    const citationPaper = filteredData.find(p => p.paperId === citation) ?? data.find(p => p.paperId === citation);
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

    return filteredData;
}

export function generateGraph(filter?: FilterData): SGraph {
    if (cachedFlattenedData.length === 0) {
        cachedFlattenedData = flattenData(data as any as PaperAsTree);
    }

    // const flattenedData = flattenData(data as any as PaperAsTree);
    // filter = !filter ? {...filter, titleFilter: 'enhancing smart farming'} : undefined;
    const filteredData = filterData(cachedFlattenedData, filter);

    const authors: PaperAuthor[] = [];
    const fieldsOfStudy: string[] = [];
    cachedFlattenedData.forEach(paper => {
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
    
    // get a list of unique years from flattened data
    const years: number[] = [];
    cachedFlattenedData.forEach(paper => {
        if (years.findIndex(year => year === paper.year) === -1) {
            years.push(paper.year);
        }
    });
    // remove duplicate years
    const uniqueYears = [...new Set(years)]
    // sort years
    uniqueYears.sort((a, b) => a - b);

    const graph: SGraph & PaperMetaData = {
        type: 'graph',
        id: 'graph',
        rootId: cachedFlattenedData[0].paperId,
        children: generateChildren(filteredData),
        authors,
        fieldsOfStudy,
        years: uniqueYears
    };

    return graph;
}