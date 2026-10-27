package main

import (
	"bytes"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPortalMemberValidationAndSelfProtection(t *testing.T) {
	r, tokens := portalTestRouter(t)
	body := gin.H{"username": " new-member ", "name": "新成员", "password": "ValidTest2026", "role": "STUDENT", "status": "active"}
	w, out := portalRequest(t, r, tokens["admin"], "POST", "/manage/users", body)
	require.Equal(t, 200, w.Code)
	require.Contains(t, string(out["data"]), `"username":"new-member"`)
	var user User
	require.NoError(t, DB.Where("username = ?", "new-member").First(&user).Error)
	require.NotEqual(t, "ValidTest2026", user.Password)
	for _, changes := range []gin.H{{"password": "short"}, {"password": strings.Repeat("x", 73)}, {"status": "unknown"}, {"username": "   "}} {
		candidate := gin.H{}
		for k, v := range body {
			candidate[k] = v
		}
		for k, v := range changes {
			candidate[k] = v
		}
		_, out = portalRequest(t, r, tokens["admin"], "POST", "/manage/users", candidate)
		require.Equal(t, "1", string(out["code"]))
	}
	_, out = portalRequest(t, r, tokens["admin"], "PUT", "/manage/users/admin", gin.H{"username": "test-admin", "role": "STUDENT", "status": "active"})
	require.Equal(t, "1", string(out["code"]))
	var admin User
	require.NoError(t, DB.First(&admin, "id = ?", "admin").Error)
	require.Equal(t, RoleAdmin, admin.Role)
	r.PUT("/api/me", AuthMiddleware(), UpdateMe)
	req := httptest.NewRequest("PUT", "/api/me", bytes.NewBufferString(`{"password":"short"}`))
	req.Header.Set("Authorization", "Bearer "+tokens["student"])
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Contains(t, w.Body.String(), `"code":1`)
}
