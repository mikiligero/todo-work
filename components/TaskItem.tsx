'use client'

import { useState } from 'react'
import { toggleTaskCompletion, deleteTask, updateTask, shareTask, unshareTask } from '@/app/actions/tasks'
import { createSubTask, toggleSubTask, deleteSubTask, updateSubTask } from '@/app/actions/subtasks'
import { Check, Calendar, ChevronDown, ChevronUp, Plus, Trash2, ListTodo, Edit2, X, RotateCcw, Share2, Users, CheckCircle2, Pencil, Repeat, AlignLeft } from 'lucide-react'
import { format } from 'date-fns'
import { RecurrenceFields } from './RecurrenceFields'

interface TaskItemProps {
    task: any // Type this properly if possible
    categories?: any[] // Optional, passed from parent for editing
    allUsers?: any[] // New: for sharing buttons
    currentUserId?: string // New: to identify if we are the creator
}

export function TaskItem({ task, categories, allUsers, currentUserId }: TaskItemProps) {
    const [isCompleted, setIsCompleted] = useState(task.completed)
    const [isPending, setIsPending] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const [newSubTaskTitle, setNewSubTaskTitle] = useState('')
    const [isAddingSubTask, setIsAddingSubTask] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [editingSubtask, setEditingSubtask] = useState<any>(null)

    // Sort subtasks locally just in case, though query helper does it
    const subtasks = task.subtasks || []
    const completedSubtasks = subtasks.filter((st: any) => st.completed).length
    const totalSubtasks = subtasks.length
    const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0

    const handleToggle = async (e?: React.MouseEvent) => {
        e?.stopPropagation()
        const newState = !isCompleted
        setIsCompleted(newState)
        setIsPending(true)
        await toggleTaskCompletion(task.id, newState)
        setIsPending(false)
    }

    const handleDelete = async (e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return
        setIsPending(true)
        await deleteTask(task.id)
        setIsPending(false)
    }

    const handleAddSubTask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSubTaskTitle.trim()) return

        setIsAddingSubTask(true)
        await createSubTask(task.id, newSubTaskTitle)
        setNewSubTaskTitle('')
        setIsAddingSubTask(false)
    }

    const handleToggleSubTask = async (e: React.MouseEvent, subtaskId: string, currentStatus: boolean) => {
        e.stopPropagation()
        await toggleSubTask(subtaskId, !currentStatus)
    }

    const handleDeleteSubTask = async (e: React.MouseEvent, subtaskId: string) => {
        e.stopPropagation()
        if (!confirm('Delete subtask?')) return
        await deleteSubTask(subtaskId)
    }

    return (
        <>
            <div
                onClick={() => setShowDetailModal(true)}
                className={`p-4 bg-white dark:bg-zinc-900 rounded-xl border-4 transition-all cursor-pointer ${isCompleted ? 'opacity-50 border-zinc-200 dark:border-zinc-800' : 'shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                style={{ borderColor: !isCompleted && task.category ? `${task.category.color}E6` : undefined }}
            >
                <div className="flex items-start gap-4">
                    <button
                        onClick={handleToggle}
                        disabled={isPending}
                        className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isCompleted
                            ? 'bg-zinc-400 border-zinc-400 dark:bg-zinc-600 dark:border-zinc-600'
                            : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-500'
                            }`}
                    >
                        {isCompleted && <Check size={14} className="text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className={`font-medium text-zinc-900 dark:text-white truncate ${isCompleted ? 'line-through text-zinc-500' : ''}`}>
                                {task.title}
                            </h3>
                            <div className="flex items-center gap-1 shrink-0">
                                {isCompleted && (
                                    <button
                                        onClick={handleToggle}
                                        className="text-indigo-500 hover:text-indigo-600 p-1"
                                        title="Mark as Pending"
                                    >
                                        <RotateCcw size={16} />
                                    </button>
                                )}
                                {!isCompleted && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowEditModal(true) }}
                                        className="text-zinc-400 hover:text-indigo-600 p-1"
                                        title="Edit Task"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => handleDelete(e)}
                                    className="text-zinc-400 hover:text-red-500 p-1"
                                    title="Delete Task"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
                                    className="text-zinc-400 hover:text-indigo-500 p-1"
                                >
                                    {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {task.category && (
                                    <span
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-white"
                                        style={{ backgroundColor: task.category.color }}
                                    >
                                        {task.category.name}
                                    </span>
                                )}

                                {task.dueDate && (
                                    <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        <Calendar size={12} />
                                        {format(new Date(task.dueDate), 'MMM d')}
                                    </span>
                                )}

                                {currentUserId && task.creatorId !== currentUserId && task.creator && (
                                    <span className="flex items-center gap-1 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-md">
                                        <Users size={10} />
                                        Compartido por {task.creator.username}
                                    </span>
                                )}

                                {task.creatorId === currentUserId && task.sharedWith && task.sharedWith.length > 0 && (
                                    <span className="flex items-center gap-1 text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/30">
                                        <Users size={10} />
                                        Compartido con {task.sharedWith.map((u: any) => `@${u.username}`).join(', ')}
                                    </span>
                                )}

                                {task.importance === 'High' && !isCompleted && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-200 text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                                        High
                                    </span>
                                )}

                                {totalSubtasks > 0 && (
                                    <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                                        <ListTodo size={12} />
                                        {completedSubtasks}/{totalSubtasks}
                                    </span>
                                )}
                            </div>

                            {/* Progress Bar */}
                            {totalSubtasks > 0 && !isCompleted && (
                                <div className="mt-3 h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Subtasks Section */}
                        {expanded && (
                            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-top-2">
                                <div className="space-y-2 mb-3">
                                    {subtasks.map((st: any) => (
                                        <div key={st.id} className="group relative">
                                            <div className="flex items-start gap-3">
                                                <button
                                                    onClick={(e) => handleToggleSubTask(e, st.id, st.completed)}
                                                    className={`shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors ${st.completed
                                                        ? 'bg-indigo-500 border-indigo-500 text-white'
                                                        : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-400'}`}
                                                >
                                                    {st.completed && <Check size={10} />}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-sm block ${st.completed ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                                        {st.title}
                                                    </span>
                                                    {st.description && (
                                                        <p className={`text-xs mt-0.5 ${st.completed ? 'text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'} line-clamp-2`}>
                                                            {st.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingSubtask(st) }}
                                                        className="text-zinc-400 hover:text-indigo-500 p-1"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteSubTask(e, st.id)}
                                                        className="text-zinc-400 hover:text-red-500 p-1"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <form
                                    onSubmit={handleAddSubTask}
                                    className="flex items-center gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        type="text"
                                        value={newSubTaskTitle}
                                        onChange={(e) => setNewSubTaskTitle(e.target.value)}
                                        placeholder="Add subtask..."
                                        className="flex-1 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newSubTaskTitle.trim() || isAddingSubTask}
                                        className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showEditModal && categories && (
                <EditTaskModal
                    task={task}
                    categories={categories}
                    onClose={() => setShowEditModal(false)}
                />
            )}

            {showDetailModal && (
                <TaskDetailModal
                    task={task}
                    onClose={() => setShowDetailModal(false)}
                    onEdit={() => { setShowDetailModal(false); setShowEditModal(true); }}
                    isCompleted={isCompleted}
                    progress={progress}
                    completedSubtasks={completedSubtasks}
                    totalSubtasks={totalSubtasks}
                    handleToggle={handleToggle}
                    handleDelete={handleDelete}
                    handleToggleSubTask={handleToggleSubTask}
                    handleDeleteSubTask={handleDeleteSubTask}
                    handleAddSubTask={handleAddSubTask}
                    newSubTaskTitle={newSubTaskTitle}
                    setNewSubTaskTitle={setNewSubTaskTitle}
                    isAddingSubTask={isAddingSubTask}
                    allUsers={allUsers}
                    currentUserId={currentUserId}
                    onEditSubTask={setEditingSubtask}
                />
            )}

            {editingSubtask && (
                <EditSubTaskModal
                    subtask={editingSubtask}
                    onClose={() => setEditingSubtask(null)}
                />
            )}
        </>
    )
}

function TaskDetailModal({
    task, onClose, onEdit, isCompleted, progress, completedSubtasks, totalSubtasks,
    handleToggle, handleDelete, handleToggleSubTask, handleDeleteSubTask, handleAddSubTask,
    newSubTaskTitle, setNewSubTaskTitle, isAddingSubTask, allUsers, currentUserId,
    onEditSubTask // New prop
}: any) {
    const isOwner = !currentUserId || task.creatorId === currentUserId
    return (
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div
                className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar">
                    <div className="flex items-start gap-4 mb-6">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleToggle(e); }}
                            className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors mt-1 relative z-10 ${isCompleted
                                ? 'bg-zinc-400 border-zinc-400 dark:bg-zinc-600 dark:border-zinc-600'
                                : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-500'
                                }`}
                        >
                            {isCompleted && <Check size={18} className="text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    {task.category && (
                                        <span className="inline-block px-3 py-1 rounded-full text-white text-[10px] font-bold mb-2 shadow-sm" style={{ backgroundColor: task.category.color }}>
                                            {task.category.name}
                                        </span>
                                    )}
                                    <h2 className={`text-2xl font-bold text-zinc-900 dark:text-white leading-tight ${isCompleted ? 'line-through text-zinc-500' : ''} break-words`}>
                                        {task.title}
                                    </h2>
                                    {!isOwner && task.creator && (
                                        <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1">
                                            <Users size={14} />
                                            Compartido por <span className="font-semibold text-indigo-600 dark:text-indigo-400">@{task.creator.username}</span>
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    {!isCompleted && (
                                        <button onClick={onEdit} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400 transition-colors">
                                            <Edit2 size={20} />
                                        </button>
                                    )}
                                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mt-3">
                                {task.dueDate && (
                                    <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                                        <Calendar size={16} className="text-indigo-500" />
                                        Due {format(new Date(task.dueDate), 'MMMM d, yyyy')}
                                    </div>
                                )}
                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border ${task.importance === 'High' ? 'border-red-200 text-red-600 bg-red-50' :
                                    task.importance === 'Medium' ? 'border-amber-200 text-amber-600 bg-amber-50' :
                                        'border-emerald-200 text-emerald-600 bg-emerald-50'
                                    } uppercase tracking-wider`}>
                                    {task.importance} Importance
                                </div>
                                {task.isRecurring && (
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">
                                        <Repeat size={12} />
                                        <span className="capitalize">
                                            {task.recurrenceInterval}
                                            {task.recurrenceInterval === 'weekly' && task.recurrenceWeekDays && (
                                                <span className="ml-1 text-indigo-500/80">
                                                    (
                                                    {task.recurrenceWeekDays.split(',').map((d: string) =>
                                                        ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][parseInt(d)]
                                                    ).join(', ')}
                                                    )
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {task.description && (
                        <div className="mb-8">
                            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-3">Description</h3>
                            <p className="text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 leading-relaxed">
                                {task.description}
                            </p>
                        </div>
                    )}

                    {isOwner && allUsers && allUsers.length > 0 && (
                        <div className="mb-10 p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Users size={16} className="text-indigo-500" />
                                Compartir
                            </h3>

                            <div className="flex flex-wrap gap-2">
                                {allUsers.map((u: any) => {
                                    const isShared = task.sharedWith?.some((su: any) => su.id === u.id);
                                    return (
                                        <button
                                            key={u.id}
                                            onClick={async () => {
                                                if (isShared) {
                                                    await unshareTask(task.id, u.id);
                                                } else {
                                                    await shareTask(task.id, u.username);
                                                }
                                            }}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-md flex items-center gap-2 group border-2 ${isShared
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-500/30'
                                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-indigo-400'
                                                } ${isShared ? 'scale-[1.02]' : 'scale-100'}`}
                                        >
                                            {isShared ? (
                                                <CheckCircle2 size={16} className="text-white fill-white/20" />
                                            ) : (
                                                <Users size={16} className="text-zinc-400 group-hover:text-indigo-500" />
                                            )}
                                            {u.username}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <ListTodo size={16} className="text-indigo-500" />
                            Checklist ({completedSubtasks}/{totalSubtasks})
                        </h3>
                    </div>

                    {totalSubtasks > 0 && (
                        <div className="mb-6 h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-700 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}

                    <div className="space-y-2 mb-6 max-h-60 overflow-auto pr-2 custom-scrollbar">
                        {task.subtasks?.map((st: any) => (
                            <div key={st.id} className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl group hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                <button
                                    onClick={() => handleToggleSubTask(st.id, st.completed)}
                                    className={`shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors ${st.completed
                                        ? 'bg-indigo-500 border-indigo-500 text-white'
                                        : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-400'}`}
                                >
                                    {st.completed && <Check size={12} />}
                                </button>
                                <div className="flex-1 min-w-0">
                                    <span className={`text-zinc-700 dark:text-zinc-200 block ${st.completed ? 'line-through text-zinc-400' : ''}`}>
                                        {st.title}
                                    </span>
                                    {st.description && (
                                        <p className={`text-xs mt-1 ${st.completed ? 'text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                            {st.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => onEditSubTask(st)}
                                        className="text-zinc-400 hover:text-indigo-500 p-1"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteSubTask(st.id)}
                                        className="text-zinc-400 hover:text-red-500 p-1"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleAddSubTask} className="flex items-center gap-3">
                        <input
                            type="text"
                            value={newSubTaskTitle}
                            onChange={(e) => setNewSubTaskTitle(e.target.value)}
                            placeholder="Add a step..."
                            className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!newSubTaskTitle.trim() || isAddingSubTask}
                            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all flex item-center justify-center"
                        >
                            <Plus size={20} />
                        </button>
                    </form>

                    <div className="mt-10 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-400">
                        <span>Created {format(new Date(task.createdAt), 'MMM d, p')}</span>
                        <button onClick={handleDelete} className="text-red-400 hover:text-red-500 flex items-center gap-1.5 transition-colors">
                            <Trash2 size={14} />
                            Permanently Delete Task
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function EditTaskModal({ task, categories, onClose }: { task: any, categories: any[], onClose: () => void }) {
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        await updateTask(task.id, formData)
        setLoading(false)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white">Edit Task</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Title</label>
                        <input name="title" defaultValue={task.title} required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
                        <textarea name="description" defaultValue={task.description || ''} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 h-24 resize-none" placeholder="Add more details..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
                            <select name="categoryId" defaultValue={task.categoryId} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2">
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Importance</label>
                            <select name="importance" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2" defaultValue={task.importance}>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Due Date</label>
                        <input
                            name="dueDate"
                            type="date"
                            defaultValue={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                        />
                    </div>

                    <RecurrenceFields
                        initialIsRecurring={task.isRecurring}
                        initialInterval={task.recurrenceInterval}
                        initialWeekDays={task.recurrenceWeekDays ? task.recurrenceWeekDays.split(',') : []}
                        initialDayOfMonth={task.recurrenceDayOfMonth}
                        initialEndDate={task.recurrenceEndDate ? format(new Date(task.recurrenceEndDate), 'yyyy-MM-dd') : null}
                    />

                    <div className="pt-2 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function EditSubTaskModal({ subtask, onClose }: { subtask: any, onClose: () => void }) {
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        await updateSubTask(subtask.id, formData)
        setLoading(false)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                    <X size={20} />
                </button>

                <h2 className="text-lg font-bold mb-4 text-zinc-900 dark:text-white">Edit Subtask</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Title</label>
                        <input
                            name="title"
                            defaultValue={subtask.title}
                            required
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description (Optional)</label>
                        <textarea
                            name="description"
                            defaultValue={subtask.description || ''}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 h-24 resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            placeholder="Add details..."
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">Save</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
