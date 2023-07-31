import { Container, ContainerModule } from "inversify";
import { configureModelElement, configureViewerOptions, ConsoleLogger, edgeIntersectionModule, loadDefaultModules, LocalModelSource, LogLevel, PolylineEdgeView, RectangularNode, SEdgeImpl, SGraphImpl, SGraphView, SLabelImpl, SLabelView, TYPES } from "sprotty";
import { SGraph, SModelIndex, SNode, SPort } from 'sprotty-protocol';
import { LayoutOptions } from 'elkjs/lib/elk-api';
import { PaperNodeView } from "./views";
import { DefaultLayoutConfigurator, ElkFactory, ElkLayoutEngine, ILayoutConfigurator, elkLayoutModule } from "sprotty-elk";
import ElkConstructor from 'elkjs/lib/elk.bundled';

export default (containerId: string) => {

    const elkFactory: ElkFactory = () => new ElkConstructor();

    const AcademicPapersModule = new ContainerModule((bind, unbind, isBound, rebind) => {
        bind(TYPES.ModelSource).to(LocalModelSource).inSingletonScope();
        bind(TYPES.IModelLayoutEngine).toService(ElkLayoutEngine);
        bind(ElkFactory).toConstantValue(elkFactory);
        rebind(ILayoutConfigurator).to(PaperGraphLayoutConfigurator);
        rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
        rebind(TYPES.LogLevel).toConstantValue(LogLevel.log);
        const context = { bind, unbind, isBound, rebind };
        configureModelElement(context, 'graph', SGraphImpl, SGraphView);
        configureModelElement(context, 'node:paper', RectangularNode, PaperNodeView);
        configureModelElement(context, 'label', SLabelImpl, SLabelView);
        configureModelElement(context, 'edge', SEdgeImpl, PolylineEdgeView);

        configureViewerOptions(context, {
            needsClientLayout: true,
            baseDiv: containerId
        });

    });

    const container = new Container();
    loadDefaultModules(container);
    container.load(elkLayoutModule);
    container.load(AcademicPapersModule);
    container.load(edgeIntersectionModule)
    return container;

}

export class PaperGraphLayoutConfigurator extends DefaultLayoutConfigurator {

    protected override graphOptions(sgraph: SGraph, index: SModelIndex): LayoutOptions | undefined {
        return {
            'org.eclipse.elk.algorithm': 'org.eclipse.elk.radial'
        };
    }

    // protected override nodeOptions(snode: SNode, index: SModelIndex): LayoutOptions | undefined {
    //     return {
    //         'org.eclipse.elk.nodeSize.constraints': 'PORTS PORT_LABELS NODE_LABELS MINIMUM_SIZE',
    //         'org.eclipse.elk.nodeSize.minimum': '(40, 40)',
    //         'org.eclipse.elk.portConstraints': 'FREE',
    //         'org.eclipse.elk.nodeLabels.placement': 'INSIDE H_CENTER V_TOP',
    //         'org.eclipse.elk.portLabels.placement': 'OUTSIDE'
    //     };
    // }

    // protected override portOptions(sport: SPort, index: SModelIndex): LayoutOptions | undefined {
    //     return {
    //         'org.eclipse.elk.port.borderOffset': '1'
    //     };
    // }

}