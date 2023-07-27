/** @jsx svg */
import { svg } from 'sprotty/lib/lib/jsx';
import { injectable } from 'inversify';
import { VNode } from 'snabbdom';
import { IView, RenderingContext, SNodeImpl } from 'sprotty';
import { SNode } from 'sprotty-protocol';
import { TaskNode } from './model';

@injectable()
export class PaperNodeView implements IView {
    render(node: Readonly<SNodeImpl & TaskNode>, context: RenderingContext): VNode {
        return <g>
            <rect class-sprotty-node={true} class-task={true}
                class-running={node.isRunning}
                class-finished={node.isFinished}
                width={node.size.width}
                height={node.size.height}
            >
            </rect>
            {context.renderChildren(node)}
        </g>;
    }
}