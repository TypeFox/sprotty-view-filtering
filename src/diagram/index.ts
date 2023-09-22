import 'reflect-metadata'
import { IActionDispatcher, TYPES, WebSocketDiagramServerProxy, onAction } from 'sprotty'
import { SGraph, FitToScreenAction, SelectionResult, GetSelectionAction, SetModelAction, UpdateModelAction, RequestModelAction, SelectAction, Action, SNode } from 'sprotty-protocol'
import createContainer from './di.config'
import { FilterAction, FilterData } from '../common/actions';
import { Paper, PaperAuthor, PaperMetaData } from '../common/model';

const defaultFilter = (): FilterData => ({
    paperIds: [],
    titleFilter: '',
    authorFilter: '',
    yearFilter: { from: 0, to: 0 },
    fieldsOfStudyFilter: '',
    isOpenAccess: undefined,
    hideWiresOfHiddenNodes: false,
    hideWires: false,
    additionalChildLevels: 0,
    additionalParentLevels: 0
})
export let filter: FilterData = defaultFilter();

export interface OptimizeData {
    useIsVisible: boolean;
    useZoomFactor: boolean;
}

export const optimizeData: OptimizeData = {
    useIsVisible: false,
    useZoomFactor: false
}

const el = (id: string) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
    const container = createContainer('sprotty');
    const modelSource = container.get<WebSocketDiagramServerProxy>(TYPES.ModelSource);
    const websocket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`);

    modelSource.listen(websocket);

    const actionDispatcher = container.get<IActionDispatcher>(TYPES.IActionDispatcher);

    // button to fit all to screen
    el('allFitToScreen')!.addEventListener('click', async () => {
        const newGraph = modelSource.model;
        const elementIds = newGraph.children?.map(child => child.id) ?? [];
        await actionDispatcher.dispatch(FitToScreenAction.create(elementIds, {
            maxZoom: 0.5,
            padding: 100
        }));
    });
    // button to fit selection to screen
    el('selectedFitToScreen')!.addEventListener('click', async () => {
        const selection = await actionDispatcher.request<SelectionResult>(GetSelectionAction.create());
        const elementIds = selection.selectedElementsIDs;
        await actionDispatcher.dispatch(FitToScreenAction.create(elementIds, {
            maxZoom: 0.5,
            padding: 100
        }));
    });
    // button to filter by paperId of only selected
    el('showOnlySelected')!.addEventListener('click', async () => {
        const selection = await actionDispatcher.request<SelectionResult>(GetSelectionAction.create());
        filter.paperIds = selection.selectedElementsIDs;
        modelSource.handle({
            kind: FilterAction.KIND,
            filter
        } as FilterAction);
    });
    //button to reset filter
    el('showAll')!.addEventListener('click', async () => {
        filter = defaultFilter();
        modelSource.handle({
            kind: FilterAction.KIND,
            filter
        } as FilterAction);
    });
    // set filterSelectedImmediately by checkbox
    let filterSelectedImmediately = false;
    el('filterSelectedImmediately')!.addEventListener('change', ev => {
        filterSelectedImmediately = !!(ev.target as HTMLInputElement).checked;
    });
    onAction(container, SelectAction.KIND, (action: Action) => {
        if (filterSelectedImmediately) {
            filter.paperIds = (action as SelectAction).selectedElementsIDs;
            modelSource.handle({
                kind: FilterAction.KIND,
                filter
            } as FilterAction);
        }
    });

    el('useIsVisible')!.addEventListener('change', ev => {
        optimizeData.useIsVisible = !!(ev.target as HTMLInputElement).checked;
        actionDispatcher.dispatch(UpdateModelAction.create(modelSource.model));
    });
    el('useZoomFactor')!.addEventListener('change', ev => {
        optimizeData.useZoomFactor = !!(ev.target as HTMLInputElement).checked;
        actionDispatcher.dispatch(UpdateModelAction.create(modelSource.model));
    });

    const initializeFilters = (metadata: PaperMetaData) => {
        el('fieldsOfStudyFilter')!.innerHTML = [
            '<option value="all">All</option>',
            '<option value="unknown">Unknown</option>',
            ...metadata.fieldsOfStudy.map(fieldOfStudy => `<option value="${fieldOfStudy}">${fieldOfStudy}</option>`)
        ].join('');
        // collect all years
        const years = modelSource.model.children?.filter(child => child.type === 'node:paper')?.map(child => (child as SNode & Paper).year) ?? [];
        // remove duplicates
        const uniqueYears = [...new Set(years)]
        // sort years
        uniqueYears.sort((a, b) => a - b);
        // TODO use a rangeslider here later when we use nextjs or react or MUI or...
    }
    const handleFilterChange = async () => {
        modelSource.handle({
            kind: FilterAction.KIND,
            filter
        } as FilterAction);
    }
    el('hideWires')!.addEventListener('change', ev => {
        filter.hideWires = (ev.target as HTMLInputElement).checked;
        handleFilterChange();
    });

    const nameFilterInput = el('titleFilter') as HTMLInputElement;
    nameFilterInput.addEventListener('input', ev => {
        filter.titleFilter = (ev.target as HTMLInputElement).value;
        handleFilterChange();
    });
    const authorFilterInput = el('authorFilter') as HTMLInputElement;
    authorFilterInput.addEventListener('input', ev => {
        filter.authorFilter = (ev.target as HTMLInputElement).value;
        handleFilterChange();
    });
    const yearFilterInput = el('yearFilter') as HTMLInputElement;
    yearFilterInput.addEventListener('input', ev => {
        filter.titleFilter = (ev.target as HTMLInputElement).value;
        handleFilterChange();
    });
    const fieldsOfStudyFilterInput = el('fieldsOfStudyFilter') as HTMLInputElement;
    fieldsOfStudyFilterInput.addEventListener('input', ev => {
        filter.fieldsOfStudyFilter = (ev.target as HTMLInputElement).value;
        handleFilterChange();
    });

    const additionalChildLevelsFilter = el('additionalChildLevelsFilter') as HTMLInputElement;
    additionalChildLevelsFilter.addEventListener('input', ev => {
        filter.additionalChildLevels = Number((ev.target as HTMLInputElement).value);
        // show the value in element with id 'additionalLevels'
        el('additionalChildLevels')!.innerText = String(filter.additionalChildLevels);
        handleFilterChange();
    });
    const additionalParentLevelsFilter = el('additionalParentLevelsFilter') as HTMLInputElement;
    additionalParentLevelsFilter.addEventListener('input', ev => {
        filter.additionalParentLevels = Number((ev.target as HTMLInputElement).value);
        // show the value in element with id 'additionalLevels'
        el('additionalParentLevels')!.innerText = String(filter.additionalParentLevels);
        handleFilterChange();
    });

    websocket.addEventListener('open', async () => {
        try {
            const setModelAction: SetModelAction = await actionDispatcher.request({ kind: RequestModelAction.KIND, requestId: 'client_1' } as RequestModelAction);
            const test = await actionDispatcher.dispatch(setModelAction);
            if (setModelAction.newRoot) {
                const model = setModelAction.newRoot as SGraph & PaperMetaData;
                initializeFilters({ authors: model.authors, fieldsOfStudy: model.fieldsOfStudy });
                const ftsElms = model.children?.filter(child => child.type === 'node:paper')?.map(child => child.id) ?? [];
                ftsElms && await actionDispatcher.dispatch(FitToScreenAction.create(ftsElms, {
                    maxZoom: 0.5,
                    padding: 100
                }));
            }
        } catch (err) {
            console.error(err);
            el('sprotty')!.innerText = String(err);
        }
    }, { once: true });
});

// const elementIds = newGraph.children?.map(child => child.id) ?? [];
// await server.dispatch({
//     kind: FitToScreenAction.KIND,
//     elementIds: elementIds,
//     animate: true,
//     maxZoom: 1,
//     padding: 10
// } as FitToScreenAction);