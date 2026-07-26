import { BaseCustomWebComponentConstructorAppend } from '../../dist/BaseCustomWebComponent.js';
export declare class SampleCounter extends BaseCustomWebComponentConstructorAppend {
    static template: HTMLTemplateElement;
    static style: CSSStyleSheet;
    count: number;
    label: string;
    constructor();
    ready(): void;
    increment(): void;
    decrement(): void;
    reset(): void;
}
type SampleTask = {
    label: string;
};
export declare class SampleBindingPlayground extends BaseCustomWebComponentConstructorAppend {
    static template: HTMLTemplateElement;
    static style: CSSStyleSheet;
    userName: string;
    tasks: SampleTask[];
    richMessage: string;
    showDetails: boolean;
    nextTask: number;
    constructor();
    ready(): void;
    updateName(event: Event): void;
    addTask(): void;
    toggleDetails(): void;
}
export {};
