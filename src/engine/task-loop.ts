/**
 * Autonomous Task Loop Engine
 *
 * Implements self-prompting task execution where the model can
 * break down a goal into steps, execute them sequentially, and
 * self-correct on failures. Uses Web Locks API to prevent the
 * browser from killing the process during long-running tasks.
 */

import type { Task, TaskStep, TaskStatus } from '../types';
import { saveTask, deleteTask } from '../storage/opfs-store';
import { inferenceEngine } from './inference-engine';
import { constitutionEngine } from './constitution';

export type TaskEventCallback = (task: Task) => void;

const PLANNER_PROMPT = `You are a task planner. Given a goal, break it down into concrete, sequential steps.
Respond ONLY with a JSON array of step descriptions. Example:
["Step 1 description", "Step 2 description", "Step 3 description"]
Do not include any other text.`;

const EXECUTOR_PROMPT = `You are executing step {step} of a multi-step task.
Task: {task}
Current step: {description}
Previous results: {previousResults}

Execute this step and provide your result. Be specific and actionable.`;

export class TaskLoopEngine {
  private tasks: Map<string, Task> = new Map();
  private running = false;
  private onUpdate: TaskEventCallback | null = null;

  setUpdateCallback(cb: TaskEventCallback) {
    this.onUpdate = cb;
  }

  private emit(task: Task) {
    this.onUpdate?.(task);
  }

  async createTask(title: string): Promise<Task> {
    const task: Task = {
      id: crypto.randomUUID(),
      title,
      steps: [],
      status: 'pending',
      createdAt: Date.now(),
    };

    this.tasks.set(task.id, task);
    await saveTask(task);
    this.emit(task);
    return task;
  }

  /**
   * Use the model to plan steps for a task.
   */
  async planTask(taskId: string): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    if (!inferenceEngine.isReady()) {
      throw new Error('Model not loaded — cannot plan task');
    }

    const response = await inferenceEngine.chat(
      [
        { id: '0', role: 'system', content: PLANNER_PROMPT, timestamp: Date.now() },
        { id: '1', role: 'user', content: task.title, timestamp: Date.now() },
      ],
      null,
      { temperature: 0.3, maxTokens: 1024, stream: false },
    );

    // Parse JSON array of step descriptions
    try {
      const match = response.match(/\[[\s\S]*\]/);
      const descriptions: string[] = match ? JSON.parse(match[0]) : [response];

      task.steps = descriptions.map((desc) => ({
        id: crypto.randomUUID(),
        description: desc,
        status: 'pending' as TaskStatus,
      }));
    } catch {
      // If model output isn't valid JSON, treat the whole response as one step
      task.steps = [
        {
          id: crypto.randomUUID(),
          description: response.trim(),
          status: 'pending',
        },
      ];
    }

    await saveTask(task);
    this.emit(task);
    return task;
  }

  /**
   * Execute a task's steps sequentially with self-prompting.
   * Uses Web Locks API to prevent browser suspension.
   */
  async executeTask(taskId: string): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (!inferenceEngine.isReady()) throw new Error('Model not loaded');

    this.running = true;
    task.status = 'running';
    this.emit(task);

    const lockName = `omniframe-task-${taskId}`;
    const previousResults: string[] = [];

    // Web Locks API prevents the browser from suspending this work
    await navigator.locks.request(lockName, async () => {
      for (const step of task.steps) {
        if (!this.running) {
          step.status = 'pending';
          break;
        }

        step.status = 'running';
        this.emit(task);

        try {
          const prompt = EXECUTOR_PROMPT
            .replace('{step}', String(task.steps.indexOf(step) + 1))
            .replace('{task}', task.title)
            .replace('{description}', step.description)
            .replace(
              '{previousResults}',
              previousResults.length > 0
                ? previousResults.map((r, i) => `Step ${i + 1}: ${r}`).join('\n')
                : 'None',
            );

          const constitutionPrompt = constitutionEngine.compile();

          const result = await inferenceEngine.chat(
            [{ id: step.id, role: 'user', content: prompt, timestamp: Date.now() }],
            constitutionPrompt,
            { temperature: 0.5, maxTokens: 1024, stream: false },
          );

          step.result = result;
          step.status = 'completed';
          previousResults.push(result);
        } catch (err) {
          step.status = 'failed';
          step.error = err instanceof Error ? err.message : String(err);
          task.status = 'failed';
          await saveTask(task);
          this.emit(task);
          this.running = false;
          return task;
        }

        await saveTask(task);
        this.emit(task);
      }
    });

    task.status = task.steps.every((s) => s.status === 'completed')
      ? 'completed'
      : 'failed';
    task.completedAt = Date.now();
    this.running = false;
    await saveTask(task);
    this.emit(task);
    return task;
  }

  stopExecution() {
    this.running = false;
  }

  async removeTask(taskId: string): Promise<void> {
    this.tasks.delete(taskId);
    await deleteTask(taskId);
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Add a manual step to a task.
   */
  addStep(taskId: string, description: string): TaskStep | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;

    const step: TaskStep = {
      id: crypto.randomUUID(),
      description,
      status: 'pending',
    };
    task.steps.push(step);
    saveTask(task);
    this.emit(task);
    return step;
  }
}

export const taskLoopEngine = new TaskLoopEngine();
