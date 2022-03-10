import {
    Workflow,
    WorkflowContext,
    WorkflowStep,
} from "@cloudextend/contrib/workflows";

import { WorkflowStepExpectations } from "./workflow-step-expectations";

export function expectWorkflowStep<T extends WorkflowContext = WorkflowContext>(
    step: WorkflowStep<T>
) {
    return new WorkflowStepExpectations(step);
}

function findStepByLabel<T extends WorkflowContext = WorkflowContext>(
    workflow: Workflow<T>,
    label: string
) {
    return workflow.steps[workflow.steps.findIndex(s => s.label === label)];
}

export interface WorkflowExpectations<
    T extends WorkflowContext = WorkflowContext
> {
    step(lableOrIndex: string | number): WorkflowStepExpectations<T>;
    step(
        labelOrIndex: string | number,
        context: Partial<T>
    ): WorkflowStepExpectations<T>;
    step(
        lableOrIndex: string | number,
        context: Partial<T>,
        dependencies: any[]
    ): WorkflowStepExpectations<T>;
    step(
        lableOrIndex: string | number,
        dependencies: any[]
    ): WorkflowStepExpectations<T>;
}

export function expectWorkflow<T extends WorkflowContext = WorkflowContext>(
    workflow: Workflow<T>
) {
    const step = (
        labelOrIndex: string | number,
        contextOrDependencies?: Partial<T> | any[],
        dependencies?: any[]
    ) => {
        let context: Partial<T> | undefined;
        let deps: any[] | undefined;

        if (Array.isArray(contextOrDependencies)) {
            context = undefined;
            deps = contextOrDependencies;
        } else {
            context = contextOrDependencies;
            deps = dependencies;
        }

        const wfStep =
            typeof labelOrIndex === "string"
                ? findStepByLabel(workflow, labelOrIndex)
                : workflow.steps[labelOrIndex];
        return new WorkflowStepExpectations(wfStep, context, deps);
    };

    return { step } as WorkflowExpectations<T>;
}
