import { useState, useEffect, useCallback } from 'react';
import type { Task } from '../../types';
import { taskLoopEngine } from '../../engine';
import { inferenceEngine } from '../../engine';

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const refresh = useCallback(() => {
    setTasks([...taskLoopEngine.getAllTasks()]);
  }, []);

  useEffect(() => {
    taskLoopEngine.setUpdateCallback(() => refresh());
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    setNewTaskTitle('');

    const task = await taskLoopEngine.createTask(title);

    if (inferenceEngine.isReady()) {
      await taskLoopEngine.planTask(task.id);
    }
    refresh();
  };

  const handleExecute = async (taskId: string) => {
    await taskLoopEngine.executeTask(taskId);
    refresh();
  };

  const handleRemove = async (taskId: string) => {
    await taskLoopEngine.removeTask(taskId);
    refresh();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-400';
      case 'running':
        return 'text-amber-400 animate-pulse';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-white/30';
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 overflow-y-auto h-full">
      <h2 className="text-sm font-semibold text-white/90">Autonomous Tasks</h2>

      {/* Create task */}
      <div className="flex gap-2">
        <input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Describe a task goal..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
        />
        <button
          onClick={handleCreate}
          disabled={!newTaskTitle.trim()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-white/20 rounded-lg text-sm font-medium text-white transition-colors"
        >
          Create
        </button>
      </div>

      {/* Task list */}
      {tasks.length === 0 && (
        <p className="text-white/20 text-sm text-center py-10">
          No tasks yet. Create one above — the model will plan and execute it.
        </p>
      )}

      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm text-white/80 font-medium">{task.title}</h3>
                <span className={`text-[10px] font-mono uppercase ${statusColor(task.status)}`}>
                  {task.status}
                </span>
              </div>
              <div className="flex gap-2">
                {task.status === 'pending' && task.steps.length > 0 && (
                  <button
                    onClick={() => handleExecute(task.id)}
                    disabled={!inferenceEngine.isReady()}
                    className="px-3 py-1 text-[11px] bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 disabled:opacity-30 rounded transition-colors"
                  >
                    Execute
                  </button>
                )}
                {task.status === 'running' && (
                  <button
                    onClick={() => taskLoopEngine.stopExecution()}
                    className="px-3 py-1 text-[11px] bg-red-600/30 text-red-300 hover:bg-red-600/50 rounded transition-colors"
                  >
                    Stop
                  </button>
                )}
                <button
                  onClick={() => handleRemove(task.id)}
                  className="px-3 py-1 text-[11px] text-white/20 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Steps */}
            {task.steps.length > 0 && (
              <div className="space-y-1.5 ml-1">
                {task.steps.map((step, i) => (
                  <div key={step.id} className="flex items-start gap-2">
                    <span className={`text-[10px] font-mono mt-0.5 ${statusColor(step.status)}`}>
                      {step.status === 'completed' ? '+' : step.status === 'failed' ? '!' : step.status === 'running' ? '>' : '-'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60">{i + 1}. {step.description}</p>
                      {step.result && (
                        <p className="text-[11px] text-white/30 mt-0.5 line-clamp-2">{step.result}</p>
                      )}
                      {step.error && (
                        <p className="text-[11px] text-red-400/60 mt-0.5">{step.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
