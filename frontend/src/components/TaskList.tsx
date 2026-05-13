import React from 'react';
import { supabase } from '../supabaseClient';

interface Task {
  id: string;
  post_url: string;
  is_active: boolean;
  last_run_at: string;
}

const TaskList: React.FC<{ tasks: Task[], onTaskChanged: () => void }> = ({ tasks, onTaskChanged }) => {
  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      alert('Error updating task: ' + error.message);
    } else {
      onTaskChanged();
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      alert('Error deleting task: ' + error.message);
    } else {
      onTaskChanged();
    }
  };

  return (
    <div>
      <h3>작업 목록</h3>
      <table border={1} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>URL</th>
            <th>상태</th>
            <th>마지막 실행</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr key={task.id}>
              <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.post_url}</td>
              <td>{task.is_active ? '✅ 활성' : '❌ 비활성'}</td>
              <td>{task.last_run_at ? new Date(task.last_run_at).toLocaleString() : '-'}</td>
              <td>
                <button onClick={() => toggleActive(task.id, task.is_active)}>
                  {task.is_active ? '끄기' : '켜기'}
                </button>
                <button onClick={() => deleteTask(task.id)} style={{ marginLeft: '5px' }}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TaskList;
