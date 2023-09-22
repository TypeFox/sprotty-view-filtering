import { injectable } from "inversify";
import { IActionHandler } from "sprotty";
import { FilterAction } from "../common/actions";

// TODO this is obsolete
@injectable()
export class FilterActionHandler implements IActionHandler {
    handle(action: FilterAction): void {
        console.log('FilterActionHandler', action);
    }
}