import { Container, ContainerModule } from "inversify";
import { configureModelElement, configureViewerOptions, ConsoleLogger, edgeIntersectionModule, loadDefaultModules, LogLevel, PolylineEdgeView, RectangularNode, SEdgeImpl, SGraphImpl, SGraphView, SLabelImpl, SLabelView, TYPES, WebSocketDiagramServerProxy } from "sprotty";
import { PaperNodeView } from "./views";

export default (containerId: string) => {

    const AcademicPapersModule = new ContainerModule((bind, unbind, isBound, rebind) => {
        bind(TYPES.ModelSource).to(WebSocketDiagramServerProxy).inSingletonScope();
        rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
        rebind(TYPES.LogLevel).toConstantValue(LogLevel.log);
        const context = { bind, unbind, isBound, rebind };
        configureModelElement(context, 'graph', SGraphImpl, SGraphView);
        configureModelElement(context, 'node:paper', RectangularNode, PaperNodeView);
        configureModelElement(context, 'label', SLabelImpl, SLabelView);
        configureModelElement(context, 'edge', SEdgeImpl, PolylineEdgeView);

        configureViewerOptions(context, {
            needsClientLayout: false,
            needsServerLayout: true,
            baseDiv: containerId,
            zoomLimits: { min: 0.001, max: 2 }
        });
    });

    const container = new Container();
    loadDefaultModules(container);
    container.load(AcademicPapersModule);
    container.load(edgeIntersectionModule)

    return container;

}