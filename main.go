package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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
			if _, exists := os.LookupEnv(key); !exists {
				os.Setenv(key, strings.Trim(val, "\"'"))
			}
		}
	}
}

func main() {
	LoadEnv() // Explicit environment variables take precedence.
	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		jwtSecret = []byte(secret)
	} else {
		fmt.Println("JWT_SECRET is required")
		os.Exit(1)
	}
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

		registerPortalRoutes(api)

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
			protected.GET("/homeworks/:id/questions", GetHomeworkQuestions)
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
			protected.GET("/students/:id/learning-plans", GetStudentLearningPlans)
			protected.POST("/students/:id/learning-plans", CreateStudentLearningPlan)
			protected.POST("/students/:id/learning-plans/:planId/assign", AssignStudentLearningPlan)
			protected.POST("/students/:id/learning-plans/:planId/reassessment", ReassessStudentLearningPlan)
			protected.GET("/students/:id/learning-plans/:planId/comparison", CompareStudentLearningPlan)

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

			// Application (Scenario Games)
			protected.GET("/scenarios", GetScenarios)
			protected.POST("/scenarios", CreateScenario)
			protected.PUT("/scenarios/:id", UpdateScenario)
			protected.DELETE("/scenarios/:id", DeleteScenario)
			protected.GET("/scenarios/:id/items", GetScenarioItems)
			protected.POST("/scenarios/:id/items", CreateScenarioItem)
			protected.POST("/scenarios/:id/preview", PreviewScenarioGame)
			protected.POST("/scenario-sessions", CreateScenarioSession)
			protected.GET("/scenario-sessions", GetScenarioSessions)
			protected.GET("/scenario-sessions/:id", GetScenarioSession)
			protected.POST("/scenario-sessions/:id/actions", SaveScenarioAction)

			// Shared assessment interface. Method adapters own versioned rules and storage.
			protected.GET("/assessments/methods", GetAssessmentMethods)
			protected.GET("/assessments/records", GetAllAssessmentRecords)
			protected.GET("/assessments/methods/:method/catalog", GetMethodAssessmentDefinition)
			protected.GET("/assessments/methods/:method/records", GetMethodAssessmentRecords)
			protected.POST("/assessments/methods/:method/records", CreateMethodAssessment)
			protected.GET("/assessments/methods/:method/records/:id", GetMethodAssessment)
			protected.GET("/assessments/methods/:method/records/:id/responses", GetMethodAssessmentResponses)
			protected.POST("/assessments/methods/:method/records/:id/responses", SaveMethodAssessmentResponse)
			protected.POST("/assessments/methods/:method/records/:id/complete", CompleteMethodAssessment)

			// PK (PEAK) pre-assessments; legacy records retain their own tables and endpoints.
			protected.GET("/assessments/peak/catalog", GetPEAKCatalog)
			protected.GET("/assessments/peak", GetPEAKAssessments)
			protected.POST("/assessments/peak", CreatePEAKAssessment)
			protected.GET("/assessments/peak/:id/scores", GetPEAKScores)
			protected.POST("/assessments/peak/:id/scores", SavePEAKScore)
			protected.PUT("/assessments/peak/:id", CompletePEAKAssessment)

			// Historical VB-MAPP assessments
			protected.GET("/assessments", GetAssessments)
			protected.POST("/assessments", CreateAssessment)
			protected.GET("/assessments/:id", GetAssessmentDetail)
			protected.PUT("/assessments/:id", UpdateAssessment)
			protected.GET("/assessments/:id/scores", GetAssessmentScores)
			protected.POST("/assessments/:id/scores", SaveAssessmentScore)

			// Mood Diary
			protected.GET("/mood-diaries", GetMoodDiaries)
			protected.POST("/mood-diaries", CreateMoodDiary)
			protected.GET("/mood-diaries/stats", GetMoodStats)
			protected.GET("/mood-diaries/students", GetMoodStudents)
			protected.GET("/mood-diaries/:id/observations", GetMoodObservations)
			protected.POST("/mood-diaries/:id/observations", CreateMoodObservation)

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
	processSchedulesAt(time.Now())
}

func processSchedulesAt(now time.Time) {
	today := now.Format("2006-01-02")
	var dueHws []Homework
	// Recover a missed run after downtime, without flooding students with historical copies.
	DB.Where("next_run_date != '' AND next_run_date <= ? AND repeat_interval != '' AND repeat_interval != 'none'", today).Find(&dueHws)
	for _, hw := range dueHws {
		nextRun := calculateNextRun(now, hw.RepeatInterval)
		if nextRun == "" {
			continue
		}
		endDate := today
		start, startErr := time.Parse("2006-01-02", hw.StartDate)
		end, endErr := time.Parse("2006-01-02", hw.EndDate)
		if startErr == nil && endErr == nil && !end.Before(start) {
			endDate = now.AddDate(0, 0, int(end.Sub(start).Hours()/24)).Format("2006-01-02")
		}
		newHw := Homework{
			ID: strconv.FormatInt(time.Now().UnixNano(), 36), TeacherID: hw.TeacherID, PaperID: hw.PaperID,
			Name: hw.Name, ClassID: hw.ClassID, StartDate: today, EndDate: endDate, Status: "pending",
			Total: len(hw.StudentIDs), StudentIDs: hw.StudentIDs, RepeatInterval: hw.RepeatInterval,
			ParentID: hw.ID, NextRunDate: nextRun,
		}
		// Claim and create atomically: a retry or concurrent scheduler must not duplicate a task.
		err := DB.Transaction(func(tx *gorm.DB) error {
			claim := tx.Model(&Homework{}).Where("id = ? AND next_run_date = ?", hw.ID, hw.NextRunDate).Update("next_run_date", "")
			if claim.Error != nil {
				return claim.Error
			}
			if claim.RowsAffected == 0 {
				return nil
			}
			return tx.Create(&newHw).Error
		})
		if err != nil {
			fmt.Printf("[Scheduler] Failed to assign recurring homework: %v\n", err)
		}
	}
}
