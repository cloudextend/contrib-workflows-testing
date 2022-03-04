import { TestScheduler } from "rxjs/testing";

import { busy, idle } from "@cloudextend/contrib/workflows";
import { RxEvent } from "@cloudextend/contrib/events";
import { WorkflowContext, WorkflowStep } from "@cloudextend/contrib/workflows";

export class WorkflowStepExpectations<
    T extends WorkflowContext = WorkflowContext
> {
    constructor(
        private readonly step: WorkflowStep<T>,
        private readonly dependencies: any[] = []
    ) {}

    private readonly testScheduler = new TestScheduler((actual, expected) =>
        expect(actual).toEqual(expected)
    );

    public toCompleteAnd(
        assertions: (returnedEvents: RxEvent[]) => void,
        done: jest.DoneCallback,
        context?: T
    ) {
        const testContext = context ?? ({ workflowName: "UT" } as T);

        const emittedEvents: RxEvent[] = [];
        this.step.activate(testContext, ...this.dependencies).subscribe({
            next: event => emittedEvents.push(event),
            error: done.fail,
            complete: () => {
                try {
                    assertions(emittedEvents);
                    done();
                } catch (e) {
                    done.fail(e as unknown as string | { message: string });
                }
            },
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

    public toReturnAnEventAnd(
        assertions: (event: RxEvent) => void,
        done: jest.DoneCallback,
        context?: T
    ) {
        const testContext = context ?? ({ workflowName: "UT" } as T);

        const emittedEvents: RxEvent[] = [];
        this.step.activate(testContext, ...this.dependencies).subscribe({
            next: event => emittedEvents.push(event),
            error: done.fail,
            complete: () => {
                try {
                    expect(emittedEvents).toHaveLength(1);
                    assertions(emittedEvents[0]);
                    done();
                } catch (e) {
                    done.fail(e as unknown as string | { message: string });
                }
            },
        });
    }

    private testEventSequence(eventsOrPatterns: unknown[], context?: T) {
        const expectedEvents: Record<string, unknown> = {};

        const charCodeOfA = "a".charCodeAt(0);
        let theMarbles = "";

        eventsOrPatterns.forEach((e, i) => {
            const marble = String.fromCharCode(charCodeOfA + i);
            theMarbles += marble;
            expectedEvents[marble] = e;
        });

        const expectedMarbles = `(${theMarbles}|)`;

        const testContext = context ?? ({ workflowName: "UT" } as T);

        this.testScheduler.run(({ expectObservable }) => {
            expectObservable(
                this.step.activate(testContext, ...this.dependencies)
            ).toBe(expectedMarbles, expectedEvents);
        });
    }
}
