package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// LoadEnv loads environment variables from a .env file
func LoadEnv() {
	file, err := os.Open(".env")
	if err != nil {
		return // No .env file, ignore
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			os.Setenv(key, val)
		}
	}
}

func main() {
	LoadEnv() // Load .env file at startup
	r := gin.Default()

	// Initialize MySQL
	if err := InitDB(); err != nil {
		fmt.Printf("Failed to initialize database: %v\n", err)
		os.Exit(1)
	}

	// Start Background Scheduler
	go startScheduler()

	// Global Middlewares
 r.Use(CORSMiddleware())

	// API Routes
	api := r.Group("/api")
	{
		// Public routes
		api.POST("/auth/login", LoginHandler)
		api.POST("/auth/register", RegisterHandler)
		api.GET("/config/public", GetPublicConfig)

		// Protected routes
		protected := api.Group("/")
		protected.Use(AuthMiddleware(), PermissionMiddleware())
		{
			// Me
			protected.GET("/me", GetMe)
			protected.GET("/me/permissions", GetMyPermissions)
			protected.PUT("/me", UpdateMe)

			// Questions
			protected.GET("/questions", GetQuestions)
			protected.GET("/questions/stats/grades", GetQuestionGradeStats)
			protected.POST("/questions", CreateQuestion)
			protected.POST("/questions/bulk", BulkCreateQuestions)
			protected.PUT("/questions/:id", UpdateQuestion)
			protected.DELETE("/questions/:id", DeleteQuestion)

			// Papers
			protected.GET("/papers", GetPapers)
			protected.POST("/papers", CreatePaper)
			protected.PUT("/papers/:id", UpdatePaper)
			protected.DELETE("/papers/:id", DeletePaper)

			// Homeworks
			protected.GET("/homeworks", GetHomeworks)
			protected.POST("/homeworks/assign", AssignHomework)
			protected.PUT("/homeworks/:id/complete", CompleteHomework)

			// Reinforcements
			protected.GET("/reinforcements", GetReinforcements)
			protected.POST("/reinforcements", CreateReinforcement)
			protected.PUT("/reinforcements/:id", UpdateReinforcement)
			protected.DELETE("/reinforcements/:id", DeleteReinforcement)

			// Resources
			protected.GET("/resources", GetResources)
			protected.POST("/resources", CreateResource)
			protected.PUT("/resources/:id", UpdateResource)
			protected.DELETE("/resources/:id", DeleteResource)

			// History
			protected.GET("/history", GetHistory)
			protected.POST("/history", CreateHistory)

			// Wrong Question Book
			protected.GET("/wrong-book", GetWrongBook)

			// Students
			protected.GET("/students", GetStudents)
			protected.GET("/students/:id", GetStudentDetail)

			// Student Stats
			protected.GET("/student/stats", GetStudentStats)
			
			// Teacher Stats
			protected.GET("/teacher/stats", GetTeacherStats)

			// Admin: User Management
			admin := protected.Group("/admin")
			{
				admin.GET("/users", GetUsers)
				admin.POST("/users", CreateUser)
				admin.PUT("/users/:id", UpdateUser)
				admin.DELETE("/users/:id", DeleteUser)
				admin.GET("/logs", GetAuditLogs)
				admin.GET("/homeworks", AdminGetHomeworks)
				admin.GET("/practices", AdminGetPractices)
				
				// System Config
				admin.GET("/config", GetSystemConfig)
				admin.POST("/config", UpdateSystemConfig)
				admin.GET("/settings", GetSystemSettings)
				admin.POST("/settings", UpdateSystemSettings)
				admin.GET("/permissions", GetRolePermissions)
				admin.POST("/permissions", UpdateRolePermissions)
			}

			// Analytics
			protected.GET("/dashboard/stats", GetDashboardStats)
			protected.GET("/dashboard/online-users", GetOnlineUsers)

			// Ability Tracking
			protected.GET("/skills", GetSkillTopics)
			protected.GET("/skills/questions", GetSkillQuestions)
			protected.POST("/skills", CreateSkillTopic)
			protected.PUT("/skills/:id", UpdateSkillTopic)
			protected.DELETE("/skills/:id", DeleteSkillTopic)
			protected.PUT("/skills/order", UpdateSkillOrder)

			protected.POST("/objectives", CreateSkillObjective)
			protected.PUT("/objectives/:id", UpdateSkillObjective)
			protected.DELETE("/objectives/:id", DeleteSkillObjective)
			protected.PUT("/objectives/order", UpdateObjectiveOrder)

			protected.GET("/ability/matrix", GetAbilityMatrix)
		}
	}

	r.Run(":8080")
}

func startScheduler() {
	ticker := time.NewTicker(1 * time.Hour)
	for range ticker.C {
		processSchedules()
	}
}

func processSchedules() {
	today := time.Now().Format("2006-01-02")
	var dueHws []Homework
	DB.Where("next_run_date = ? AND repeat_interval != '' AND repeat_interval != 'none'", today).Find(&dueHws)

	for _, hw := range dueHws {
		// Clone homework
		newID := strconv.FormatInt(time.Now().UnixNano(), 36)
		newHw := Homework{
			ID:             newID,
			TeacherID:      hw.TeacherID,
			PaperID:        hw.PaperID,
			Name:           fmt.Sprintf("%s (Auto)", hw.Name),
			ClassID:        hw.ClassID,
			StartDate:      today,
			EndDate:        today, // Or calculate based on original duration
			Status:         "pending",
			Total:          hw.Total,
			StudentIDs:     hw.StudentIDs,
			RepeatInterval: hw.RepeatInterval,
			ParentID:       hw.ID,
		}

		// Calculate next run for new one
		nextRun := calculateNextRun(time.Now(), hw.RepeatInterval)
		newHw.NextRunDate = nextRun

		if err := DB.Create(&newHw).Error; err == nil {
			// Clear next_run on OLD one to avoid double processing, 
			// though usually we keep it and only the LATEST one has a next_run?
			// Strategy: Only the most recent recurring homework has next_run_date.
			hw.NextRunDate = ""
			DB.Save(&hw)
			fmt.Printf("[Scheduler] Auto-assigned homework: %s for %s\n", newHw.Name, today)
		}
	}
}
