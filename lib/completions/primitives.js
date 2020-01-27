let primitives = require('./docparser').completions.primitives;
const { CompletionItem: Item, CompletionItemKind: Kind } = require('vscode');

module.exports = primitives.map(label => new Item(label, Kind.Value));