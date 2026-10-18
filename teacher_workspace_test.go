package main

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
)

func TestTeacherWorkspaceUsesLiveRoleAndModulePermissions(t *testing.T) {
	isolatedDB(t)
	previousSecret := jwtSecret
	jwtSecret = []byte("workspace-test-secret")
	t.Cleanup(func() { jwtSecret = previousSecret })
	require.NoError(t, DB.Create(&User{ID: "workspace-teacher", Username: "workspace-teacher", Role: RoleTeacher, Status: "active"}).Error)
	// A stale role in the token must not change the role obtained from the account.
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"userId": "workspace-teacher", "role": "ADMIN", "exp": time.Now().Add(time.Hour).Unix()}).SignedString(jwtSecret)
	require.NoError(t, err)
	r := gin.New()
	r.Use(AuthMiddleware(), PermissionMiddleware())
	r.GET("/api/me/permissions", GetMyPermissions)
	r.GET("/api/resources", func(c *gin.Context) { SendJSON(c, 0, "", []string{}) })
	read := func(path string) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		r.ServeHTTP(w, req)
		return w
	}
	readPermissions := func() []RolePermission {
		w := read("/api/me/permissions")
		require.Equal(t, 200, w.Code)
		var result struct {
			Data []RolePermission `json:"data"`
		}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &result))
		return result.Data
	}
	var found bool
	for _, p := range readPermissions() {
		require.Equal(t, RoleTeacher, p.Role)
		if p.ModuleID == "resources" {
			found = true
			require.Contains(t, p.WorkspaceSections, "materials")
		}
	}
	require.True(t, found)
	require.NoError(t, DB.Model(&RolePermission{}).Where("role = ? AND module_id = ?", RoleTeacher, "resources").Update("api_access", false).Error)
	for _, p := range readPermissions() {
		if p.ModuleID == "resources" {
			require.Empty(t, p.WorkspaceSections)
		}
	}
	require.Equal(t, 403, read("/api/resources").Code)
	require.NoError(t, DB.Model(&RolePermission{}).Where("role = ? AND module_id = ?", RoleTeacher, "resources").Updates(map[string]any{"api_access": true, "ui_access": false}).Error)
	for _, p := range readPermissions() {
		if p.ModuleID == "resources" {
			require.Empty(t, p.WorkspaceSections)
		}
	}
	require.NoError(t, DB.Model(&User{}).Where("id = ?", "workspace-teacher").Update("role", RoleStudent).Error)
	for _, p := range readPermissions() {
		require.Equal(t, RoleStudent, p.Role)
		require.Empty(t, p.WorkspaceSections)
	}
}
