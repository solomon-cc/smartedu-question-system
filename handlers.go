package main

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func SendJSON(c *gin.Context, code int, err string, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:      code,
		Err:       err,
		Data:      data,
		Timestamp: time.Now().Unix(),
	})
}

// Store Data (Initial Seed Users only)
var storeUsers = []User{
	{ID: "1", Username: "admin", Password: "123", Role: RoleAdmin, Status: "active"},
	{ID: "2", Username: "teacher", Password: "123", Role: RoleTeacher, Status: "active"},
	{ID: "3", Username: "student", Password: "123", Role: RoleStudent, Status: "active"},
}

var storeQuestions = make([]Question, 0)
var storePapers = make([]Paper, 0)
var storeHomeworks = make([]Homework, 0)
var storeHistory = make([]History, 0)
var storeReinforcements = make([]Reinforcement, 0)

// Auth Handlers
func LoginHandler(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		SendJSON(c, 1, "Invalid request", nil)
		return
	}

	var foundUser *User
	for _, u := range storeUsers {
		if u.Username == req.Username && u.Password == req.Password {
			foundUser = &u
			break
		}
	}

	if foundUser == nil {
		SendJSON(c, 1, "Unauthorized", nil)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": foundUser.ID,
		"role":   foundUser.Role,
		"exp":    time.Now().Add(tokenDuration).Unix(),
	})

	tokenString, _ := token.SignedString(jwtSecret)

	// Set context for logging
	c.Set("userId", foundUser.ID)
	c.Set("role", string(foundUser.Role))
	AddAuditLog(c, "LOGIN", fmt.Sprintf("User logged in: %s", foundUser.Username))

	SendJSON(c, 0, "", gin.H{
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
	SendJSON(c, 0, "", storeUsers)
}

func GetStudents(c *gin.Context) {
	students := make([]User, 0)
	for _, u := range storeUsers {
		if u.Role == RoleStudent {
			students = append(students, u)
		}
	}
	SendJSON(c, 0, "", students)
}

func CreateUser(c *gin.Context) {
	var newUser User
	if err := c.ShouldBindJSON(&newUser); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	newUser.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	storeUsers = append(storeUsers, newUser)
	SaveData()
	SendJSON(c, 0, "", newUser)
}

func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var updateData User
	if err := c.ShouldBindJSON(&updateData); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	for i, u := range storeUsers {
		if u.ID == id {
			if updateData.Password != "" {
				storeUsers[i].Password = updateData.Password
			}
			storeUsers[i].Username = updateData.Username
			storeUsers[i].Role = updateData.Role
			storeUsers[i].Status = updateData.Status
			SaveData()
			SendJSON(c, 0, "", storeUsers[i])
			return
		}
	}
	SendJSON(c, 1, "User not found", nil)
}

func DeleteUser(c *gin.Context) {
	id := c.Param("id")
	for i, u := range storeUsers {
		if u.ID == id {
			storeUsers = append(storeUsers[:i], storeUsers[i+1:]...)
			SaveData()
			SendJSON(c, 0, "", gin.H{"message": "Deleted"})
			return
		}
	}
	SendJSON(c, 1, "User not found", nil)
}

// Stats Handlers
func GetDashboardStats(c *gin.Context) {
	accuracyTrend := make([]StatPoint, 7)
	completionTrend := make([]StatPoint, 7)
	
	now := time.Now()
	for i := 0; i < 7; i++ {
		day := now.AddDate(0, 0, - (6 - i))
		dateStr := day.Format("2006-01-02")
		label := day.Format("01-02")
		
		// 1. Calculate Accuracy for this day
		correct := 0
		total := 0
		for _, h := range storeHistory {
			if strings.HasPrefix(h.Date, dateStr) {
				correct += h.CorrectCount
				total += (h.CorrectCount + h.WrongCount)
			}
		}
		accValue := 0.0
		if total > 0 {
			accValue = (float64(correct) / float64(total)) * 100
		}
		accuracyTrend[i] = StatPoint{Label: label, Value: accValue}

		// 2. Calculate Completion for this day
		finished := 0
		assigned := 0
		for _, hw := range storeHomeworks {
			if strings.HasPrefix(hw.StartDate, dateStr) {
				assigned++
				if hw.Status == "completed" {
					finished++
				}
			}
		}
		compValue := 0.0
		if assigned > 0 {
			compValue = (float64(finished) / float64(assigned)) * 100
		}
		completionTrend[i] = StatPoint{Label: label, Value: compValue}
	}

	// Calculate online users (last 5 mins)
	onlineCount := 0
	nowUnix := time.Now().Unix()
	ActiveUsers.Range(func(key, value interface{}) bool {
		lastActive := value.(int64)
		if nowUnix-lastActive < 300 { // 300 seconds = 5 minutes
			onlineCount++
		}
		return true
	})

	stats := DashboardStats{
		AccuracyTrend:   accuracyTrend,
		CompletionTrend: completionTrend,
		TotalUsers:      len(storeUsers),
		TotalQuestions:  len(storeQuestions),
		OnlineUsers:     onlineCount,
	}
	SendJSON(c, 0, "", stats)
}

