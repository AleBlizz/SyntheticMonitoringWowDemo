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
exports.PluginManager = void 0;
const _1 = require("./");
class PluginManager {
    driver;
    plugins = new Map();
    PLUGIN_TYPES = [
        'network',
        'trace',
        'performance',
        'browserconsole',
    ];
    constructor(driver) {
        this.driver = driver;
    }
    register(type, options) {
        let instance;
        switch (type) {
            case 'network':
                instance = new _1.NetworkManager(this.driver);
                break;
            case 'trace':
                instance = new _1.Tracing(this.driver, options);
                break;
            case 'performance':
                instance = new _1.PerformanceManager(this.driver);
                break;
            case 'browserconsole':
                instance = new _1.BrowserConsole(this.driver);
                break;
        }
        instance && this.plugins.set(type, instance);
        return instance;
    }
    registerAll(options) {
        for (const type of this.PLUGIN_TYPES) {
            this.register(type, options);
        }
    }
    unregisterAll() {
        for (const type of this.PLUGIN_TYPES) {
            this.plugins.delete(type);
        }
    }
    async stop(type) {
        const instance = this.plugins.get(type);
        if (instance) {
            return await instance.stop();
        }
        return {};
    }
    async start(type) {
        const instance = this.plugins.get(type);
        instance && (await instance.start());
        return instance;
    }
    get(type) {
        return this.plugins.get(type);
    }
    onStep(step) {
        this.get('browserconsole')._currentStep = step;
        this.get('network')._currentStep = step;
    }
    async output() {
        const data = {};
        for (const [, plugin] of this.plugins) {
            if (plugin instanceof _1.NetworkManager) {
                data.networkinfo = await plugin.stop();
            }
            else if (plugin instanceof _1.BrowserConsole) {
                data.browserconsole = plugin.stop();
            }
        }
        return data;
    }
}
exports.PluginManager = PluginManager;
//# sourceMappingURL=plugin-manager.js.map