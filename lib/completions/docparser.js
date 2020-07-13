let fs = require('fs');
let doch = require('./doch.json');
let completions = doch;

function getCompletions() {
    return completions;
}

function parseFile(fileName) {
    //reset
    if (fileName == null) {
        completions = doch;
        console.log("Using build-in completions for maniascript!");
        return;
    }

    if (fs.existsSync(fileName)) {
        try {
            completions = {
                primitives: [
                    "Void",
                    "Integer",
                    "Real",
                    "Boolean",
                    "Text",
                    "Ident"
                ],
                namespaces: {},
                classes: {
                    Int2: {
                        inherit: "",
                        enums: {},
                        methods: [],
                        props: {
                            Integer: [
                                "X",
                                "Y"
                            ]
                        }
                    },
                    Vec2: {
                        inherit: "",
                        enums: {},
                        methods: [],
                        props: {
                            Real: [
                                "X",
                                "Y"
                            ]
                        }
                    },
                    Vec3: {
                        inherit: "",
                        enums: {},
                        methods: [],
                        props: {
                            "Real": [
                                "X",
                                "Y",
                                "Z"
                            ]
                        }
                    },
                    Int3: {
                        inherit: "",
                        enums: {},
                        methods: [],
                        props: {
                            Integer: [
                                "X",
                                "Y",
                                "Z"
                            ]
                        }
                    },

                }
            };
            let file = fs.readFileSync(fileName).toString().replace(/(\/\*[\s\S]*?(.*)\*\/)|(\/\/.*)/gm,"");
            let fileArray = file.split("\n");

            let regexNamespaces = /^namespace\s+(.*?)\s*\{/gm;
            for (let match of file.match(regexNamespaces) || []) {
                let startLine = fileArray.indexOf(match);
                let line = startLine;
                let scopeArray = [];
                while (!fileArray[line].match(/^\}\;/gm)) {
                    scopeArray.push(fileArray[line]);
                    line += 1;

                }
                processNamespace(scopeArray);
            }
            
            let regexClasses = /^class\s+\b(.*?)\b\s+(\:\s+public\s+\b(.*?)\b\s+){0,1}.*/gm;
            let matches = file.match(regexClasses) || [];
            for (let match of matches) {
                let startLine = fileArray.indexOf(match);
                let line = startLine;
                let scopeArray = [];
                if (startLine == -1) continue;
                while (true) {
                    if (fileArray[line] != undefined && fileArray[line].match(/^\}\;/gm)) {
                        break;
                    }

                    scopeArray.push(fileArray[line]);
                    line += 1;
                }
                
                processClasses(scopeArray);
            }

        } catch (err) {
            console.log("doc.h read error: " + err);
            console.log(err.stack);
            console.log("Using build-in completions for maniascript!");
            completions = doch;
            return completions;

        }
        console.log("Using file: " + fileName + " for maniascript completions!");
        return completions;
    }
}

function processNamespace(data) {
    let regexNamespaces = /namespace\s+(.*?)\s*\{/g;
    regexNamespaces.lastIndex = -1;
    let name = regexNamespaces.exec(data[0]);
    let namespaceObj = {
        enums: parseEnums(data) || {},
        methods: parseMethods(data) || []
    };
    completions.namespaces[name[1]] = namespaceObj;
}

function processClasses(data) {
    let regex = /class\s+\b(.*?)\b\s+(\:\s+public\s+\b(.*?)\b\s+){0,1}/g
    regex.lastIndex = -1;
    let value = regex.exec(data[0]) || {};
    let classObj = {
        inherit: value[3] || "",
        enums: parseEnums(data) || {},
        props: parseProperties(data) || {},
        methods: parseMethods(data) || []
    }

    completions.classes[value[1]] = classObj;
}

function parseEnums(data) {
    let out = {};
    let stringData = data.join("\n");
    let regex = /[\t\v ]*enum\s+\b(\w+?)\b.*/g;
    regex.lastIndex = -1;
    let lines2 = stringData.match(regex);
    if (lines2) {
        for (let enumLine of lines2) {
            regex.lastIndex = -1;
            let enumval = regex.exec(enumLine);
            let line = data.indexOf(enumLine) + 1;
            if (line != 0) {
                let enumValues = [];
                while (!data[line].match(/\s*\}\;/g)) {
                    enumValues.push(data[line].trim().replace(",",""));
                    line += 1;
                }
                out[enumval[1]] = enumValues;
            }
        }
    }
    return out;
}

function fixArrays(value) {
    let result = /Array\<(.*?)\>/g.exec(value);
    if (result) {
        return result[1]+"[]";
    }
    return value;
}

function parseMethods(data) {
    let out = [];
    let regex = /\s*\b(.+?)\b\s+(.*(?=\()).*/g;
    regex.lastIndex = -1;
    for (line of data) {
        regex.lastIndex = -1;
        let value = regex.exec(line);
        if (value) {
            let methodParams = [];
            let getTypes = value.input.match(/\((.*)\)/);
            for (let type of getTypes[1].split(",")) {
                if (type != "") {
                    let param = type.trim().split(" ");
                    methodParams.push({
                        identifier: fixArrays(param[0]),
                        argument: param[1]
                    });
                }
            }
            out.push(
                {
                    name: value[2],
                    returns: fixArrays(value[1]),
                    params: methodParams
                });
        }
    }

    return out;
}

function parseProperties(data) {
    let out = {};
    let regex = /\s*(const\s*){0,1}([\w\[\]\<\>]+?)\s+\b(\w+)\b;/g
    regex.lastIndex = -1;
    for (line of data) {
        regex.lastIndex = -1;
        let value = regex.exec(line);
        if (value) {
            if (!out.hasOwnProperty(fixArrays(value[2]))) {
                out[fixArrays(value[2])] = [];
            }
            out[fixArrays(value[2])].push(value[3]);
        }
    }

    return out;

}

module.exports = {
    parseFile,
    completions,
    getCompletions
};
