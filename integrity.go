package main

import (
	"fmt"
	"strings"
	"time"
)

// resolvePaperQuestions preserves existing snapshots and the teacher's selected order.
func resolvePaperQuestions(ids []string, saved []Question) ([]Question, error) {
	if len(ids) == 0 {
		return nil, fmt.Errorf("请至少选择一道题目")
	}
	previous := map[string]Question{}
	for _, q := range saved {
		previous[q.ID] = q
	}
	seen := map[string]bool{}
	result := make([]Question, 0, len(ids))
	for _, id := range ids {
		if seen[id] {
			return nil, fmt.Errorf("试卷中不能重复选择同一道题目")
		}
		seen[id] = true
		q, ok := previous[id]
		if !ok && DB.First(&q, "id = ?", id).Error != nil {
			return nil, fmt.Errorf("部分题目已不存在，请刷新题库后重新选择")
		}
		result = append(result, q)
	}
	return result, nil
}
func sameQuestionOrder(ids []string, questions []Question) bool {
	if len(ids) != len(questions) {
		return false
	}
	for i, q := range questions {
		if ids[i] != q.ID {
			return false
		}
	}
	return true
}
func validateAssignment(h *Homework) error {
	h.Name = strings.TrimSpace(h.Name)
	if h.Name == "" {
		return fmt.Errorf("请填写作业名称")
	}
	start, err := time.Parse("2006-01-02", h.StartDate)
	if err != nil {
		return fmt.Errorf("请填写有效的开始日期")
	}
	end, err := time.Parse("2006-01-02", h.EndDate)
	if err != nil || end.Before(start) {
		return fmt.Errorf("截止日期不能早于开始日期")
	}
	var paper Paper
	if h.PaperID == "" || DB.First(&paper, "id = ?", h.PaperID).Error != nil || len(paper.Questions) == 0 {
		return fmt.Errorf("请选择包含题目的有效试卷")
	}
	if len(h.StudentIDs) == 0 {
		return fmt.Errorf("请至少选择一位学生")
	}
	unique := make([]string, 0, len(h.StudentIDs))
	seen := map[string]bool{}
	for _, id := range h.StudentIDs {
		if seen[id] {
			continue
		}
		seen[id] = true
		var student User
		if DB.First(&student, "id = ? AND role = ? AND status = ?", id, RoleStudent, "active").Error != nil {
			return fmt.Errorf("所选学生不存在或已停用，请刷新学生列表")
		}
		unique = append(unique, id)
	}
	h.StudentIDs = unique
	switch h.RepeatInterval {
	case "", "none", "daily", "3days", "weekly", "monthly":
	default:
		return fmt.Errorf("重复布置周期无效")
	}
	return nil
}

// A date-only deadline includes the entire selected day in the service's time zone.
func homeworkPastDeadline(date string, now time.Time) bool {
	end, err := time.ParseInLocation("2006-01-02", date, now.Location())
	return err == nil && !now.Before(end.AddDate(0, 0, 1))
}
