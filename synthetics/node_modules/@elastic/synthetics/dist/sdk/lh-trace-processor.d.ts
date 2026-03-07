declare class TraceProcessor {
    static get TIMESPAN_MARKER_ID(): string;
    /**
     * @return {Error}
     */
    static createNoNavstartError(): Error;
    /**
     * @return {Error}
     */
    static createNoResourceSendRequestError(): Error;
    /**
     * @return {Error}
     */
    static createNoTracingStartedError(): Error;
    /**
     * @return {Error}
     */
    static createNoFirstContentfulPaintError(): Error;
    /**
     * @return {Error}
     */
    static createNoLighthouseMarkerError(): Error;
    /**
     * Returns true if the event is a navigation start event of a document whose URL seems valid.
     *
     * @param {LH.TraceEvent} event
     */
    static _isNavigationStartOfInterest(event: any): boolean;
    /**
     * This method sorts a group of trace events that have the same timestamp. We want to...
     *
     * 1. Put E events first, we finish off our existing events before we start new ones.
     * 2. Order B/X events by their duration, we want parents to start before child events.
     * 3. If we don't have any of this to go on, just use the position in the original array (stable sort).
     *
     * Note that the typical group size with the same timestamp will be quite small (<10 or so events),
     * and the number of groups typically ~1% of total trace, so the same ultra-performance-sensitive consideration
     * given to functions that run on entire traces does not necessarily apply here.
     *
     * @param {number[]} tsGroupIndices
     * @param {number[]} timestampSortedIndices
     * @param {number} indexOfTsGroupIndicesStart
     * @param {LH.TraceEvent[]} traceEvents
     * @return {number[]}
     */
    static _sortTimestampEventGroup(tsGroupIndices: any, timestampSortedIndices: any, indexOfTsGroupIndicesStart: any, traceEvents: any): any[];
    /**
     * Sorts and filters trace events by timestamp and respecting the nesting structure inherent to
     * parent/child event relationships.
     *
     * @param {LH.TraceEvent[]} traceEvents
     * @param {(e: LH.TraceEvent) => boolean} filter
     */
    static filteredTraceSort(traceEvents: any, filter: any): any[];
    /**
     * There should *always* be at least one top level event, having 0 typically means something is
     * drastically wrong with the trace and we should just give up early and loudly.
     *
     * @param {LH.TraceEvent[]} events
     */
    static assertHasToplevelEvents(events: any): void;
    /**
     * Calculate duration at specified percentiles for given population of
     * durations.
     * If one of the durations overlaps the end of the window, the full
     * duration should be in the duration array, but the length not included
     * within the window should be given as `clippedLength`. For instance, if a
     * 50ms duration occurs 10ms before the end of the window, `50` should be in
     * the `durations` array, and `clippedLength` should be set to 40.
     * @see https://docs.google.com/document/d/1b9slyaB9yho91YTOkAQfpCdULFkZM9LqsipcX3t7He8/preview
     * @param {!Array<number>} durations Array of durations, sorted in ascending order.
     * @param {number} totalTime Total time (in ms) of interval containing durations.
     * @param {!Array<number>} percentiles Array of percentiles of interest, in ascending order.
     * @param {number=} clippedLength Optional length clipped from a duration overlapping end of window. Default of 0.
     * @return {!Array<{percentile: number, time: number}>}
     * @private
     */
    static _riskPercentiles(durations: any, totalTime: any, percentiles: any, clippedLength?: number): any[];
    /**
     * Calculates the maximum queueing time (in ms) of high priority tasks for
     * selected percentiles within a window of the main thread.
     * @see https://docs.google.com/document/d/1b9slyaB9yho91YTOkAQfpCdULFkZM9LqsipcX3t7He8/preview
     * @param {Array<ToplevelEvent>} events
     * @param {number} startTime Start time (in ms relative to timeOrigin) of range of interest.
     * @param {number} endTime End time (in ms relative to timeOrigin) of range of interest.
     * @param {!Array<number>=} percentiles Optional array of percentiles to compute. Defaults to [0.5, 0.75, 0.9, 0.99, 1].
     * @return {!Array<{percentile: number, time: number}>}
     */
    static getRiskToResponsiveness(events: any, startTime: any, endTime: any, percentiles?: number[]): any[];
    /**
     * Provides durations in ms of all main thread top-level events
     * @param {Array<ToplevelEvent>} topLevelEvents
     * @param {number} startTime Optional start time (in ms relative to timeOrigin) of range of interest. Defaults to 0.
     * @param {number} endTime Optional end time (in ms relative to timeOrigin) of range of interest. Defaults to trace end.
     * @return {{durations: Array<number>, clippedLength: number}}
     */
    static getMainThreadTopLevelEventDurations(topLevelEvents: any, startTime?: number, endTime?: number): {
        durations: any[];
        clippedLength: number;
    };
    /**
     * Provides the top level events on the main thread with timestamps in ms relative to timeOrigin.
     * start.
     * @param {LH.Artifacts.ProcessedTrace} trace
     * @param {number=} startTime Optional start time (in ms relative to timeOrigin) of range of interest. Defaults to 0.
     * @param {number=} endTime Optional end time (in ms relative to timeOrigin) of range of interest. Defaults to trace end.
     * @return {Array<ToplevelEvent>}
     */
    static getMainThreadTopLevelEvents(trace: any, startTime?: number, endTime?: number): any[];
    /**
     * @param {LH.TraceEvent[]} events
     * @return {{pid: number, tid: number, frameId: string}}
     */
    static findMainFrameIds(events: any): {
        pid: any;
        tid: any;
        frameId: any;
    };
    /**
     * @param {LH.TraceEvent} evt
     * @return {boolean}
     */
    static isScheduleableTask(evt: any): boolean;
    /**
     * @param {LH.TraceEvent} evt
     * @return {evt is LCPEvent}
     */
    static isLCPEvent(evt: any): boolean;
    /**
     * @param {LH.TraceEvent} evt
     * @return {evt is LCPCandidateEvent}
     */
    static isLCPCandidateEvent(evt: any): boolean;
    /**
     * Returns the maximum LCP event across all frames in `events`.
     * Sets `invalidated` flag if LCP of every frame is invalidated.
     *
     * LCP's trace event was first introduced in m78. We can't surface an LCP for older Chrome versions.
     * LCP comes from a frame's latest `largestContentfulPaint::Candidate`, but it can be invalidated by a `largestContentfulPaint::Invalidate` event.
     *
     * @param {LH.TraceEvent[]} events
     * @param {LH.TraceEvent} timeOriginEvent
     * @return {{lcp: LCPEvent | undefined, invalidated: boolean}}
     */
    static computeValidLCPAllFrames(events: any, timeOriginEvent: any): {
        lcp: any;
        invalidated: boolean;
    };
    /**
     * @param {Array<{id: string, url: string, parent?: string}>} frames
     * @return {Map<string, string>}
     */
    static resolveRootFrames(frames: any): Map<any, any>;
    /**
     * Finds key trace events, identifies main process/thread, and returns timings of trace events
     * in milliseconds since the time origin in addition to the standard microsecond monotonic timestamps.
     * @param {LH.Trace} trace
     * @param {{timeOriginDeterminationMethod?: TimeOriginDeterminationMethod}} [options]
     * @return {LH.Artifacts.ProcessedTrace}
     */
    static processTrace(trace: any, options: any): {
        frames: {
            id: any;
            url: any;
            parent: any;
        }[];
        mainThreadEvents: any[];
        frameEvents: any[];
        frameTreeEvents: any[];
        processEvents: any[];
        mainFrameIds: {
            pid: any;
            tid: any;
            frameId: any;
        };
        timeOriginEvt: any;
        timings: {
            timeOrigin: number;
            traceEnd: number;
        };
        timestamps: {
            timeOrigin: any;
            traceEnd: number;
        };
    };
    /**
     * Finds key navigation trace events and computes timings of events in milliseconds since the time
     * origin in addition to the standard microsecond monotonic timestamps.
     * @param {LH.Artifacts.ProcessedTrace} processedTrace
     * @return {LH.Artifacts.ProcessedNavigation}
     */
    static processNavigation(processedTrace: any): {
        timings: {
            timeOrigin: any;
            firstPaint: number;
            firstContentfulPaint: number;
            firstContentfulPaintAllFrames: number;
            firstMeaningfulPaint: number;
            largestContentfulPaint: number;
            largestContentfulPaintAllFrames: number;
            load: number;
            domContentLoaded: number;
            traceEnd: any;
        };
        timestamps: {
            timeOrigin: any;
            firstPaint: any;
            firstContentfulPaint: any;
            firstContentfulPaintAllFrames: any;
            firstMeaningfulPaint: any;
            largestContentfulPaint: any;
            largestContentfulPaintAllFrames: any;
            load: any;
            domContentLoaded: any;
            traceEnd: any;
        };
        firstPaintEvt: any;
        firstContentfulPaintEvt: any;
        firstContentfulPaintAllFramesEvt: any;
        firstMeaningfulPaintEvt: any;
        largestContentfulPaintEvt: any;
        largestContentfulPaintAllFramesEvt: any;
        loadEvt: any;
        domContentLoadedEvt: any;
        fmpFellBack: boolean;
        lcpInvalidated: boolean;
    };
    /**
     * Computes the last observable timestamp in a set of trace events.
     *
     * @param {Array<LH.TraceEvent>} events
     * @param {LH.TraceEvent} timeOriginEvt
     * @return {{timing: number, timestamp: number}}
     */
    static computeTraceEnd(events: any, timeOriginEvt: any): {
        timestamp: number;
        timing: number;
    };
    /**
     * Computes the time origin using the specified method.
     *
     *    - firstResourceSendRequest
     *      Uses the time that the very first network request is sent in the main frame.
     *      Eventually should be used in place of lastNavigationStart as the default for navigations.
     *      This method includes the cost of all redirects when evaluating a navigation (which matches lantern behavior).
     *      The only difference between firstResourceSendRequest and the first `navigationStart` is
     *      the unload time of `about:blank` (which is a Lighthouse implementation detail and shouldn't be included).
     *
     *    - lastNavigationStart
     *      Uses the time of the last `navigationStart` event in the main frame.
     *      The historical time origin of Lighthouse from 2016-Present.
     *      This method excludes the cost of client-side redirects when evaluating a navigation.
     *      Can also be skewed by several hundred milliseconds or even seconds when the browser takes a long
     *      time to unload `about:blank`.
     *
     * @param {{keyEvents: Array<LH.TraceEvent>, frameEvents: Array<LH.TraceEvent>, mainFrameIds: {frameId: string}}} traceEventSubsets
     * @param {TimeOriginDeterminationMethod} method
     * @return {LH.TraceEvent}
     */
    static computeTimeOrigin(traceEventSubsets: any, method: any): any;
    /**
     * Computes timings of trace events of key trace events in milliseconds since the time origin
     * in addition to the standard microsecond monotonic timestamps.
     * @param {Array<LH.TraceEvent>} frameEvents
     * @param {{timeOriginEvt: LH.TraceEvent}} options
     */
    static computeNavigationTimingsForFrame(frameEvents: any, options: any): {
        timings: {
            timeOrigin: number;
            firstPaint: number;
            firstContentfulPaint: number;
            firstMeaningfulPaint: number;
            largestContentfulPaint: number;
            load: number;
            domContentLoaded: number;
        };
        timestamps: {
            timeOrigin: any;
            firstPaint: any;
            firstContentfulPaint: any;
            firstMeaningfulPaint: any;
            largestContentfulPaint: any;
            load: any;
            domContentLoaded: any;
        };
        timeOriginEvt: any;
        firstPaintEvt: any;
        firstContentfulPaintEvt: any;
        firstMeaningfulPaintEvt: any;
        largestContentfulPaintEvt: any;
        loadEvt: any;
        domContentLoadedEvt: any;
        fmpFellBack: boolean;
        lcpInvalidated: boolean;
    };
}
export default TraceProcessor;
/**
 * @typedef ToplevelEvent
 * @prop {number} start
 * @prop {number} end
 * @prop {number} duration
 */
//# sourceMappingURL=lh-trace-processor.d.ts.map