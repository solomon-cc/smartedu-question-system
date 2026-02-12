package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
    "bytes"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestGetQuestions_Empty(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	r.GET("/questions", GetQuestions)

	mockQuestions = make([]Question, 0) 

	req, _ := http.NewRequest("GET", "/questions?subject=NonExistent", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "[]", w.Body.String())
}

func TestGetTeacherStats(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	r.GET("/teacher/stats", GetTeacherStats)

    mockHomeworks = make([]Homework, 0)
    mockHistory = make([]History, 0)

	req, _ := http.NewRequest("GET", "/teacher/stats", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
    var response map[string]interface{}
    json.Unmarshal(w.Body.Bytes(), &response)
    assert.Contains(t, response, "accuracyRate")
}

func TestReinforcements(t *testing.T) {
    gin.SetMode(gin.TestMode)
    r := gin.Default()
    r.GET("/reinforcements", GetReinforcements)
    r.POST("/reinforcements", CreateReinforcement)

    mockReinforcements = make([]Reinforcement, 0)

    // Test Create Global
    newR := Reinforcement{Name: "Test", Type: "sticker", Condition: "global"}
    body, _ := json.Marshal(newR)
    req, _ := http.NewRequest("POST", "/reinforcements", bytes.NewBuffer(body))
    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusCreated, w.Code)

    // Test Create Targeted (Student Specific)
    targetR := Reinforcement{Name: "Targeted Reward", Type: "sticker", Condition: "student123"}
    body, _ = json.Marshal(targetR)
    req, _ = http.NewRequest("POST", "/reinforcements", bytes.NewBuffer(body))
    w = httptest.NewRecorder()
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusCreated, w.Code)

    // Test List
    req, _ = http.NewRequest("GET", "/reinforcements", nil)
    w = httptest.NewRecorder()
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusOK, w.Code)
    
    var response []Reinforcement
    json.Unmarshal(w.Body.Bytes(), &response)
    assert.Equal(t, 2, len(response))
    assert.Equal(t, "Test", response[0].Name)
    assert.Equal(t, "Targeted Reward", response[1].Name)
    assert.Equal(t, "student123", response[1].Condition)
}

func TestPapers(t *testing.T) {
    gin.SetMode(gin.TestMode)
    r := gin.Default()
    r.GET("/papers", GetPapers)
    r.POST("/papers", CreatePaper)

    mockPapers = make([]Paper, 0)

    p := Paper{Name: "Test Paper", Total: 100}
    body, _ := json.Marshal(p)
    req, _ := http.NewRequest("POST", "/papers", bytes.NewBuffer(body))
    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusCreated, w.Code)

    req, _ = http.NewRequest("GET", "/papers", nil)
    w = httptest.NewRecorder()
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusOK, w.Code)
    
    var response []Paper
    json.Unmarshal(w.Body.Bytes(), &response)
    assert.Equal(t, 1, len(response))
    assert.Equal(t, "Test Paper", response[0].Name)
}

func TestHomeworks(t *testing.T) {
    gin.SetMode(gin.TestMode)
    r := gin.Default()
    r.GET("/homeworks", GetHomeworks)
    r.POST("/homeworks/assign", AssignHomework)

    mockHomeworks = make([]Homework, 0)

    h := Homework{Name: "HW1", PaperID: "p1"}
    body, _ := json.Marshal(h)
    req, _ := http.NewRequest("POST", "/homeworks/assign", bytes.NewBuffer(body))
    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusCreated, w.Code)

    req, _ = http.NewRequest("GET", "/homeworks", nil)
    w = httptest.NewRecorder()
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusOK, w.Code)

    var response []Homework
    json.Unmarshal(w.Body.Bytes(), &response)
    assert.Equal(t, 1, len(response))
    assert.Equal(t, "pending", response[0].Status)
}

func TestUsers(t *testing.T) {
    gin.SetMode(gin.TestMode)
    r := gin.Default()
    r.GET("/users", GetUsers)
    r.POST("/users", CreateUser)
    r.DELETE("/users/:id", DeleteUser)

    // Reset mock users (keep defaults)
    mockUsers = []User{{ID: "1", Username: "admin"}}

    // Create
    u := User{Username: "testuser", Role: "STUDENT"}
    body, _ := json.Marshal(u)
    req, _ := http.NewRequest("POST", "/users", bytes.NewBuffer(body))
    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusCreated, w.Code)
    
    var created User
    json.Unmarshal(w.Body.Bytes(), &created)
    id := created.ID

    // List
    req, _ = http.NewRequest("GET", "/users", nil)
    w = httptest.NewRecorder()
    r.ServeHTTP(w, req)
    var users []User
    json.Unmarshal(w.Body.Bytes(), &users)
    assert.Equal(t, 2, len(users))

    // Delete
    req, _ = http.NewRequest("DELETE", "/users/"+id, nil)
    w = httptest.NewRecorder()
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusOK, w.Code)

    // Verify Delete
    req, _ = http.NewRequest("GET", "/users", nil)
    w = httptest.NewRecorder()
    r.ServeHTTP(w, req)
    json.Unmarshal(w.Body.Bytes(), &users)
    assert.Equal(t, 1, len(users))
}