let completions = require('./docparser');
const { CompletionItem: Item, CompletionItemKind: Kind } = require('vscode');

function getPrimitives() {
    let primitives = completions.getCompletions().primitives;
    return primitives.map(label => new Item(label, Kind.Value));
}

module.exports = {
    getPrimitives,
};
