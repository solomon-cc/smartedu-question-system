package main

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestPEAKCatalog(t *testing.T) {
	require.Len(t, peakCatalog, 128)
	for _, module := range []string{"D", "G"} {
		seen := map[string]bool{}
		for _, item := range peakCatalog {
			if item.Module != module {
				continue
			}
			require.False(t, seen[item.Code])
			seen[item.Code] = true
			require.NotEmpty(t, item.Script)
			require.Equal(t, len(item.ScriptPages), len(item.StimulusPages))
		}
		require.Len(t, seen, 64)
	}
}
func TestPEAKWorkflow(t *testing.T) {
	isolatedDB(t)
	require.NoError(t, DB.Create(&User{ID: "peak-student", Username: "peak-student", Role: RoleStudent, Status: "active"}).Error)
	require.NoError(t, DB.Create(&VBMAPPAssessment{ID: "legacy", StudentID: "peak-student"}).Error)
	role, user := string(RoleTeacher), "teacher"
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("role", role); c.Set("userId", user) })
	r.GET("/peak", GetPEAKAssessments)
	r.POST("/peak", CreatePEAKAssessment)
	r.POST("/peak/:id/scores", SavePEAKScore)
	r.GET("/peak/:id/scores", GetPEAKScores)
	r.PUT("/peak/:id", CompletePEAKAssessment)
	call := func(method, path, body string) (int, map[string]interface{}) {
		t.Helper()
		w := httptest.NewRecorder()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		var data map[string]interface{}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &data))
		return w.Code, data
	}
	_, bad := call("POST", "/peak", `{"studentId":"missing","module":"D"}`)
	require.EqualValues(t, 1, bad["code"])
	_, created := call("POST", "/peak", `{"studentId":"peak-student","module":"D"}`)
	require.EqualValues(t, 0, created["code"])
	id := created["data"].(map[string]interface{})["id"].(string)
	_, list := call("GET", "/peak", "")
	require.Len(t, list["data"], 1, "legacy must not appear as PEAK")
	for _, body := range []string{`{"code":"FLS-1"}`, `{"code":"FLS-1","score":0.5}`, `{"code":"FLS-1","score":2}`, `{"code":"LLS-1","score":1}`} {
		_, v := call("POST", "/peak/"+id+"/scores", body)
		require.EqualValues(t, 1, v["code"])
	}
	_, v := call("PUT", "/peak/"+id, `{"status":"completed"}`)
	require.EqualValues(t, 1, v["code"])
	_, v = call("POST", "/peak/"+id+"/scores", `{"code":"FLS-1","score":0}`)
	require.EqualValues(t, 0, v["code"])
	_, v = call("POST", "/peak/"+id+"/scores", `{"code":"FLS-1","score":1,"response":"看向评估者","notes":"2秒"}`)
	require.EqualValues(t, 0, v["code"])
	_, v = call("GET", "/peak/"+id+"/scores", "")
	require.Len(t, v["data"], 1)
	for _, item := range peakCatalog {
		if item.Module == "D" {
			_, v = call("POST", "/peak/"+id+"/scores", fmt.Sprintf(`{"code":%q,"score":1}`, item.Code))
			require.EqualValues(t, 0, v["code"])
		}
	}
	_, v = call("PUT", "/peak/"+id, `{"status":"completed","studentId":"hijack","module":"G"}`)
	require.EqualValues(t, 0, v["code"])
	require.Equal(t, "D", v["data"].(map[string]interface{})["module"])
	_, v = call("POST", "/peak/"+id+"/scores", `{"code":"FLS-1","score":0}`)
	require.EqualValues(t, 1, v["code"])
	role, user = string(RoleStudent), "other"
	status, _ := call("GET", "/peak/"+id+"/scores", "")
	require.Equal(t, 403, status)
	_, v = call("GET", "/peak?studentId=peak-student", "")
	require.Len(t, v["data"], 0)
	user = "peak-student"
	status, _ = call("GET", "/peak/"+id+"/scores", "")
	require.Equal(t, 200, status)
	status, _ = call("POST", "/peak", `{"studentId":"peak-student","module":"G"}`)
	require.Equal(t, 403, status)
	var legacy VBMAPPAssessment
	require.NoError(t, DB.First(&legacy, "id = ?", "legacy").Error)
}
