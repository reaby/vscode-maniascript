const vscode = require('vscode');
const fs = require('fs');
const autocomplete = require('./completions');
let docParser = require('./completions/docparser');

const { checkStructs, getAllStructs, getStructElemType } = require('./completions/structs.js');
const { resetExternals, allNamespacesIncluded } = require('./completions/namespaces.js');

const templatestringColor = vscode.window.createTextEditorDecorationType({
  isWholeLine: false,
  backgroundColor: { id: "textCodeBlock.background" }
});

const templatestringColor2 = vscode.window.createTextEditorDecorationType({
  overviewRulerColor: { id: "textBlockQuote.border" },
  overviewRulerLane: vscode.OverviewRulerLane.Right,
  isWholeLine: true,
  backgroundColor: { id: "textCodeBlock.background" }
});

const structColor = vscode.window.createTextEditorDecorationType({
  color: { id: "maniascript.structColor" }
});

const vscodecolors = {};

exports.activate = function (context) {
  var activeEditor = vscode.window.activeTextEditor;
  console.log('started');
  var subscriptions = [];
  let timeout = null;

  let confValue = vscode.workspace.getConfiguration().get('conf.maniascript.apiDocPath');
  try {
    docParser.parseFile(confValue); // load default config
  } catch (err) {
    console.log(err);
  }

  if (activeEditor) {
    if (activeEditor.document.languageId == "maniascript" || activeEditor.document.languageId == "xml" || activeEditor.document.languageId == "jinja-xml") {
      allNamespacesIncluded(activeEditor.document.getText());
      updateDecorations();
    }
  }

  function updateDecorations() {
    if (!activeEditor) {
      return;
    }

    const regEx = /"{3}([\s\S]*?"{3})/g;
    const text = activeEditor.document.getText();
    const templates = [];
    const templates2 = [];
    const structs = [];


    let match;
    while (match = regEx.exec(text)) {
      const startPos = activeEditor.document.positionAt(match.index);
      const endPos = activeEditor.document.positionAt(match.index + match[0].length);
      const decoration = { range: new vscode.Range(startPos, endPos) };
      if (startPos.line != endPos.line) {
        templates2.push(decoration);
      } else {
        templates.push(decoration);
      }

    }

    checkStructs(text);  // refresh / update structs 

    for (let struct of getAllStructs()) {
      var re = new RegExp(`(?:(?<![\.]))\\b(${struct.label})\\b`, "g");
      let line;
      while (line = re.exec(text)) {
        const startPos = activeEditor.document.positionAt(line.index);
        const endPos = activeEditor.document.positionAt(line.index + line[1].length);
        const decoration = { range: new vscode.Range(startPos, endPos) };
        structs.push(decoration);
      }
    }


    if (activeEditor.document.languageId == "xml" || activeEditor.document.languageId == "jinja-xml") {
      for (i in vscodecolors) {
        vscodecolors[i].color.dispose();
        delete vscodecolors[i];
      }

      const regex = /\s+\b((\w*)color|colorize|focusareacolor1|focusareacolor2)\b\s*=(?<color>["]((?:(?=(?:\\)*)\\.|.)*?)["])/g
      let line;
      while (line = regex.exec(text)) {
        let colorCode = line[4];
        const startIdx = line[0].search(colorCode);
        const endIdx = startIdx + colorCode.length;

        const startPos = activeEditor.document.positionAt(line.index + startIdx);
        const endPos = activeEditor.document.positionAt(line.index + endIdx);
        const decoration = { range: new vscode.Range(startPos, endPos) };
        if (colorCode.length < 3 || colorCode.length == 5 || colorCode.length == 7 || colorCode.length > 8) {
          continue;
        }
        if (!vscodecolors.hasOwnProperty(line[3])) {
          vscodecolors[line[3]] = {
            "color": vscode.window.createTextEditorDecorationType({
              isWholeLine: false,

              before: {
                contentText: ' ',
                border: 'solid 0.1em #000',
                margin: '0.1em 0.2em 0 0.2em',
                width: '0.8em',
                height: '0.8em',
                backgroundColor: "#" + colorCode,
              },
              dark: {
                before: {
                  border: 'solid 0.1em #eee'
                }
              },
            }),
            "range": [decoration]
          };
        } else {
          vscodecolors[line[3]]["range"].push(decoration);
        }
      }

      for (i in vscodecolors) {
        activeEditor.setDecorations(vscodecolors[i].color, vscodecolors[i].range);
      }

    }
    activeEditor.setDecorations(structColor, structs);
    activeEditor.setDecorations(templatestringColor, templates);
    activeEditor.setDecorations(templatestringColor2, templates2);
  }

  function triggerUpdateDecorations() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    timeout = setTimeout(updateDecorations, 500);
  }


  const onActiveEditorChange = function (editor) {
    if (editor && editor.document) {
      if (editor.document.languageId == "maniascript" || editor.document.languageId == "xml" || editor.document.languageId == "jinja-xml") {
        activeEditor = editor;
        var activeDocument = editor.document;
        var activeDocumentLanguage = activeDocument.languageId;
        console.log('Active file language: ' + activeDocumentLanguage);
        let confValue = vscode.workspace.getConfiguration().get('conf.maniascript.apiDocPath');

        try {
          docParser.parseFile(confValue); // load default config
        } catch (err) {
          console.log(err);
        }
        resetExternals();
        allNamespacesIncluded(editor.document.getText());
        triggerUpdateDecorations(editor);
      }
    }
  }

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider({ language: 'maniascript', scheme: 'file' }, {
      provideCompletionItems(document, position, token) {
        const start = new vscode.Position(position.line, 0);
        const range = new vscode.Range(start, position);
        let startToCurrent = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(position.line, 0));

        const text = document.getText(range).replace(/^\s*/, "").split(/([ |(])/);
        const text2 = document.getText(startToCurrent);  //limit reading file from start to current line, so variables gets parsed right

        const completionItems = autocomplete.find(text, text2);

        return completionItems;
      }
    }, '.', ':', '#')
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider({ language: 'xml', scheme: 'file' }, {
      provideCompletionItems(document, position, token) {

        const start = new vscode.Position(position.line, 0);
        const range = new vscode.Range(start, position);

        let startToCurrent = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(position.line, 0));
        let index = document.getText(startToCurrent).indexOf("<script>");
        if (index == -1) return [];

        startToCurrent = new vscode.Range(document.positionAt(index), new vscode.Position(position.line, 0));
        const text = document.getText(range).replace(/^\s*/, "").split(/([ |(])/);
        const text2 = document.getText(startToCurrent);  //limit reading file from start to current line, so variables gets parsed right

        const completionItems = autocomplete.find(text, text2);

        return completionItems;
      }
    }, '.', ':', '#')
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider({ language: 'jinja-xml', scheme: 'file' }, {
      provideCompletionItems(document, position, token) {

        const start = new vscode.Position(position.line, 0);
        const range = new vscode.Range(start, position);

        let startToCurrent = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(position.line, 0));
        let index = document.getText(startToCurrent).indexOf("<script>");
        if (index == -1) return [];

        startToCurrent = new vscode.Range(document.positionAt(index), new vscode.Position(position.line, 0));
        const text = document.getText(range).replace(/^\s*/, "").split(/([ |(])/);
        const text2 = document.getText(startToCurrent);  //limit reading file from start to current line, so variables gets parsed right

        const completionItems = autocomplete.find(text, text2);

        return completionItems;
      }
    }, '.', ':', '#')
  );

  const listener = vscode.window.onDidChangeActiveTextEditor(onActiveEditorChange, this, subscriptions);

  const listenerDisposable = vscode.Disposable.from.apply(vscode.Disposable, subscriptions);
  vscode.workspace.onDidChangeTextDocument(event => {
    if (activeEditor && event.document === activeEditor.document) {
      if (event.document.languageId == "maniascript" || event.document.languageId == "xml" || event.document.languageId == "jinja-xml") {
        triggerUpdateDecorations();
      }
    }
  }, null, context.subscriptions);

}

exports.deactivate = () => { }