// Question Handlers
func GetQuestions(c *gin.Context) {
	subject := c.Query("subject")
	gradeStr := c.Query("grade")
	
	println("GET /api/questions called with:", subject, gradeStr)

	// Map English subject enums to Chinese stored values
	subjectMap := map[string]string{
		"MATH":     "数学",
		"LANGUAGE": "语文",
		"READING":  "阅读",
		"LITERACY": "识字",
	}

	filtered := make([]Question, 0)
	for _, q := range storeQuestions {
		// Try to match original subject or mapped subject
		matchSubject := subject == "" || q.Subject == subject || (subjectMap[subject] != "" && q.Subject == subjectMap[subject])
		
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
	SendJSON(c, 0, "", filtered)
}

func CreateQuestion(c *gin.Context) {
	var q Question
	if err := c.ShouldBindJSON(&q); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	// 1. Process stem image if it's base64
	if strings.HasPrefix(q.StemImage, "data:image") {
		url, err := UploadBase64ToOSS(q.StemImage)
		if err == nil {
			q.StemImage = url
		}
	}

	// 2. Process option images if any
	for i, opt := range q.Options {
		if strings.HasPrefix(opt.Image, "data:image") {
			url, err := UploadBase64ToOSS(opt.Image)
			if err == nil {
				q.Options[i].Image = url
			}
		}
	}

	q.ID = time.Now().Format("20060102150405")
	storeQuestions = append(storeQuestions, q)
	SaveData()
	AddAuditLog(c, "CREATE_QUESTION", fmt.Sprintf("Created question: %s", q.StemText))
	SendJSON(c, 0, "", q)
}

func UpdateQuestion(c *gin.Context) {
	id := c.Param("id")
	var q Question
	if err := c.ShouldBindJSON(&q); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	// 1. Process stem image if it's base64
	if strings.HasPrefix(q.StemImage, "data:image") {
		url, err := UploadBase64ToOSS(q.StemImage)
		if err == nil {
			q.StemImage = url
		}
	}

	// 2. Process option images
	for i, opt := range q.Options {
		if strings.HasPrefix(opt.Image, "data:image") {
			url, err := UploadBase64ToOSS(opt.Image)
			if err == nil {
				q.Options[i].Image = url
			}
		}
	}

	for i, existing := range storeQuestions {
		if existing.ID == id {
			storeQuestions[i] = q
			storeQuestions[i].ID = id
			SaveData()
			AddAuditLog(c, "UPDATE_QUESTION", fmt.Sprintf("Updated question: %s", q.StemText))
			SendJSON(c, 0, "", storeQuestions[i])
			return
		}
	}
	SendJSON(c, 1, "Question not found", nil)
}

func DeleteQuestion(c *gin.Context) {
	id := c.Param("id")
	for i, q := range storeQuestions {
		if q.ID == id {
			stem := q.StemText
			storeQuestions = append(storeQuestions[:i], storeQuestions[i+1:]...)
			SaveData()
			AddAuditLog(c, "DELETE_QUESTION", fmt.Sprintf("Deleted question: %s", stem))
			SendJSON(c, 0, "", gin.H{"message": "Deleted"})
			return
		}
	}
	SendJSON(c, 1, "Question not found", nil)
}

// Paper Handlers
func GetPapers(c *gin.Context) {
	println("GET /api/papers called, returning", len(storePapers), "papers")
	SendJSON(c, 0, "", storePapers)
}

func CreatePaper(c *gin.Context) {
	var p Paper
	if err := c.ShouldBindJSON(&p); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	p.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	
	// Populate Questions from IDs if provided
	if len(p.QuestionIDs) > 0 {
		p.Questions = make([]Question, 0)
		for _, qID := range p.QuestionIDs {
			for _, q := range storeQuestions {
				if q.ID == qID {
					p.Questions = append(p.Questions, q)
					break
				}
			}
		}
	}
	p.Total = len(p.Questions)

	storePapers = append(storePapers, p)
	SaveData()
	SendJSON(c, 0, "", p)
}

func UpdatePaper(c *gin.Context) {
	id := c.Param("id")
	var p Paper
	if err := c.ShouldBindJSON(&p); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	for i, existing := range storePapers {
		if existing.ID == id {
			p.ID = id
			// Populate questions
			if len(p.QuestionIDs) > 0 {
				p.Questions = make([]Question, 0)
				for _, qID := range p.QuestionIDs {
					for _, q := range storeQuestions {
						if q.ID == qID {
							p.Questions = append(p.Questions, q)
							break
						}
					}
				}
			}
			p.Total = len(p.Questions)
			storePapers[i] = p
			SaveData()
			SendJSON(c, 0, "", p)
			return
		}
	}
	SendJSON(c, 1, "Paper not found", nil)
}

func DeletePaper(c *gin.Context) {
	id := c.Param("id")
	for i, p := range storePapers {
		if p.ID == id {
			storePapers = append(storePapers[:i], storePapers[i+1:]...)
			SaveData()
			SendJSON(c, 0, "", gin.H{"message": "Deleted"})
			return
		}
	}
	SendJSON(c, 1, "Paper not found", nil)
}

// Homework Handlers
func GetHomeworks(c *gin.Context) {
	SendJSON(c, 0, "", storeHomeworks)
}

func AssignHomework(c *gin.Context) {
	var h Homework
	if err := c.ShouldBindJSON(&h); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	h.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	h.Status = "pending"
	storeHomeworks = append(storeHomeworks, h)
	SaveData()
	AddAuditLog(c, "ASSIGN_HOMEWORK", fmt.Sprintf("Assigned homework: %s", h.Name))
	SendJSON(c, 0, "", h)
}

func CompleteHomework(c *gin.Context) {
	id := c.Param("id")
	for i, h := range storeHomeworks {
		if h.ID == id {
			storeHomeworks[i].Status = "completed"
			storeHomeworks[i].Completed++
			SaveData()
			AddAuditLog(c, "COMPLETE_HOMEWORK", fmt.Sprintf("Finished homework: %s", h.Name))
			SendJSON(c, 0, "", storeHomeworks[i])
			return
		}
	}
	SendJSON(c, 1, "Homework not found", nil)
}

// History Handlers
func GetHistory(c *gin.Context) {
	SendJSON(c, 0, "", storeHistory)
}

func CreateHistory(c *gin.Context) {
	var h History
	if err := c.ShouldBindJSON(&h); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	
	userId, exists := c.Get("userId")
	if !exists {
		println("[ERROR] CreateHistory called without userId in context")
	}

	h.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	h.StudentID = fmt.Sprintf("%v", userId)
	h.Date = time.Now().Format("2006-01-02 15:04:05")

	storeHistory = append(storeHistory, h)
	SaveData()
	
	// Ensure Action contains 'PRACTICE' for frontend filter
	AddAuditLog(c, "PRACTICE_FINISH", fmt.Sprintf("Completed session: %s (Score: %d/%s)", h.Name, h.CorrectCount, h.Total))
	
	SendJSON(c, 0, "", h)
}

// Student Stats
func GetStudentStats(c *gin.Context) {
	userId, _ := c.Get("userId")
	studentId := userId.(string)

	totalCorrect := 0
	totalQuestions := 0
	completed := 0
	trends := make([]int, 7) // Last 7 sessions accuracy

	count := 0
	for i := len(storeHistory) - 1; i >= 0; i-- {
		h := storeHistory[i]
		if h.StudentID == studentId {
			completed++
			currTotal := h.CorrectCount + h.WrongCount
			totalCorrect += h.CorrectCount
			totalQuestions += currTotal

			if count < 7 {
				if currTotal > 0 {
					trends[6-count] = int((float64(h.CorrectCount) / float64(currTotal)) * 100)
				}
				count++
			}
		}
	}

	accuracy := "0%"
	if totalQuestions > 0 {
		accuracy = strconv.Itoa(int((float64(totalCorrect)/float64(totalQuestions))*100)) + "%"
	}

	SendJSON(c, 0, "", gin.H{
		"accuracy":     accuracy,
		"completed":    completed,
		"rank":         0, // Rank would require sorting all students, keeping 0 for now
		"time":         "0h", // Time tracking not yet implemented in history
		"achievements": 0,
		"trends":       trends,
	})
}

func GetTeacherStats(c *gin.Context) {
	today := time.Now().Format("2006-01-02")
	todayCorrected := 0
	for _, h := range storeHistory {
		if strings.HasPrefix(h.Date, today) {
			todayCorrected++
		}
	}

	pendingCount := 0
	for _, h := range storeHomeworks {
		if h.Status == "pending" {
			pendingCount++
		}
	}

	totalCorrect := 0
	totalQuestions := 0
	for _, h := range storeHistory {
		totalCorrect += h.CorrectCount
		totalQuestions += (h.CorrectCount + h.WrongCount)
	}
	accuracy := 0.0
	if totalQuestions > 0 {
		accuracy = float64(totalCorrect) / float64(totalQuestions)
	}

	recent := make([]gin.H, 0)
	// Get up to 5 most recent homeworks
	for i := len(storeHomeworks) - 1; i >= 0 && len(recent) < 5; i-- {
		h := storeHomeworks[i]
		recent = append(recent, gin.H{
			"id":        h.ID,
			"name":      h.Name,
			"date":      h.StartDate,
			"completed": h.Completed,
			"total":     h.Total,
		})
	}

	SendJSON(c, 0, "", gin.H{
		"todayCorrected":     todayCorrected,
		"pendingAssignments": pendingCount,
		"accuracyRate":       accuracy,
		"recentHomeworks":    recent,
	})
}

// Reinforcement Handlers
func GetAuditLogs(c *gin.Context) {
	// Return latest 50 logs
	start := 0
	if len(storeLogs) > 50 {
		start = len(storeLogs) - 50
	}
	SendJSON(c, 0, "", storeLogs[start:])
}

func AddAuditLog(c *gin.Context, action, details string) {
	userId, _ := c.Get("userId")
	role, _ := c.Get("role")
	
	// Find username
	username := "system"
	if uid, ok := userId.(string); ok {
		for _, u := range storeUsers {
			if u.ID == uid {
				username = u.Username
				break
			}
		}
		if username == "system" {
			username = "UID:" + uid // Fallback if user object deleted
		}
	} else if action == "LOGIN" {
		username = "guest"
	}

	roleStr := "UNKNOWN"
	if r, ok := role.(Role); ok {
		roleStr = string(r)
	} else if r, ok := role.(string); ok {
		roleStr = r
	}

	log := AuditLog{
		ID:        strconv.FormatInt(time.Now().UnixNano(), 36),
		UserID:    fmt.Sprintf("%v", userId),
		Username:  fmt.Sprintf("%s (%s)", username, roleStr),
		Action:    action,
		Details:   details,
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
	}
	
	dataMu.Lock()
	storeLogs = append(storeLogs, log)
	dataMu.Unlock()
	
	SaveData()
	println("[AUDIT]", log.Username, "|", log.Action, "|", log.Details)
}

func GetReinforcements(c *gin.Context) {
	SendJSON(c, 0, "", storeReinforcements)
}

func CreateReinforcement(c *gin.Context) {
	var r Reinforcement
	if err := c.ShouldBindJSON(&r); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	r.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	storeReinforcements = append(storeReinforcements, r)
	SaveData()
	SendJSON(c, 0, "", r)
}

func DeleteReinforcement(c *gin.Context) {
	id := c.Param("id")
	for i, r := range storeReinforcements {
		if r.ID == id {
			storeReinforcements = append(storeReinforcements[:i], storeReinforcements[i+1:]...)
			SaveData()
			SendJSON(c, 0, "", gin.H{"message": "Deleted"})
			return
		}
	}
	SendJSON(c, 1, "Reinforcement not found", nil)
}
