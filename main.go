package main

import (
	"github.com/gin-gonic/gin"
)

func main() {
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

			// Homeworks
			protected.GET("/homeworks", GetHomeworks)
			protected.POST("/homeworks/assign", AssignHomework)

			// Reinforcements
			protected.GET("/reinforcements", GetReinforcements)
			protected.POST("/reinforcements", CreateReinforcement)
			protected.DELETE("/reinforcements/:id", DeleteReinforcement)

			// History
			protected.GET("/history", GetHistory)

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
			}

			// Analytics
			protected.GET("/dashboard/stats", GetDashboardStats)
		}
	}

	r.Run(":8080")
}