package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

// This instrument exists only in tests. It deliberately differs from PEAK in
// module identity, fractional scoring, versions and completion requirements.
type testAssessmentMethod struct{}

func (testAssessmentMethod) Info() AssessmentMethodInfo {
	return AssessmentMethodInfo{ID: "test-observation", Name: "测试观察法", CurrentVersion: "v2", Versions: []string{"v1", "v2"}, Renderer: "numeric", CanLinkTargets: true, CanCompare: true}
}
func (testAssessmentMethod) Definition(version string) (AssessmentDefinition, error) {
	if version != "v1" && version != "v2" {
		return AssessmentDefinition{}, errors.New("未知观察版本")
	}
	min, max, step := 0.0, 3.0, 0.5
	if version == "v2" {
		max = 6
	}
	return AssessmentDefinition{MethodID: "test-observation", Version: version, Modules: []AssessmentModule{{ID: "OBS", Name: "观察"}}, Items: []AssessmentItem{{Module: "OBS", Code: "FLS-1", Title: "测试观察", Script: "教师提示", Materials: []string{"/test.png"}}, {Module: "OBS", Code: "optional", Title: "可选观察"}}, Scoring: AssessmentScoring{Min: &min, Max: &max, Step: &step, Options: []AssessmentScoreOption{}}}, nil
}
func (testAssessmentMethod) Repository() AssessmentRepository {
	return SQLAssessmentRepository{MethodID: "test-observation"}
}
func (m testAssessmentMethod) ValidateResponse(record AssessmentRecord, response AssessmentResponse) error {
	def, err := m.Definition(record.Version)
	if err != nil {
		return err
	}
	if response.Score == nil || *response.Score < *def.Scoring.Min || *response.Score > *def.Scoring.Max {
		return errors.New("观察值超出该版本范围")
	}
	return nil
}
func (m testAssessmentMethod) ValidateCompletion(record AssessmentRecord, responses []AssessmentResponse) error {
	if len(responses) == 0 {
		return errors.New("至少记录一个观察项目")
	}
	for _, response := range responses {
		if err := m.ValidateResponse(record, response); err != nil {
			return err
		}
	}
	return nil
}
func (testAssessmentMethod) Compare(record AssessmentRecord, before, after *AssessmentResponse) string {
	if before == nil || after == nil {
		return "观察法：待补充"
	}
	return fmt.Sprintf("观察法 %s：变化 %.1f", record.Version, *after.Score-*before.Score)
}
func assessmentMethodFixture(t *testing.T) (*gin.Engine, *string, *string) {
	t.Helper()
	isolatedDB(t)
	old := assessmentMethods
	assessmentMethods = NewAssessmentRegistry(PEAKMethod{}, testAssessmentMethod{})
	t.Cleanup(func() { assessmentMethods = old })
	require.NoError(t, DB.Create(&User{ID: "student", Username: "method-student", Role: RoleStudent, Status: "active"}).Error)
	role, user := string(RoleTeacher), "teacher"
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("role", role); c.Set("userId", user) }, PermissionMiddleware())
	r.GET("/api/assessments/methods", GetAssessmentMethods)
	r.GET("/api/assessments/records", GetAllAssessmentRecords)
	r.GET("/api/assessments/methods/:method/catalog", GetMethodAssessmentDefinition)
	r.GET("/api/assessments/methods/:method/records", GetMethodAssessmentRecords)
	r.POST("/api/assessments/methods/:method/records", CreateMethodAssessment)
	r.GET("/api/assessments/methods/:method/records/:id", GetMethodAssessment)
	r.GET("/api/assessments/methods/:method/records/:id/responses", GetMethodAssessmentResponses)
	r.POST("/api/assessments/methods/:method/records/:id/responses", SaveMethodAssessmentResponse)
	r.POST("/api/assessments/methods/:method/records/:id/complete", CompleteMethodAssessment)
	r.POST("/api/assessments/peak/:id/scores", SavePEAKScore)
	r.GET("/api/assessments/peak/:id/scores", GetPEAKScores)
	r.POST("/api/students/:id/learning-plans", CreateStudentLearningPlan)
	r.POST("/api/students/:id/learning-plans/:planId/assign", AssignStudentLearningPlan)
	r.POST("/api/students/:id/learning-plans/:planId/reassessment", ReassessStudentLearningPlan)
	r.GET("/api/students/:id/learning-plans/:planId/comparison", CompareStudentLearningPlan)
	return r, &role, &user
}
func methodCall(t *testing.T, r *gin.Engine, verb, path, body string) (int, map[string]any) {
	t.Helper()
	w := httptest.NewRecorder()
	req := httptest.NewRequest(verb, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	var payload map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	return w.Code, payload
}
func TestAssessmentMethodRulesAndCompatibility(t *testing.T) {
	r, role, user := assessmentMethodFixture(t)
	_, result := methodCall(t, r, "GET", "/api/assessments/methods", "")
	require.Len(t, result["data"], 2)
	status, _ := methodCall(t, r, "GET", "/api/assessments/methods/unknown/records", "")
	require.Equal(t, 404, status)
	_, result = methodCall(t, r, "POST", "/api/assessments/methods/test-observation/records", `{"studentId":"student","module":"OBS","version":"absent"}`)
	require.EqualValues(t, 1, result["code"])
	for _, body := range []string{`{"studentId":"missing","module":"OBS"}`, `{"studentId":"student","module":"D"}`} {
		_, result = methodCall(t, r, "POST", "/api/assessments/methods/test-observation/records", body)
		require.EqualValues(t, 1, result["code"])
	}
	// IDs can overlap across methods, without sharing responses.
	require.NoError(t, DB.Create(&PEAKAssessment{ID: "same", StudentID: "student", Module: "D", Version: peakVersion, Status: "ongoing"}).Error)
	require.NoError(t, DB.Create(&AssessmentRecord{MethodID: "test-observation", ID: "same", StudentID: "student", Module: "OBS", Version: "v1", Status: "ongoing"}).Error)
	peak := "/api/assessments/methods/peak/records/same"
	obs := "/api/assessments/methods/test-observation/records/same"
	_, result = methodCall(t, r, "POST", peak+"/responses", `{"code":"FLS-1","score":0.5}`)
	require.EqualValues(t, 1, result["code"])
	_, result = methodCall(t, r, "POST", obs+"/responses", `{"methodId":"peak","assessmentId":"hijack","code":"FLS-1","score":0.5,"notes":"fractional"}`)
	require.EqualValues(t, 0, result["code"])
	require.Equal(t, "test-observation", result["data"].(map[string]any)["methodId"])
	_, result = methodCall(t, r, "POST", obs+"/responses", `{"code":"optional","score":4}`)
	require.EqualValues(t, 1, result["code"], "must use pinned v1, not current v2")
	_, result = methodCall(t, r, "POST", obs+"/responses", `{"code":"foreign","score":1}`)
	require.EqualValues(t, 1, result["code"])
	_, result = methodCall(t, r, "POST", "/api/assessments/peak/same/scores", `{"code":"FLS-1","score":0}`)
	require.EqualValues(t, 0, result["code"])
	_, result = methodCall(t, r, "GET", peak+"/responses", "")
	require.EqualValues(t, 0, result["data"].([]any)[0].(map[string]any)["score"])
	_, result = methodCall(t, r, "POST", peak+"/responses", `{"code":"FLS-1","score":1}`)
	require.EqualValues(t, 0, result["code"])
	_, result = methodCall(t, r, "GET", "/api/assessments/peak/same/scores", "")
	require.EqualValues(t, 1, result["data"].([]any)[0].(map[string]any)["score"])
	_, result = methodCall(t, r, "POST", peak+"/complete", `{}`)
	require.EqualValues(t, 1, result["code"])
	_, result = methodCall(t, r, "POST", obs+"/complete", `{}`)
	require.EqualValues(t, 0, result["code"], "new method must not inherit all-64 completion")
	_, result = methodCall(t, r, "POST", obs+"/responses", `{"code":"FLS-1","score":2}`)
	require.EqualValues(t, 1, result["code"])
	_, result = methodCall(t, r, "GET", obs+"/responses", "")
	require.EqualValues(t, 0.5, result["data"].([]any)[0].(map[string]any)["score"])
	_, result = methodCall(t, r, "GET", "/api/assessments/records?studentId=student", "")
	require.Len(t, result["data"], 2)
	*role, *user = string(RoleStudent), "other"
	status, _ = methodCall(t, r, "GET", obs+"/responses", "")
	require.Equal(t, 403, status)
	_, result = methodCall(t, r, "GET", "/api/assessments/records?studentId=student", "")
	require.Empty(t, result["data"])
	*user = "student"
	status, _ = methodCall(t, r, "GET", obs+"/responses", "")
	require.Equal(t, 200, status)
	status, _ = methodCall(t, r, "POST", obs+"/responses", `{"code":"FLS-1","score":2}`)
	require.Equal(t, 403, status)
	_, result = methodCall(t, r, "GET", "/api/assessments/methods/test-observation/catalog?version=v1", "")
	item := result["data"].(map[string]any)["items"].([]any)[0].(map[string]any)
	require.NotContains(t, item, "script")
	require.NotContains(t, item, "materials")
	*role = string(RoleTeacher)
	_, result = methodCall(t, r, "GET", "/api/assessments/methods/test-observation/catalog?version=v1", "")
	require.Equal(t, "教师提示", result["data"].(map[string]any)["items"].([]any)[0].(map[string]any)["script"])
}
func TestAssessmentMethodLearningPlanRetainsVersionAndInterpretation(t *testing.T) {
	r, _, _ := assessmentMethodFixture(t)
	require.NoError(t, DB.Create(&SkillObjective{ID: "goal", Name: "目标"}).Error)
	require.NoError(t, DB.Create(&Question{ID: "q", ObjectiveID: "goal", StemText: "训练"}).Error)
	require.NoError(t, DB.Create(&AssessmentRecord{MethodID: "test-observation", ID: "base", StudentID: "student", Module: "OBS", Version: "v1", Status: "completed"}).Error)
	value := 0.5
	require.NoError(t, DB.Create(&AssessmentResponse{MethodID: "test-observation", AssessmentID: "base", Code: "FLS-1", Score: &value}).Error)
	_, res := methodCall(t, r, "POST", "/api/students/student/learning-plans", `{"methodId":"test-observation","assessmentId":"base","sourceCodes":["FLS-1"],"objectiveId":"goal","target":"老师确认的目标"}`)
	require.EqualValues(t, 0, res["code"])
	plan := res["data"].(map[string]any)
	require.Equal(t, "test-observation", plan["methodId"])
	require.Equal(t, "v1", plan["version"])
	path := "/api/students/student/learning-plans/" + plan["id"].(string)
	_, res = methodCall(t, r, "POST", path+"/assign", `{"name":"训练","questionIds":["q"],"startDate":"2026-10-09","endDate":"2026-10-12"}`)
	require.EqualValues(t, 0, res["code"])
	_, res = methodCall(t, r, "POST", path+"/reassessment", `{}`)
	require.EqualValues(t, 0, res["code"])
	id := res["data"].(map[string]any)["followupAssessmentId"].(string)
	var record AssessmentRecord
	require.NoError(t, DB.First(&record, "method_id = ? AND id = ?", "test-observation", id).Error)
	require.Equal(t, "v1", record.Version)
	require.Equal(t, "OBS", record.Module)
	_, res = methodCall(t, r, "GET", path+"/comparison", "")
	require.Equal(t, "观察法：待补充", res["data"].(map[string]any)["items"].([]any)[0].(map[string]any)["observation"])
	_, res = methodCall(t, r, "POST", "/api/assessments/methods/test-observation/records/"+id+"/responses", `{"code":"FLS-1","score":2}`)
	require.EqualValues(t, 0, res["code"])
	_, res = methodCall(t, r, "GET", path+"/comparison", "")
	require.Equal(t, "观察法 v1：变化 1.5", res["data"].(map[string]any)["items"].([]any)[0].(map[string]any)["observation"])
	require.NoError(t, DB.Model(&AssessmentRecord{}).Where("method_id = ? AND id = ?", "test-observation", id).Update("version", "v2").Error)
	_, res = methodCall(t, r, "GET", path+"/comparison", "")
	require.EqualValues(t, 1, res["code"])
}
