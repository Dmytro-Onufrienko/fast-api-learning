import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScenarioResult } from "@learn-fastapi/check-engine";

export type LessonStatus = "not-started" | "in-progress" | "passed";

export interface LessonProgress {
  status: LessonStatus;
  /** ISO timestamp of the most recent run. */
  lastRunAt?: string;
  passedChecks?: number;
  totalChecks?: number;
}

interface ProgressState {
  byLesson: Record<string, LessonProgress>;
  /** Called when a lesson page opens — moves "not-started" to "in-progress". */
  markOpened: (lessonId: string) => void;
  /** Progress is derived from the most recent run, never set by hand. */
  recordRun: (lessonId: string, result: ScenarioResult) => void;
  reset: (lessonId: string) => void;
  resetAll: () => void;
}

export const STATUS_LABEL: Record<LessonStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  passed: "Passed",
};

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      byLesson: {},

      markOpened: (lessonId) =>
        set((state) => {
          const existing = state.byLesson[lessonId];
          if (existing && existing.status !== "not-started") return state;
          return {
            byLesson: {
              ...state.byLesson,
              [lessonId]: { ...existing, status: "in-progress" },
            },
          };
        }),

      recordRun: (lessonId, result) =>
        set((state) => {
          const passedChecks = result.results.filter((r) => r.status === "pass").length;
          return {
            byLesson: {
              ...state.byLesson,
              [lessonId]: {
                status: result.passed ? "passed" : "in-progress",
                lastRunAt: new Date().toISOString(),
                passedChecks,
                totalChecks: result.results.length,
              },
            },
          };
        }),

      reset: (lessonId) =>
        set((state) => {
          const next = { ...state.byLesson };
          delete next[lessonId];
          return { byLesson: next };
        }),

      resetAll: () => set({ byLesson: {} }),
    }),
    { name: "learn-fastapi.progress" },
  ),
);

export function lessonStatus(byLesson: Record<string, LessonProgress>, lessonId: string): LessonStatus {
  return byLesson[lessonId]?.status ?? "not-started";
}
