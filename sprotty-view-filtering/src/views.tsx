/** @jsx svg */
import { svg } from 'sprotty/lib/lib/jsx';
import { injectable } from 'inversify';
import { VNode } from 'snabbdom';
import { IView, RectangularNodeView, RenderingContext, SNodeImpl, isViewport } from 'sprotty';
import { SNode } from 'sprotty-protocol';
import { TaskNode } from './model';

@injectable()
export class PaperNodeView extends RectangularNodeView {
    render(node: Readonly<SNodeImpl & TaskNode>, context: RenderingContext): VNode {
        if(!this.isVisible(node, context)) {
            return undefined;
        }
        return <g>
            <rect class-sprotty-node={true} class-task={true}
                class-running={node.isRunning}
                class-finished={node.isFinished}
                x="0" y="0"
                width={node.size.width}
                height={node.size.height}
            >
            </rect>
            {context.renderChildren(node)}
        </g>;
    }
}