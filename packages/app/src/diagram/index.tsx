import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FormControlLabel, Checkbox, ButtonGroup, Button, Autocomplete, TextField, Box, Slider } from '@mui/material';
import { FilterAction, FilterData, OptimizeData, Paper, PaperMetaData, optimizeData } from 'common';
import 'reflect-metadata';
import { IActionDispatcher, TYPES, WebSocketDiagramServerProxy, onAction } from 'sprotty';
import { Action, FitToScreenAction, GetSelectionAction, RequestModelAction, SGraph, SNode, SelectAction, SelectionResult, SetModelAction, UpdateModelAction } from 'sprotty-protocol';
import createContainer from './di.config';
import { on } from 'events';

// sprotty container
interface SprottyContext {
    model: SGraph & PaperMetaData;
    actionDispatcher: IActionDispatcher;
    modelSource: WebSocketDiagramServerProxy;
}
interface SprottyContainerProps {
    onModelReady: (sprottyContext: SprottyContext) => void;
    onSelectionChanged: (ids: string[]) => void;
    onModelUpdated: (model: SGraph & PaperMetaData) => void;
}
const SprottyContainer = (props: SprottyContainerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { onModelReady, onModelUpdated, onSelectionChanged } = props;

    useEffect(() => {
        const container = createContainer('sprotty');
        const modelSource = container.get<WebSocketDiagramServerProxy>(TYPES.ModelSource);
        const websocket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`);

        modelSource.listen(websocket);

        const actionDispatcher = container.get<IActionDispatcher>(TYPES.IActionDispatcher);

        onAction(container, SelectAction.KIND, (action: Action) => {
            actionDispatcher.request<SelectionResult>(GetSelectionAction.create()).then(selection => {
                onSelectionChanged(selection.selectedElementsIDs);
            });
        });
        onAction(container, SetModelAction.KIND, (action: Action) => {
            console.log('SetModelAction', action);
        });
        onAction(container, UpdateModelAction.KIND, (action: Action) => {
            onModelUpdated((action as UpdateModelAction).newRoot as SGraph & PaperMetaData);
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
    model: SGraph & PaperMetaData;
    selectedElements: string[];
    onFitAllToScreen: () => void;
    onFitSelectionToScreen: () => void;
    onFilterChanged: (filter: FilterData) => void;
    onOptimizeDataChanged: (optimizeData: OptimizeData) => void;
}
const FilterContainer = (props: FilterContainerProps) => {

    const { model, selectedElements, onFitAllToScreen, onFitSelectionToScreen, onFilterChanged, onOptimizeDataChanged } = props;

    const defaultFilter = (): FilterData => ({
        paperIds: [],
        titleFilter: '',
        authorFilter: '',
        yearFilter: { from: 0, to: model.years[model.years.length - 1] },
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

    // year fiter state, get a range by providing an array with min and max year
    const [yearRange, setYearRange] = useState<number[]>([0, model.years.length - 1]);

    //initializeFilters({ authors: model.authors, fieldsOfStudy: model.fieldsOfStudy });

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
        setYearRange([0, model.years.length - 1]);
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

    const handleYearFilterChange = (ev, yearRange) => {
        setYearRange(yearRange as number[]);
        setFilter({ ...filter, yearFilter: { from: model.years[yearRange[0]], to: model.years[yearRange[1]] } });
    }

    const handleAdditionalSuccessorLevelsChange = (ev, additionalChildLevels) => {
        setFilter({ ...filter, additionalChildLevels });
    }

    const handleAdditionalPredecessorLevelsChange = (ev, additionalParentLevels) => {
        setFilter({ ...filter, additionalParentLevels });
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
                        <TextField id="titleFilter" label="Title" variant="filled" value={filter.titleFilter} onChange={handleTitleFilterChange} />
                    </div>
                    <div>
                        <TextField id="authorFilter" label="Author" variant="filled" value={filter.authorFilter} onChange={handleAuthorsChange} />
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
                    <div>
                        <Box sx={{ width: 200 }}>
                            <Slider
                                value={yearRange}
                                step={1}
                                min={0}
                                max={model.years.length - 1}
                                valueLabelFormat={(value) => model.years[value]}
                                valueLabelDisplay="auto"
                                marks={model.years.map((year, index) => ({ value: index, label: String(year) }))}
                                onChange={handleYearFilterChange}
                            />
                        </Box>
                    </div>
                    <Autocomplete
                        multiple
                        id="fieldsOfStudyFilter"
                        options={['unknown', ...model.fieldsOfStudy]}
                        filterSelectedOptions
                        value={filter.fieldsOfStudyFilter}
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
                    <div id="additionalLevelsFilterContainer">
                        <FormControlLabel control={
                            <Box sx={{ width: 200 }}>
                                <Slider
                                    id='additionalSuccessorsFilter'
                                    value={filter.additionalChildLevels}
                                    step={1}
                                    min={0}
                                    max={5}
                                    marks
                                    valueLabelDisplay="off"
                                    onChange={handleAdditionalSuccessorLevelsChange}
                                />
                            </Box>} label="Additional successor levels" labelPlacement='top' />
                        <FormControlLabel control={
                            <Box sx={{ width: 200 }}>
                                <Slider
                                    id='additionalPredecessorsFilter'
                                    value={filter.additionalParentLevels}
                                    step={1}
                                    min={0}
                                    max={5}
                                    marks
                                    valueLabelDisplay="off"
                                    onChange={handleAdditionalPredecessorLevelsChange}
                                />
                            </Box>} label="Additional predecessor levels" labelPlacement='top' />
                    </div>
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

    const onModelUpdated = (model: SGraph & PaperMetaData) => {
        setModel(model);
    }

    const onSelectionChanged = async (elementIds: string[]) => {
        setSelectedElements(elementIds);
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
        <SprottyContainer onSelectionChanged={onSelectionChanged} onModelReady={modelReadyHandler} onModelUpdated={onModelUpdated} />
        {model && actionDispatcher &&
            <FilterContainer
                model={model}
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
