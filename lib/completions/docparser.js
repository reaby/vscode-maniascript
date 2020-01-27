let fs = require('fs');
let doch = require('./doch');

let completions = {
    primitives: [],
    namespaces: {},
    classes: {
        Vec2: {
            inherit: null,
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
            inherit: null,
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
            inherit: null,
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

function parseFile(fileName) {
    //reset
    if (fileName == null) {
        completions = doch;
        return completions;
    }
    completions = {
        primitives: [],
        namespaces: {},
        classes: {
            Vec2: {
                inherit: null,
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
                inherit: null,
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
                inherit: null,
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

    let file = fs.readFileSync(fileName).toString();
    let fileArray = file.split("\n");

    try {
        let regexPrimitives = /class\s*(?<name>.*?)\s*\{\}\;/g;
        for (let line of file.match(regexPrimitives) || []) {
            regexPrimitives.lastIndex = -1;
            let primitive = regexPrimitives.exec(line);
            if (primitive) {
                completions.primitives.push(primitive.groups.name);
            }
        }

        let regexNamespaces = /namespace\s+(.*?)\s*\{/g;
        for (match of file.match(regexNamespaces) || []) {
            let startLine = fileArray.indexOf(match);
            let line = startLine;
            let scopeArray = [];
            while (!fileArray[line].match(/^\}\;/gm)) {
                scopeArray.push(fileArray[line]);
                line += 1;

            }
            processNamespace(scopeArray);
        }

        let regexClasses = /struct\s+(.*?)\s+(.*?)\{/g;
        let matches = file.match(regexClasses) || [];
        for (match of matches) {
            let startLine = fileArray.indexOf(match);
            let line = startLine;
            let scopeArray = [];
            while (!fileArray[line].match(/^\}\;/gm)) {
                scopeArray.push(fileArray[line]);
                line += 1;

            }
            processClasses(scopeArray);
        }
    } catch (err) {
        console.log(err);
        completions = doch;
    }

    return completions;
}

function processNamespace(data) {
    let regexNamespaces = /namespace\s+(.*?)\s*\{/g;
    regexNamespaces.lastIndex = -1;
    let name = regexNamespaces.exec(data[0]);
    let namespaceObj = {
        enums: parseEnums(data),
        methods: parseMethods(data) || []
    };
    completions.namespaces[name[1]] = namespaceObj;
}

function processClasses(data) {
    let regex = /struct\s+\b(.*?)\b\s+(\:\s+public\s+\b(.*?)\b\s+){0,1}/gm
    regex.lastIndex = -1;
    let value = regex.exec(data[0]);
    let classObj = {
        inherit: value[3] || null,
        enums: parseEnums(data),
        props: parseProperties(data) || {},
        methods: parseMethods(data) || []
    }

    completions.classes[value[1]] = classObj;
}

function parseEnums(data) {
    let out = {};
    let stringData = data.join("\n");
    let regex = /\s*enum\s+\b(.+?)\b.*/g;
    regex.lastIndex = -1;
    let lines2 = stringData.match(regex);
    if (lines2) {
        for (let enumLine of lines2) {
            regex.lastIndex = -1;
            let enumval = regex.exec(enumLine);
            let line = data.indexOf(enumLine.replace("\n", "")) + 1;
            if (line != 0) {
                let enumValues = [];
                while (!data[line].match(/\s*\}\;/g)) {
                    enumValues.push(data[line].trim());
                    line += 1;
                }
                out[enumval[1]] = enumValues;
            }
        }
    }
    return out;
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
                    let param = type.split(" ");
                    methodParams.push({
                        identifier: param[0],
                        name: param[1]
                    });
                }
            }
            out.push(
                {
                    name: value[2],
                    returns: value[1],
                    params: methodParams
                });
        }
    }

    return out;
}

function parseProperties(data) {
    let out = {};
    let regex = /\s*(const\s*){0,1}(.+?)\s+\b(.+?)\b;/g
    regex.lastIndex = -1;
    for (line of data) {
        regex.lastIndex = -1;
        let value = regex.exec(line);
        if (value) {
            if (!out.hasOwnProperty(value[2])) {
                out[value[2]] = [];
            }
            out[value[2]].push(value[3]);
        }
    }

    return out;

}

module.exports = {
    parseFile,
    completions
};
