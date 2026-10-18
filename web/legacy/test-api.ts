
// Simple test script for api.ts logic (mocking fetch)

import { api } from './services/api.ts';

// Mock global fetch
global.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = url.toString();
  
  if (urlStr.includes('/questions')) {
    // Simulate null response from backend
    return {
      ok: true,
      json: async () => null
    } as Response;
  }
  
  if (urlStr.includes('/teacher/stats')) {
    return {
      ok: true,
      json: async () => ({
        todayCorrected: 10,
        pendingAssignments: 5,
        accuracyRate: 0.9,
        recentHomeworks: []
      })
    } as Response;
  }

  return { ok: false } as Response;
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });


async function runTests() {
  console.log('Running API Tests...');

  try {
    // Test 1: Questions list should return [] when backend returns null
    console.log('Test 1: api.questions.list() should return [] on null response');
    const questions = await api.questions.list();
    if (Array.isArray(questions) && questions.length === 0) {
      console.log('PASS');
    } else {
      console.error('FAIL: Expected [], got', questions);
    }

    // Test 2: Teacher stats should return data
    console.log('Test 2: api.teacher.stats() should return correct data');
    const stats = await api.teacher.stats();
    if (stats.todayCorrected === 10) {
      console.log('PASS');
    } else {
      console.error('FAIL: Expected todayCorrected=10, got', stats);
    }

  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

runTests();
