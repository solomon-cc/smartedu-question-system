package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func portalTestRouter(t *testing.T) (*gin.Engine, map[string]string) {
	isolatedDB(t)
	t.Setenv("TRAINING_UPLOAD_DIR", t.TempDir())
	old := jwtSecret
	jwtSecret = []byte("portal-tests-only")
	t.Cleanup(func() { jwtSecret = old })
	tokens := map[string]string{}
	for id, r := range map[string]Role{"student": RoleStudent, "teacher": RoleTeacher, "parent": RoleParent, "outsider": RoleParent, "trainer": RoleTrainer, "admin": RoleAdmin, "trainer2": RoleTrainer} {
		require.NoError(t, DB.Create(&User{ID: id, Username: "test-" + id, Role: r, Status: "active"}).Error)
		token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"userId": id, "exp": time.Now().Add(time.Hour).Unix()}).SignedString(jwtSecret)
		require.NoError(t, err)
		tokens[id] = token
	}
	r := gin.New()
	registerPortalRoutes(r.Group("/api"))
	return r, tokens
}
func portalRequest(t *testing.T, r *gin.Engine, token, method, path string, body any) (*httptest.ResponseRecorder, map[string]json.RawMessage) {
	t.Helper()
	var b []byte
	if body != nil {
		b, _ = json.Marshal(body)
	}
	req := httptest.NewRequest(method, "/api/portal"+path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	out := map[string]json.RawMessage{}
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w, out
}
func portalCourseFixture(t *testing.T) TrainingCourse {
	v := TrainingCourse{ID: "private", OwnerID: "trainer", Title: "指定培训", Audience: "parent", Visibility: "assigned", UserIDs: []string{"parent"}, Published: true, Lessons: []TrainingLesson{{ID: "lesson", Title: "第一节", Kind: "text", Text: "学习正文"}}}
	require.NoError(t, DB.Create(&v).Error)
	return v
}
func TestPortalCoursePrivacyAndOwnership(t *testing.T) {
	r, tokens := portalTestRouter(t)
	v := portalCourseFixture(t)
	w, out := portalRequest(t, r, "", "GET", "/courses", nil)
	require.Equal(t, 200, w.Code)
	require.JSONEq(t, "[]", string(out["data"]))
	for _, id := range []string{"student", "outsider", "teacher", "trainer2"} {
		w, _ := portalRequest(t, r, tokens[id], "GET", "/courses/private", nil)
		require.Equal(t, 403, w.Code, id)
	}
	w, out = portalRequest(t, r, tokens["parent"], "GET", "/courses/private", nil)
	require.Equal(t, 200, w.Code)
	require.Contains(t, string(out["data"]), "\"userIds\":null")
	w, _ = portalRequest(t, r, tokens["trainer2"], "PUT", "/manage/courses/private", v)
	require.Equal(t, 403, w.Code)
	w, _ = portalRequest(t, r, tokens["teacher"], "POST", "/manage/courses", v)
	require.Equal(t, 403, w.Code)
	require.NoError(t, DB.Model(&v).Update("published", false).Error)
	w, _ = portalRequest(t, r, tokens["parent"], "GET", "/courses/private", nil)
	require.Equal(t, 403, w.Code)
	w, _ = portalRequest(t, r, tokens["trainer"], "GET", "/courses/private", nil)
	require.Equal(t, 200, w.Code)
}
func TestPortalProgressPersistsAndDoesNotLeak(t *testing.T) {
	r, tokens := portalTestRouter(t)
	portalCourseFixture(t)
	w, _ := portalRequest(t, r, tokens["outsider"], "PUT", "/progress/lesson", gin.H{"position": 10})
	require.Equal(t, 403, w.Code)
	w, _ = portalRequest(t, r, tokens["parent"], "PUT", "/progress/lesson", gin.H{"position": 45, "completed": true})
	require.Equal(t, 200, w.Code)
	w, _ = portalRequest(t, r, tokens["parent"], "PUT", "/progress/lesson", gin.H{"position": 12, "completed": false})
	require.Equal(t, 200, w.Code)
	var p TrainingProgress
	require.NoError(t, DB.First(&p, "user_id = ?", "parent").Error)
	require.Equal(t, 12., p.Position)
	require.True(t, p.Completed)
	_, out := portalRequest(t, r, tokens["outsider"], "GET", "/progress", nil)
	require.NotContains(t, string(out["data"]), "lesson")
}
func TestPortalProgressIncludesEligibleCourseLessonSummaries(t *testing.T) {
	r, tokens := portalTestRouter(t)
	portalCourseFixture(t)
	require.NoError(t, DB.Create(&TrainingLesson{ID: "lesson2", CourseID: "private", Title: "第二节", Kind: "video", UploadID: "protected-upload", Duration: 120, SortOrder: 1}).Error)
	for _, course := range []TrainingCourse{
		{ID: "public", OwnerID: "trainer", Title: "公开培训", Audience: "teacher", Visibility: "all", Published: true, Lessons: []TrainingLesson{{ID: "public-lesson", Title: "公开章节", Kind: "text", Text: "公开课程正文仍不在进度接口返回"}}},
		{ID: "other-private", OwnerID: "trainer", Title: "其他学员的指定课程", Audience: "parent", Visibility: "assigned", UserIDs: []string{"outsider"}, Published: true, Lessons: []TrainingLesson{{ID: "other-lesson", Title: "其他学员章节", Kind: "text", Text: "不可见正文"}}},
		{ID: "draft", OwnerID: "trainer", Title: "未发布课程", Audience: "parent", Visibility: "all", Published: false, Lessons: []TrainingLesson{{ID: "draft-lesson", Title: "草稿章节", Kind: "text", Text: "草稿正文"}}},
	} {
		require.NoError(t, DB.Create(&course).Error)
	}
	require.NoError(t, DB.Create(&TrainingProgress{UserID: "parent", LessonID: "lesson", Position: 45, Completed: true}).Error)
	w, out := portalRequest(t, r, tokens["parent"], "GET", "/progress", nil)
	require.Equal(t, 200, w.Code)
	var result struct {
		Courses []struct {
			ID      string           `json:"id"`
			Lessons []map[string]any `json:"lessons"`
		} `json:"courses"`
		Progress []TrainingProgress `json:"progress"`
	}
	require.NoError(t, json.Unmarshal(out["data"], &result))
	require.Len(t, result.Courses, 2)
	var raw struct {
		Courses []map[string]json.RawMessage `json:"courses"`
	}
	require.NoError(t, json.Unmarshal(out["data"], &raw))
	for _, course := range raw.Courses {
		for _, field := range []string{"id", "title", "summary", "audience", "instructor", "ownerId", "published", "visibility", "userIds", "updatedAt", "lessons"} {
			require.Contains(t, course, field)
		}
		require.JSONEq(t, "true", string(course["published"]))
		require.JSONEq(t, "null", string(course["userIds"]))
	}
	byCourse := map[string][]map[string]any{}
	for _, course := range result.Courses {
		byCourse[course.ID] = course.Lessons
	}
	require.Contains(t, byCourse, "public")
	require.Contains(t, byCourse, "private")
	require.NotContains(t, byCourse, "other-private")
	require.NotContains(t, byCourse, "draft")
	require.Equal(t, []map[string]any{
		{"id": "lesson", "title": "第一节", "kind": "text", "duration": float64(0)},
		{"id": "lesson2", "title": "第二节", "kind": "video", "duration": float64(120)},
	}, byCourse["private"])
	require.Len(t, result.Progress, 1)
	require.Equal(t, byCourse["private"][0]["id"], result.Progress[0].LessonID)
	require.True(t, result.Progress[0].Completed)
	require.NotContains(t, string(out["data"]), "学习正文")
	require.NotContains(t, string(out["data"]), "公开课程正文")
	require.NotContains(t, string(out["data"]), "protected-upload")
	require.NotContains(t, string(out["data"]), "\"text\":")
	require.NotContains(t, string(out["data"]), "\"uploadId\":")
}
func TestPortalPracticeServerScoringAndPreview(t *testing.T) {
	r, tokens := portalTestRouter(t)
	require.NoError(t, DB.Create(&Question{ID: "q", Subject: "MATH", Grade: 1, StemText: "1+1", Answer: "2", Hint: "把两个1合在一起", Type: "FILL_BLANK"}).Error)
	w, out := portalRequest(t, r, tokens["student"], "GET", "/practice?subject=MATH&grade=1", nil)
	require.Equal(t, 200, w.Code)
	require.NotContains(t, string(out["data"]), "把两个")
	require.Contains(t, string(out["data"]), "\"answer\":\"\"")
	for _, id := range []string{"student", "teacher", "admin"} {
		w, out = portalRequest(t, r, tokens[id], "POST", "/practice/q", gin.H{"answer": "2"})
		require.Equal(t, 200, w.Code)
		require.Contains(t, string(out["data"]), "\"correct\":true")
	}
	var n int64
	DB.Model(&PortalAttempt{}).Count(&n)
	require.EqualValues(t, 1, n)
	w, _ = portalRequest(t, r, tokens["parent"], "GET", "/practice?subject=MATH&grade=1", nil)
	require.Equal(t, 403, w.Code)
	w, _ = portalRequest(t, r, "", "GET", "/practice?subject=MATH&grade=1", nil)
	require.Equal(t, 401, w.Code)
}
func TestPortalResumableUploadAndProtectedRange(t *testing.T) {
	r, tokens := portalTestRouter(t)
	data := []byte("resumable test document")
	fingerprint := strings.Repeat("a", 64)
	body := gin.H{"name": "test.txt", "size": len(data), "fingerprint": fingerprint}
	w, out := portalRequest(t, r, tokens["trainer"], "POST", "/uploads", body)
	require.Equal(t, 200, w.Code)
	var start struct {
		Upload TrainingUpload `json:"upload"`
	}
	require.NoError(t, json.Unmarshal(out["data"], &start))
	u := start.Upload
	chunk := func(offset int, data []byte, hash string) *httptest.ResponseRecorder {
		req := httptest.NewRequest("PUT", fmt.Sprintf("/api/portal/uploads/%s?offset=%d", u.ID, offset), bytes.NewReader(data))
		req.Header.Set("Authorization", "Bearer "+tokens["trainer"])
		req.Header.Set("X-Chunk-SHA256", hash)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}
	hash := func(b []byte) string { s := sha256.Sum256(b); return hex.EncodeToString(s[:]) }
	require.Equal(t, 400, chunk(0, data[:8], "bad").Code)
	require.Equal(t, 200, chunk(0, data[:8], hash(data[:8])).Code)
	// Retry the first chunk: must not duplicate disk bytes.
	require.Equal(t, 200, chunk(0, data[:8], hash(data[:8])).Code)
	w, out = portalRequest(t, r, tokens["trainer"], "POST", "/uploads", body)
	require.Equal(t, 200, w.Code)
	require.NoError(t, json.Unmarshal(out["data"], &start))
	require.Equal(t, u.ID, start.Upload.ID)
	require.EqualValues(t, 8, start.Upload.Received)
	w, _ = portalRequest(t, r, tokens["trainer2"], "PUT", "/uploads/"+u.ID, nil)
	require.Equal(t, 404, w.Code)
	// Simulate a crash after disk write but before the DB offset commit.
	part, err := os.OpenFile(filepath.Join(portalUploadRoot(), u.ID+".txt.part"), os.O_APPEND|os.O_WRONLY, 0600)
	require.NoError(t, err)
	_, err = part.Write([]byte("uncommitted tail"))
	require.NoError(t, err)
	require.NoError(t, part.Close())
	require.Equal(t, 200, chunk(8, data[8:], hash(data[8:])).Code)
	// Completed bytes must exactly equal the original file after recovering the tail.
	w, _ = portalRequest(t, r, tokens["trainer"], "POST", "/uploads/"+u.ID+"/complete", nil)
	require.Equal(t, 200, w.Code)
	saved, err := os.ReadFile(filepath.Join(portalUploadRoot(), u.ID+".txt"))
	require.NoError(t, err)
	require.Equal(t, data, saved)
	c := portalCourseFixture(t)
	require.NoError(t, DB.Model(&TrainingLesson{}).Where("id = ?", "lesson").Updates(map[string]any{"upload_id": u.ID, "kind": "document"}).Error)
	_ = c
	w, out = portalRequest(t, r, tokens["parent"], "GET", "/media-link/"+u.ID, nil)
	require.Equal(t, 200, w.Code)
	var link struct {
		URL string `json:"url"`
	}
	require.NoError(t, json.Unmarshal(out["data"], &link))
	req := httptest.NewRequest("GET", link.URL, nil)
	req.Header.Set("Range", "bytes=0-3")
	rw := httptest.NewRecorder()
	r.ServeHTTP(rw, req)
	require.Equal(t, 206, rw.Code)
	require.Equal(t, string(data[:4]), rw.Body.String())
	w, _ = portalRequest(t, r, tokens["outsider"], "GET", "/media-link/"+u.ID, nil)
	require.Equal(t, 403, w.Code)
	require.NoError(t, DB.Model(&TrainingCourse{}).Where("id = ?", "private").Update("published", false).Error)
	rw = httptest.NewRecorder()
	r.ServeHTTP(rw, httptest.NewRequest("GET", link.URL, nil))
	require.Equal(t, 403, rw.Code)
}
func TestPortalRoleAdministrationAndValidation(t *testing.T) {
	r, tokens := portalTestRouter(t)
	for _, role := range []Role{RoleParent, RoleTrainer, RoleAdmin} {
		w, out := portalRequest(t, r, tokens["admin"], "POST", "/manage/users", gin.H{"username": "new-" + string(role), "password": "Testing2026", "role": role, "status": "active"})
		require.Equal(t, 200, w.Code)
		require.Equal(t, "0", string(out["code"]))
	}
	w, _ := portalRequest(t, r, tokens["trainer"], "GET", "/manage/users", nil)
	require.Equal(t, 403, w.Code)
	w, _ = portalRequest(t, r, tokens["admin"], "PUT", "/manage/users/parent", gin.H{"username": "parent", "role": "INVALID", "status": "active"})
	require.Equal(t, 400, w.Code)
	w, out := portalRequest(t, r, tokens["admin"], "PUT", "/manage/users/admin", gin.H{"username": "admin", "role": "PARENT", "status": "active"})
	require.Equal(t, 200, w.Code)
	require.NotEqual(t, "0", string(out["code"]))
}

func TestPortalTopicAndQuestionValidation(t *testing.T) {
	r, tokens := portalTestRouter(t)
	w, out := portalRequest(t, r, tokens["teacher"], "POST", "/manage/topics", gin.H{"name": "数量", "subject": "MATH", "grade": 1, "objective": "认识三个"})
	require.Equal(t, 200, w.Code)
	var topic SkillTopic
	require.NoError(t, json.Unmarshal(out["data"], &topic))
	var objectives []SkillObjective
	require.NoError(t, DB.Where("topic_id = ?", topic.ID).Find(&objectives).Error)
	require.Len(t, objectives, 1)
	require.Equal(t, "认识三个", objectives[0].Name)
	q := Question{Subject: "MATH", Grade: 1, Type: "MULTIPLE_CHOICE", StemText: "1+2=?", Answer: "B", ObjectiveID: objectives[0].ID, Options: []Option{{Value: "A", Text: "2"}, {Value: "B", Text: "3"}}}
	w, _ = portalRequest(t, r, tokens["teacher"], "POST", "/manage/questions", q)
	require.Equal(t, 200, w.Code)
	q.Subject = "READING"
	w, _ = portalRequest(t, r, tokens["teacher"], "POST", "/manage/questions", q)
	require.Equal(t, 400, w.Code)
	q.Subject = "MATH"
	q.Answer = "missing"
	w, _ = portalRequest(t, r, tokens["teacher"], "POST", "/manage/questions", q)
	require.Equal(t, 400, w.Code)
	w, _ = portalRequest(t, r, tokens["parent"], "POST", "/manage/topics", gin.H{"name": "不可写入"})
	require.Equal(t, 403, w.Code)
}
