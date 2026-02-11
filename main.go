package main

import (
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

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

			// History
			protected.GET("/history", GetHistory)

			// Student Stats
			protected.GET("/student/stats", GetStudentStats)

			// Admin: User Management
			admin := protected.Group("/admin")
			{
				admin.GET("/users", GetUsers)
				admin.POST("/users", CreateUser)
				admin.PUT("/users/:id", UpdateUser)
			}

			// Analytics
			protected.GET("/dashboard/stats", GetDashboardStats)
		}
	}

	r.Run(":8080")
}