# 一粒麦子题目管理系统 – Full Stack Integration Mode

## 🚨 Critical Requirement (Must Follow)

The system is now in **API Integration Phase**.

* ❌ **DO NOT use any mock data**
* ❌ Do NOT hardcode users, stats, questions, or demo content in frontend
* ❌ Do NOT simulate authentication using localStorage
* ✅ ALL data MUST be fetched from backend APIs
* ✅ Frontend and backend data structures MUST remain strictly consistent
* ✅ Any field changes must be updated on both frontend and backend simultaneously

If an API is missing:

1. Implement it in backend first
2. Then integrate it in frontend

---

## 🏗 Project Architecture

### Frontend

* Framework: React 19
* Language: TypeScript
* Router: React Router v7 (HashRouter)
* Build Tool: Vite
* Styling: Tailwind CSS
* Icons: Lucide React

### Backend

* Language: Go
* Framework: Gin
* Authentication: JWT Middleware
* API Base URL: `http://localhost:8080`

---

## 🔐 Authentication Rules (Mandatory)

### Login Flow

1. Frontend calls `POST /login`
2. Backend returns JWT token
3. Frontend stores token securely
4. All protected requests must include:

```
Authorization: Bearer <token>
```

5. Backend middleware must validate JWT

❌ No simulated login
❌ No fake role switching
❌ No localStorage-only authentication

---

## 📦 Unified API Contract (Strictly Required)

### Request Format

```json
{
  "page": 1,
  "pageSize": 10,
  "params": {},
  "sort": {}
}
```

### Response Format

```json
{
  "code": 0,
  "err": "",
  "data": [],
  "page": 1,
  "pageSize": 10,
  "total": 100,
  "requestId": "uuid",
  "timestamp": 1700000000
}
```

### Rules

* `code = 0` → success
* `code != 0` → failure
* Frontend MUST check `code` before using `data`
* All list APIs must support pagination
* Field names must match exactly between Go and TypeScript

---

## 📁 Development Requirements

### 1️⃣ Remove All Mock Data

Delete:

* Hardcoded arrays in `App.tsx`
* Mock utilities in `utils.ts`
* Mock handlers in backend

Replace with:

* Real API calls (fetch or axios)
* Centralized request wrapper

---

### 2️⃣ Strict Data Model Consistency

For every entity (User, Question, Homework, Stats):

#### Go Model

```go
type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Role  string `json:"role"`
}
```

#### TypeScript Model

```ts
export interface User {
  id: number
  name: string
  role: string
}
```

### Rules

* JSON tag must match TS field name
* No camelCase / snake_case mismatch
* No extra or missing fields
* No frontend-only fields

---

### 3️⃣ Frontend API Layer Structure

Create:

```
src/api/
    request.ts
    user.ts
    question.ts
```

### `request.ts` Must:

* Automatically attach JWT
* Handle unified response structure
* Standardize error handling
* Reject when `code !== 0`

---

### 4️⃣ Replace Fake Auth Flow

❌ Old Mock Flow

```ts
localStorage.setItem("role", "student")
```

✅ New Real Flow

```
POST /login
→ receive token
→ store token
→ GET /me
→ fetch user info
```

---

### 5️⃣ Backend Architecture Rules

Backend must separate:

* Router layer
* Handler layer
* Service layer
* Repository layer

❌ No business logic inside router
❌ No mock data inside handlers

---

## 🎯 Current Goal

Transform project from:

> Demo Mode (Mock-based Architecture)

To:

> Production-Ready API-Driven Architecture

---

## 🚀 Code Generation Rules

When generating code:

* Always generate backend API first
* Then generate frontend integration
* Ensure data models are identical
* Follow unified response structure
* Never fallback to mock data
* Maintain modular clean architecture
* Ensure pagination compatibility
* Ensure JWT protection consistency
* 如果左侧侧边栏有修改、新增、删除，管理员对应的权限设置也要更新

---

## ✅ Final Validation Checklist

* [ ] No mock data remains
* [ ] API response follows unified format
* [ ] JWT validation is implemented
* [ ] Frontend checks `code === 0`
* [ ] Go struct matches TS interface
* [ ] Pagination works correctly
* [ ] No hardcoded demo logic

---

**This system is no longer a demo.
All data must come from real backend APIs.**
