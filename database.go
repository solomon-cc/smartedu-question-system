package main

import (
	"fmt"
	"os"
	"path/filepath"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/schema"
)

var DB *gorm.DB

func InitDB() error {
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASSWORD")
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	name := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		user, pass, host, port, name)

	var dialector gorm.Dialector = mysql.Open(dsn)
	if os.Getenv("DB_DRIVER") == "sqlite" {
		dbPath := os.Getenv("SQLITE_PATH")
		if dbPath == "" {
			dbPath = ".local/smartedu.db"
		}
		if err := os.MkdirAll(filepath.Dir(dbPath), 0700); err != nil {
			return err
		}
		dialector = sqlite.Open(dbPath + "?_busy_timeout=5000&_journal_mode=WAL")
	}
	db, err := gorm.Open(dialector, &gorm.Config{NamingStrategy: schema.NamingStrategy{SingularTable: false}})

	if err != nil {
		return err
	}

	DB = db

	// Auto Migration
	err = DB.AutoMigrate(
		&User{},
		&TrainingCourse{}, &TrainingLesson{}, &TrainingProgress{}, &TrainingUpload{}, &PortalAttempt{}, &AssessmentAppointment{}, &ParentStudentLink{},
		&Question{},
		&Paper{},
		&Homework{},
		&History{},
		&Reinforcement{},
		&Resource{},
		&AuditLog{},
		&StudentWrongQuestion{},
		&SystemConfig{},
		&RolePermission{},
		&SkillTopic{},
		&SkillObjective{},
		&AbilityRecord{},
		&Scenario{},
		&ScenarioItem{},
		&ScenarioSession{},
		&MoodObservation{},
		&VBMAPPAssessment{},
		&VBMAPPScore{},
		&PEAKAssessment{},
		&PEAKScore{},
		&AssessmentRecord{},
		&AssessmentResponse{},
		&StudentLearningPlan{},
		&MoodDiary{},
	)
	if err != nil {
		return err
	}

	// Backfill only method identity for plans created before the assessment interface.
	if err := DB.Model(&StudentLearningPlan{}).Where("method_id = ? OR method_id IS NULL", "").Update("method_id", "peak").Error; err != nil {
		return err
	}

	// Seed initial users
	var count int64
	DB.Model(&User{}).Count(&count)
	if count == 0 {
		password := os.Getenv("BOOTSTRAP_ADMIN_PASSWORD")
		if password == "" {
			return fmt.Errorf("empty database: set BOOTSTRAP_ADMIN_PASSWORD to create the administrator")
		}
		hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		initialUsers := []User{
			{ID: "1", Username: "admin", Password: string(hashed), Role: RoleAdmin, Status: "active", Name: "超级管理员"},
		}
		DB.Create(&initialUsers)
	}

	// Seed default permissions

	type Module struct {
		ID       string
		ParentID string
		Sort     int
	}

	allModules := []Module{
		{ID: "dashboard", Sort: 1},
		{ID: "skills", Sort: 2}, // Sub-system Parent
		{ID: "skills_practice", ParentID: "skills", Sort: 1},
		{ID: "skills_homework", ParentID: "skills", Sort: 2},
		{ID: "skills_history", ParentID: "skills", Sort: 3},
		{ID: "skills_wrongbook", ParentID: "skills", Sort: 4},
		{ID: "skills_stats", ParentID: "skills", Sort: 5},

		{ID: "application", Sort: 3}, // Sub-system Parent
		{ID: "application_games", ParentID: "application", Sort: 1},

		{ID: "assessment", Sort: 4}, // Sub-system Parent
		{ID: "assessment_history", ParentID: "assessment", Sort: 1},

		{ID: "mood", Sort: 5}, // Sub-system Parent
		{ID: "mood_diary", ParentID: "mood", Sort: 1},
		{ID: "mood_stats", ParentID: "mood", Sort: 2},

		{ID: "students", Sort: 10},
		{ID: "questions", Sort: 11},
		{ID: "papers", Sort: 12},
		{ID: "assignments", Sort: 13},
		{ID: "ability_tracking", Sort: 14},
		{ID: "reinforcements", Sort: 15},
		{ID: "resources", Sort: 16},
		{ID: "users", Sort: 20},
		{ID: "homework_audit", Sort: 21},
		{ID: "audit_logs", Sort: 22},
		{ID: "system_config", Sort: 23},
		{ID: "permissions", Sort: 24},
		{ID: "help_docs", Sort: 25},
		{ID: "stats", Sort: 26},
	}

	var defaultPerms []RolePermission

	// Admin: Full access
	for _, m := range allModules {
		defaultPerms = append(defaultPerms, RolePermission{Role: RoleAdmin, ModuleID: m.ID, ParentID: m.ParentID, UIAccess: true, APIAccess: true, SortOrder: m.Sort})
	}

	// Teacher
	teacherAccessible := map[string]bool{
		"dashboard": true, "skills": true, "skills_practice": true, "skills_homework": true, "skills_history": true, "skills_wrongbook": true, "skills_stats": true,
		"application": true, "application_games": true, "assessment": true, "assessment_history": true, "mood": true, "mood_diary": true, "mood_stats": true,
		"students": true, "questions": true, "papers": true, "assignments": true, "ability_tracking": true, "reinforcements": true, "resources": true, "stats": true, "help_docs": true,
	}
	for _, m := range allModules {
		defaultPerms = append(defaultPerms, RolePermission{Role: RoleTeacher, ModuleID: m.ID, ParentID: m.ParentID, UIAccess: teacherAccessible[m.ID], APIAccess: teacherAccessible[m.ID], SortOrder: m.Sort})
	}

	// Student
	studentAccessible := map[string]bool{
		"dashboard": true, "skills": true, "skills_practice": true, "skills_homework": true, "skills_history": true, "skills_wrongbook": true, "skills_stats": true,
		"application": true, "application_games": true, "assessment": true, "assessment_history": true, "mood": true, "mood_diary": true, "mood_stats": true,
		"help_docs": true,
	}
	for _, m := range allModules {
		defaultPerms = append(defaultPerms, RolePermission{Role: RoleStudent, ModuleID: m.ID, ParentID: m.ParentID, UIAccess: studentAccessible[m.ID], APIAccess: studentAccessible[m.ID], SortOrder: m.Sort})
	}

	if err := DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&defaultPerms).Error; err != nil {
		return err
	}

	// Seed default config
	var configCount int64
	DB.Model(&SystemConfig{}).Where("`key` = ?", "error_logic").Count(&configCount)
	if configCount == 0 {
		defaultConfig := `{
			"globalEnabled": true,
			"excludeMistakesFromPractice": false,
			"stages": {
				"1": {"nextWrong": 2, "nextCorrect": 4, "showAnswer": false, "label": "出错"},
				"2": {"nextWrong": 3, "nextCorrect": 4, "showAnswer": true, "label": "重试 (有答案)"},
				"3": {"nextWrong": 5, "nextCorrect": 4, "showAnswer": false, "label": "重试 (无答案)"},
				"4": {"nextWrong": 1, "nextCorrect": 4, "showAnswer": false, "label": "已知"},
				"5": {"nextWrong": 5, "nextCorrect": 5, "showAnswer": false, "label": "困难"}
			}
		}`
		DB.Create(&SystemConfig{Key: "error_logic", Value: defaultConfig})
	}

	if err := seedLifeSkillCourses(DB); err != nil {
		return err
	}

	return nil
}
