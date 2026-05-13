import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const TaskForm: React.FC<{ onTaskAdded: () => void }> = ({ onTaskAdded }) => {
  const [postUrl, setPostUrl] = useState('');
  const [dmContent, setDmContent] = useState('');
  const [replyContent, setReplyContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('tasks').insert([
      { post_url: postUrl, dm_content: dmContent, reply_content: replyContent }
    ]);

    if (error) {
      alert('Error adding task: ' + error.message);
    } else {
      setPostUrl('');
      setDmContent('');
      setReplyContent('');
      onTaskAdded();
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px' }}>
      <h3>새 작업 추가</h3>
      <div>
        <label>게시물 URL:</label><br />
        <input type="text" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} required style={{ width: '100%' }} />
      </div>
      <div>
        <label>DM 내용:</label><br />
        <textarea value={dmContent} onChange={(e) => setDmContent(e.target.value)} required style={{ width: '100%' }} />
      </div>
      <div>
        <label>답글 내용:</label><br />
        <textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} required style={{ width: '100%' }} />
      </div>
      <button type="submit" style={{ marginTop: '10px' }}>작업 추가</button>
    </form>
  );
};

export default TaskForm;
