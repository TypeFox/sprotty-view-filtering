import 'reflect-metadata'
import { IActionDispatcher, TYPES, WebSocketDiagramServerProxy } from 'sprotty'
import { SGraph, FitToScreenAction, SetModelAction, UpdateModelAction, ResponseAction, RequestModelAction } from 'sprotty-protocol'
import createContainer from './di.config'

export let useIsVisible = false;
export let useZoomFactor = false;

document.addEventListener("DOMContentLoaded", () => {
    const container = createContainer('sprotty');
    const modelSource = container.get<WebSocketDiagramServerProxy>(TYPES.ModelSource);
    const websocket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`);

    modelSource.listen(websocket);

    const actionDispatcher = container.get<IActionDispatcher>(TYPES.IActionDispatcher);
    websocket.addEventListener('open', async () => {
        try {
            const setModelAction: SetModelAction = await actionDispatcher.request(RequestModelAction.create());
            const model = setModelAction.newRoot;
            await actionDispatcher.dispatch(setModelAction);
            const firstElementId = model.children?.[0].id;
            const ftsElms = firstElementId ? [firstElementId] : [];
            await actionDispatcher.dispatch(FitToScreenAction.create(ftsElms));
        } catch (err) {
            console.error(err);
            document.getElementById('sprotty')!.innerText = String(err);
        }
    }, { once: true });

    document.getElementById('useIsVisible')!.addEventListener('click', async ev => {
        useIsVisible = !useIsVisible;
        (ev.target as HTMLButtonElement)!.className = useIsVisible ? 'active' : '';
        actionDispatcher.dispatch(UpdateModelAction.create(modelSource.model));
    });
    document.getElementById('useZoomFactor')!.addEventListener('click', async ev => {
        useZoomFactor = !useZoomFactor;
        (ev.target as HTMLButtonElement)!.className = useZoomFactor ? 'active' : '';
        actionDispatcher.dispatch(UpdateModelAction.create(modelSource.model));
    });
});