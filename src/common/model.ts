import { SNode } from "sprotty-protocol"

export interface TaskNode extends SNode {
    name: string;
    isRunning: boolean;
    isFinished: boolean;
}

export type PaperNode = {
    paperId: string
} & SNode
