import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FormControlLabel, Checkbox, ButtonGroup, Button, Autocomplete, TextField } from '@mui/material';

import { FilterAction, FilterData, OptimizeData, Paper, PaperMetaData, optimizeData } from 'common';
import 'reflect-metadata';
import { IActionDispatcher, TYPES, WebSocketDiagramServerProxy, onAction } from 'sprotty';
import { Action, FitToScreenAction, GetSelectionAction, RequestModelAction, SGraph, SNode, SelectAction, SelectionResult, SetModelAction, UpdateModelAction } from 'sprotty-protocol';
import createContainer from './di.config';
import { on } from 'events';

// const el = (id: string) => document.getElementById(id);

// document.addEventListener("DOMContentLoaded", () => {

//     const yearFilterInput = el('yearFilter') as HTMLInputElement;
//     yearFilterInput.addEventListener('input', ev => {
//         filter.titleFilter = (ev.target as HTMLInputElement).value;
//         handleFilterChange();
//     });


//     const additionalChildLevelsFilter = el('additionalChildLevelsFilter') as HTMLInputElement;
//     const additionalChildLevel = el('additionalChildLevels');
//     additionalChildLevelsFilter.addEventListener('input', ev => {
//         filter.additionalChildLevels = Number((ev.target as HTMLInputElement).value);
//         // show the value in element with id 'additionalLevels'
//         additionalChildLevel!.innerText = String(filter.additionalChildLevels);
//         handleFilterChange();
//     });
//     const additionalParentLevelsFilter = el('additionalParentLevelsFilter') as HTMLInputElement;
//     const additionalParentLevel = el('additionalParentLevels')!;
//     additionalParentLevelsFilter.addEventListener('input', ev => {
//         filter.additionalParentLevels = Number((ev.target as HTMLInputElement).value);
//         // show the value in element with id 'additionalLevels'
//         additionalParentLevel.innerText = String(filter.additionalParentLevels);
//         handleFilterChange();
//     });

// });


