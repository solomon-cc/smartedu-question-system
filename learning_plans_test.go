package main

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestStudentLearningPlanWorkflow(t *testing.T) {
	isolatedDB(t)
	require.NoError(t, DB.Create(&User{ID: "student", Username: "plan-student", Role: RoleStudent, Status: "active"}).Error)
	require.NoError(t, DB.Create(&SkillObjective{ID: "goal", Name: "目标名称", Target: "原目标"}).Error)
	require.NoError(t, DB.Create(&[]Question{{ID: "q", ObjectiveID: "goal", StemText: "训练图片", StemImage: "/image.png", Answer: "A"}, {ID: "wrong", ObjectiveID: "other"}}).Error)
	baseline := PEAKAssessment{ID: "baseline", StudentID: "student", Module: "D", Version: "peak-pa-user-docs-v1", Status: "completed"}
	require.NoError(t, DB.Create(&baseline).Error)
	require.NoError(t, DB.Create(&[]PEAKScore{{AssessmentID: "baseline", Code: "FLS-1", Score: 0, Response: "未独立完成"}, {AssessmentID: "baseline", Code: "FLS-2", Score: 1}}).Error)
	role, uid := string(RoleTeacher), "teacher"
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("role", role); c.Set("userId", uid) }, PermissionMiddleware())
	r.GET("/api/students/:id/learning-plans", GetStudentLearningPlans)
	r.POST("/api/students/:id/learning-plans", CreateStudentLearningPlan)
	r.POST("/api/students/:id/learning-plans/:planId/assign", AssignStudentLearningPlan)
	r.POST("/api/students/:id/learning-plans/:planId/reassessment", ReassessStudentLearningPlan)
	r.GET("/api/students/:id/learning-plans/:planId/comparison", CompareStudentLearningPlan)
	r.GET("/api/homeworks", GetHomeworks)
	r.GET("/api/homeworks/:id/questions", GetHomeworkQuestions)
	r.POST("/api/assessments/peak/:id/scores", SavePEAKScore)
	call := func(method, path, body string) (int, map[string]any) {
		t.Helper()
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(method, path, strings.NewReader(body)))
		var data map[string]any
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &data))
		return w.Code, data
	}
	createBody := `{"assessmentId":"baseline","sourceCodes":["FLS-1","FLS-2"],"objectiveId":"goal","target":"三种材料中独立选择目标图片"}`
	for _, body := range []string{strings.Replace(createBody, "baseline", "missing", 1), strings.Replace(createBody, "FLS-2", "LLS-1", 1), strings.Replace(createBody, "FLS-2", "FLS-1", 1), strings.Replace(createBody, "\"goal\"", "\"missing\"", 1)} {
		_, res := call("POST", "/api/students/student/learning-plans", body)
		require.EqualValues(t, 1, res["code"])
	}
	require.NoError(t, DB.Model(&RolePermission{}).Where("role = ? AND module_id = ?", RoleTeacher, "ability_tracking").Update("api_access", false).Error)
	status, _ := call("POST", "/api/students/student/learning-plans", createBody)
	require.Equal(t, 403, status, "students permission must not bypass goal permissions")
	require.NoError(t, DB.Model(&RolePermission{}).Where("role = ? AND module_id = ?", RoleTeacher, "ability_tracking").Update("api_access", true).Error)
	_, res := call("POST", "/api/students/student/learning-plans", createBody)
	require.EqualValues(t, 0, res["code"])
	planID := res["data"].(map[string]any)["id"].(string)
	path := "/api/students/student/learning-plans/" + planID
	_, res = call("POST", path+"/reassessment", "")
	require.EqualValues(t, 1, res["code"])
	assign := `{"name":"图片选择练习","questionIds":["q"],"startDate":"2026-10-09","endDate":"2026-10-12"}`
	for _, body := range []string{strings.Replace(assign, "\"q\"", "\"wrong\"", 1), strings.Replace(assign, "2026-10-12", "2026-10-01", 1), strings.Replace(assign, "[\"q\"]", "[\"q\",\"q\"]", 1)} {
		_, res = call("POST", path+"/assign", body)
		require.EqualValues(t, 1, res["code"])
	}
	var count int64
	DB.Model(&Paper{}).Count(&count)
	require.Zero(t, count, "failed assignment must not leave papers")
	uid = "other-teacher"
	_, res = call("POST", path+"/assign", assign)
	require.EqualValues(t, 1, res["code"])
	uid = "teacher"
	require.NoError(t, DB.Model(&RolePermission{}).Where("role = ? AND module_id = ?", RoleTeacher, "assignments").Update("api_access", false).Error)
	status, _ = call("POST", path+"/assign", assign)
	require.Equal(t, 403, status)
	require.NoError(t, DB.Model(&RolePermission{}).Where("role = ? AND module_id = ?", RoleTeacher, "assignments").Update("api_access", true).Error)
	_, res = call("POST", path+"/assign", assign)
	require.EqualValues(t, 0, res["code"])
	_, res = call("POST", path+"/assign", assign)
	require.EqualValues(t, 0, res["code"])
	DB.Model(&Paper{}).Count(&count)
	require.EqualValues(t, 1, count)
	DB.Model(&Homework{}).Count(&count)
	require.EqualValues(t, 1, count)
	var plan StudentLearningPlan
	require.NoError(t, DB.First(&plan, "id = ?", planID).Error)
	require.NoError(t, DB.Model(&Question{}).Where("id = ?", "q").Update("stem_text", "题库已改").Error)
	role, uid = string(RoleStudent), "student"
	_, res = call("GET", "/api/homeworks", "")
	require.Len(t, res["data"], 1)
	_, res = call("GET", "/api/homeworks/"+plan.HomeworkID+"/questions", "")
	require.Contains(t, res["data"].(map[string]any)["questions"].([]any)[0], "stemText")
	require.Equal(t, "训练图片", res["data"].(map[string]any)["questions"].([]any)[0].(map[string]any)["stemText"])
	status, _ = call("POST", path+"/assign", assign)
	require.Equal(t, 403, status)
	// Even if an administrator exposes the profile module to students, plan data stay teacher-only.
	require.NoError(t, DB.Model(&RolePermission{}).Where("role = ? AND module_id = ?", RoleStudent, "students").Update("api_access", true).Error)
	status, _ = call("GET", "/api/students/student/learning-plans", "")
	require.Equal(t, 403, status)
	role, uid = string(RoleAdmin), "admin"
	_, res = call("POST", path+"/reassessment", "")
	require.EqualValues(t, 0, res["code"])
	followupID := res["data"].(map[string]any)["followupAssessmentId"].(string)
	_, res = call("POST", path+"/reassessment", "")
	require.Equal(t, followupID, res["data"].(map[string]any)["followupAssessmentId"])
	var after PEAKAssessment
	require.NoError(t, DB.First(&after, "id = ?", followupID).Error)
	require.Equal(t, baseline.Module, after.Module)
	require.Equal(t, baseline.Version, after.Version)
	_, res = call("GET", path+"/comparison", "")
	rows := res["data"].(map[string]any)["items"].([]any)
	require.Nil(t, rows[0].(map[string]any)["after"], "unassessed must remain null")
	_, res = call("POST", "/api/assessments/peak/"+followupID+"/scores", `{"code":"FLS-1","score":1,"notes":"新的材料"}`)
	require.EqualValues(t, 0, res["code"])
	_, res = call("GET", path+"/comparison", "")
	rows = res["data"].(map[string]any)["items"].([]any)
	require.EqualValues(t, 0, rows[0].(map[string]any)["before"].(map[string]any)["score"])
	require.EqualValues(t, 1, rows[0].(map[string]any)["after"].(map[string]any)["score"])
	require.Nil(t, rows[1].(map[string]any)["after"])
	_, res = call("POST", "/api/assessments/peak/baseline/scores", `{"code":"FLS-1","score":1}`)
	require.EqualValues(t, 1, res["code"])
	_, res = call("GET", strings.Replace(path, "/student/", "/someone-else/", 1)+"/comparison", "")
	require.Nil(t, res["data"])
	require.NoError(t, DB.Model(&PEAKAssessment{}).Where("id = ?", followupID).Update("version", "changed").Error)
	_, res = call("GET", path+"/comparison", "")
	require.EqualValues(t, 1, res["code"])
}

