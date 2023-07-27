import { Container, ContainerModule } from "inversify";
import { configureModelElement, configureViewerOptions, ConsoleLogger, edgeIntersectionModule, loadDefaultModules, LocalModelSource, LogLevel, PolylineEdgeView, RectangularNode, SEdge, SEdgeImpl, SGraph, SGraphImpl, SGraphView, SLabelImpl, SLabelView, TYPES } from "sprotty";
import { PaperNodeView } from "./views";

export default (containerId: string) => {

    const ASCETExamleModule = new ContainerModule((bind, unbind, isBound, rebind) => {
        bind(TYPES.ModelSource).to(LocalModelSource).inSingletonScope();
        rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
        rebind(TYPES.LogLevel).toConstantValue(LogLevel.log);
        const context = { bind, unbind, isBound, rebind };
        configureModelElement(context, 'graph', SGraphImpl, SGraphView);
        configureModelElement(context, 'paper', RectangularNode, PaperNodeView);
        configureModelElement(context, 'label', SLabelImpl, SLabelView);
        configureModelElement(context, 'edge', SEdgeImpl, PolylineEdgeView);

        configureViewerOptions(context, {
            needsClientLayout: false,
            baseDiv: containerId
        });

    });

    const container = new Container();
    loadDefaultModules(container);
    container.load(ASCETExamleModule);
    container.load(edgeIntersectionModule)
    return container;

}