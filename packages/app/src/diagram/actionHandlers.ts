import { FilterAction } from "common";
import { injectable } from "inversify";
import { IActionHandler } from "sprotty";

// TODO this is obsolete
@injectable()
export class FilterActionHandler implements IActionHandler {
    handle(action: FilterAction): void {
        console.log('FilterActionHandler', action);
    }
}