// sprotty container
interface SprottyContext {
    model: SGraph & PaperMetaData;
    actionDispatcher: IActionDispatcher;
    modelSource: WebSocketDiagramServerProxy;
}
interface SprottyContainerProps {
    onModelReady: (sprottyContext: SprottyContext) => void;
    onSelectionChanged: (selection: string[]) => void;
}
const SprottyContainer = (props: SprottyContainerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { onModelReady, onSelectionChanged } = props;

    useEffect(() => {
        const container = createContainer('sprotty');
        const modelSource = container.get<WebSocketDiagramServerProxy>(TYPES.ModelSource);
        const websocket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`);

        modelSource.listen(websocket);

        const actionDispatcher = container.get<IActionDispatcher>(TYPES.IActionDispatcher);

        onAction(container, SelectAction.KIND, (action: Action) => {
            console.log('SelectAction', action);
            onSelectionChanged((action as SelectAction).selectedElementsIDs);
        });
        onAction(container, SetModelAction.KIND, (action: Action) => {
            console.log('SetModelAction', action);
        });
        onAction(container, UpdateModelAction.KIND, (action: Action) => {
            console.log('UpdateModelAction', action);
            // initializeFilters({ authors: (modelSource.model as SGraph & PaperMetaData).authors, fieldsOfStudy: (modelSource.model as SGraph & PaperMetaData).fieldsOfStudy });
        });

        websocket.addEventListener('open', async () => {
            try {
                const setModelAction: SetModelAction = await actionDispatcher.request({ kind: RequestModelAction.KIND, requestId: 'client_1' } as RequestModelAction);
                const test = await actionDispatcher.dispatch(setModelAction);
                if (setModelAction.newRoot) {
                    const model = setModelAction.newRoot as SGraph & PaperMetaData;
                    onModelReady({
                        model,
                        actionDispatcher,
                        modelSource
                    });
                    const ftsElms = model.children?.filter(child => child.type === 'node:paper')?.map(child => child.id) ?? [];
                    ftsElms && await actionDispatcher.dispatch(FitToScreenAction.create(ftsElms, {
                        maxZoom: 0.5,
                        padding: 100
                    }));
                }
            } catch (err) {
                console.error(err);
                if (containerRef.current) {
                    containerRef.current.innerHTML = String(err);
                }
            }
        }, { once: true });

    }, []);

    return <>
        <div ref={containerRef} id="sprotty"></div>
    </>
}

// FilterContainer
interface FilterContainerProps {
    fieldOfStudyList: string[];
    authorList: string[];
    selectedElements: string[];
    onFitAllToScreen: () => void;
    onFitSelectionToScreen: () => void;
    onFilterChanged: (filter: FilterData) => void;
    onOptimizeDataChanged: (optimizeData: OptimizeData) => void;
}
const FilterContainer = (props: FilterContainerProps) => {

    const { fieldOfStudyList, authorList, selectedElements, onFitAllToScreen, onFitSelectionToScreen, onFilterChanged, onOptimizeDataChanged } = props;

    const defaultFilter = (): FilterData => ({
        paperIds: [],
        titleFilter: '',
        authorFilter: '',
        yearFilter: { from: 0, to: 0 },
        fieldsOfStudyFilter: [],
        isOpenAccess: undefined,
        hideWiresOfHiddenNodes: false,
        hideWires: false,
        additionalChildLevels: 0,
        additionalParentLevels: 0
    })

    // filterState
    const [filter, setFilter] = useState<FilterData>(defaultFilter());

    // optimize data state
    const [optimizeData, setOptimizeData] = useState<OptimizeData>({ useIsVisible: false, useZoomFactor: false });

    //initializeFilters({ authors: model.authors, fieldsOfStudy: model.fieldsOfStudy });

    // const initializeFilters = (metadata: PaperMetaData) => {
    //     // collect all years
    //     const years = modelSource.model.children?.filter(child => child.type === 'node:paper')?.map(child => (child as SNode & Paper).year) ?? [];
    //     // remove duplicates
    //     const uniqueYears = [...new Set(years)]
    //     // sort years
    //     uniqueYears.sort((a, b) => a - b);
    //     // TODO use a rangeslider here later when we use nextjs or react or MUI or...
    // }

    useEffect(() => {
        onOptimizeDataChanged(optimizeData);
    }, [optimizeData]);

    const handleUseZoomFactor = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setOptimizeData({ ...optimizeData, useZoomFactor: ev.target.checked });
    }

    const handleUseIsVisible = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setOptimizeData({ ...optimizeData, useIsVisible: ev.target.checked });
    }

    const handleHideWires = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setFilter({ ...filter, hideWires: ev.target.checked });
    }

    const handleFitAllToScreen = () => {
        onFitAllToScreen();
    }

    const handleFitSelectionToScreen = () => {
        onFitSelectionToScreen();
    }

    const [filterSelectedImmediately, setFilterSelectedImmediately] = useState<boolean>(false);
    const handleFilterSelectedImmediately = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setFilterSelectedImmediately(ev.target.checked);
    }
    useEffect(() => {
        if (!filterSelectedImmediately) return;
        const newFilter: FilterData = { ...filter, paperIds: selectedElements };
        setFilter(newFilter);
    }, [selectedElements]);

    useEffect(() => {
        onFilterChanged(filter);
    }, [filter]);

    // button to reset filter
    const handleShowAll = () => {
        setFilter(defaultFilter());
    }
    // button to filter by paperId of only selected
    const handleShowSelected = () => {
        setFilter({ ...filter, paperIds: selectedElements });
    }

    const handleTitleFilterChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setFilter({ ...filter, titleFilter: ev.target.value });
    }

    const handleFieldsOfStudyFilterChange = (ev, fieldsOfStudyFilter) => {
        setFilter({ ...filter, fieldsOfStudyFilter });
    }

    const handleAuthorsChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setFilter({ ...filter, authorFilter: ev.target.value });
    }

    return <>
        <div className="filters">
            <div>
                <FormControlLabel control={<>
                    <ButtonGroup variant="contained">
                        <Button id="allFitToScreen" onClick={handleFitAllToScreen}>All</Button>
                        <Button id="selectedFitToScreen" onClick={handleFitSelectionToScreen}>Selection</Button>
                    </ButtonGroup>
                </>} label="Fit to screen" labelPlacement='top' />
            </div>
            <div>
                <FormControlLabel control={<>
                    <ButtonGroup variant="contained">
                        <Button id="showAll" onClick={handleShowAll}>All</Button>
                        <Button id="showOnlySelected" onClick={handleShowSelected}>Selected</Button>
                    </ButtonGroup>
                </>} label="Show" labelPlacement='top' />
                <FormControlLabel control={<Checkbox onChange={handleFilterSelectedImmediately} />} label="Filter selected immediately" />
            </div>
            <div className="modeButtons">
                <div id="optionsContainer">
                    <div>
                        <FormControlLabel control={<Checkbox onChange={handleUseZoomFactor} />} label="Use zoom factor" />
                    </div>
                    <div>
                        <FormControlLabel control={<Checkbox onChange={handleUseIsVisible} />} label="Use isVisible" />
                    </div>
                    <div>
                        <FormControlLabel control={<Checkbox onChange={handleHideWires} checked={filter.hideWires} />} label="Hide all wires" />
                    </div>
                </div>
                <div id="filterContainer">
                    <div>
                        <TextField id="titleFilter" label="Title" variant="filled" onChange={handleTitleFilterChange} />
                    </div>
                    <div>
                        <TextField id="authorFilter" label="Author" variant="filled" onChange={handleAuthorsChange} />
                    {/* <Autocomplete
                        id="authorFilter"
                        freeSolo
                        options={authorList}
                        filterSelectedOptions
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Authors"
                                placeholder="Authors"
                                variant="filled"
                            />
                        )}
                        onChange={handleAuthorsChange}
                    /> */}
                    </div>
                    {/* <div>
                        <input type="text" id="yearFilter" name="year" value="" />
                    </div> */}
                    <Autocomplete
                        multiple
                        id="fieldsOfStudyFilter"
                        options={['unknown', ...fieldOfStudyList]}
                        filterSelectedOptions
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Fields Of Study"
                                placeholder="Fields Of Study"
                                variant="filled"
                            />
                        )}
                        onChange={handleFieldsOfStudyFilterChange}
                    />
                    {/* <div id="additionalLevelsFilterContainer">
                        <div>
                            <label htmlFor="additionalChildLevelsFilter">Additional child levels</label>
                            <input id="additionalChildLevelsFilter" type="range" min="0" max="40" value="0" />
                            <div id="additionalChildLevels"></div>
                        </div>
                        <div>
                            <label htmlFor="additionalParentLevelsFilter">Additional parent levels</label>
                            <input id="additionalParentLevelsFilter" type="range" min="0" max="40" value="0" />
                            <div id="additionalParentLevels"></div>
                        </div>
                    </div> */}
                </div>
            </div>
        </div>
    </>
}

const App = () => {

    // state of the model
    const [model, setModel] = useState<SGraph & PaperMetaData>();
    // actionDispatcher
    const [actionDispatcher, setActionDispatcher] = useState<IActionDispatcher>();
    // modelSource
    const [modelSource, setModelSource] = useState<WebSocketDiagramServerProxy>();
    // selected elements
    const [selectedElements, setSelectedElements] = useState<string[]>([]);

    const modelReadyHandler = (sprottyContext: SprottyContext) => {
        setModel(sprottyContext.model);
        setActionDispatcher(sprottyContext.actionDispatcher);
        setModelSource(sprottyContext.modelSource);
    }

    const onSelectionChanged = (selection: string[]) => {
        setSelectedElements(selection);
    }

    const onOptimizeDataChanged = (newOptimizeData: OptimizeData) => {
        optimizeData.useIsVisible = newOptimizeData.useIsVisible;
        optimizeData.useZoomFactor = newOptimizeData.useZoomFactor;
        if (!model || !actionDispatcher) return;
        actionDispatcher.dispatch(UpdateModelAction.create(model));
    }

    const onFitAllToScreen = async () => {
        const newGraph = model;
        const elementIds = newGraph?.children?.map(child => child.id) ?? [];
        if (!actionDispatcher) return;
        await actionDispatcher.dispatch(FitToScreenAction.create(elementIds, {
            maxZoom: 0.8,
            padding: 100
        }));
    }

    const onFitSelectionToScreen = async () => {
        if (!actionDispatcher) return;
        const selection = await actionDispatcher.request<SelectionResult>(GetSelectionAction.create());
        const elementIds = selection.selectedElementsIDs;
        await actionDispatcher.dispatch(FitToScreenAction.create(elementIds, {
            maxZoom: 0.8,
            padding: 100
        }));
    }

    const onFilterChanged = async (filter: FilterData) => {
        if (!modelSource) return;
        modelSource.handle({
            kind: FilterAction.KIND,
            filter
        } as FilterAction);
    }

    // const onShowSelected = async (filter: FilterData) => {
    //     const selection = await actionDispatcher.request<SelectionResult>(GetSelectionAction.create());
    //     filter.paperIds = selection.selectedElementsIDs;
    //     modelSource.handle({
    //         kind: FilterAction.KIND,
    //         filter
    //     } as FilterAction);
    // }

    return <>
        <SprottyContainer onSelectionChanged={onSelectionChanged} onModelReady={modelReadyHandler} />
        {model && actionDispatcher &&
            <FilterContainer
                authorList={model.authors.map(author => author.name)}
                fieldOfStudyList={model.fieldsOfStudy}
                selectedElements={selectedElements}
                onFilterChanged={onFilterChanged}
                onFitAllToScreen={onFitAllToScreen}
                onFitSelectionToScreen={onFitSelectionToScreen}
                onOptimizeDataChanged={onOptimizeDataChanged}
            />}
    </>
}

const appNode = document.getElementById('app');// ssadad
const root = createRoot(appNode);
root.render(<App />);
