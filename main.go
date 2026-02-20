package main

import (
	"bufio"
	"os"
	"strings"
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

	// Load data from disk
	if err := LoadData(); err != nil {
		println("Failed to load data:", err.Error())
	}

	// Global Middlewares
	r.Use(CORSMiddleware())

	// API Routes
	api := r.Group("/api")
	{
		// Public routes
		api.POST("/auth/login", LoginHandler)

		// Protected routes
		protected := api.Group("/")
		protected.Use(AuthMiddleware())
		{
			// Questions
			protected.GET("/questions", GetQuestions)
			protected.POST("/questions", CreateQuestion)
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
			protected.DELETE("/reinforcements/:id", DeleteReinforcement)

			// History
			protected.GET("/history", GetHistory)
			protected.POST("/history", CreateHistory)

			// Students
			protected.GET("/students", GetStudents)

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
			}

			// Analytics
			protected.GET("/dashboard/stats", GetDashboardStats)
		}
	}

	r.Run(":8080")
}