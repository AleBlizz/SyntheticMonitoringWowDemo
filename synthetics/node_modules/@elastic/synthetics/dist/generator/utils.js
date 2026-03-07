"use strict";
/**
 * MIT License
 *
 * Copyright (c) 2020-present, Elastic NV
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudIDToKibanaURL = exports.replaceTemplates = exports.runCommand = exports.getPackageManager = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
async function getPackageManager(dir) {
    if ((0, fs_1.existsSync)((0, path_1.join)(dir, 'yarn.lock'))) {
        return 'yarn';
    }
    return 'npm';
}
exports.getPackageManager = getPackageManager;
function runCommand(pkgManager, command) {
    if (pkgManager === 'yarn') {
        return `yarn ${command}`;
    }
    return `npm run ${command}`;
}
exports.runCommand = runCommand;
function replaceTemplates(input, values) {
    for (const key in values) {
        const finalValue = values[key];
        input = input.replace(new RegExp(`'{{` + key + `}}'`, 'g'), () => {
            if (Array.isArray(finalValue)) {
                return String(finalValue)
                    .split(',')
                    .filter(Boolean)
                    .map(f => `'${f}'`);
            }
            if (typeof finalValue == 'number') {
                return Number(finalValue);
            }
            if (typeof finalValue == 'string') {
                return `'${finalValue}'`;
            }
            return finalValue;
        });
    }
    return input;
}
exports.replaceTemplates = replaceTemplates;
function cloudIDToKibanaURL(id) {
    const ID_SEPARATOR = ':';
    const VALUE_SEPARATOR = '$';
    // Ignore values before the separator
    const index = id.lastIndexOf(ID_SEPARATOR);
    if (index >= 0) {
        id = id.substring(index + 1);
    }
    // Decode the base64 string
    const decoded = Buffer.from(id, 'base64').toString();
    const words = decoded.split(VALUE_SEPARATOR);
    // construct the kibana and ES urls from decoded value
    const [host, port = '443'] = words[0].split(ID_SEPARATOR);
    const [kibanaId, kibanaPort = port] = words[2].split(ID_SEPARATOR);
    const kibanaURL = `https://${kibanaId}.${host}:${kibanaPort}`;
    return kibanaURL;
}
exports.cloudIDToKibanaURL = cloudIDToKibanaURL;
//# sourceMappingURL=utils.js.map