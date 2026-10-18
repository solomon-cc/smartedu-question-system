package main

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"testing"
)

func TestPortalReinforcementRolesValidationAndFalseStatus(t *testing.T) {
	r, tokens := portalTestRouter(t)
	body := gin.H{"name": "鼓励提示", "type": "text", "prompt": "继续加油", "duration": 3, "isGlobal": false, "targetStudentIds": []string{"student"}, "ruleType": "correct_count", "ruleValue": 3, "isActive": false}
	for _, role := range []string{"parent", "student", "trainer"} {
		w, _ := portalRequest(t, r, tokens[role], "POST", "/manage/reinforcements", body)
		require.Equal(t, 403, w.Code)
	}
	w, out := portalRequest(t, r, tokens["teacher"], "POST", "/manage/reinforcements", body)
	require.Equal(t, 200, w.Code)
	var saved Reinforcement
	require.NoError(t, json.Unmarshal(out["data"], &saved))
	require.False(t, saved.IsActive)
	var stored Reinforcement
	require.NoError(t, DB.First(&stored, "id = ?", saved.ID).Error)
	require.False(t, stored.IsActive)
	require.Equal(t, []string{"student"}, stored.TargetStudentIDs)
	body["isActive"] = true
	body["isGlobal"] = true
	w, _ = portalRequest(t, r, tokens["admin"], "PUT", "/manage/reinforcements/"+saved.ID, body)
	require.Equal(t, 200, w.Code)
	require.NoError(t, DB.First(&stored, "id = ?", saved.ID).Error)
	require.True(t, stored.IsActive)
	require.Empty(t, stored.TargetStudentIDs)
	body["ruleValue"] = 0
	w, _ = portalRequest(t, r, tokens["teacher"], "POST", "/manage/reinforcements", body)
	require.Equal(t, 400, w.Code)
	body["ruleValue"] = 3
	body["isGlobal"] = false
	body["targetStudentIds"] = []string{"parent"}
	w, _ = portalRequest(t, r, tokens["teacher"], "POST", "/manage/reinforcements", body)
	require.Equal(t, 400, w.Code)
	w, out = portalRequest(t, r, tokens["teacher"], "GET", "/students", nil)
	require.Equal(t, 200, w.Code)
	require.NotContains(t, string(out["data"]), "password")
	require.NotContains(t, string(out["data"]), "test-parent")
	w, _ = portalRequest(t, r, tokens["admin"], "DELETE", "/manage/reinforcements/"+saved.ID, nil)
	require.Equal(t, 200, w.Code)
	w, _ = portalRequest(t, r, tokens["admin"], "DELETE", "/manage/reinforcements/"+saved.ID, nil)
	require.Equal(t, 404, w.Code)
}
