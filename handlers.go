package main

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Mock Data (Initial Seed Users only)
var mockUsers = []User{
	{ID: "1", Username: "admin", Password: "123", Role: RoleAdmin, Status: "active"},
	{ID: "2", Username: "teacher", Password: "123", Role: RoleTeacher, Status: "active"},
	{ID: "3", Username: "student", Password: "123", Role: RoleStudent, Status: "active"},
}

var mockQuestions = make([]Question, 0)
var mockPapers = []Paper{
	{ID: "p1", Name: "2024春季数学摸底卷", Total: 10, Questions: []Question{}},
	{ID: "p2", Name: "一年级语文识字练习", Total: 15, Questions: []Question{}},
	{ID: "p3", Name: "英语基础阅读理解", Total: 5, Questions: []Question{}},
}
var mockHomeworks = make([]Homework, 0)
var mockHistory = make([]History, 0)
var mockReinforcements = make([]Reinforcement, 0)

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
		"exp":    time.Now().Add(tokenDuration).Unix(),
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

func GetStudents(c *gin.Context) {
	students := make([]User, 0)
	for _, u := range mockUsers {
		if u.Role == RoleStudent {
			students = append(students, u)
		}
	}
	c.JSON(http.StatusOK, students)
}

func CreateUser(c *gin.Context) {
	var newUser User
	if err := c.ShouldBindJSON(&newUser); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	newUser.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	mockUsers = append(mockUsers, newUser)
	SaveData()
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
			SaveData()
			c.JSON(http.StatusOK, mockUsers[i])
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
}

func DeleteUser(c *gin.Context) {
	id := c.Param("id")
	for i, u := range mockUsers {
		if u.ID == id {
			mockUsers = append(mockUsers[:i], mockUsers[i+1:]...)
			SaveData()
			c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
}

// Stats Handlers
func GetDashboardStats(c *gin.Context) {
	// TODO: Calculate from mockHistory
	stats := DashboardStats{
		AccuracyTrend:   []StatPoint{},
		CompletionTrend: []StatPoint{},
	}
	c.JSON(http.StatusOK, stats)
}

// Question Handlers
func GetQuestions(c *gin.Context) {
	subject := c.Query("subject")
	gradeStr := c.Query("grade")
	
	filtered := make([]Question, 0)
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
	SaveData()
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
			SaveData()
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
			SaveData()
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
	var p Paper
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	p.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	
	// Populate Questions from IDs if provided
	if len(p.QuestionIDs) > 0 {
		p.Questions = make([]Question, 0)
		for _, qID := range p.QuestionIDs {
			for _, q := range mockQuestions {
				if q.ID == qID {
					p.Questions = append(p.Questions, q)
					break
				}
			}
		}
	}
	p.Total = len(p.Questions)

	mockPapers = append(mockPapers, p)
	SaveData()
	c.JSON(http.StatusCreated, p)
}

// Homework Handlers
func GetHomeworks(c *gin.Context) {
	c.JSON(http.StatusOK, mockHomeworks)
}

func AssignHomework(c *gin.Context) {
	var h Homework
	if err := c.ShouldBindJSON(&h); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	h.Status = "pending"
	mockHomeworks = append(mockHomeworks, h)
	SaveData()
	c.JSON(http.StatusCreated, h)
}

// History Handlers
func GetHistory(c *gin.Context) {
	c.JSON(http.StatusOK, mockHistory)
}

// Student Stats
func GetStudentStats(c *gin.Context) {
	// TODO: Calculate from history
	c.JSON(http.StatusOK, gin.H{
		"accuracy": "92%",
		"completed": 15,
		"rank": 5,
		"time": "12h 30m",
		"achievements": 8,
		"trends": []int{65, 70, 75, 72, 85, 88, 92},
	})
}

func GetTeacherStats(c *gin.Context) {
	pendingCount := 0
	for _, h := range mockHomeworks {
		if h.Status == "pending" {
			pendingCount++
		}
	}

	todayCorrected := 0 // Mock calculation, real logic would query History with today's date
	
	// Calculate Accuracy
	totalCorrect := 0
	totalQuestions := 0
	for _, h := range mockHistory {
		totalCorrect += h.CorrectCount
		totalQuestions += (h.CorrectCount + h.WrongCount)
	}
	accuracy := 0.0
	if totalQuestions > 0 {
		accuracy = float64(totalCorrect) / float64(totalQuestions)
	}

	recent := make([]gin.H, 0)
	// Return up to 3 recent homeworks
	count := 0
	for i := len(mockHomeworks) - 1; i >= 0; i-- {
		h := mockHomeworks[i]
		recent = append(recent, gin.H{
			"id": h.ID,
			"name": h.Name,
			"date": h.StartDate,
			"completed": h.Completed,
			"total": h.Total,
		})
		count++
		if count >= 3 {
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"todayCorrected": todayCorrected,
		"pendingAssignments": pendingCount,
		"accuracyRate": accuracy,
		"recentHomeworks": recent,
	})
}

// Reinforcement Handlers
func GetReinforcements(c *gin.Context) {
	c.JSON(http.StatusOK, mockReinforcements)
}

func CreateReinforcement(c *gin.Context) {
	var r Reinforcement
	if err := c.ShouldBindJSON(&r); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	r.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	mockReinforcements = append(mockReinforcements, r)
	SaveData()
	c.JSON(http.StatusCreated, r)
}

func DeleteReinforcement(c *gin.Context) {
	id := c.Param("id")
	for i, r := range mockReinforcements {
		if r.ID == id {
			mockReinforcements = append(mockReinforcements[:i], mockReinforcements[i+1:]...)
			SaveData()
			c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Reinforcement not found"})
}
