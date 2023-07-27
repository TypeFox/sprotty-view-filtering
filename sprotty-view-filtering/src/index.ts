import 'reflect-metadata'

import { LocalModelSource, TYPES } from 'sprotty'
import createContainer from './di.config'
import { generateGraph } from './model-source';

document.addEventListener("DOMContentLoaded", () => {
    const container = createContainer('sprotty');
    const modelSource = container.get<LocalModelSource>(TYPES.ModelSource);
    modelSource.setModel(generateGraph());
});