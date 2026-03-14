import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Trash2, CheckCircle2, Circle, Clock, AlertCircle, Bell, BellOff, Edit2, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Todo, TodoFilter } from './types';
import { useNotifications } from './hooks/useNotifications';
import { supabase } from './lib/supabase';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<TodoFilter>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Todo['priority']>('medium');

  const { permission, requestPermission, sendNotification } = useNotifications();

  // Fetch todos from Supabase
  const fetchTodos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map Supabase snake_case to our camelCase types
      const mappedTodos: Todo[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        completed: item.completed,
        dueDate: item.due_date,
        priority: item.priority,
        createdAt: item.created_at
      }));
      
      setTodos(mappedTodos);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  // Notification Checker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      todos.forEach(todo => {
        if (!todo.completed && todo.dueDate) {
          const due = new Date(todo.dueDate);
          const diff = due.getTime() - now.getTime();
          if (diff > 0 && diff < 60000) {
            sendNotification(`Task Due Soon: ${todo.title}`, {
              body: todo.description || 'Your task is due in less than a minute!',
              icon: '/favicon.ico'
            });
          }
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [todos, sendNotification]);

  const filteredTodos = useMemo(() => {
    return todos
      .filter(todo => {
        const matchesSearch = todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            todo.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' ? true :
                            filter === 'active' ? !todo.completed :
                            todo.completed;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime());
  }, [todos, searchQuery, filter]);

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      if (editingTodo) {
        const { error } = await supabase
          .from('todos')
          .update({
            title,
            description,
            due_date: dueDate || null,
            priority
          })
          .eq('id', editingTodo.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('todos')
          .insert([{
            title,
            description,
            completed: false,
            due_date: dueDate || null,
            priority
          }]);

        if (error) throw error;
      }
      
      fetchTodos(); // Refresh list
      closeModal();
    } catch (error) {
      console.error('Error saving todo:', error);
      alert('Failed to save task. Please check if the "todos" table exists in your Supabase project.');
    }
  };

  const toggleComplete = async (todo: Todo) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ completed: !todo.completed })
        .eq('id', todo.id);

      if (error) throw error;
      fetchTodos();
    } catch (error) {
      console.error('Error toggling complete:', error);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const openModal = (todo?: Todo) => {
    if (todo) {
      setEditingTodo(todo);
      setTitle(todo.title);
      setDescription(todo.description);
      setDueDate(todo.dueDate || '');
      setPriority(todo.priority);
    } else {
      setEditingTodo(null);
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTodo(null);
  };

  const getPriorityColor = (p: Todo['priority']) => {
    switch (p) {
      case 'high': return 'text-red-500 bg-red-50 border-red-100';
      case 'medium': return 'text-amber-500 bg-amber-50 border-amber-100';
      case 'low': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    }
  };

  const filterLabels: Record<TodoFilter, string> = {
    all: '전체',
    active: '진행 중',
    completed: '완료'
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="bg-white border-b border-black/5 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">TaskFlow</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => permission === 'default' && requestPermission()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors relative group"
              title="Notifications"
            >
              {permission === 'granted' ? <Bell size={20} className="text-emerald-500" /> : <BellOff size={20} className="text-gray-400" />}
              {permission === 'default' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>
            <button 
              onClick={() => openModal()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus size={20} />
              <span>New Task</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex bg-white p-1 rounded-2xl border border-black/5 shadow-sm">
            {(['all', 'active', 'completed'] as TodoFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="animate-spin mb-4" size={40} />
              <p>Loading tasks from Supabase...</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredTodos.length > 0 ? (
                filteredTodos.map((todo) => (
                  <motion.div
                    key={todo.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`group bg-white p-5 rounded-3xl border border-black/5 shadow-sm hover:shadow-md transition-all flex items-start gap-4 ${
                      todo.completed ? 'opacity-60' : ''
                    }`}
                  >
                    <button 
                      onClick={() => toggleComplete(todo)}
                      className={`mt-1 transition-colors ${todo.completed ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-400'}`}
                    >
                      {todo.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={`font-semibold text-lg truncate ${todo.completed ? 'line-through text-gray-400' : ''}`}>
                        {todo.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${getPriorityColor(todo.priority)}`}>
                        {todo.priority}
                      </span>
                    </div>
                    {todo.description && (
                      <p className={`text-sm mb-3 line-clamp-2 ${todo.completed ? 'text-gray-400' : 'text-gray-500'}`}>
                        {todo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                      {todo.dueDate && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} />
                          <span>{new Date(todo.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <AlertCircle size={14} />
                        <span>Created {new Date(todo.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openModal(todo)}
                      className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-emerald-500 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => deleteTodo(todo.id)}
                      className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <Search size={40} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">{editingTodo ? 'Edit Task' : 'New Task'}</h2>
                  <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleAddOrEdit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Title</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Description</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add some details..."
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Due Date</label>
                      <input 
                        type="datetime-local" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Priority</label>
                      <select 
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-500 transition-all appearance-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                      {editingTodo ? 'Save Changes' : 'Create Task'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
