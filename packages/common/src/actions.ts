import { Action } from "sprotty-protocol";

export interface FilterData {
    reset: boolean;
    highlightOnly: boolean;
    paperIds: string[];
    titleFilter: string;
    authorFilter: string;
    yearFilter: { from: number, to: number };
    fieldsOfStudyFilter: string[];
    isOpenAccess?: boolean;
    hideWiresOfHiddenNodes: boolean;
    hideWires: boolean;
    additionalChildLevels: number;
    additionalParentLevels: number;
}

export interface FilterAction extends Action {
    kind: typeof FilterAction.KIND;
    filter: FilterData
}

export namespace FilterAction {
    export const KIND = 'filterAction';
}

