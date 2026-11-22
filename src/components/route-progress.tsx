import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";

export type ProgressUpdate = { label: string; detail?: string; value?: number };

type TaskProgress = {
  update: (progress: ProgressUpdate) => void;
  finish: () => void;
};

type StartTask = (initial: ProgressUpdate) => TaskProgress;

type FinishState = "complete" | "dismissed";
type ActiveTask = {
  id: number;
  progress: ProgressUpdate;
  finishing?: FinishState;
};

const TaskProgressContext = createContext<StartTask | null>(null);
const SHOW_DELAY = 220;
const EXIT_DURATION = 200;
const COMPLETE_HOLD = 200;

export function useTaskProgress(): StartTask {
  const start = useContext(TaskProgressContext);
  if (!start) throw new Error("useTaskProgress requires TaskProgressProvider");
  return start;
}

export function TaskProgressProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<ActiveTask[]>([]);
  const nextId = useRef(0);
  const exitTimers = useRef(new Set<number>());
  const start = useCallback<StartTask>((progress) => {
    const id = ++nextId.current;
    let finished = false;
    let latestValue = progress.value;
    setTasks((current) => [...current, { id, progress }]);

    return {
      update(next) {
        if (finished) return;
        latestValue = next.value;
        setTasks((current) =>
          current.map((task) =>
            task.id === id ? { id, progress: next } : task,
          ),
        );
      },
      finish() {
        if (finished) return;
        finished = true;
        const complete = latestValue === 100;
        const finishing = complete ? "complete" : "dismissed";
        setTasks((current) =>
          current.map((task) =>
            task.id === id ? { ...task, finishing } : task,
          ),
        );
        const timer = window.setTimeout(
          () => {
            exitTimers.current.delete(timer);
            setTasks((current) => current.filter((task) => task.id !== id));
          },
          EXIT_DURATION + (complete ? COMPLETE_HOLD : 0),
        );
        exitTimers.current.add(timer);
      },
    };
  }, []);

  useEffect(() => {
    const timers = exitTimers.current;
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const task = tasks.filter((task) => !task.finishing).at(-1) ?? tasks.at(-1);
  return (
    <TaskProgressContext.Provider value={start}>
      {children}
      <ProgressViewport task={task} />
    </TaskProgressContext.Provider>
  );
}

function ProgressViewport({ task }: { task: ActiveTask | undefined }) {
  const navigationPending = useRouterState({
    select: (state) =>
      (state.isLoading || state.status === "pending") &&
      state.location.href !== state.resolvedLocation?.href,
  });
  if (task && !task.finishing)
    return <DelayedProgress key={task.id} task={task} />;
  if (navigationPending) return <NavigationSpinner />;
  return task ? <DelayedProgress key={task.id} task={task} /> : null;
}

function NavigationSpinner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <div
      className="lens-progress-position"
      role="status"
      aria-label="페이지 불러오는 중"
    >
      <span className="lens-navigation-spinner" aria-hidden="true" />
    </div>
  );
}

function DelayedProgress({ task }: { task: ActiveTask }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (task.finishing) return;
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY);
    return () => window.clearTimeout(timer);
  }, [task.finishing]);

  return (
    <>
      <span className="sr-only" role="status">
        {visible && task.finishing !== "dismissed" ? task.progress.label : ""}
      </span>
      {visible ? (
        <ProgressCard progress={task.progress} finishing={task.finishing} />
      ) : null}
    </>
  );
}

function ProgressCard({
  progress,
  finishing,
}: {
  progress: ProgressUpdate;
  finishing?: FinishState;
}) {
  const descriptionId = useId();
  const value =
    progress.value !== undefined && Number.isFinite(progress.value)
      ? Math.round(Math.min(100, Math.max(0, progress.value)))
      : undefined;

  return (
    <div
      className="lens-progress-position lens-task-progress-position"
      data-finishing={finishing}
      aria-hidden={finishing === "dismissed" ? true : undefined}
    >
      <div className="lens-progress-card">
        <div
          aria-describedby={progress.detail ? descriptionId : undefined}
          aria-label={progress.label}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={value}
          className="lens-progress-ring"
          role="progressbar"
        >
          <div
            aria-hidden="true"
            className={value === undefined ? "lens-progress-orbit" : undefined}
          >
            <svg viewBox="0 0 56 56" fill="none" focusable="false">
              <circle className="lens-progress-track" cx="28" cy="28" r="24" />
              <circle
                key={value === undefined ? "indeterminate" : "determinate"}
                className="lens-progress-arc"
                cx="28"
                cy="28"
                r="24"
                pathLength="100"
                strokeDasharray={value === undefined ? "32 68" : "100"}
                strokeDashoffset={value === undefined ? 0 : 100 - value}
                transform="rotate(-90 28 28)"
              />
            </svg>
          </div>
          {value !== undefined ? (
            <span aria-hidden="true" className="lens-progress-value">
              {value}%
            </span>
          ) : null}
        </div>
        <div className="lens-progress-copy">
          <p className="font-semibold">{progress.label}</p>
          {progress.detail ? (
            <p id={descriptionId} className="mt-0.5 text-sm text-muted">
              {progress.detail}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
