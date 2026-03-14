export interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string; // ISO string
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export type TodoFilter = 'all' | 'active' | 'completed';