func TestLearningPlanAssignmentRollsBackOnStorageFailure(t *testing.T) {
	isolatedDB(t)
	require.NoError(t, DB.Create(&User{ID: "student", Username: "rollback-student", Role: RoleStudent, Status: "active"}).Error)
	require.NoError(t, DB.Create(&StudentLearningPlan{ID: "rollback", StudentID: "student", ObjectiveID: "goal", ConfirmedBy: "teacher", ConfirmedAt: "2026-10-09"}).Error)
	require.NoError(t, DB.Create(&Question{ID: "q", ObjectiveID: "goal"}).Error)
	// Simulate a storage conflict after the paper has been created inside the transaction.
	require.NoError(t, DB.Create(&Homework{ID: "rollback-task"}).Error)
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("role", string(RoleTeacher)); c.Set("userId", "teacher") })
	r.POST("/students/:id/learning-plans/:planId/assign", AssignStudentLearningPlan)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("POST", "/students/student/learning-plans/rollback/assign", strings.NewReader(`{"name":"训练","questionIds":["q"],"startDate":"2026-10-09","endDate":"2026-10-12"}`)))
	var result struct{ Code int }
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &result))
	require.Equal(t, 1, result.Code)
	var count int64
	DB.Model(&Paper{}).Count(&count)
	require.Zero(t, count, "transaction must roll back the new paper")
	var plan StudentLearningPlan
	require.NoError(t, DB.First(&plan, "id = ?", "rollback").Error)
	require.Empty(t, plan.HomeworkID)
	require.Empty(t, plan.PaperID)
}
