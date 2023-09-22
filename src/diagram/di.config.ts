import { Container, ContainerModule } from "inversify";
import { configureActionHandler, configureModelElement, configureViewerOptions, ConsoleLogger, edgeIntersectionModule, loadDefaultModules, LogLevel, moveFeature, PolylineEdgeView, RectangularNode, RectangularNodeView, SCompartmentImpl, SCompartmentView, SEdgeImpl, SGraphImpl, SGraphView, ShapeView, SLabelImpl, SLabelView, SNodeImpl, TYPES, WebSocketDiagramServerProxy } from "sprotty";
import { PaperEdgeView, PaperNodeLabelView, PaperNodeView } from "./views";
import { FilterAction } from "../common/actions";
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