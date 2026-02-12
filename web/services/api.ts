import { Question, User } from '../types';

const isProd = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;
const API_URL = isProd
  ? 'https://go-admin.ylmz.com.cn/api' 
  : 'http://localhost:8080/api';

const getHeaders = () => {
  const userStr = localStorage.getItem('user');
  const token = userStr ? JSON.parse(userStr).token : '';
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const api = {
  auth: {
    login: async (username: string, password: string): Promise<{ user: User; token: string }> => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error('Login failed');
      return res.json();
    },
  },
  questions: {
    list: async (subject?: string, grade?: number): Promise<Question[]> => {
      const params = new URLSearchParams();
      if (subject) params.append('subject', subject);
      if (grade) params.append('grade', grade.toString());
      
      const res = await fetch(`${API_URL}/questions?${params.toString()}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch questions');
      return (await res.json()) || [];
    },
    create: async (data: Partial<Question>): Promise<Question> => {
      const res = await fetch(`${API_URL}/questions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create question');
      return res.json();
    },
    update: async (id: string, data: Partial<Question>): Promise<Question> => {
      const res = await fetch(`${API_URL}/questions/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update question');
      return res.json();
    },
    delete: async (id: string): Promise<void> => {
      const res = await fetch(`${API_URL}/questions/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete question');
    },
  },
  papers: {
    list: async (): Promise<any[]> => {
      const res = await fetch(`${API_URL}/papers`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch papers');
      return (await res.json()) || [];
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_URL}/papers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create paper');
      return res.json();
    }
  },
  homework: {
    list: async (): Promise<any[]> => {
      const res = await fetch(`${API_URL}/homeworks`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch homeworks');
      return (await res.json()) || [];
    },
    assign: async (data: any): Promise<any> => {
      const res = await fetch(`${API_URL}/homeworks/assign`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to assign homework');
      return res.json();
    }
  },
  dashboard: {
    stats: async (): Promise<any> => {
      const res = await fetch(`${API_URL}/dashboard/stats`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    }
  },
  history: {
    list: async (): Promise<any[]> => {
      const res = await fetch(`${API_URL}/history`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch history');
      return (await res.json()) || [];
    }
  },
  student: {
    stats: async (): Promise<any> => {
      const res = await fetch(`${API_URL}/student/stats`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch student stats');
      return res.json();
    }
  },
  teacher: {
    stats: async (): Promise<any> => {
      const res = await fetch(`${API_URL}/teacher/stats`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch teacher stats');
      return res.json();
    }
  },
  users: {
    list: async (): Promise<User[]> => {
      const res = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch users');
      return (await res.json()) || [];
    },
    create: async (data: Partial<User>): Promise<User> => {
      const res = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create user');
      return res.json();
    },
    update: async (id: string, data: Partial<User>): Promise<User> => {
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update user');
      return res.json();
    },
    delete: async (id: string): Promise<void> => {
       const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
       });
       if (!res.ok) throw new Error('Failed to delete user');
    }
  },
  reinforcements: {
    list: async (): Promise<any[]> => {
      const res = await fetch(`${API_URL}/reinforcements`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch reinforcements');
      return (await res.json()) || [];
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_URL}/reinforcements`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create reinforcement');
      return res.json();
    },
    delete: async (id: string): Promise<void> => {
      const res = await fetch(`${API_URL}/reinforcements/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete reinforcement');
    }
  }
};
