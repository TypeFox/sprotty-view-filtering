import { FilterAction } from "common";
import { Container, ContainerModule } from "inversify";
import { ConsoleLogger, LogLevel, SCompartmentImpl, SCompartmentView, SEdgeImpl, SGraphImpl, SGraphView, SLabelImpl, SNodeImpl, TYPES, WebSocketDiagramServerProxy, configureActionHandler, configureModelElement, configureViewerOptions, edgeIntersectionModule, loadDefaultModules, moveFeature } from "sprotty";
import { BadgeView, PaperEdgeView, PaperNodeLabelView, PaperNodeView } from "sprotty-views";
import { FilterActionHandler } from "./actionHandlers";

export default (containerId: string) => {

    const AcademicPapersModule = new ContainerModule((bind, unbind, isBound, rebind) => {
        bind(TYPES.ModelSource).to(WebSocketDiagramServerProxy).inSingletonScope();
        rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
        rebind(TYPES.LogLevel).toConstantValue(LogLevel.log);
        const context = { bind, unbind, isBound, rebind };
        configureModelElement(context, 'graph', SGraphImpl, SGraphView);
        configureModelElement(context, 'node:paper', SNodeImpl, PaperNodeView, {
            disable: [moveFeature]
        });
        configureModelElement(context, 'compartment', SCompartmentImpl, SCompartmentView);
        configureModelElement(context, 'compartment:badge', SCompartmentImpl, BadgeView);
        configureModelElement(context, 'node:details', SNodeImpl, SCompartmentView, {
            disable: [moveFeature]
        });
        configureModelElement(context, 'label', SLabelImpl, PaperNodeLabelView, {
            disable: [moveFeature]
        });
        configureModelElement(context, 'edge', SEdgeImpl, PaperEdgeView);

        // TODO this is obsolete
        configureActionHandler(context, FilterAction.KIND, FilterActionHandler);

        configureViewerOptions(context, {
            needsClientLayout: true,
            needsServerLayout: true,
            baseDiv: containerId,
            zoomLimits: { min: 0, max: 15 },
            verticalScrollLimits: { min: -500000, max: 500000 },
        });
    });

    const container = new Container();
    loadDefaultModules(container);
    container.load(AcademicPapersModule);
    container.load(edgeIntersectionModule)

    return container;

}