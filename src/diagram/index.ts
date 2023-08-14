import 'reflect-metadata'
import { IActionDispatcher, LocalModelSource, TYPES, WebSocketDiagramServerProxy } from 'sprotty'
import { FitToScreenAction, RequestModelAction } from 'sprotty-protocol'
import createContainer from './di.config'

document.addEventListener("DOMContentLoaded", () => {
    const container = createContainer('sprotty');
    // const modelSource = container.get<LocalModelSource>(TYPES.ModelSource);
    // modelSource.setModel(generateGraph());
    const modelSource = container.get<WebSocketDiagramServerProxy>(TYPES.ModelSource);
    const websocket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`);

    modelSource.listen(websocket);

    const actionDispatcher = container.get<IActionDispatcher>(TYPES.IActionDispatcher);
    websocket.addEventListener('open', () => {
        actionDispatcher.request(RequestModelAction.create())
            .then(response => actionDispatcher.dispatch(response))
            .then(response => actionDispatcher.dispatch(FitToScreenAction.create([])))
            .catch(err => {
                console.error(err);
                document.getElementById('sprotty')!.innerText = String(err);
            })
    }, { once: true });
});