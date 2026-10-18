package main

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestPaperSnapshotIntegrity(t *testing.T) {
	isolatedDB(t)
	original := Question{ID: "original", StemText: "original content", Answer: "A"}
	require.NoError(t, DB.Create(&Paper{ID: "paper", Name: "Assigned", Questions: []Question{original}, Total: 1}).Error)
	require.NoError(t, DB.Create(&Homework{ID: "homework", PaperID: "paper"}).Error)
	require.NoError(t, DB.Create(&Question{ID: "original", StemText: "bank edited", Answer: "B"}).Error)
	require.NoError(t, DB.Create(&Question{ID: "new", StemText: "New"}).Error)
	router := gin.New()
	router.PUT("/papers/:id", UpdatePaper)
	for _, body := range []string{`{"name":"Changed","questionIds":["new"]}`, `{"name":"Changed","questionIds":[]}`} {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, httptest.NewRequest("PUT", "/papers/paper", strings.NewReader(body)))
		require.Contains(t, w.Body.String(), "不能修改题目")
	}
	// Even after the source question is removed, renaming must retain the assigned snapshot.
	require.NoError(t, DB.Delete(&Question{}, "id = ?", "original").Error)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest("PUT", "/papers/paper", strings.NewReader(`{"name":"Renamed","questionIds":["original"]}`)))
	var response struct {
		Code int `json:"code"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
	require.Zero(t, response.Code)
	var saved Paper
	require.NoError(t, DB.First(&saved, "id = ?", "paper").Error)
	require.Equal(t, "Renamed", saved.Name)
	require.Equal(t, []Question{original}, saved.Questions)
}

func TestRecurringHomeworkPreservesDurationAndDoesNotDuplicate(t *testing.T) {
	isolatedDB(t)
	now := time.Date(2026, 10, 10, 8, 0, 0, 0, time.Local)
	require.NoError(t, DB.Create(&Homework{ID: "recurring", Name: "Weekly practice", StartDate: "2026-10-01", EndDate: "2026-10-04", RepeatInterval: "weekly", NextRunDate: "2026-10-08", StudentIDs: []string{"student"}, Total: 1}).Error)
	processSchedulesAt(now)
	processSchedulesAt(now)
	var tasks []Homework
	require.NoError(t, DB.Order("start_date").Find(&tasks).Error)
	require.Len(t, tasks, 2)
	require.Empty(t, tasks[0].NextRunDate)
	require.Equal(t, "2026-10-10", tasks[1].StartDate)
	require.Equal(t, "2026-10-13", tasks[1].EndDate)
	require.Equal(t, "2026-10-17", tasks[1].NextRunDate)
	require.Equal(t, "Weekly practice", tasks[1].Name)
	require.Equal(t, "recurring", tasks[1].ParentID)
}

func TestFutureAssignmentSchedulesFromStartDate(t *testing.T) {
	isolatedDB(t)
	require.NoError(t, DB.Create(&Paper{ID: "paper", Questions: []Question{{ID: "q"}}}).Error)
	require.NoError(t, DB.Create(&User{ID: "student", Username: "future-student", Role: RoleStudent, Status: "active"}).Error)
	start := time.Now().AddDate(0, 0, 30)
	input := Homework{Name: "Future practice", PaperID: "paper", StudentIDs: []string{"student"}, StartDate: start.Format("2006-01-02"), EndDate: start.AddDate(0, 0, 3).Format("2006-01-02"), RepeatInterval: "weekly"}
	body, _ := json.Marshal(input)
	router := gin.New()
	router.POST("/assign", AssignHomework)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest("POST", "/assign", strings.NewReader(string(body))))
	var saved Homework
	require.NoError(t, DB.First(&saved).Error)
	require.Equal(t, start.AddDate(0, 0, 7).Format("2006-01-02"), saved.NextRunDate)
}

func TestPaperSelectionValidation(t *testing.T) {
	isolatedDB(t)
	require.NoError(t, DB.Create(&[]Question{{ID: "a", StemText: "A"}, {ID: "b", StemText: "B"}}).Error)
	for _, ids := range [][]string{nil, {"missing"}, {"a", "a"}} {
		_, err := resolvePaperQuestions(ids, nil)
		require.Error(t, err)
	}
	questions, err := resolvePaperQuestions([]string{"b", "a"}, nil)
	require.NoError(t, err)
	require.Equal(t, "b", questions[0].ID)
	require.Equal(t, "a", questions[1].ID)
}

func TestAssignmentRejectsInvalidInput(t *testing.T) {
	isolatedDB(t)
	require.NoError(t, DB.Create(&Paper{ID: "paper", Questions: []Question{{ID: "q"}}}).Error)
	require.NoError(t, DB.Create(&[]User{{ID: "student", Username: "active-student", Role: RoleStudent, Status: "active"}, {ID: "inactive", Username: "inactive-student", Role: RoleStudent, Status: "inactive"}, {ID: "teacher", Username: "teacher", Role: RoleTeacher, Status: "active"}}).Error)
	router := gin.New()
	router.Use(func(c *gin.Context) { c.Set("userId", "teacher") })
	router.POST("/assign", AssignHomework)
	valid := func() Homework {
		return Homework{Name: "Practice", PaperID: "paper", StudentIDs: []string{"student"}, StartDate: "2026-10-01", EndDate: "2026-10-07"}
	}
	cases := []struct {
		name   string
		change func(*Homework)
	}{
		{"blank name", func(h *Homework) { h.Name = " " }},
		{"missing paper", func(h *Homework) { h.PaperID = "missing" }},
		{"no students", func(h *Homework) { h.StudentIDs = nil }},
		{"inactive student", func(h *Homework) { h.StudentIDs = []string{"inactive"} }},
		{"teacher as student", func(h *Homework) { h.StudentIDs = []string{"teacher"} }},
		{"invalid date", func(h *Homework) { h.StartDate = "2026-02-30" }},
		{"end before start", func(h *Homework) { h.EndDate = "2026-09-30" }},
		{"invalid recurrence", func(h *Homework) { h.RepeatInterval = "invalid" }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			input := valid()
			tc.change(&input)
			body, _ := json.Marshal(input)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, httptest.NewRequest("POST", "/assign", strings.NewReader(string(body))))
			var response struct {
				Code int `json:"code"`
			}
			require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
			require.NotZero(t, response.Code)
		})
	}
	var count int64
	DB.Model(&Homework{}).Count(&count)
	require.Zero(t, count)
	input := valid()
	input.StudentIDs = []string{"student", "student"}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest("POST", "/assign", strings.NewReader(string(body))))
	var saved Homework
	require.NoError(t, DB.First(&saved).Error)
	require.Equal(t, 1, saved.Total)
	require.Equal(t, []string{"student"}, saved.StudentIDs)
}

func TestHomeworkDeadlineIncludesSelectedDay(t *testing.T) {
	now := time.Date(2026, 10, 9, 23, 59, 59, 0, time.FixedZone("CST", 8*3600))
	require.False(t, homeworkPastDeadline("2026-10-09", now))
	require.True(t, homeworkPastDeadline("2026-10-09", now.Add(time.Second)))
	require.False(t, homeworkPastDeadline("", now))
}
