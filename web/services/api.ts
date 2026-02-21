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
  
  const result = await res.json();
  
  if (!res.ok || result.code !== 0) {
    throw new Error(result.err || result.error || 'Request failed');
  }
  
  return result.data;
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
    bulkCreate: async (data: Partial<Question>[]): Promise<{ imported: number }> => {
      const res = await fetch(`${API_URL}/questions/bulk`, {
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
    },
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_URL}/papers/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id: string): Promise<void> => {
      const res = await fetch(`${API_URL}/papers/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.status === 401) {
        localStorage.removeItem('user');
        window.location.hash = '#/login';
        throw new Error('Unauthorized');
      }
      if (!res.ok) throw new Error('Failed to delete paper');
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
    },
    complete: async (id: string): Promise<any> => {
      const res = await fetch(`${API_URL}/homeworks/${id}/complete`, {
        method: 'PUT',
        headers: getHeaders(),
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
    list: async (page = 1, pageSize = 10, homeworkId?: string): Promise<{ list: any[], total: number }> => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });
      if (homeworkId) params.append('homeworkId', homeworkId);
      const res = await fetch(`${API_URL}/history?${params.toString()}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_URL}/history`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
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
  admin: {
    listUsers: async (): Promise<User[]> => {
      const res = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data || [];
    },
    createUser: async (data: Partial<User>): Promise<User> => {
      const res = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    updateUser: async (id: string, data: Partial<User>): Promise<User> => {
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    deleteUser: async (id: string): Promise<void> => {
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
    },
    logs: async (): Promise<any[]> => {
       const res = await fetch(`${API_URL}/admin/logs`, { headers: getHeaders() });
       const data = await handleResponse(res);
       return data || [];
    },
    homeworks: async (): Promise<any[]> => {
       const res = await fetch(`${API_URL}/admin/homeworks`, { headers: getHeaders() });
       const data = await handleResponse(res);
       return data || [];
    },
    practices: async (): Promise<any[]> => {
       const res = await fetch(`${API_URL}/admin/practices`, { headers: getHeaders() });
       const data = await handleResponse(res);
       return data || [];
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
    update: async (id: string, data: any): Promise<any> => {
      const res = await fetch(`${API_URL}/reinforcements/${id}`, {
        method: 'PUT',
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
  },
  resources: {
    list: async (page = 1, pageSize = 10, keyword = ''): Promise<{ list: Resource[], total: number }> => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        keyword: keyword
      });
      const res = await fetch(`${API_URL}/resources?${params.toString()}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data: any): Promise<Resource> => {
      const res = await fetch(`${API_URL}/resources`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id: string, data: any): Promise<Resource> => {
      const res = await fetch(`${API_URL}/resources/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id: string): Promise<void> => {
      const res = await fetch(`${API_URL}/resources/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.status === 401) {
        localStorage.removeItem('user');
        window.location.hash = '#/login';
        throw new Error('Unauthorized');
      }
      if (!res.ok) throw new Error('Failed to delete resource');
    }
  }
};
