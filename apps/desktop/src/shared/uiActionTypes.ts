export type TaskActionRequestType = "create" | "launch-selected" | "run-checks-selected";
export type TerminalActionRequestType = "new-tab" | "next-tab" | "previous-tab" | "start-active";
export type QualityActionRequestType = "run-all";

export interface UiActionRequest<T extends string> {
  id: string;
  type: T;
}
