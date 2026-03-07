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
exports.Tracing = void 0;
const logger_1 = require("../core/logger");
const trace_metrics_1 = require("../sdk/trace-metrics");
const trace_processor_1 = require("../sdk/trace-processor");
/**
 * Custom Tracer that listenes for events from specified categories
 * https://chromedevtools.github.io/devtools-protocol/tot/Tracing/
 */
class Tracing {
    driver;
    options;
    constructor(driver, options) {
        this.driver = driver;
        this.options = options;
    }
    async start() {
        (0, logger_1.log)(`Plugins: started collecting trace events`);
        const includedCategories = [
            // exclude all default categories
            '-*',
        ];
        if (this.options.filmstrips) {
            // capture screenshots - up to 450 max for each trace (https://goo.gl/rBfhn4)
            includedCategories.push('disabled-by-default-devtools.screenshot');
        }
        if (this.options.trace) {
            includedCategories.push(
            // Used instead of 'toplevel' in Chrome 71+
            'disabled-by-default-lighthouse', 
            // Cumulative Layout Shift metric
            'loading', 
            // UserTiming marks/measures
            'blink.user_timing', 
            // Most of the events we need are from these two categories
            // Includes FCP, LCP, Main thread frames, process, etc.
            'devtools.timeline', 'disabled-by-default-devtools.timeline');
        }
        await this.driver.client.send('Tracing.start', {
            /**
             * Using `ReportEvents` makes gathering trace events
             * much faster as opposed to using `ReturnAsStream` mode
             */
            transferMode: 'ReportEvents',
            categories: includedCategories.join(','),
            options: 'sampling-frequency=10000', // 1000 is default
        });
    }
    async stop() {
        const events = [];
        const collectListener = payload => events.push(...payload.value);
        const { client } = this.driver;
        client.on('Tracing.dataCollected', collectListener);
        const [traceEvents] = await Promise.all([
            new Promise(resolve => client.once('Tracing.tracingComplete', () => {
                client.off('Tracing.dataCollected', collectListener);
                resolve(events);
            })),
            client.send('Tracing.end'),
        ]);
        const output = {};
        if (this.options.filmstrips) {
            output.filmstrips = trace_metrics_1.Filmstrips.compute(traceEvents);
        }
        if (this.options.trace) {
            Object.assign(output, {
                ...trace_processor_1.TraceProcessor.computeTrace(traceEvents),
            });
        }
        (0, logger_1.log)(`Plugins: stopped collecting trace events`);
        return output;
    }
}
exports.Tracing = Tracing;
//# sourceMappingURL=tracing.js.map