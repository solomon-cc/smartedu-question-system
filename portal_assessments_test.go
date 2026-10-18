package main

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"testing"
)

func TestPortalAssessmentFamilyIsolationAndTargetedPractice(t *testing.T) {
	r, tokens := portalTestRouter(t)
	w, _ := portalRequest(t, r, "", "GET", "/assessment-methods", nil)
	require.Equal(t, 200, w.Code)
	w, _ = portalRequest(t, r, "", "POST", "/appointments", gin.H{})
	require.Equal(t, 404, w.Code)
	w, _ = portalRequest(t, r, tokens["parent"], "GET", "/manage/appointments", nil)
	require.Equal(t, 404, w.Code)
	w, _ = portalRequest(t, r, tokens["parent"], "POST", "/assessments/peak/records", gin.H{"studentId": "student", "module": "D"})
	require.Equal(t, 403, w.Code)
	w, out := portalRequest(t, r, tokens["teacher"], "POST", "/assessments/peak/records", gin.H{"studentId": "student", "module": "D"})
	require.Equal(t, 200, w.Code)
	var record AssessmentRecord
	require.NoError(t, json.Unmarshal(out["data"], &record))
	require.NotEmpty(t, record.ID)
	require.Equal(t, "ongoing", record.Status)
	path := "/assessments/peak/records/" + record.ID
	for _, token := range []string{tokens["parent"], tokens["outsider"]} {
		w, _ = portalRequest(t, r, token, "GET", path, nil)
		require.Equal(t, 403, w.Code)
	}
	w, _ = portalRequest(t, r, tokens["trainer"], "GET", path, nil)
	require.Equal(t, 403, w.Code)
	w, _ = portalRequest(t, r, tokens["teacher"], "PUT", "/manage/parent-links/parent", gin.H{"studentIds": []string{"student"}})
	require.Equal(t, 403, w.Code)
	w, _ = portalRequest(t, r, tokens["admin"], "PUT", "/manage/parent-links/parent", gin.H{"studentIds": []string{"teacher"}})
	require.Equal(t, 400, w.Code)
	w, _ = portalRequest(t, r, tokens["admin"], "PUT", "/manage/parent-links/parent", gin.H{"studentIds": []string{"student"}})
	require.Equal(t, 200, w.Code)
	w, out = portalRequest(t, r, tokens["parent"], "GET", "/assessment-students", nil)
	require.Equal(t, 200, w.Code)
	require.Contains(t, string(out["data"]), "student")
	require.NotContains(t, string(out["data"]), "password")
	w, out = portalRequest(t, r, tokens["parent"], "GET", path, nil)
	require.Equal(t, 200, w.Code)
	var detail struct{ Definition AssessmentDefinition }
	require.NoError(t, json.Unmarshal(out["data"], &detail))
	require.Len(t, detail.Definition.Items, 64)
	require.Empty(t, detail.Definition.Items[0].Script)
	require.Nil(t, detail.Definition.Items[0].Definition)
	w, _ = portalRequest(t, r, tokens["parent"], "POST", path+"/responses", gin.H{"code": "1A", "score": 1})
	require.Equal(t, 403, w.Code)
	w, out = portalRequest(t, r, tokens["teacher"], "POST", path+"/complete", gin.H{})
	require.Equal(t, 200, w.Code)
	require.JSONEq(t, "1", string(out["code"]))
	method, _ := assessmentMethods.Get("peak")
	def, err := method.Definition(peakVersion)
	require.NoError(t, err)
	var code string
	for _, i := range def.Items {
		if i.Module != "D" {
			continue
		}
		score := float64(0)
		if code == "" {
			code = i.Code
			w, out = portalRequest(t, r, tokens["teacher"], "POST", path+"/responses", gin.H{"code": code, "score": 0, "response": "实际反应", "notes": "仅施测人员备注"})
			require.Equal(t, 200, w.Code)
			require.JSONEq(t, "0", string(out["code"]))
		} else {
			require.NoError(t, method.Repository().SaveResponse(DB, AssessmentResponse{MethodID: "peak", AssessmentID: record.ID, Code: i.Code, Score: &score}))
		}
	}
	w, out = portalRequest(t, r, tokens["student"], "GET", "/assessments", nil)
	require.Equal(t, 200, w.Code)
	var summaries []portalAssessmentSummary
	require.NoError(t, json.Unmarshal(out["data"], &summaries))
	require.Len(t, summaries, 1)
	require.Equal(t, 64, summaries[0].Recorded)
	require.NoError(t, DB.Create(&SkillTopic{ID: "test-topic", Name: "沟通", Subject: "LANGUAGE", Grade: 1}).Error)
	require.NoError(t, DB.Create(&SkillObjective{ID: "test-objective", TopicID: "test-topic", Name: "表达需要"}).Error)
	require.NoError(t, DB.Create(&[]Question{{ID: "target-q", ObjectiveID: "test-objective", Answer: "A", StemText: "测试题", Subject: "LANGUAGE", Grade: 1}, {ID: "other-q", ObjectiveID: "other", Answer: "B"}}).Error)
	target := gin.H{"sourceCodes": []string{code}, "objectiveId": "test-objective", "target": "练习表达需要"}
	w, _ = portalRequest(t, r, tokens["teacher"], "POST", path+"/targets", target)
	require.Equal(t, 400, w.Code)
	w, out = portalRequest(t, r, tokens["teacher"], "POST", path+"/complete", gin.H{})
	require.Equal(t, 200, w.Code)
	require.JSONEq(t, "0", string(out["code"]))
	w, out = portalRequest(t, r, tokens["teacher"], "POST", path+"/responses", gin.H{"code": code, "score": 1})
	require.JSONEq(t, "1", string(out["code"]))
	w, out = portalRequest(t, r, tokens["teacher"], "POST", path+"/targets", target)
	require.Equal(t, 200, w.Code)
	var plan StudentLearningPlan
	require.NoError(t, json.Unmarshal(out["data"], &plan))
	require.Equal(t, record.ID, plan.AssessmentID)
	w, out = portalRequest(t, r, tokens["parent"], "GET", path, nil)
	require.Equal(t, 200, w.Code)
	require.Contains(t, string(out["data"]), "练习表达需要")
	require.NotContains(t, string(out["data"]), "仅施测人员备注")
	w, _ = portalRequest(t, r, tokens["parent"], "GET", "/practice?objectiveId=test-objective", nil)
	require.Equal(t, 403, w.Code)
	query := "?planId=" + plan.ID
	w, out = portalRequest(t, r, tokens["parent"], "GET", "/practice"+query, nil)
	require.Equal(t, 200, w.Code)
	require.Contains(t, string(out["data"]), "target-q")
	require.NotContains(t, string(out["data"]), "other-q")
	require.NotContains(t, string(out["data"]), "\"answer\":\"A\"")
	w, _ = portalRequest(t, r, tokens["outsider"], "GET", "/practice"+query, nil)
	require.Equal(t, 403, w.Code)
	w, _ = portalRequest(t, r, tokens["parent"], "POST", "/practice/other-q"+query, gin.H{"answer": "B"})
	require.Equal(t, 403, w.Code)
	w, out = portalRequest(t, r, tokens["parent"], "POST", "/practice/target-q"+query, gin.H{"answer": "A"})
	require.Equal(t, 200, w.Code)
	var attempt PortalAttempt
	require.NoError(t, DB.First(&attempt, "question_id = ?", "target-q").Error)
	require.Equal(t, "student", attempt.UserID)
	require.Equal(t, "parent", attempt.ActorID)
	require.True(t, attempt.Correct)
	w, _ = portalRequest(t, r, tokens["admin"], "PUT", "/manage/parent-links/parent", gin.H{"studentIds": []string{}})
	require.Equal(t, 200, w.Code)
	w, _ = portalRequest(t, r, tokens["parent"], "GET", path, nil)
	require.Equal(t, 403, w.Code)
	w, _ = portalRequest(t, r, tokens["parent"], "GET", "/practice"+query, nil)
	require.Equal(t, 403, w.Code)
	require.NoError(t, DB.Create(&User{ID: "other-student", Username: "other-student", Role: RoleStudent, Status: "active"}).Error)
	require.NoError(t, DB.Create(&PEAKAssessment{ID: "other-assessment", StudentID: "other-student", Module: "D", Version: peakVersion, Status: "ongoing"}).Error)
	w, _ = portalRequest(t, r, tokens["student"], "GET", "/assessments/peak/records/other-assessment", nil)
	require.Equal(t, 403, w.Code)
	w, out = portalRequest(t, r, tokens["student"], "GET", "/assessments?studentId=other-student", nil)
	require.Equal(t, 200, w.Code)
	require.JSONEq(t, "[]", string(out["data"]))
}
