import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import './App.css';

function App() {
  const [tasks, setTasks] = useState<any[]>([]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching tasks:', error);
    else setTasks(data || []);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="App" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>📸 인스타그램 댓글 자동화 대시보드</h1>
      <TaskForm onTaskAdded={fetchTasks} />
      <TaskList tasks={tasks} onTaskChanged={fetchTasks} />
    </div>
  );
}

export default App;
