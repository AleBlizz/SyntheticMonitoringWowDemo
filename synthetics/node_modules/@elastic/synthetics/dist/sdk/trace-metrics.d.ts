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
import { Filmstrip, TraceOutput } from '../common_types';
import type { LHProcessedNavigation, LHProcessedTrace, TraceEvent } from './trace-processor';
export declare class UserTimings {
    static compute(trace: LHProcessedTrace): TraceOutput[];
}
export declare class ExperienceMetrics {
    static buildMetric(name: string, timestamp?: number): {
        name: string;
        type: string;
        start: {
            us: number;
        };
    };
    static compute(trace: LHProcessedNavigation): {
        metrics: {};
        traces: TraceOutput[];
    };
}
export declare class CumulativeLayoutShift {
    static getLayoutShiftEvents(traceEvents: Array<TraceEvent>): any[];
    /**
     * Calculate cumulative layout shift per sesion window where each session
     * windows lasts for 5 seconds since the last layoutShift event and has 1 second
     * gap between them. Return the maximum score between all windows.
     * More details - https://web.dev/evolving-cls/
     */
    static calculateScore(layoutShiftEvents: any): number;
    static compute(trace: LHProcessedTrace): {
        cls: number;
        traces: TraceOutput[];
    };
}
export declare class Filmstrips {
    static filterExcesssiveScreenshots(events: Array<TraceEvent>): TraceEvent[];
    static compute(traceEvents: Array<TraceEvent>): Array<Filmstrip>;
}
//# sourceMappingURL=trace-metrics.d.ts.map