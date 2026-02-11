package main

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Mock Data
var mockUsers = []User{
	{ID: "1", Username: "admin", Password: "123", Role: RoleAdmin, Status: "active"},
	{ID: "2", Username: "teacher", Password: "123", Role: RoleTeacher, Status: "active"},
	{ID: "3", Username: "student", Password: "123", Role: RoleStudent, Status: "active"},
}

var mockQuestions = []Question{
	{
		ID:        "1",
		Subject:   "MATH",
		Grade:     1,
		Type:      "MULTIPLE_CHOICE",
		StemText:  "1 + 1 = ?",
		Answer:    "2",
		Options: []Option{
			{Text: "1", Value: "1"},
			{Text: "2", Value: "2"},
			{Text: "3", Value: "3"},
			{Text: "4", Value: "4"},
		},
	},
	{
		ID:        "2",
		Subject:   "MATH",
		Grade:     1,
		Type:      "CALCULATION",
		StemText:  "5 - 2 = ?",
		Answer:    "3",
	},
}

var mockPapers = []any{}
var mockHomeworks = []any{}
var mockHistory = []any{}

// Auth Handlers
func LoginHandler(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var foundUser *User
	for _, u := range mockUsers {
		if u.Username == req.Username && u.Password == req.Password {
			foundUser = &u
			break
		}
	}

	if foundUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": foundUser.ID,
		"role":   foundUser.Role,
		"exp":    time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, _ := token.SignedString(jwtSecret)

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":       foundUser.ID,
			"username": foundUser.Username,
			"role":     foundUser.Role,
		},
	})
}

// User Handlers (Admin)
func GetUsers(c *gin.Context) {
	c.JSON(http.StatusOK, mockUsers)
}

func CreateUser(c *gin.Context) {
	var newUser User
	if err := c.ShouldBindJSON(&newUser); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	newUser.ID = "new-id" // In real app, use UUID or DB ID
	mockUsers = append(mockUsers, newUser)
	c.JSON(http.StatusCreated, newUser)
}

func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var updateData User
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for i, u := range mockUsers {
		if u.ID == id {
			if updateData.Password != "" {
				mockUsers[i].Password = updateData.Password
			}
			mockUsers[i].Username = updateData.Username
			mockUsers[i].Role = updateData.Role
			mockUsers[i].Status = updateData.Status
			c.JSON(http.StatusOK, mockUsers[i])
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
}

// Stats Handlers
func GetDashboardStats(c *gin.Context) {
	stats := DashboardStats{
		AccuracyTrend: []StatPoint{
			{Label: "Mon", Value: 65}, {Label: "Tue", Value: 78}, {Label: "Wed", Value: 82},
			{Label: "Thu", Value: 75}, {Label: "Fri", Value: 88}, {Label: "Sat", Value: 92}, {Label: "Sun", Value: 85},
		},
		CompletionTrend: []StatPoint{
			{Label: "Mon", Value: 45}, {Label: "Tue", Value: 52}, {Label: "Wed", Value: 60},
			{Label: "Thu", Value: 48}, {Label: "Fri", Value: 70}, {Label: "Sat", Value: 85}, {Label: "Sun", Value: 78},
		},
	}
	c.JSON(http.StatusOK, stats)
}

// Question Handlers
func GetQuestions(c *gin.Context) {
	subject := c.Query("subject")
	gradeStr := c.Query("grade")
	
	var filtered []Question
	for _, q := range mockQuestions {
		matchSubject := subject == "" || q.Subject == subject
		matchGrade := true
		if gradeStr != "" {
			matchGrade = false
			if g, err := strconv.Atoi(gradeStr); err == nil {
				if q.Grade == g {
					matchGrade = true
				}
			}
		}

		if matchSubject && matchGrade {
			filtered = append(filtered, q)
		}
	}
	c.JSON(http.StatusOK, filtered)
}

func CreateQuestion(c *gin.Context) {
	var q Question
	if err := c.ShouldBindJSON(&q); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	q.ID = time.Now().Format("20060102150405")
	mockQuestions = append(mockQuestions, q)
	c.JSON(http.StatusCreated, q)
}

func UpdateQuestion(c *gin.Context) {
	id := c.Param("id")
	var q Question
	if err := c.ShouldBindJSON(&q); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	for i, existing := range mockQuestions {
		if existing.ID == id {
			mockQuestions[i] = q
			mockQuestions[i].ID = id
			c.JSON(http.StatusOK, mockQuestions[i])
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Question not found"})
}

func DeleteQuestion(c *gin.Context) {
	id := c.Param("id")
	for i, q := range mockQuestions {
		if q.ID == id {
			mockQuestions = append(mockQuestions[:i], mockQuestions[i+1:]...)
			c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Question not found"})
}

// Paper Handlers
func GetPapers(c *gin.Context) {
	c.JSON(http.StatusOK, mockPapers)
}

func CreatePaper(c *gin.Context) {
	var p any
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	mockPapers = append(mockPapers, p)
	c.JSON(http.StatusCreated, p)
}

// Homework Handlers
func GetHomeworks(c *gin.Context) {
	c.JSON(http.StatusOK, mockHomeworks)
}

func AssignHomework(c *gin.Context) {
	var h any
	if err := c.ShouldBindJSON(&h); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	mockHomeworks = append(mockHomeworks, h)
	c.JSON(http.StatusCreated, h)
}

// History Handlers
func GetHistory(c *gin.Context) {
	c.JSON(http.StatusOK, mockHistory)
}

// Student Stats
func GetStudentStats(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"accuracy": 0.85,
		"completed": 120,
		"rank": 5,
	})
}