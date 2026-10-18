package main

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func isolatedDB(t *testing.T) {
	t.Helper()
	old := DB
	t.Setenv("DB_DRIVER", "sqlite")
	t.Setenv("SQLITE_PATH", filepath.Join(t.TempDir(), "test.db"))
	t.Setenv("BOOTSTRAP_ADMIN_PASSWORD", "Testing-Password-2026")
	require.NoError(t, InitDB())
	t.Cleanup(func() { sqlDB, _ := DB.DB(); sqlDB.Close(); DB = old })
}
func TestPermissionsSurviveRestart(t *testing.T) {
	isolatedDB(t)
	require.NoError(t, DB.Model(&RolePermission{}).Where("role = ? AND module_id = ?", RoleTeacher, "questions").Update("api_access", false).Error)
	existing, _ := DB.DB()
	require.NoError(t, InitDB())
	existing.Close()
	var perm RolePermission
	require.NoError(t, DB.First(&perm, "role = ? AND module_id = ?", RoleTeacher, "questions").Error)
	require.False(t, perm.APIAccess, "startup must never reset administrator choices")
	var count int64
	DB.Model(&RolePermission{}).Where("role = ? AND module_id = ?", RoleTeacher, "questions").Count(&count)
	require.EqualValues(t, 1, count)
}
func TestStudentHomeworkIsolation(t *testing.T) {
	isolatedDB(t)
	require.NoError(t, DB.Create(&[]Homework{{ID: "own", Name: "Own", StudentIDs: []string{"student-1"}}, {ID: "other", Name: "Other", StudentIDs: []string{"student-2"}}}).Error)
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("userId", "student-1"); c.Set("role", string(RoleStudent)) })
	r.GET("/homeworks", GetHomeworks)
	r.GET("/homeworks/:id/questions", GetHomeworkQuestions)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/homeworks", nil))
	var response struct {
		Data []Homework `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
	require.Len(t, response.Data, 1)
	require.Equal(t, "own", response.Data[0].ID)
	denied := httptest.NewRecorder()
	r.ServeHTTP(denied, httptest.NewRequest("GET", "/homeworks/other/questions", nil))
	require.Equal(t, 403, denied.Code)
}
func TestStudentPrivateRecordsIsolation(t *testing.T) {
	isolatedDB(t)
	DB.Create(&[]MoodDiary{{ID: "own", StudentID: "student-1", Mood: 3}, {ID: "other", StudentID: "student-2", Mood: 2}})
	DB.Create(&[]VBMAPPAssessment{{ID: "own", StudentID: "student-1"}, {ID: "other", StudentID: "student-2"}})
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("userId", "student-1"); c.Set("role", string(RoleStudent)) })
	r.GET("/diaries", GetMoodDiaries)
	r.GET("/assessments", GetAssessments)
	r.GET("/assessments/:id/scores", GetAssessmentScores)
	for _, path := range []string{"/diaries?studentId=student-2", "/assessments?studentId=student-2"} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		var response struct {
			Data []struct {
				StudentID string `json:"studentId"`
			} `json:"data"`
		}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
		require.Len(t, response.Data, 1)
		require.Equal(t, "student-1", response.Data[0].StudentID)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/assessments/other/scores", nil))
	require.Equal(t, 403, w.Code)
}
func TestPasswordsAreNotReturned(t *testing.T) {
	isolatedDB(t)
	r := gin.New()
	r.GET("/users", GetUsers)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/users", nil))
	require.NotContains(t, w.Body.String(), "password")
	require.NotContains(t, w.Body.String(), "$2a$")
}
func TestMalformedJWTDoesNotPanic(t *testing.T) {
	isolatedDB(t)
	old := jwtSecret
	jwtSecret = []byte("test-only-signing-key")
	t.Cleanup(func() { jwtSecret = old })
	r := gin.New()
	r.Use(AuthMiddleware())
	r.GET("/me", GetMe)
	for _, claims := range []jwt.MapClaims{{"userId": 42, "exp": time.Now().Add(time.Hour).Unix()}, {"userId": "1"}, {"userId": "1", "exp": time.Now().Add(-time.Hour).Unix()}} {
		token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret)
		req := httptest.NewRequest("GET", "/me", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		require.Equal(t, 401, w.Code)
	}
}
func TestStudentCannotChangeTeachingContent(t *testing.T) {
	isolatedDB(t)
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("userId", "student-1"); c.Set("role", string(RoleStudent)) }, PermissionMiddleware())
	r.POST("/api/scenarios", CreateScenario)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("POST", "/api/scenarios", strings.NewReader(`{"name":"disallowed"}`)))
	require.Equal(t, 403, w.Code)
}

func TestHomeworkSubmissionCompletion(t *testing.T) {
	isolatedDB(t)
	require.NoError(t, DB.Create(&Homework{ID: "submission", StudentIDs: []string{"student-1"}, Total: 1, Status: "pending"}).Error)
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("userId", "student-1"); c.Set("role", string(RoleStudent)) })
	r.POST("/history", CreateHistory)
	for i := 0; i < 2; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/history", strings.NewReader(`{"homeworkId":"submission","studentId":"forged","total":"1","correctCount":1,"questions":[]}`))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		require.Equal(t, 200, w.Code)
		require.Contains(t, w.Body.String(), `"code":0`)
	}
	var hw Homework
	require.NoError(t, DB.First(&hw, "id = ?", "submission").Error)
	require.Equal(t, 1, hw.Completed, "repeat submissions must not count as multiple students")
	require.Equal(t, "completed", hw.Status)
	var records []History
	require.NoError(t, DB.Find(&records).Error)
	require.Len(t, records, 2)
	for _, h := range records {
		require.Equal(t, "student-1", h.StudentID)
	}
}

func TestWrongBookUsesConfiguredAnswerHints(t *testing.T) {
	isolatedDB(t)
	require.NoError(t, DB.Create(&Question{ID: "hint-question", StemText: "test"}).Error)
	require.NoError(t, DB.Create(&StudentWrongQuestion{ID: "hint-state", StudentID: "student-1", QuestionID: "hint-question", Status: 2}).Error)
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("userId", "student-1"); c.Set("role", string(RoleStudent)) })
	r.GET("/wrong-book", GetWrongBook)
	for _, enabled := range []bool{true, false} {
		cfg, err := json.Marshal(ErrorLogicConfig{GlobalEnabled: enabled, Stages: map[int]StageConfig{2: {ShowAnswer: true}}})
		require.NoError(t, err)
		require.NoError(t, DB.Save(&SystemConfig{Key: "error_logic", Value: string(cfg)}).Error)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest("GET", "/wrong-book", nil))
		var response struct {
			Data []StudentWrongQuestion `json:"data"`
		}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
		require.Len(t, response.Data, 1)
		require.Equal(t, enabled, response.Data[0].ShowAnswer)
	}
}

func TestResourceSearchAndEdit(t *testing.T) {
	isolatedDB(t)
	require.NoError(t, DB.Create(&Resource{ID: "asset-1", Name: "Class image", Tags: []string{"math"}, URL: "https://example.org/old.png", Type: "image", CreatorID: "teacher-1", Visibility: "personal"}).Error)
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("userId", "teacher-1"); c.Set("role", string(RoleTeacher)) })
	r.GET("/resources", GetResources)
	r.PUT("/resources/:id", UpdateResource)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/resources?keyword=math&page=1&pageSize=12", nil))
	var response struct {
		Data struct {
			List  []Resource `json:"list"`
			Total int        `json:"total"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
	require.Equal(t, 1, response.Data.Total)
	require.Len(t, response.Data.List, 1)
	req := httptest.NewRequest("PUT", "/resources/asset-1", strings.NewReader(`{"name":"Updated", "url":"https://example.org/new.mp4", "type":"video", "visibility":"personal", "tags":["math"]}`))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Contains(t, w.Body.String(), `"code":0`)
	var asset Resource
	require.NoError(t, DB.First(&asset, "id = ?", "asset-1").Error)
	require.Equal(t, "https://example.org/new.mp4", asset.URL)
	require.Equal(t, "video", asset.Type)
}
