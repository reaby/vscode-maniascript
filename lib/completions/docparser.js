const vscode = require('vscode');
let parser;
let completions;
initParser();

function parseFile(file) {
    completions = parser.parseFile(file);
    return completions;
}

function getCompletions() {
    return completions;
}

function initParser() {
    if (vscode.workspace.getConfiguration().get('maniascript.useManiaplanetApi')) {
        parser = require('./mpdocparser');
        console.log("init Maniaplanet parser!");
        completions = parser.parseFile(vscode.workspace.getConfiguration().get('maniascript.apidocPath'));
    } else {
        parser = require('./tmdocparser');
        console.log("init Trackmania parser!");
        completions = parser.parseFile(vscode.workspace.getConfiguration().get('maniascript.apidocPath'));
    }
}

module.exports = {
    initParser,
    parseFile,
    completions,
    getCompletions
};
