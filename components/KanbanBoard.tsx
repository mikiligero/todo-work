'use client'

import { useState } from 'react'
import { TaskItem } from '@/components/TaskItem'
import { Task, Project, User, KanbanColumn as KanbanColumnType } from '@prisma/client'
import { STATUS_CONFIG } from '@/components/TaskItem'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { updateTaskStatus, createTask } from '@/app/actions/tasks'
import { createColumn, deleteColumn, updateColumn } from '@/app/actions/columns'
import { Plus, MoreHorizontal, X, Trash2, Edit2 } from 'lucide-react'

interface KanbanBoardProps {
    tasks: (Task & {
        subtasks: any[]
        assignee: User | null
        sharedWith: User[]
    })[]
    columns: KanbanColumnType[]
    projects: Project[]
    allUsers: any[]
    currentUserId: string
    projectId: string
    isOwner: boolean
}

export function KanbanBoard({ tasks, columns, projects, allUsers, currentUserId, projectId, isOwner }: KanbanBoardProps) {
    const [activeId, setActiveId] = useState<string | null>(null)
    const [isCreatingColumn, setIsCreatingColumn] = useState(false)
    const [newColumnTitle, setNewColumnTitle] = useState('')

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const activeTaskId = active.id as string
        const newColumnId = over.id as string

        const currentTask = tasks.find(t => t.id === activeTaskId)
        if (!currentTask || currentTask.columnId === newColumnId) return

        // If dropped on the same column but reordered, we need sort logic (not implemented yet)
        if (currentTask.columnId === newColumnId) return

        try {
            await updateTaskStatus(activeTaskId, newColumnId)
        } catch (error) {
            console.error('Failed to move task:', error)
        }
    }

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string)
    }

    async function handleCreateColumn(e: React.FormEvent) {
        e.preventDefault()
        if (!newColumnTitle.trim()) return
        await createColumn(projectId, newColumnTitle)
        setNewColumnTitle('')
        setIsCreatingColumn(false)
    }

    const activeTask = tasks.find(t => t.id === activeId)

    return (
        <DndContext
            id="kanban-dnd-context"
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-250px)]">
                {columns.map(col => (
                    <KanbanColumn
                        key={col.id}
                        col={col}
                        tasks={tasks.filter(t => t.columnId === col.id)}
                        projects={projects}
                        allUsers={allUsers}
                        currentUserId={currentUserId}
                        projectId={projectId}
                        isOwner={isOwner}
                    />
                ))}

                {/* Add Column Button */}
                {isOwner && (
                    <div className="min-w-[300px] w-[300px] flex-shrink-0">
                        {isCreatingColumn ? (
                            <form onSubmit={handleCreateColumn} className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <input
                                    autoFocus
                                    value={newColumnTitle}
                                    onChange={e => setNewColumnTitle(e.target.value)}
                                    placeholder="Column name..."
                                    className="w-full text-sm bg-transparent border-b border-indigo-500 focus:outline-none mb-3 px-1 py-1"
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingColumn(false)}
                                        className="text-xs text-zinc-500 hover:text-zinc-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newColumnTitle.trim()}
                                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700"
                                    >
                                        Add
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <button
                                onClick={() => setIsCreatingColumn(true)}
                                className="w-full h-12 flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 transition-colors text-sm font-medium"
                            >
                                <Plus size={16} />
                                Add Column
                            </button>
                        )}
                    </div>
                )}
            </div>

            <DragOverlay>
                {activeId && activeTask ? (
                    <div className="opacity-80 rotate-2 scale-105 cursor-grabbing">
                        <TaskItem
                            task={activeTask}
                            projects={projects}
                            allUsers={allUsers}
                            currentUserId={currentUserId}
                            compact
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}

function KanbanColumn({ col, tasks, projects, allUsers, currentUserId, projectId, isOwner }: any) {
    const [isEditing, setIsEditing] = useState(false)
    const [title, setTitle] = useState(col.title)
    const [isAddingTask, setIsAddingTask] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState('')

    const { setNodeRef } = useSortable({
        id: col.id,
        data: { type: 'Column', col },
        disabled: true
    })

    async function handleUpdateTitle(e: React.FormEvent) {
        e.preventDefault()
        if (title.trim() && title !== col.title) {
            await updateColumn(col.id, title)
        }
        setIsEditing(false)
    }

    async function handleDeleteColumn() {
        if (confirm('Delete this column? Tasks will be moved to the backlog (or null column).')) {
            await deleteColumn(col.id)
        }
    }

    async function handleAddTask(e: React.FormEvent) {
        e.preventDefault()
        if (!newTaskTitle.trim()) return

        const formData = new FormData()
        formData.append('title', newTaskTitle)
        formData.append('projectId', projectId)
        formData.append('status', 'TODO') // Legacy default, but columnId is key
        formData.append('columnId', col.id)

        await createTask(formData)
        setNewTaskTitle('')
        setIsAddingTask(false)
    }

    // Determine color based on title (fallback logic similar to status)
    const getHeaderColor = (t: string) => {
        const lower = t.toLowerCase()
        if (lower.includes('done')) return 'bg-emerald-500'
        if (lower.includes('review')) return 'bg-amber-500'
        if (lower.includes('progress')) return 'bg-blue-500'
        if (lower.includes('todo') || lower.includes('to do')) return 'bg-slate-500'
        return 'bg-zinc-400'
    }

    return (
        <div ref={setNodeRef} className="min-w-[300px] w-[300px] flex-shrink-0 flex flex-col bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 h-full max-h-full">
            {/* Column Header */}
            <div className={`p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-50 dark:bg-zinc-900 rounded-t-xl z-10`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${getHeaderColor(col.title)}`}></div>
                    {isEditing ? (
                        <form onSubmit={handleUpdateTitle} className="flex-1">
                            <input
                                autoFocus
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                onBlur={handleUpdateTitle}
                                className="w-full text-sm font-semibold bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </form>
                    ) : (
                        <h3
                            className="font-semibold text-zinc-700 dark:text-zinc-200 text-sm truncate cursor-pointer"
                            onDoubleClick={() => isOwner && setIsEditing(true)}
                        >
                            {col.title}
                        </h3>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                        {tasks.length}
                    </span>
                    {isOwner && (
                        <div className="relative group">
                            <button className="p-1 text-zinc-400 hover:text-zinc-600 rounded">
                                <MoreHorizontal size={14} />
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-20 overflow-hidden flex flex-col cursor-pointer">
                                <div onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer">
                                    <Edit2 size={12} /> Rename
                                </div>
                                <div onClick={handleDeleteColumn} className="flex items-center gap-2 px-3 py-2 text-xs text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer">
                                    <Trash2 size={12} /> Delete
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => setIsAddingTask(true)}
                        className="p-1 text-zinc-400 hover:text-indigo-600 rounded"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Inline Add Task */}
            {isAddingTask && (
                <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <form onSubmit={handleAddTask}>
                        <textarea
                            autoFocus
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="w-full text-sm bg-transparent resize-none focus:outline-none mb-2 placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-200"
                            rows={2}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleAddTask(e)
                                }
                            }}
                        />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsAddingTask(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500"><X size={14} /></button>
                            <button type="submit" className="px-2 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700">Add</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Droppable Zone */}
            <DroppableTaskList
                colId={col.id}
                tasks={tasks}
                projects={projects}
                allUsers={allUsers}
                currentUserId={currentUserId}
            />
        </div>
    )
}

function DroppableTaskList({ colId, tasks, projects, allUsers, currentUserId }: any) {
    const { setNodeRef, isOver } = useSortable({
        id: colId,
        data: { type: 'Container' },
        disabled: true
    })

    return (
        <div
            ref={setNodeRef}
            className={`p-2 flex-1 overflow-y-auto space-y-2 transition-colors custom-scrollbar ${isOver ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
        >
            <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
                {tasks.map((task: any) => (
                    <SortableTaskItem
                        key={task.id}
                        task={task}
                        projects={projects}
                        allUsers={allUsers}
                        currentUserId={currentUserId}
                    />
                ))}
            </SortableContext>
        </div>
    )
}

function SortableTaskItem(props: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.task.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
            <TaskItem {...props} compact />
        </div>
    )
}
