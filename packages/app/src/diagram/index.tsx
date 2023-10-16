import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FormControlLabel, Checkbox, ButtonGroup, Button, Autocomplete, TextField, Box, Slider, Container } from '@mui/material';
import { FilterAction, FilterData, OptimizeData, Paper, PaperMetaData, optimizeData } from 'common';
import 'reflect-metadata';
import { IActionDispatcher, SEdgeImpl, TYPES, WebSocketDiagramServerProxy, onAction } from 'sprotty';
import { SEdge, Action, FitToScreenAction, GetSelectionAction, RequestModelAction, SGraph, SNode, SelectAction, SelectionResult, SetModelAction, UpdateModelAction } from 'sprotty-protocol';
import createContainer from './di.config';
import { useDebouncedCallback } from 'use-debounce';

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
            const selection = action as SelectionResult;
            const firstSelEl = modelSource.model.children?.find(c => c.id === selection.selectedElementsIDs[0]);
            if(firstSelEl?.type === 'edge')
                return
            onSelectionChanged(selection.selectedElementsIDs);
            const edges: SEdge[] = [];
            selection.selectedElementsIDs.forEach(id => {
                edges.push(...(modelSource.model.children?.filter(child =>
                    child.type === 'edge' &&
                    ((child as SEdge).sourceId === id || (child as SEdge).targetId === id)) as SEdge[]))
            });
            if(edges.length > 0) {
                const selEdgesAction = SelectAction.create({
                    selectedElementsIDs: edges.map(e => e.id)
                })
                return selEdgesAction;
            }
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
    onFitRootToScreen: () => void;
    onFitSelectionToScreen: () => void;
    onFilterChanged: (filter: FilterData) => void;
    onOptimizeDataChanged: (optimizeData: OptimizeData) => void;
}
const FilterContainer = (props: FilterContainerProps) => {

    const { model, selectedElements, onFitAllToScreen, onFitSelectionToScreen, onFitRootToScreen, onFilterChanged, onOptimizeDataChanged } = props;

    const defaultFilter = (): FilterData => ({
        reset: true,
        highlightOnly: false,
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
        setFilter({ ...filter, reset: false, hideWires: ev.target.checked });
    }

    const handleFitAllToScreen = () => {
        onFitAllToScreen();
    }

    const handleFitSelectionToScreen = () => {
        onFitSelectionToScreen();
    }

    const handleFitRootToScreen = () => {
        onFitRootToScreen();
    }

    const [filterSelectedImmediately, setFilterSelectedImmediately] = useState<boolean>(false);
    const handleFilterSelectedImmediately = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setFilterSelectedImmediately(ev.target.checked);
    }
    useEffect(() => {
        if (!filterSelectedImmediately) return;
        const newFilter: FilterData = { ...defaultFilter(), highlightOnly: filter.highlightOnly, reset: false, paperIds: selectedElements };
        newFilter.additionalChildLevels = filter.additionalChildLevels;
        newFilter.additionalParentLevels = filter.additionalParentLevels;
        setYearRange([0, model.years.length - 1]);
        setFilter(newFilter);
    }, [selectedElements]);

    // button to reset filter
    const handleShowAll = () => {
        setYearRange([0, model.years.length - 1]);
        setFilter(defaultFilter());
    }
    // button to filter by paperId of only selected
    const handleShowSelected = () => {
        const newFilter: FilterData = { ...defaultFilter(), highlightOnly: filter.highlightOnly, reset: false, paperIds: selectedElements };
        newFilter.additionalChildLevels = filter.additionalChildLevels;
        newFilter.additionalParentLevels = filter.additionalParentLevels;
        setYearRange([0, model.years.length - 1]);
        setFilter(newFilter);
    }

    const handleShowRoot = () => {
        setFilter({ ...defaultFilter(), highlightOnly: filter.highlightOnly, reset: false, paperIds: [model.rootId] });
    }

    const [titleFilterField, setTitleFilterField] = useState<string>('');
    const debouncedTitleFilterChange = useDebouncedCallback(
        (ev: React.ChangeEvent<HTMLInputElement>) => {
            setFilter({ ...filter, reset: false, titleFilter: ev.target.value });
        },
        500
    );
    const handleTitleFilterChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setTitleFilterField(ev.target.value);
        debouncedTitleFilterChange(ev);
    }

    const [authorField, setAuthorField] = useState<string>('');
    const debouncedAuthorFilterChange = useDebouncedCallback(
        (ev: React.ChangeEvent<HTMLInputElement>) => {
            setFilter({ ...filter, reset: false, authorFilter: ev.target.value });
        },
        500
    );
    const handleAuthorsChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setAuthorField(ev.target.value);
        debouncedAuthorFilterChange(ev);
    }

    // handler for show openAccess checkbox
    const handleOpenAccessChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setFilter({ ...filter, reset: false, isOpenAccess: ev.target.checked });
    }

    const handleHighlightOnlyChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        setFilter({ ...filter, highlightOnly: ev.target.checked });
    }

    const handleFieldsOfStudyFilterChange = (ev, fieldsOfStudyFilter) => {
        setFilter({ ...filter, reset: false, fieldsOfStudyFilter });
    }

    const handleYearFilterChange = (ev, yearRange) => {
        setYearRange(yearRange as number[]);
    }

    const handleYearFilterChangeCommit = (ev, yearRange) => {
        setFilter({ ...filter, reset: false, yearFilter: { from: model.years[yearRange[0]], to: model.years[yearRange[1]] } });
    }

    const handleAdditionalSuccessorLevelsChange = (ev, additionalChildLevels) => {
        setFilter({ ...filter, additionalChildLevels });
    }

    const handleAdditionalPredecessorLevelsChange = (ev, additionalParentLevels) => {
        setFilter({ ...filter, additionalParentLevels });
    }

    useEffect(() => {
        setTitleFilterField((filter ?? defaultFilter()).titleFilter);
        setAuthorField((filter ?? defaultFilter()).authorFilter);
        onFilterChanged(filter);
    }, [filter]);

    return <>
        <Box className="filters" sx={{ padding: '10px' }}>
            <Box id="optionsContainer">
                <Box>
                    <FormControlLabel control={<Checkbox onChange={handleUseZoomFactor} />} label="Use zoom factor" />
                </Box>
                <Box>
                    <FormControlLabel control={<Checkbox onChange={handleUseIsVisible} />} label="Use isVisible" />
                </Box>
                <Box>
                    <FormControlLabel control={<Checkbox onChange={handleHideWires} checked={filter?.hideWires} />} label="Hide all wires" />
                </Box>
            </Box>
            <Box>
                <Box>
                    <FormControlLabel control={<>
                        <ButtonGroup variant="contained">
                            <Button id="allFitToScreen" onClick={handleFitAllToScreen}>All</Button>
                            <Button id="selectedFitToScreen" onClick={handleFitSelectionToScreen}>Selection</Button>
                            <Button id="rootFitToScreen" onClick={handleFitRootToScreen}>Root</Button>
                        </ButtonGroup>
                    </>} label="Fit to screen" labelPlacement='top' />
                </Box>
                <Box>
                    <FormControlLabel control={<>
                        <ButtonGroup variant="contained">
                            <Button id="showAll" onClick={handleShowAll}>All</Button>
                            <Button id="showOnlySelected" onClick={handleShowSelected}>Selected</Button>
                            <Button id="showRoot" onClick={handleShowRoot}>Root</Button>
                        </ButtonGroup>
                    </>} label="Set Filter To" labelPlacement='top' />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <FormControlLabel control={<Checkbox onChange={handleFilterSelectedImmediately} />} label="Filter selected immediately" />
                </Box>
            </Box>
            {/* <div>
                        <Autocomplete
                        id="authorFilter"
                        freeSolo
                        options={model.authors}
                        filterSelectedOptions
                        renderInput={(params) => (
                            <TextField
                            {...params}
                            label="Authors"
                                placeholder="Authors"
                                variant="filled"
                                />
                                )}
                                onChange={(ev, value) => handleAuthorsChange()}
                            />
                    </div> */}
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Box>
                    <FormControlLabel control={<Checkbox checked={!!filter?.highlightOnly} onChange={handleHighlightOnlyChange} />} label="Only highlight filtered data" />
                </Box>
                <TextField fullWidth id="titleFilter" label="Title" variant="filled" value={titleFilterField} onChange={handleTitleFilterChange} />
                <TextField fullWidth id="authorFilter" label="Author" variant="filled" value={authorField} onChange={handleAuthorsChange} />
                <Box>
                    <FormControlLabel control={<Checkbox checked={!!filter?.isOpenAccess} onChange={handleOpenAccessChange} />} label="Open Access only" />
                </Box>
                <Box sx={{ width: '95%' }}>
                    <FormControlLabel control={
                        <Slider
                            sx={{ margin: '0' }}
                            value={yearRange}
                            step={1}
                            min={0}
                            max={model.years.length - 1}
                            valueLabelFormat={(value) => model.years[value]}
                            valueLabelDisplay="auto"
                            marks
                            // marks={model.years.map((year, index) => ({ value: index, label: String(year) }))}
                            onChangeCommitted={handleYearFilterChangeCommit}
                            onChange={handleYearFilterChange}
                        />
                    } sx={{ width: '100%', margin: '0' }} label="Year Range" labelPlacement='top' />
                </Box>
                <Autocomplete
                    sx={{ width: '100%' }}
                    multiple
                    id="fieldsOfStudyFilter"
                    options={['unknown', ...model.fieldsOfStudy]}
                    filterSelectedOptions
                    value={filter?.fieldsOfStudyFilter}
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
            </Box>
            <Box id="additionalLevelsFilterContainer" sx={{ width: '95%' }}>
                <FormControlLabel control={
                    <Slider
                        id='additionalSuccessorsFilter'
                        value={filter?.additionalChildLevels}
                        step={1}
                        min={0}
                        max={5}
                        marks
                        valueLabelDisplay="auto"
                        // onChange={handleAdditionalSuccessorLevelsChange}
                        onChangeCommitted={handleAdditionalSuccessorLevelsChange}
                    />
                } sx={{ width: '100%', margin: '0' }} label="Additional successor levels" labelPlacement='top' />
                <FormControlLabel control={
                    <Slider
                        id='additionalPredecessorsFilter'
                        value={filter?.additionalParentLevels}
                        step={1}
                        min={0}
                        max={5}
                        marks
                        valueLabelDisplay="auto"
                        onChangeCommitted={handleAdditionalPredecessorLevelsChange}
                    />
                } sx={{ width: '100%', margin: '0' }} label="Additional predecessor levels" labelPlacement='top' />
            </Box>
        </Box>
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

    const onFitRootToScreen = async () => {
        const newGraph = model;
        const elementIds = newGraph?.rootId ? [newGraph?.rootId] : [];
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

    const onFilterChanged = async (filter: FilterData | undefined) => {
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
                onFitRootToScreen={onFitRootToScreen}
                onFitSelectionToScreen={onFitSelectionToScreen}
                onOptimizeDataChanged={onOptimizeDataChanged}
            />}
    </>
}

const appNode = document.getElementById('app');// ssadad
const root = createRoot(appNode);
root.render(<App />);
