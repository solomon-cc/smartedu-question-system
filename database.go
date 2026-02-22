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
	)
	if err != nil {
		return err
	}

	// Seed initial users
	var count int64
	DB.Model(&User{}).Count(&count)
	if count == 0 {
		hashed, _ := bcrypt.GenerateFromPassword([]byte("123"), bcrypt.DefaultCost)
		initialUsers := []User{
			{ID: "1", Username: "admin", Password: string(hashed), Role: RoleAdmin, Status: "active"},
			{ID: "2", Username: "teacher", Password: string(hashed), Role: RoleTeacher, Status: "active"},
			{ID: "3", Username: "student", Password: string(hashed), Role: RoleStudent, Status: "active"},
		}
		DB.Create(&initialUsers)
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
