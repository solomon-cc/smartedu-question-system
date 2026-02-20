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

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    localStorage.removeItem('user');
    window.location.hash = '#/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
};

export const api = {
  auth: {
    login: async (username: string, password: string): Promise<{ user: User; token: string }> => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      return handleResponse(res);
    },
  },
  questions: {
    list: async (subject?: string, grade?: number): Promise<Question[]> => {
      const params = new URLSearchParams();
      if (subject) params.append('subject', subject);
      if (grade) params.append('grade', grade.toString());
      
      const res = await fetch(`${API_URL}/questions?${params.toString()}`, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data || [];
    },
    create: async (data: Partial<Question>): Promise<Question> => {
      const res = await fetch(`${API_URL}/questions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id: string, data: Partial<Question>): Promise<Question> => {
      const res = await fetch(`${API_URL}/questions/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id: string): Promise<void> => {
      const res = await fetch(`${API_URL}/questions/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.status === 401) {
        localStorage.removeItem('user');
        window.location.hash = '#/login';
        throw new Error('Unauthorized');
      }
      if (!res.ok) throw new Error('Failed to delete question');
    },
  },
  papers: {
    list: async (): Promise<any[]> => {
      const res = await fetch(`${API_URL}/papers`, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data || [];
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_URL}/papers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    }
  },
  homework: {
    list: async (): Promise<any[]> => {
      const res = await fetch(`${API_URL}/homeworks`, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data || [];
    },
    assign: async (data: any): Promise<any> => {
      const res = await fetch(`${API_URL}/homeworks/assign`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    }
  },
  dashboard: {
    stats: async (): Promise<any> => {
      const res = await fetch(`${API_URL}/dashboard/stats`, { headers: getHeaders() });
      return handleResponse(res);
    }
  },
  history: {
    list: async (): Promise<any[]> => {
      const res = await fetch(`${API_URL}/history`, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data || [];
    }
  },
  student: {
    stats: async (): Promise<any> => {
      const res = await fetch(`${API_URL}/student/stats`, { headers: getHeaders() });
      return handleResponse(res);
    }
  },
  students: {
    list: async (): Promise<User[]> => {
      const res = await fetch(`${API_URL}/students`, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data || [];
    }
  },
  teacher: {
    stats: async (): Promise<any> => {
      const res = await fetch(`${API_URL}/teacher/stats`, { headers: getHeaders() });
      return handleResponse(res);
    }
  },
  users: {
    list: async (): Promise<User[]> => {
      const res = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data || [];
    },
    create: async (data: Partial<User>): Promise<User> => {
      const res = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id: string, data: Partial<User>): Promise<User> => {
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id: string): Promise<void> => {
       const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
       });
       if (res.status === 401) {
         localStorage.removeItem('user');
         window.location.hash = '#/login';
         throw new Error('Unauthorized');
       }
       if (!res.ok) throw new Error('Failed to delete user');
    }
  },
  reinforcements: {
    list: async (): Promise<any[]> => {
      const res = await fetch(`${API_URL}/reinforcements`, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data || [];
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_URL}/reinforcements`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id: string): Promise<void> => {
      const res = await fetch(`${API_URL}/reinforcements/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.status === 401) {
        localStorage.removeItem('user');
        window.location.hash = '#/login';
        throw new Error('Unauthorized');
      }
      if (!res.ok) throw new Error('Failed to delete reinforcement');
    }
  }
};
