package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)

	// Use SQLite in-memory for testing
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	// Migrate the schema
	db.AutoMigrate(
		&User{},
		&Question{},
		&Paper{},
		&Homework{},
		&History{},
		&Reinforcement{},
		&Resource{},
		&AuditLog{},
	)
	DB = db

	os.Exit(m.Run())
}

func TestGetQuestions_TableDriven(t *testing.T) {
	r := gin.Default()
	r.GET("/questions", GetQuestions)

	tests := []struct {
		name           string
		url            string
		expectedStatus int
		expectedCode   int
	}{
		{
			name:           "List all questions",
			url:            "/questions",
			expectedStatus: http.StatusOK,
			expectedCode:   0,
		},
		{
			name:           "Filter by subject",
			url:            "/questions?subject=MATH",
			expectedStatus: http.StatusOK,
			expectedCode:   0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", tt.url, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			var resp Response
			err := json.Unmarshal(w.Body.Bytes(), &resp)
			assert.NoError(t, err)
			assert.Equal(t, tt.expectedCode, resp.Code)
		})
	}
}

func TestGetTeacherStats(t *testing.T) {
	r := gin.Default()
	r.GET("/teacher/stats", func(c *gin.Context) {
		c.Set("userId", "2")
		GetTeacherStats(c)
	})

	req, _ := http.NewRequest("GET", "/teacher/stats", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp Response
	json.Unmarshal(w.Body.Bytes(), &resp)

	// Check if expected keys exist in response
	data := resp.Data.(map[string]interface{})
	assert.Contains(t, data, "accuracyRate")
	assert.Contains(t, data, "completionRate")
	assert.Contains(t, data, "todayAssigned")
}

func TestReinforcements(t *testing.T) {
	DB.Exec("DELETE FROM reinforcements")

	r := gin.Default()
	r.GET("/reinforcements", GetReinforcements)
	r.POST("/reinforcements", CreateReinforcement)

	// Test Create Global
	newR := Reinforcement{Name: "Test", Type: "sticker", IsGlobal: true}
	body, _ := json.Marshal(newR)
	req, _ := http.NewRequest("POST", "/reinforcements", bytes.NewBuffer(body))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code) // SendJSON returns 200

	// Test Create Targeted (Student Specific)
	targetR := Reinforcement{Name: "Targeted Reward", Type: "sticker", TargetStudentIDs: []string{"student123"}}
	body, _ = json.Marshal(targetR)
	req, _ = http.NewRequest("POST", "/reinforcements", bytes.NewBuffer(body))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// Test List
	req, _ = http.NewRequest("GET", "/reinforcements", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Code int             `json:"code"`
		Data []Reinforcement `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, 0, resp.Code)
	assert.Equal(t, 2, len(resp.Data))
	assert.Equal(t, "Test", resp.Data[0].Name)
	assert.Equal(t, "Targeted Reward", resp.Data[1].Name)
	assert.Contains(t, resp.Data[1].TargetStudentIDs, "student123")
}

func TestPapers(t *testing.T) {
	DB.Exec("DELETE FROM papers")

	r := gin.Default()
	r.GET("/papers", GetPapers)
	r.POST("/papers", CreatePaper)

	p := Paper{Name: "Test Paper", Total: 100}
	body, _ := json.Marshal(p)
	req, _ := http.NewRequest("POST", "/papers", bytes.NewBuffer(body))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	req, _ = http.NewRequest("GET", "/papers", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Code int     `json:"code"`
		Data []any   `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, 0, resp.Code)
	assert.Equal(t, 1, len(resp.Data))
}

func TestHomeworks(t *testing.T) {
	DB.Exec("DELETE FROM homeworks")

	r := gin.Default()
	r.GET("/homeworks", GetHomeworks)
	r.POST("/homeworks/assign", func(c *gin.Context) {
		c.Set("userId", "2")
		AssignHomework(c)
	})

	h := Homework{Name: "HW1", PaperID: "p1", StudentIDs: []string{"s1"}}
	body, _ := json.Marshal(h)
	req, _ := http.NewRequest("POST", "/homeworks/assign", bytes.NewBuffer(body))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	req, _ = http.NewRequest("GET", "/homeworks", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Code int        `json:"code"`
		Data []Homework `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, 0, resp.Code)
	assert.Equal(t, 1, len(resp.Data))
	assert.Equal(t, "pending", resp.Data[0].Status)
}

func TestUsers(t *testing.T) {
	DB.Exec("DELETE FROM users")
	// Add initial admin
	DB.Create(&User{ID: "1", Username: "admin", Role: RoleAdmin})

	r := gin.Default()
	r.GET("/users", GetUsers)
	r.POST("/users", CreateUser)
	r.DELETE("/users/:id", DeleteUser)

	// Create
	u := User{Username: "testuser", Role: RoleStudent, Password: "123"}
	body, _ := json.Marshal(u)
	req, _ := http.NewRequest("POST", "/users", bytes.NewBuffer(body))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var createResp struct {
		Code int  `json:"code"`
		Data User `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &createResp)
	id := createResp.Data.ID

	// List
	req, _ = http.NewRequest("GET", "/users", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var listResp struct {
		Code int    `json:"code"`
		Data []User `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &listResp)
	assert.Equal(t, 2, len(listResp.Data))

	// Delete
	req, _ = http.NewRequest("DELETE", "/users/"+id, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// Verify Delete
	req, _ = http.NewRequest("GET", "/users", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	json.Unmarshal(w.Body.Bytes(), &listResp)
	assert.Equal(t, 1, len(listResp.Data))
}
