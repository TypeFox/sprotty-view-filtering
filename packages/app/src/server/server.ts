/********************************************************************************
 * Copyright (c) 2023 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { FilterAction } from 'common';
import { LayoutOptions } from 'elkjs/lib/elk-api';
import ElkConstructor from 'elkjs/lib/elk.bundled';
import express from 'express';
import * as path from 'path';
import { DefaultElementFilter, DefaultLayoutConfigurator, ElkFactory, ElkLayoutEngine } from 'sprotty-elk/lib/elk-layout';
import { Action, ActionMessage, DiagramServer, DiagramServices, FitToScreenAction, SGraph, SModelIndex } from 'sprotty-protocol';
import { ServerActionHandlerRegistry } from 'sprotty-protocol/lib/action-handler';
import { Server } from 'ws';
import { generateGraph } from './generator';

export class PaperGraphLayoutConfigurator extends DefaultLayoutConfigurator {

    protected override graphOptions(sgraph: SGraph, index: SModelIndex): LayoutOptions | undefined {
        return {
            'org.eclipse.elk.algorithm': 'org.eclipse.elk.layered'
        };
    }

    // protected override nodeOptions(snode: SNode, index: SModelIndex): LayoutOptions | undefined {
    //     return {
    //         'org.eclipse.elk.nodeSize.constraints': 'PORTS PORT_LABELS NODE_LABELS MINIMUM_SIZE',
    //         // 'org.eclipse.elk.nodeSize.minimum': '(10, 10)',
    //         'org.eclipse.elk.portConstraints': 'FREE',
    //         'org.eclipse.elk.nodeLabels.placement': 'INSIDE H_CENTER V_CENTER'
    //     };
    // }

    // protected override portOptions(sport: SPort, index: SModelIndex): LayoutOptions | undefined {
    //     return {
    //         'org.eclipse.elk.port.borderOffset': '1'
    //     };
    // }
}

const serverApp = express();
serverApp.use(express.json());

const elkFactory: ElkFactory = () => new ElkConstructor();
const serverActionHandlerRegistry = new ServerActionHandlerRegistry();
serverActionHandlerRegistry.onAction(FilterAction.KIND, async (action: FilterAction, state, server) => {
    console.log('FilterAction received', action, state, server);
    const newGraph = generateGraph(action.filter);
    await server.updateModel(newGraph);
    // ids of all children after filtering
    const ftsElms = newGraph.children?.filter(child => child.type === 'node:paper')?.map(child => child.id) ?? [];
    await server.dispatch(FitToScreenAction.create(ftsElms, {
        maxZoom: 0.5,
        padding: 100
    }));
    return Promise.resolve();
});

const layoutConfigurator = new PaperGraphLayoutConfigurator();
const services: DiagramServices = {
    DiagramGenerator: {
        generate: () => generateGraph()
    },
    ServerActionHandlerRegistry: serverActionHandlerRegistry,
    ModelLayoutEngine: new ElkLayoutEngine(elkFactory, new DefaultElementFilter(), layoutConfigurator)
}

// Create a WebSocket Server
const wsServer = new Server({ noServer: true });
wsServer.on('connection', socket => {

    let clientId: string | undefined;
    const diagramServer = new DiagramServer(async (action: Action) => {
        const msg = JSON.stringify({ clientId, action });
        socket.send(msg);
    }, services);

    socket.on('error', console.error);
    socket.on('message', message => {
        try {
            const actionMessage = JSON.parse(message.toString()) as ActionMessage;
            clientId = actionMessage.clientId;
            diagramServer.accept(actionMessage.action);
        } catch (err) {
            console.error(err);
            socket.send(JSON.stringify(err));
        }
    });
});

serverApp.use(express.static(path.join(__dirname, '..', '..', 'static')));

const server = serverApp.listen(8080, () => {
    console.log('Diagram is shown at http://localhost:8080');
});

server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, socket => {
        wsServer.emit('connection', socket, request);
    });
});
