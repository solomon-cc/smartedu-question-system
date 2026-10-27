package main

import (
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"sort"
	"strings"

	"gorm.io/gorm"
)

type portalPracticeReward struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Image    string `json:"image,omitempty"`
	Prompt   string `json:"prompt,omitempty"`
	Duration int    `json:"duration"`
}

// Existing attempts are the counter; no student lists or teaching rules are sent to learners.
func portalRewardForAttempt(db *gorm.DB, attempt PortalAttempt) *portalPracticeReward {
	var rewards []Reinforcement
	if db.Where("is_active = ?", true).Order("is_global ASC, id ASC").Find(&rewards).Error != nil {
		return nil
	}
	var total, correct int64
	scope := db.Model(&PortalAttempt{}).Where("user_id = ?", attempt.UserID).Where("created_at < ? OR (created_at = ? AND id <= ?)", attempt.CreatedAt, attempt.CreatedAt, attempt.ID)
	if scope.Count(&total).Error != nil {
		return nil
	}
	scope = db.Model(&PortalAttempt{}).Where("user_id = ? AND correct = ?", attempt.UserID, true).Where("created_at < ? OR (created_at = ? AND id <= ?)", attempt.CreatedAt, attempt.CreatedAt, attempt.ID)
	if scope.Count(&correct).Error != nil {
		return nil
	}
	candidates := []Reinforcement{}
	targeted := false
	for _, r := range rewards {
		if r.RuleValue < 1 || r.Duration < 1 || r.Duration > 300 || (!r.IsGlobal && !containsStudent(r.TargetStudentIDs, attempt.UserID)) {
			continue
		}
		hit := false
		switch r.RuleType {
		case "fixed":
			hit = total > 0 && total%int64(r.RuleValue) == 0
		case "correct_count":
			hit = attempt.Correct && correct > 0 && correct%int64(r.RuleValue) == 0
		case "average":
			sum := sha256.Sum256([]byte(attempt.ID + "|" + r.ID))
			hit = binary.BigEndian.Uint64(sum[:8])%uint64(r.RuleValue) == 0
		}
		if !hit {
			continue
		}
		if !r.IsGlobal {
			targeted = true
		}
		if targeted && r.IsGlobal {
			continue
		}
		candidates = append(candidates, r)
	}
	if len(candidates) == 0 {
		return nil
	}
	sum := sha256.Sum256([]byte(attempt.ID))
	r := candidates[binary.BigEndian.Uint64(sum[:8])%uint64(len(candidates))]
	return &portalPracticeReward{r.ID, r.Name, r.Type, r.Image, r.Prompt, r.Duration}
}
func portalRequestAttemptID(actor, request string) string {
	sum := sha256.Sum256([]byte(actor + "|" + request))
	return fmt.Sprintf("practice-%x", sum[:])
}
func normalizePortalAnswer(value, kind string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if kind == "MULTIPLE_SELECT" {
		parts := strings.Split(strings.ReplaceAll(value, "，", ","), ",")
		for i := range parts {
			parts[i] = strings.TrimSpace(parts[i])
		}
		sort.Strings(parts)
		return strings.Join(parts, ",")
	}
	return value
}
