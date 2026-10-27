package main

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestPortalAnswerNormalizationAndChoiceValidation(t *testing.T) {
	r, tokens := portalTestRouter(t)
	q := Question{ID: "multiple", Subject: "MATH", Grade: 1, Type: "MULTIPLE_SELECT", StemText: "多选", Options: []Option{{Value: "A", Text: "甲"}, {Value: "B", Text: "乙"}, {Value: "C", Text: "丙"}}, Answer: "A, C"}
	require.NoError(t, DB.Create(&q).Error)
	w, out := portalRequest(t, r, tokens["student"], "POST", "/practice/multiple", gin.H{"answer": "C,A", "requestId": "normalization"})
	require.Equal(t, 200, w.Code)
	require.Contains(t, string(out["data"]), `"correct":true`)
	q.ID = ""
	q.Answer = " A， C "
	w, out = portalRequest(t, r, tokens["teacher"], "POST", "/manage/questions", q)
	require.Equal(t, 200, w.Code)
	require.Contains(t, string(out["data"]), `"answer":"A,C"`)
	for _, tt := range []struct{ kind, answer string }{{"MULTIPLE_CHOICE", "A,C"}, {"TRUE_FALSE", "A,C"}, {"MULTIPLE_SELECT", "A,A"}} {
		q.Type = tt.kind
		q.Answer = tt.answer
		w, _ = portalRequest(t, r, tokens["teacher"], "POST", "/manage/questions", q)
		require.Equal(t, 400, w.Code)
	}
}
func TestPortalAnswerRetryAndRewardPermissions(t *testing.T) {
	r, tokens := portalTestRouter(t)
	require.NoError(t, DB.Create(&Question{ID: "q", Subject: "MATH", Grade: 1, Type: "FILL_BLANK", StemText: "一加一", Answer: "2"}).Error)
	for _, v := range []Reinforcement{
		{ID: "global", Name: "全局", Type: "text", Prompt: "继续", Duration: 3, IsGlobal: true, RuleType: "fixed", RuleValue: 1, IsActive: true},
		{ID: "target", Name: "专属", Type: "sticker", Image: "star", Duration: 3, TargetStudentIDs: []string{"student"}, RuleType: "correct_count", RuleValue: 1, IsActive: true},
		{ID: "other", Name: "他人专属", Type: "text", Duration: 3, TargetStudentIDs: []string{"outsider"}, RuleType: "fixed", RuleValue: 1, IsActive: true},
	} {
		require.NoError(t, DB.Create(&v).Error)
	}
	body := gin.H{"answer": "2", "requestId": "same-operation"}
	w, out := portalRequest(t, r, tokens["student"], "POST", "/practice/q", body)
	require.Equal(t, 200, w.Code)
	var first map[string]any
	require.NoError(t, json.Unmarshal(out["data"], &first))
	require.Equal(t, "target", first["reward"].(map[string]any)["id"])
	require.NotContains(t, string(out["data"]), "targetStudentIds")
	require.NotContains(t, string(out["data"]), "ruleType")
	w, _ = portalRequest(t, r, tokens["student"], "POST", "/practice/q", body)
	require.Equal(t, 200, w.Code)
	var n int64
	DB.Model(&PortalAttempt{}).Where("user_id = ?", "student").Count(&n)
	require.EqualValues(t, 1, n)
	w, _ = portalRequest(t, r, tokens["student"], "POST", "/practice/q", gin.H{"answer": "3", "requestId": "same-operation"})
	require.Equal(t, 409, w.Code)
	for _, role := range []string{"teacher", "admin"} {
		w, out = portalRequest(t, r, tokens[role], "POST", "/practice/q", body)
		require.Equal(t, 200, w.Code)
		require.Contains(t, string(out["data"]), `"reward":null`)
	}
	DB.Model(&PortalAttempt{}).Count(&n)
	require.EqualValues(t, 1, n)
}
func TestPortalRewardCountersAndInactiveExclusion(t *testing.T) {
	portalTestRouter(t)
	fixed := Reinforcement{ID: "fixed", Name: "间隔", Type: "text", Duration: 3, IsGlobal: true, RuleType: "fixed", RuleValue: 2, IsActive: true}
	require.NoError(t, DB.Create(&fixed).Error)
	now := time.Now().UTC()
	a := PortalAttempt{ID: "a", UserID: "student", Correct: false, CreatedAt: now}
	require.NoError(t, DB.Create(&a).Error)
	require.Nil(t, portalRewardForAttempt(DB, a))
	b := PortalAttempt{ID: "b", UserID: "student", Correct: true, CreatedAt: now.Add(time.Second)}
	require.NoError(t, DB.Create(&b).Error)
	require.Equal(t, "fixed", portalRewardForAttempt(DB, b).ID)
	require.NoError(t, DB.Model(&fixed).Update("is_active", false).Error)
	require.Nil(t, portalRewardForAttempt(DB, b))
	require.NoError(t, DB.Model(&fixed).Updates(map[string]any{"is_active": true, "rule_type": "correct_count"}).Error)
	require.Nil(t, portalRewardForAttempt(DB, b))
	c := PortalAttempt{ID: "c", UserID: "student", Correct: true, CreatedAt: now.Add(2 * time.Second)}
	require.NoError(t, DB.Create(&c).Error)
	require.Equal(t, "fixed", portalRewardForAttempt(DB, c).ID)
	require.NoError(t, DB.Model(&fixed).Updates(map[string]any{"rule_type": "average", "rule_value": 1}).Error)
	require.Equal(t, "fixed", portalRewardForAttempt(DB, c).ID)
}
