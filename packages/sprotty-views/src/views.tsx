/** @jsx svg */
import { Paper, PaperLabel, optimizeData } from 'common';
import { injectable } from 'inversify';
import { VNode } from 'snabbdom';
import { IViewArgs, PolylineEdgeView, RectangularNodeView, RenderingContext, SCompartmentImpl, SEdgeImpl, SLabelImpl, SNodeImpl, ShapeView, ViewportRootElement, setAttr } from 'sprotty';
import { getSubType } from 'sprotty-protocol';
import { svg } from 'sprotty/lib/lib/jsx';

@injectable()
export class PaperNodeView extends RectangularNodeView {
    render(node: Readonly<SNodeImpl & Paper>, context: RenderingContext): VNode | undefined {
        if (optimizeData.useIsVisible && !this.isVisible(node, context)) {
            return undefined;
        }
        return <g>
            <rect class-sprotty-node={true} class-added={node.added} class-mouseover={node.hoverFeedback}
                width={node.size.width}
                height={node.size.height}
            >
            </rect>
            {context.renderChildren(node)}
        </g>;
    }
}

@injectable()
export class PaperNodeLabelView extends ShapeView {
    render(label: Readonly<SLabelImpl & PaperLabel>, context: RenderingContext): VNode | undefined {
        if ((optimizeData.useIsVisible && !this.isVisible(label, context)) || (optimizeData.useZoomFactor && !showDetail(label.root as ViewportRootElement, label.minZoomLevel))) {
            return undefined;
        }
        const vnode = <text class-sprotty-label={true}>{label.text}</text>;
        const subType = getSubType(label);
        if (subType) {
            setAttr(vnode, 'class', subType);
        }
        return vnode;
    }
}

function showDetail(vp: ViewportRootElement, zoomLevel: number): boolean {
    return vp.zoom >= zoomLevel;
}

@injectable()
export class PaperEdgeView extends PolylineEdgeView {

    render(edge: Readonly<SEdgeImpl>, context: RenderingContext, args?: IViewArgs): VNode | undefined {
        const route = this.edgeRouterRegistry.route(edge, args);
        if (route.length === 0) {
            return this.renderDanglingEdge("Cannot compute route", edge, context);
        }
        if (optimizeData.useIsVisible && !this.isVisible(edge, route, context)) {
            if (edge.children.length === 0) {
                return undefined;
            }
            // The children of an edge are not necessarily inside the bounding box of the route,
            // so we need to render a group to ensure the children have a chance to be rendered.
            return <g>{context.renderChildren(edge, { route })}</g>;
        }

        return <g class-sprotty-edge={true} class-mouseover={edge.hoverFeedback}>
            {this.renderLine(edge, route, context, args)}
            {this.renderAdditionals(edge, route, context)}
            {context.renderChildren(edge, { route })}
        </g>;
    }
}

@injectable()
export class BadgeView extends ShapeView {
    render(node: Readonly<SCompartmentImpl & PaperLabel>, context: RenderingContext): VNode | undefined {
        if (optimizeData.useIsVisible && !this.isVisible(node, context) || (optimizeData.useZoomFactor && !showDetail(node.root as ViewportRootElement, node.minZoomLevel))) {
            return undefined;
        }
        return <g>
            <rect class-sprotty-node={true}
                width={node.size.width}
                height={node.size.height}
                rx={10}
            >
            </rect>
            {context.renderChildren(node)}
        </g>;
    }
}
