import { TestScheduler } from "rxjs/testing";

import { busy, idle } from "@cloudextend/contrib/workflows";
import { RxEvent } from "@cloudextend/contrib/events";
import { WorkflowContext, WorkflowStep } from "@cloudextend/contrib/workflows";

export class WorkflowStepExpectations<
    T extends WorkflowContext = WorkflowContext
> {
    constructor(
        private readonly step: WorkflowStep<T>,
        private readonly context?: Partial<T>,
        private readonly dependencies: any[] = []
    ) {}

    private readonly testScheduler = new TestScheduler((actual, expected) =>
        expect(actual).toEqual(expected)
    );

    public toCompleteAnd(
        assertions: (returnedEvents: RxEvent[]) => void,
        done: jest.DoneCallback
    ) {
        const testContext: T =
            (this.context as T) || ({ workflowName: "UT" } as T);

        const emittedEvents: RxEvent[] = [];
        this.step.activate(testContext, ...this.dependencies).subscribe({
            next: event => emittedEvents.push(event),
            error: done,
            complete: () => {
                try {
                    assertions(emittedEvents);
                    done();
                } catch (e) {
                    done(e as unknown as string | { message: string });
                }
            },
        });
    }

    public toAwait(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const testContext =
                (this.context as T) ?? ({ workflowName: "UT" } as T);

            this.step.activate(testContext, ...this.dependencies).subscribe({
                complete: resolve,
                error: reject,
            });
        });
    }

    public toAwaitAndReturn(...events: RxEvent[]) {
        const actualEvents = [
            expect.objectContaining({
                verb: busy.verb,
            }),
            ...events,
            expect.objectContaining({
                verb: idle.verb,
            }),
        ];
        this.testEventSequence(actualEvents);
    }

    public toReturn(...events: RxEvent[]) {
        this.testEventSequence(events);
    }

    public toReturnMatching(
        assertions: (events: RxEvent[]) => void
    ): Promise<void> {
        const testContext =
            (this.context as T) ?? ({ workflowName: "UT" } as T);

        const emittedEvents: RxEvent[] = [];

        return new Promise((resolve, reject) =>
            this.step.activate(testContext, ...this.dependencies).subscribe({
                next: event => emittedEvents.push(event),
                error: err => reject(err),
                complete: () => {
                    try {
                        assertions(emittedEvents);
                        resolve();
                    } catch (e) {
                        reject(e as unknown as string | { message: string });
                    }
                },
            })
        );
    }

    public toReturnAnEventMatching(
        assertions: (event: RxEvent) => void
    ): Promise<void> {
        return this.toReturnMatching(emittedEvents => {
            expect(emittedEvents).toHaveLength(1);
            assertions(emittedEvents[0]);
        });
    }

    private testEventSequence(eventsOrPatterns: unknown[]) {
        const expectedEvents: Record<string, unknown> = {};

        const charCodeOfA = "a".charCodeAt(0);
        let theMarbles = "";

        eventsOrPatterns.forEach((e, i) => {
            const marble = String.fromCharCode(charCodeOfA + i);
            theMarbles += marble;
            expectedEvents[marble] = e;
        });

        const expectedMarbles = `(${theMarbles}|)`;

        const testContext =
            (this.context as T) ?? ({ workflowName: "UT" } as T);

        this.testScheduler.run(({ expectObservable }) => {
            expectObservable(
                this.step.activate(testContext, ...this.dependencies)
            ).toBe(expectedMarbles, expectedEvents);
        });
    }
}
