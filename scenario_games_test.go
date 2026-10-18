package main

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestLifeCourseWorkflows(t *testing.T) {
	isolatedDB(t)
	var count int64
	DB.Model(&Scenario{}).Count(&count)
	require.EqualValues(t, 3, count)
	require.NoError(t, seedLifeSkillCourses(DB))
	DB.Model(&Scenario{}).Count(&count)
	require.EqualValues(t, 3, count)
	for _, course := range lifeSkillCourses() {
		for _, level := range course.scenario.Game.Levels {
			t.Run(course.scenario.ID+"/"+level.ID, func(t *testing.T) {
				s, err := newGameSession(DB, course.scenario.ID, level.ID, "student", "student", "student")
				require.NoError(t, err)
				action := func(a GameAction) GameEvent { e, err := applyGameAction(&s, a); require.NoError(t, err); return e }
				_, err = applyGameAction(&s, GameAction{Kind: "add", ItemID: level.Targets[0].ItemID})
				require.Error(t, err, "must follow current step")
				for s.Status == "ongoing" {
					step := level.Steps[s.State.Step]
					switch step.Kind {
					case "ack":
						action(GameAction{Kind: "check"})
					case "shop", "pack":
						e := action(GameAction{Kind: "check"})
						require.False(t, e.Correct)
						action(GameAction{Kind: "hint"})
						_, err = applyGameAction(&s, GameAction{Kind: "add", ItemID: "foreign"})
						require.Error(t, err)
						for _, target := range level.Targets {
							for n := 0; n < target.Quantity; n++ {
								action(GameAction{Kind: "add", ItemID: target.ItemID})
							}
						}
						action(GameAction{Kind: "check"})
					case "total", "change":
						expected := s.State.TotalCents
						if step.Kind == "change" {
							expected = s.State.PaidCents - s.State.TotalCents
						}
						e := action(GameAction{Kind: "answer", Value: expected + 1})
						require.False(t, e.Advanced)
						action(GameAction{Kind: "answer", Value: expected})
					case "choice":
						for _, choice := range step.Choices {
							if !choice.Correct {
								e := action(GameAction{Kind: "choice", ChoiceID: choice.ID})
								require.False(t, e.Advanced)
								break
							}
						}
						for _, choice := range step.Choices {
							if choice.Correct {
								action(GameAction{Kind: "choice", ChoiceID: choice.ID})
								break
							}
						}
					case "pay":
						require.False(t, action(GameAction{Kind: "check"}).Correct)
						for _, m := range level.Wallet {
							if m.Cents == 1000 {
								action(GameAction{Kind: "money-add", Value: 1000})
							}
						}
						if s.State.TotalCents > 1000 {
							action(GameAction{Kind: "money-add", Value: 500})
						}
						action(GameAction{Kind: "check"})
					}
				}
				require.True(t, s.State.Finished)
				require.Equal(t, len(level.Steps), s.State.Step)
				_, err = applyGameAction(&s, GameAction{Kind: "check"})
				require.Error(t, err)
				summary := gameSummary(s, "")
				require.Greater(t, summary.Errors, 0)
				require.Equal(t, 1, summary.Hints)
			})
		}
	}
}
func TestLifeSessionAPIIsolationAndRetry(t *testing.T) {
	isolatedDB(t)
	require.NoError(t, DB.Create(&[]User{{ID: "child", Username: "child", Role: RoleStudent, Status: "active"}, {ID: "other", Username: "other", Role: RoleStudent, Status: "active"}}).Error)
	role, user := string(RoleStudent), "child"
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("role", role); c.Set("userId", user) })
	r.Use(PermissionMiddleware())
	r.POST("/api/scenario-sessions", CreateScenarioSession)
	r.POST("/api/scenario-sessions/:id/actions", SaveScenarioAction)
	r.GET("/api/scenario-sessions/:id", GetScenarioSession)
	r.GET("/api/scenario-sessions", GetScenarioSessions)
	r.POST("/api/scenarios/:id/preview", PreviewScenarioGame)
	call := func(method, path, body string) (int, map[string]interface{}) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		v := map[string]interface{}{}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &v))
		return w.Code, v
	}
	_, v := call("POST", "/api/scenario-sessions", `{"scenarioId":"life-market-v1","levelId":"starter","studentId":"other"}`)
	require.EqualValues(t, 0, v["code"])
	s := v["data"].(map[string]interface{})
	require.Equal(t, "child", s["studentId"])
	id := s["id"].(string)
	path := "/api/scenario-sessions/" + id
	_, v = call("POST", path+"/actions", `{"kind":"check","requestId":"1"}`)
	require.EqualValues(t, 0, v["code"])
	for i := 0; i < 2; i++ {
		_, v = call("POST", path+"/actions", `{"kind":"add","itemId":"market-apple","requestId":"retry-once"}`)
		require.EqualValues(t, 0, v["code"])
	}
	var saved ScenarioSession
	require.NoError(t, DB.First(&saved, "id = ?", id).Error)
	require.Equal(t, 1, saved.State.Cart["market-apple"])
	require.Len(t, saved.Events, 2)
	require.NoError(t, DB.Model(&ScenarioItem{}).Where("id = ?", "market-apple").Update("price", 99).Error)
	require.Equal(t, 300, gameTotal(saved), "historical price snapshot")
	user = "other"
	status, _ := call("GET", path, "")
	require.Equal(t, 403, status)
	status, _ = call("POST", path+"/actions", `{"kind":"hint","requestId":"2"}`)
	require.Equal(t, 403, status)
	status, _ = call("POST", "/api/scenarios/life-market-v1/preview", `{"levelId":"starter","actions":[]}`)
	require.Equal(t, 403, status)
	_, v = call("GET", "/api/scenario-sessions?studentId=child", "")
	require.Len(t, v["data"].(map[string]interface{})["list"], 0)
	role, user = string(RoleTeacher), "teacher"
	var before, after int64
	DB.Model(&ScenarioSession{}).Count(&before)
	_, v = call("POST", "/api/scenarios/life-market-v1/preview", `{"levelId":"starter","actions":[{"kind":"check"}]}`)
	require.EqualValues(t, 0, v["code"])
	DB.Model(&ScenarioSession{}).Count(&after)
	require.Equal(t, before, after)
	_, v = call("POST", "/api/scenario-sessions", `{"scenarioId":"life-schoolbag-v1","levelId":"starter","studentId":"child"}`)
	require.EqualValues(t, 0, v["code"])
	guided := v["data"].(map[string]interface{})["id"].(string)
	role, user = string(RoleStudent), "child"
	status, _ = call("POST", "/api/scenario-sessions/"+guided+"/actions", `{"kind":"check","requestId":"unauthorized"}`)
	require.Equal(t, 403, status)
}
func TestMoodHistoryAndProvenance(t *testing.T) {
	isolatedDB(t)
	require.NoError(t, DB.Create(&[]User{{ID: "child", Username: "child", Name: "学生甲", Role: RoleStudent, Status: "active"}, {ID: "other", Username: "other", Role: RoleStudent, Status: "active"}}).Error)
	role, user := string(RoleStudent), "child"
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("role", role); c.Set("userId", user) })
	r.Use(PermissionMiddleware())
	r.GET("/api/mood-diaries", GetMoodDiaries)
	r.POST("/api/mood-diaries", CreateMoodDiary)
	r.GET("/api/mood-diaries/:id/observations", GetMoodObservations)
	r.POST("/api/mood-diaries/:id/observations", CreateMoodObservation)
	call := func(method, path, body string) (int, map[string]interface{}) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		v := map[string]interface{}{}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &v))
		return w.Code, v
	}
	_, v := call("POST", "/api/mood-diaries", `{"studentId":"other","mood":2,"intensity":4,"event":"有点累","source":"teacher","recorderId":"forged"}`)
	require.EqualValues(t, 0, v["code"])
	d := v["data"].(map[string]interface{})
	require.Equal(t, "student", d["source"])
	require.Equal(t, "child", d["studentId"])
	require.Equal(t, "child", d["recorderId"])
	id := d["id"].(string)
	role, user = string(RoleTeacher), "teacher"
	_, v = call("GET", "/api/mood-diaries?studentId=child&page=1&pageSize=1&source=student", "")
	data := v["data"].(map[string]interface{})
	require.EqualValues(t, 1, data["total"])
	require.Len(t, data["list"], 1)
	_, v = call("POST", fmt.Sprintf("/api/mood-diaries/%s/observations", id), `{"notes":"提供休息时间，课后再询问感受"}`)
	require.EqualValues(t, 0, v["code"])
	_, v = call("POST", "/api/mood-diaries", `{"studentId":"child","mood":3,"intensity":3,"source":"student"}`)
	require.Equal(t, "teacher", v["data"].(map[string]interface{})["source"])
	role, user = string(RoleStudent), "other"
	_, v = call("GET", "/api/mood-diaries?studentId=child&page=1", "")
	require.Len(t, v["data"].(map[string]interface{})["list"], 0)
	status, _ := call("GET", "/api/mood-diaries/"+id+"/observations", "")
	require.Equal(t, 403, status)
	status, _ = call("POST", "/api/mood-diaries/"+id+"/observations", `{"notes":"forged"}`)
	require.Equal(t, 403, status)
	var original MoodDiary
	require.NoError(t, DB.First(&original, "id = ?", id).Error)
	require.Equal(t, "student", original.Source)
	require.Equal(t, "有点累", original.Event)
	_, v = call("POST", "/api/mood-diaries", `{"mood":3,"intensity":3,"date":"not-a-date"}`)
	require.EqualValues(t, 1, v["code"])
}
