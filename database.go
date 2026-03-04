package main

import (
	"fmt"
	"os"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
	"golang.org/x/crypto/bcrypt"
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

	// Standard connection with basic config
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: false,
		},
	})

	if err != nil {
		return err
	}

	DB = db

	// Auto Migration
	err = DB.AutoMigrate(
		&User{},
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
	)
	if err != nil {
		return err
	}

	// Seed Skill Data
	var skillCount int64
	DB.Model(&SkillTopic{}).Count(&skillCount)
	if skillCount == 0 {
		topics := []SkillTopic{
			{
				ID: "t1", Name: "1-2 比较", Subject: "MATH", Grade: 1,
				Objectives: []SkillObjective{
					{ID: "o1", Name: "1", Target: "可以比较图形多少，可以使用 xx比xx多/少"},
					{ID: "o2", Name: "2", Target: "可以比较数字大小，可以使用 xx比xx大/小"},
					{ID: "o3", Name: "3", Target: "可以使用大于/小于"},
				},
			},
			{
				ID: "t2", Name: "1-3 排序和数列", Subject: "MATH", Grade: 1,
				Objectives: []SkillObjective{
					{ID: "o4", Name: "1", Target: "可以说出比xx大1/小1的数是xx"},
					{ID: "o5", Name: "2", Target: "可以填写完整的数列"},
				},
			},
			{
				ID: "t3", Name: "2 数的组成", Subject: "MATH", Grade: 1,
				Objectives: []SkillObjective{
					{ID: "o6", Name: "1", Target: "可以拆分积木，说出1-5的分解"},
					{ID: "o7", Name: "2", Target: "可以拆分积木，说出6-10的分解"},
					{ID: "o8", Name: "3", Target: "知道xx和xx可以组成xx (2-5)"},
				},
			},
		}
		DB.Create(&topics)
	}

	// Seed initial users
	var count int64
	DB.Model(&User{}).Count(&count)
	if count == 0 {
		hashed, _ := bcrypt.GenerateFromPassword([]byte("123"), bcrypt.DefaultCost)
		initialUsers := []User{
			{ID: "1", Username: "admin", Password: string(hashed), Role: RoleAdmin, Status: "active", Name: "超级管理员"},
		}
		DB.Create(&initialUsers)
	}

	// Seed default permissions
	var permCount int64
	DB.Model(&RolePermission{}).Count(&permCount)
	
	allModules := []string{"dashboard", "students", "questions", "papers", "assignments", "ability_tracking", "reinforcements", "resources", "users", "homework_audit", "audit_logs", "stats", "help_docs", "permissions", "system_config"}
	
	teacherModules := map[string]bool{"dashboard":true, "students":true, "questions":true, "papers":true, "assignments":true, "ability_tracking":true, "reinforcements":true, "resources":true, "stats":true, "help_docs":true}
	studentModules := map[string]bool{"dashboard":true, "assignments":true, "stats":true, "help_docs":true}

	if permCount == 0 {
		var defaultPerms []RolePermission
		
		// Admin: Full access
		for _, m := range allModules {
			defaultPerms = append(defaultPerms, RolePermission{Role: RoleAdmin, ModuleID: m, UIAccess: true, APIAccess: true})
		}
		
		// Teacher
		for _, m := range allModules {
			if teacherModules[m] {
				api := true
				if m == "students" || m == "stats" { api = false }
				defaultPerms = append(defaultPerms, RolePermission{Role: RoleTeacher, ModuleID: m, UIAccess: true, APIAccess: api})
			}
		}
		
		// Student
		for _, m := range allModules {
			if studentModules[m] {
				api := false
				if m == "assignments" { api = true }
				defaultPerms = append(defaultPerms, RolePermission{Role: RoleStudent, ModuleID: m, UIAccess: true, APIAccess: api})
			}
		}
		
		DB.Create(&defaultPerms)
	} else {
		// Ensure ability_tracking exists for admin and teacher if it was missing from previous versions
		for _, r := range []Role{RoleAdmin, RoleTeacher} {
			var exists int64
			DB.Model(&RolePermission{}).Where("role = ? AND module_id = ?", r, "ability_tracking").Count(&exists)
			if exists == 0 {
				DB.Create(&RolePermission{Role: r, ModuleID: "ability_tracking", UIAccess: true, APIAccess: true})
			}
		}
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

	return nil
}
