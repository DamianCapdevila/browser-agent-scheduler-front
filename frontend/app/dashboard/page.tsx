"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TaskDialog } from "@/components/task-dialog"
import { TaskList } from "@/components/task-list"
import { Task } from "@/app/types/task"
import { SetupInstructions } from "@/components/setup-instructions"
import { DemoBanner } from "@/components/demo-banner"
import { mockTasks } from "@/lib/mock-data"
import { Layout } from "@/components/layout"

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true"
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  // Fetch tasks on component mount
  useEffect(() => {
    if (DEMO_MODE) {
      setTasks(mockTasks)
      setIsLoading(false)
      return
    }

    fetchTasks()
    const interval = setInterval(fetchTasks, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/tasks`)
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitTask = async (task: Task) => {
    if (DEMO_MODE) {
      // Simulate task creation in demo mode
      const newTask = {
        ...task,
        status: 'scheduled' as const,
      }
      setTasks([...tasks, newTask])
      setIsDialogOpen(false)
      return
    }

    try {
      const isUpdate = Boolean(task.id && tasks.find(t => t.id === task.id));
      const endpoint = isUpdate ? `${API_URL}/tasks/${task.id}` : `${API_URL}/schedule`;
      const method = isUpdate ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: task.apiKey,
          task: task.task,
          scheduled_time: task.scheduledTime,
          timezone: task.timezone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isUpdate ? 'update' : 'create'} task`);
      }

      await fetchTasks();
      setIsDialogOpen(false);
    } catch (error) {
      console.error(`Failed to ${task.id ? 'update' : 'add'} task:`, error);
      throw error;
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (DEMO_MODE) {
      setTasks(tasks.filter(task => task.id !== taskId))
      return
    }

    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      setTasks(tasks.filter(task => task.id !== taskId))
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setIsDialogOpen(true)
  }

  const handleDialogClose = () => {
    setSelectedTask(undefined)
    setIsDialogOpen(false)
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 space-y-8">
        {DEMO_MODE && <DemoBanner />}
        
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Tasks</h2>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>

        <TaskList 
          tasks={tasks}
          isLoading={isLoading}
          onDelete={handleDeleteTask}
          onEdit={handleEditTask}
        />

        <SetupInstructions />

        <TaskDialog 
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          onSubmit={handleSubmitTask}
          initialTask={selectedTask}
        />
      </div>
    </Layout>
  )
}