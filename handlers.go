package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func languageSelect(c *gin.Context, zh, en string) string {
	lang := c.GetHeader("Accept-Language")
	if strings.Contains(strings.ToLower(lang), "zh") {
		return zh
	}
	return en
}

func SendJSON(c *gin.Context, code int, err string, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:      code,
		Err:       err,
		Data:      data,
		Timestamp: time.Now().Unix(),
	})
}

// Auth Handlers
func LoginHandler(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		SendJSON(c, 1, "Invalid request", nil)
		return
	}

	var foundUser User
	if err := DB.Where("username = ?", req.Username).First(&foundUser).Error; err != nil {
		SendJSON(c, 1, "Unauthorized", nil)
		return
	}

	if foundUser.Status != "active" {
		SendJSON(c, 1, "Account disabled", nil)
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(foundUser.Password), []byte(req.Password)); err != nil {
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
			"name":     foundUser.Name,
		},
	})
}

func RegisterHandler(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		SendJSON(c, 1, "Invalid request", nil)
		return
	}

	// Check if registration is enabled
	var sysConf SystemConfig
	var settings SystemSettingsConfig
	// Default to false if not configured
	if err := DB.Where("`key` = ?", "system_settings").First(&sysConf).Error; err == nil {
		json.Unmarshal([]byte(sysConf.Value), &settings)
	}

	if !settings.RegistrationEnabled {
		SendJSON(c, 1, "Registration is currently disabled", nil)
		return
	}

	// Validate Phone Number (Simple check, can be improved with regex)
	// Assuming 11 digits for CN
	if len(req.PhoneNumber) != 11 || !strings.HasPrefix(req.PhoneNumber, "1") {
		SendJSON(c, 1, "Invalid phone number format", nil)
		return
	}
	// Check if number contains only digits
	if _, err := strconv.ParseInt(req.PhoneNumber, 10, 64); err != nil {
		SendJSON(c, 1, "Invalid phone number format", nil)
		return
	}

	// Check if user exists (Phone)
	var count int64
	DB.Model(&User{}).Where("username = ?", req.PhoneNumber).Count(&count)
	if count > 0 {
		SendJSON(c, 1, "User with this phone number already exists", nil)
		return
	}

	// Check if Nickname exists
	var nickCount int64
	DB.Model(&User{}).Where("name = ?", req.Nickname).Count(&nickCount)
	if nickCount > 0 {
		SendJSON(c, 1, languageSelect(c, "该昵称已被占用", "Nickname already exists"), nil)
		return
	}

	// Create User
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		SendJSON(c, 1, "Internal server error", nil)
		return
	}

	newUser := User{
		ID:       strconv.FormatInt(time.Now().UnixNano(), 36),
		Username: req.PhoneNumber,
		Name:     req.Nickname,
		Password: string(hashed),
		Role:     RoleStudent,
		Status:   "active",
	}

	if err := DB.Create(&newUser).Error; err != nil {
		SendJSON(c, 1, "Failed to create user", nil)
		return
	}

	AddAuditLog(c, "REGISTER", fmt.Sprintf("New user registered: %s", newUser.Username))
	SendJSON(c, 0, "", gin.H{"message": "Registration successful"})
}

// User Handlers (Admin)
func GetUsers(c *gin.Context) {
	var users []User
	DB.Omit("password").Find(&users)
	SendJSON(c, 0, "", users)
}

func GetStudents(c *gin.Context) {
	var students []User
	DB.Omit("password").Where("role = ?", RoleStudent).Find(&students)
	SendJSON(c, 0, "", students)
}

func GetStudentDetail(c *gin.Context) {
	studentId := c.Param("id")

	var student User
	if err := DB.Omit("password").First(&student, "id = ? AND role = ?", studentId, RoleStudent).Error; err != nil {
		SendJSON(c, 1, "Student not found", nil)
		return
	}

	// 1. Fetch targeted reinforcements
	reinforcements := make([]Reinforcement, 0)
	DB.Where("target_student_ids LIKE ?", "%\""+studentId+"\"%").Find(&reinforcements)

	// 2. Fetch recent learning logs (last 20)
	history := make([]History, 0)
	DB.Where("student_id = ?", studentId).Order("date DESC").Limit(20).Find(&history)

	// 3. Learning progress & stats (Accuracy trend last 14 days)
	type ProgressPoint struct {
		Date     string  `json:"date"`
		Accuracy float64 `json:"accuracy"`
	}
	progress := make([]ProgressPoint, 0)

	now := time.Now()
	for i := 13; i >= 0; i-- {
		day := now.AddDate(0, 0, -i)
		dateStr := day.Format("2006-01-02")

		var results struct {
			Correct int
			Total   int
		}
		DB.Model(&History{}).
			Select("SUM(correct_count) as correct, SUM(CAST(total AS UNSIGNED)) as total").
			Where("student_id = ? AND date LIKE ?", studentId, dateStr+"%").
			Scan(&results)

		acc := 0.0
		if results.Total > 0 {
			acc = (float64(results.Correct) / float64(results.Total)) * 100
		}
		progress = append(progress, ProgressPoint{
			Date:     day.Format("01-02"),
			Accuracy: acc,
		})
	}

	// 4. Homework completion overview
	type HomeworkBrief struct {
		ID           string  `json:"id"`
		Name         string  `json:"name"`
		Status       string  `json:"status"` // "pending", "completed", "overdue"
		StartDate    string  `json:"startDate"`
		EndDate      string  `json:"endDate"`
		Score        string  `json:"score"`
		Total        string  `json:"total"`
		CorrectCount int     `json:"correctCount"`
		AccuracyRate float64 `json:"accuracyRate"`
	}

	homeworkOverview := make([]HomeworkBrief, 0)

	// Fetch all homeworks where this student is assigned
	var assignedHomeworks []Homework
	DB.Where("student_ids LIKE ?", "%\""+studentId+"\"%").Find(&assignedHomeworks)

	for _, hw := range assignedHomeworks {
		brief := HomeworkBrief{
			ID:           hw.ID,
			Name:         hw.Name,
			StartDate:    hw.StartDate,
			EndDate:      hw.EndDate,
			Status:       "pending",
			Score:        "0",
			Total:        "0",
			CorrectCount: 0,
			AccuracyRate: 0.0,
		}

		var latestHistory History
		// Find the latest history entry for this homework and student
		err := DB.Where("student_id = ? AND homework_id = ?", studentId, hw.ID).
			Order("date DESC").
			First(&latestHistory).Error

		if err == nil { // Found a submission
			brief.Status = "completed"
			brief.Score = strconv.Itoa(latestHistory.CorrectCount) // Set score to correct count
			brief.Total = latestHistory.Total
			brief.CorrectCount = latestHistory.CorrectCount

			totalInt, _ := strconv.Atoi(latestHistory.Total)
			if totalInt > 0 {
				brief.AccuracyRate = (float64(latestHistory.CorrectCount) / float64(totalInt)) * 100
			}
		} else { // No submission found
			// Check if homework is overdue
			if hw.EndDate != "" {
				if homeworkPastDeadline(hw.EndDate, time.Now()) {
					brief.Status = "overdue"
				}
			}
		}
		homeworkOverview = append(homeworkOverview, brief)
	}

	// Sort homeworks by start date
	sort.Slice(homeworkOverview, func(i, j int) bool {
		return homeworkOverview[i].StartDate > homeworkOverview[j].StartDate
	})

	SendJSON(c, 0, "", gin.H{
		"student":        student,
		"reinforcements": reinforcements,
		"history":        history,
		"progress":       progress,
		"homework":       homeworkOverview,
	})
}

func CreateUser(c *gin.Context) {
	var newUser User
	if err := c.ShouldBindJSON(&newUser); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	if strings.TrimSpace(newUser.Username) == "" || len(newUser.Password) < 8 || !portalValidRole(newUser.Role) {
		SendJSON(c, 1, "Invalid user details; password must have at least 8 characters", nil)
		return
	}
	if newUser.Status == "" {
		newUser.Status = "active"
	}
	// Hash password
	hashed, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		SendJSON(c, 1, "Failed to hash password", nil)
		return
	}
	newUser.Password = string(hashed)

	newUser.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	if err := DB.Create(&newUser).Error; err != nil {
		SendJSON(c, 1, "Failed to create user", nil)
		return
	}
	newUser.Password = ""
	SendJSON(c, 0, "", newUser)
}

func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var updateData User
	if err := c.ShouldBindJSON(&updateData); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	var user User
	if err := DB.First(&user, "id = ?", id).Error; err != nil {
		SendJSON(c, 1, "User not found", nil)
		return
	}

	if updateData.Password != "" {
		// Hash new password
		hashed, err := bcrypt.GenerateFromPassword([]byte(updateData.Password), bcrypt.DefaultCost)
		if err != nil {
			SendJSON(c, 1, "Failed to hash password", nil)
			return
		}
		user.Password = string(hashed)
	}
	if id == c.GetString("userId") && (updateData.Role != user.Role || updateData.Status != "active") {
		SendJSON(c, 1, "Cannot disable or change your own role", nil)
		return
	}
	user.Username = updateData.Username
	user.Name = updateData.Name
	user.Role = updateData.Role
	user.Status = updateData.Status

	if err := DB.Save(&user).Error; err != nil {
		SendJSON(c, 1, "Failed to update user", nil)
		return
	}
	user.Password = ""
	SendJSON(c, 0, "", user)
}

func GetMe(c *gin.Context) {
	userId, _ := c.Get("userId")
	var user User
	if err := DB.First(&user, "id = ?", userId).Error; err != nil {
		SendJSON(c, 1, "User not found", nil)
		return
	}
	// Don't send password
	user.Password = ""
	SendJSON(c, 0, "", user)
}

func UpdateMe(c *gin.Context) {
	userId, _ := c.Get("userId")
	var updateData struct {
		Name     string `json:"name"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	var user User
	if err := DB.First(&user, "id = ?", userId).Error; err != nil {
		SendJSON(c, 1, "User not found", nil)
		return
	}

	if updateData.Name != "" {
		user.Name = updateData.Name
	}
	if updateData.Password != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(updateData.Password), bcrypt.DefaultCost)
		if err != nil {
			SendJSON(c, 1, "Failed to hash password", nil)
			return
		}
		user.Password = string(hashed)
	}

	if err := DB.Save(&user).Error; err != nil {
		SendJSON(c, 1, "Failed to update user", nil)
		return
	}

	// Don't send password back
	user.Password = ""
	SendJSON(c, 0, "", user)
}

func DeleteUser(c *gin.Context) {
	id := c.Param("id")
	if id == c.GetString("userId") {
		SendJSON(c, 1, "Cannot delete your own account", nil)
		return
	}
	if err := DB.Delete(&User{}, "id = ?", id).Error; err != nil {
		SendJSON(c, 1, "Failed to delete user", nil)
		return
	}
	SendJSON(c, 0, "", gin.H{"message": "Deleted"})
}

// Stats Handlers
func GetDashboardStats(c *gin.Context) {
	accuracyTrend := make([]StatPoint, 7)
	completionTrend := make([]StatPoint, 7)

	now := time.Now()
	for i := 0; i < 7; i++ {
		day := now.AddDate(0, 0, -(6 - i))
		dateStr := day.Format("2006-01-02")
		label := day.Format("01-02")

		// 1. Calculate Accuracy for this day
		var results struct {
			Correct int
			Total   int
		}
		DB.Model(&History{}).
			Select("SUM(correct_count) as correct, SUM(CAST(total AS UNSIGNED)) as total").
			Where("date LIKE ?", dateStr+"%").
			Scan(&results)

		accValue := 0.0
		if results.Total > 0 {
			accValue = (float64(results.Correct) / float64(results.Total)) * 100
		}
		accuracyTrend[i] = StatPoint{Label: label, Value: accValue}

		// 2. Calculate Completion for this day
		var counts struct {
			Assigned  int64
			Completed int64
		}
		DB.Model(&Homework{}).Where("start_date LIKE ?", dateStr+"%").Count(&counts.Assigned)
		DB.Model(&Homework{}).Where("start_date LIKE ?", dateStr+"%").Where("status = ?", "completed").Count(&counts.Completed)

		compValue := 0.0
		if counts.Assigned > 0 {
			compValue = (float64(counts.Completed) / float64(counts.Assigned)) * 100
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

	var totalUsers int64
	var totalQuestions int64
	DB.Model(&User{}).Count(&totalUsers)
	DB.Model(&Question{}).Count(&totalQuestions)

	stats := DashboardStats{
		AccuracyTrend:   accuracyTrend,
		CompletionTrend: completionTrend,
		TotalUsers:      int(totalUsers),
		TotalQuestions:  int(totalQuestions),
		OnlineUsers:     onlineCount,
	}
	SendJSON(c, 0, "", stats)
}

func GetOnlineUsers(c *gin.Context) {
	nowUnix := time.Now().Unix()
	var onlineUserIDs []string
	userActiveMap := make(map[string]int64)

	ActiveUsers.Range(func(key, value interface{}) bool {
		lastActive := value.(int64)
		if nowUnix-lastActive < 300 { // 5 minutes
			uid := key.(string)
			onlineUserIDs = append(onlineUserIDs, uid)
			userActiveMap[uid] = lastActive
		}
		return true
	})

	var users []User
	if len(onlineUserIDs) > 0 {
		DB.Where("id IN ?", onlineUserIDs).Find(&users)
	}

	var onlineUsers []OnlineUser
	for _, u := range users {
		onlineUsers = append(onlineUsers, OnlineUser{
			ID:         u.ID,
			Username:   u.Username,
			Name:       u.Name,
			Role:       string(u.Role),
			LastActive: userActiveMap[u.ID],
		})
	}

	if onlineUsers == nil {
		onlineUsers = []OnlineUser{}
	}

	SendJSON(c, 0, "", onlineUsers)
}

// Question Handlers
func GetQuestions(c *gin.Context) {
	subject := c.Query("subject")
	gradeStr := c.Query("grade")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	query := DB.Model(&Question{})
	if objectiveID := c.Query("objectiveId"); objectiveID != "" {
		query = query.Where("objective_id = ?", objectiveID)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		query = query.Where("stem_text LIKE ?", "%"+search+"%")
	}

	if subject != "" {
		// Map English subject enums to Chinese stored values
		subjectMap := map[string]string{
			"MATH":     "数学",
			"LANGUAGE": "语言词汇",
			"READING":  "阅读",
			"LITERACY": "识字",
		}

		if mapped, ok := subjectMap[subject]; ok {
			query = query.Where("subject = ? OR subject = ?", subject, mapped)
		} else if subject == "语文" {
			// Keep support for legacy "语文"
			query = query.Where("subject = ? OR subject = ?", "LANGUAGE", "语言词汇")
		} else {
			query = query.Where("subject = ?", subject)
		}
	}

	if gradeStr != "" {
		if g, err := strconv.Atoi(gradeStr); err == nil {
			query = query.Where("grade = ?", g)
		}
	}

	// Check exclusion logic
	var sysConf SystemConfig
	var conf ErrorLogicConfig
	if err := DB.Where("`key` = ?", "error_logic").First(&sysConf).Error; err == nil {
		json.Unmarshal([]byte(sysConf.Value), &conf)
	}

	if conf.GlobalEnabled && conf.ExcludeMistakesFromPractice {
		userId, exists := c.Get("userId")
		if exists {
			var wrongQIDs []string
			// Get IDs of questions in wrong book (status != 4 means active mistake)
			// Actually status 4 is "Known", status 1,2,3,5 are active mistakes usually.
			// But requirement says "Mistakes in Wrong Book shouldn't appear".
			// If "Known" (4) is considered "in wrong book" but mastered, maybe we should exclude only active errors?
			// User said "Question in Wrong Book... should not appear again".
			// Usually "Wrong Book" contains all questions the student has ever gotten wrong unless they are "mastered" and removed.
			// Based on previous logic, all 1-5 are in the table. 4 is "Known".
			// Let's assume we exclude ANY question currently in the `student_wrong_questions` table for this student,
			// OR maybe just active errors (1,2,3,5).
			// Let's exclude ALL for now as "Wrong Book" usually implies the collection.
			// Re-reading: "错题本中的题目...不要再次出现".
			// If status 4 is "Known", maybe it's okay to appear?
			// But stage 5 is "Difficult" -> "Excluded from homework".
			// Let's filter out ALL IDs found in StudentWrongQuestion table for this student.

			DB.Model(&StudentWrongQuestion{}).Where("student_id = ?", fmt.Sprintf("%v", userId)).Pluck("question_id", &wrongQIDs)

			if len(wrongQIDs) > 0 {
				query = query.Where("id NOT IN ?", wrongQIDs)
			}
		}
	}

	var total int64
	query.Count(&total)

	questions := make([]Question, 0)
	query.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&questions)

	SendJSON(c, 0, "", gin.H{
		"list":     questions,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func GetQuestionGradeStats(c *gin.Context) {
	subject := c.Query("subject")
	if subject == "" {
		SendJSON(c, 1, "Subject required", nil)
		return
	}

	// Map English subject enums to Chinese stored values
	subjectMap := map[string]string{
		"MATH":     "数学",
		"LANGUAGE": "语言词汇",
		"READING":  "阅读",
		"LITERACY": "识字",
	}

	mappedSubject := subject
	if mapped, ok := subjectMap[subject]; ok {
		mappedSubject = mapped
	}

	type GradeStat struct {
		Grade int `json:"grade"`
		Count int `json:"count"`
	}

	stats := make([]GradeStat, 0)
	for g := 1; g <= 6; g++ {
		var count int64
		DB.Model(&Question{}).Where("(subject = ? OR subject = ?) AND grade = ?", subject, mappedSubject, g).Count(&count)
		stats = append(stats, GradeStat{Grade: g, Count: int(count)})
	}

	SendJSON(c, 0, "", stats)
}

// Helper to auto-register resources
func registerResourceIfNew(c *gin.Context, url string, name string) {
	if url == "" || strings.HasPrefix(url, "data:") {
		return
	}

	userId, _ := c.Get("userId")
	uid := fmt.Sprintf("%v", userId)

	// Check if already exists to avoid duplicates
	var count int64
	DB.Model(&Resource{}).Where("url = ?", url).Count(&count)
	if count > 0 {
		return
	}

	res := Resource{
		ID:         strconv.FormatInt(time.Now().UnixNano(), 36),
		Name:       name,
		URL:        url,
		Type:       "image",
		Tags:       []string{"auto-uploaded", "question-asset"},
		Visibility: "public",
		CreatorID:  uid,
		CreatedAt:  time.Now().Format("2006-01-02 15:04:05"),
	}
	DB.Create(&res)
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
			registerResourceIfNew(c, url, fmt.Sprintf("Question Stem: %s", q.StemText))
		}
	}

	// 2. Process option images if any
	for i, opt := range q.Options {
		if strings.HasPrefix(opt.Image, "data:image") {
			url, err := UploadBase64ToOSS(opt.Image)
			if err == nil {
				q.Options[i].Image = url
				registerResourceIfNew(c, url, fmt.Sprintf("Option %s: %s", opt.Value, q.StemText))
			}
		}
	}

	q.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	if err := DB.Create(&q).Error; err != nil {
		SendJSON(c, 1, "Failed to create question", nil)
		return
	}
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
			registerResourceIfNew(c, url, fmt.Sprintf("Question Stem: %s", q.StemText))
		}
	}

	// 2. Process option images
	for i, opt := range q.Options {
		if strings.HasPrefix(opt.Image, "data:image") {
			url, err := UploadBase64ToOSS(opt.Image)
			if err == nil {
				q.Options[i].Image = url
				registerResourceIfNew(c, url, fmt.Sprintf("Option %s: %s", opt.Value, q.StemText))
			}
		}
	}

	q.ID = id
	if err := DB.Save(&q).Error; err != nil {
		SendJSON(c, 1, "Failed to update question", nil)
		return
	}
	AddAuditLog(c, "UPDATE_QUESTION", fmt.Sprintf("Updated question: %s", q.StemText))
	SendJSON(c, 0, "", q)
}

func DeleteQuestion(c *gin.Context) {
	id := c.Param("id")
	var q Question
	if err := DB.First(&q, "id = ?", id).Error; err != nil {
		SendJSON(c, 1, "Question not found", nil)
		return
	}

	stem := q.StemText
	DB.Delete(&q)
	AddAuditLog(c, "DELETE_QUESTION", fmt.Sprintf("Deleted question: %s", stem))
	SendJSON(c, 0, "", gin.H{"message": "Deleted"})
}

// Paper Handlers
func GetPapers(c *gin.Context) {
	var papers []Paper
	DB.Find(&papers)

	result := make([]interface{}, len(papers))
	for i, p := range papers {
		var assignedCount int64
		DB.Model(&Homework{}).Where("paper_id = ?", p.ID).Count(&assignedCount)

		result[i] = gin.H{
			"id":            p.ID,
			"name":          p.Name,
			"questions":     p.Questions,
			"total":         p.Total,
			"assignedCount": assignedCount,
		}
	}
	SendJSON(c, 0, "", result)
}

func CreatePaper(c *gin.Context) {
	var p Paper
	if err := c.ShouldBindJSON(&p); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	p.Name = strings.TrimSpace(p.Name)
	if p.Name == "" {
		SendJSON(c, 1, "请填写试卷名称", nil)
		return
	}
	if len(p.QuestionIDs) == 0 {
		for _, q := range p.Questions {
			p.QuestionIDs = append(p.QuestionIDs, q.ID)
		}
	}
	questions, err := resolvePaperQuestions(p.QuestionIDs, nil)
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	p.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	p.Questions = questions
	p.Total = len(questions)
	if err := DB.Create(&p).Error; err != nil {
		SendJSON(c, 1, "保存试卷失败，请重试", nil)
		return
	}
	SendJSON(c, 0, "", p)
}

func UpdatePaper(c *gin.Context) {
	var stored Paper
	if DB.First(&stored, "id = ?", c.Param("id")).Error != nil {
		SendJSON(c, 1, "试卷不存在，请刷新列表", nil)
		return
	}
	var input Paper
	if err := c.ShouldBindJSON(&input); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	if input.Name == "" {
		SendJSON(c, 1, "请填写试卷名称", nil)
		return
	}
	if input.QuestionIDs == nil {
		for _, q := range stored.Questions {
			input.QuestionIDs = append(input.QuestionIDs, q.ID)
		}
	}
	var references int64
	DB.Model(&Homework{}).Where("paper_id = ?", stored.ID).Count(&references)
	if references > 0 && !sameQuestionOrder(input.QuestionIDs, stored.Questions) {
		SendJSON(c, 1, "此试卷已用于作业，不能修改题目；请创建新试卷", nil)
		return
	}
	questions, err := resolvePaperQuestions(input.QuestionIDs, stored.Questions)
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	stored.Name, stored.Questions, stored.QuestionIDs, stored.Total = input.Name, questions, input.QuestionIDs, len(questions)
	if err := DB.Save(&stored).Error; err != nil {
		SendJSON(c, 1, "保存试卷失败，请重试", nil)
		return
	}
	SendJSON(c, 0, "", stored)
}

func DeletePaper(c *gin.Context) {
	id := c.Param("id")
	var references int64
	DB.Model(&Homework{}).Where("paper_id = ?", id).Count(&references)
	if references > 0 {
		SendJSON(c, 1, "该试卷已被作业使用，不能删除", nil)
		return
	}
	if err := DB.Delete(&Paper{}, "id = ?", id).Error; err != nil {
		SendJSON(c, 1, "Failed to delete paper", nil)
		return
	}
	SendJSON(c, 0, "", gin.H{"message": "Deleted"})
}

// Homework Handlers
func GetHomeworks(c *gin.Context) {
	uid := c.GetString("userId")
	role := c.GetString("role")
	homeworks := make([]Homework, 0)
	q := DB.Model(&Homework{})
	if role == string(RoleTeacher) {
		q = q.Where("teacher_id = ?", uid)
	}
	if err := q.Order("start_date DESC").Find(&homeworks).Error; err != nil {
		SendJSON(c, 1, "Failed to load homeworks", nil)
		return
	}
	result := make([]Homework, 0)
	for _, hw := range homeworks {
		if role == string(RoleStudent) && !containsStudent(hw.StudentIDs, uid) {
			continue
		}
		var count int64
		history := DB.Model(&History{}).Where("homework_id = ?", hw.ID)
		if role == string(RoleStudent) {
			history = history.Where("student_id = ?", uid)
		}
		history.Distinct("student_id").Count(&count)
		hw.Completed = int(count)
		hw.Status = "pending"
		if (role == string(RoleStudent) && count > 0) || (role != string(RoleStudent) && hw.Total > 0 && int(count) >= hw.Total) {
			hw.Status = "completed"
		}
		result = append(result, hw)
	}
	SendJSON(c, 0, "", result)
}

func AssignHomework(c *gin.Context) {
	userId, _ := c.Get("userId")
	var h Homework
	if err := c.ShouldBindJSON(&h); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	if err := validateAssignment(&h); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	h.TeacherID = fmt.Sprintf("%v", userId)
	h.Total = len(h.StudentIDs)

	h.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	h.Status = "pending"

	// Initial scheduling if repeat is set
	if h.RepeatInterval != "" && h.RepeatInterval != "none" {
		start, _ := time.ParseInLocation("2006-01-02", h.StartDate, time.Local)
		if start.Before(time.Now()) {
			start = time.Now()
		}
		h.NextRunDate = calculateNextRun(start, h.RepeatInterval)
	}

	if err := DB.Create(&h).Error; err != nil {
		SendJSON(c, 1, "Failed to assign homework", nil)
		return
	}
	AddAuditLog(c, "ASSIGN_HOMEWORK", fmt.Sprintf("Assigned homework: %s (Repeat: %s)", h.Name, h.RepeatInterval))
	SendJSON(c, 0, "", h)
}

func calculateNextRun(from time.Time, interval string) string {
	var next time.Time
	switch interval {
	case "daily":
		next = from.AddDate(0, 0, 1)
	case "3days":
		next = from.AddDate(0, 0, 3)
	case "weekly":
		next = from.AddDate(0, 0, 7)
	case "monthly":
		next = from.AddDate(0, 1, 0)
	default:
		return ""
	}
	return next.Format("2006-01-02")
}

func BulkCreateQuestions(c *gin.Context) {
	var list []Question
	if err := c.ShouldBindJSON(&list); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	if len(list) == 0 || len(list) > 500 {
		SendJSON(c, 1, "Import 1 to 500 questions at a time", nil)
		return
	}
	now := time.Now().UnixNano()
	for i := range list {
		list[i].ID = strconv.FormatInt(now, 10) + "_" + strconv.Itoa(i)
	}

	if err := DB.Create(&list).Error; err != nil {
		SendJSON(c, 1, "Failed to bulk create questions", nil)
		return
	}

	AddAuditLog(c, "BULK_CREATE_QUESTIONS", fmt.Sprintf("Bulk imported %d questions", len(list)))
	SendJSON(c, 0, "", gin.H{"imported": len(list)})
}

func CompleteHomework(c *gin.Context) {
	id := c.Param("id")
	userId, _ := c.Get("userId")
	studentId := fmt.Sprintf("%v", userId)

	var h Homework
	if err := DB.First(&h, "id = ?", id).Error; err != nil {
		SendJSON(c, 1, "Homework not found", nil)
		return
	}

	// Check if this student already completed it in History
	var exists int64
	DB.Model(&History{}).Where("homework_id = ? AND student_id = ?", id, studentId).Count(&exists)

	// Recalculate accurate completion count
	var currentCompleted int64
	DB.Model(&History{}).
		Where("homework_id = ?", id).
		Select("COUNT(DISTINCT student_id)").
		Scan(&currentCompleted)

	h.Completed = int(currentCompleted)

	// Update status only if fully completed
	if h.Total > 0 && h.Completed >= h.Total {
		h.Status = "completed"
	} else {
		// If not full, ensure it's pending (or whatever active status is)
		h.Status = "pending"
	}

	DB.Save(&h)

	AddAuditLog(c, "COMPLETE_HOMEWORK", fmt.Sprintf("Finished homework: %s", h.Name))
	SendJSON(c, 0, "", h)
}

// History Handlers
func GetHistory(c *gin.Context) {
	userId, _ := c.Get("userId")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}
	homeworkId := c.Query("homeworkId")
	targetStudentId := c.Query("studentId")

	histories := make([]History, 0)
	var total int64
	role, _ := c.Get("role")

	query := DB.Model(&History{})
	if fmt.Sprintf("%v", role) == string(RoleStudent) {
		query = query.Where("student_id = ?", fmt.Sprintf("%v", userId))
	} else if fmt.Sprintf("%v", role) == string(RoleTeacher) {
		if targetStudentId != "" {
			// Teacher viewing specific student history
			query = query.Where("student_id = ?", targetStudentId)
		} else {
			// Teacher viewing all their assigned homeworks' history
			// Two-step approach to avoid JOIN issues
			// 1. Get all homework IDs for this teacher
			var homeworkIDs []string

			hwQuery := DB.Model(&Homework{}).Where("teacher_id = ?", fmt.Sprintf("%v", userId))
			if homeworkId != "" {
				hwQuery = hwQuery.Where("id = ?", homeworkId)
			}

			hwQuery.Pluck("id", &homeworkIDs)

			if len(homeworkIDs) > 0 {
				query = query.Where("homework_id IN ?", homeworkIDs)
			} else {
				// No homeworks found for this teacher (or the specific one doesn't belong to them)
				query = query.Where("1 = 0")
			}
		}
	}

	if homeworkId != "" {
		query = query.Where("homework_id = ?", homeworkId)
	}
	query.Count(&total)
	query.Order("date DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&histories)

	SendJSON(c, 0, "", gin.H{
		"list":     histories,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func CreateHistory(c *gin.Context) {
	var h History
	if err := c.ShouldBindJSON(&h); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	userId, _ := c.Get("userId")
	studentId := fmt.Sprintf("%v", userId)

	if h.HomeworkID != "" {
		var hw Homework
		if DB.First(&hw, "id = ?", h.HomeworkID).Error != nil || (c.GetString("role") == string(RoleStudent) && !containsStudent(hw.StudentIDs, studentId)) {
			c.AbortWithStatusJSON(403, gin.H{"error": "Homework access denied"})
			return
		}
	}
	h.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	h.StudentID = studentId
	h.Date = time.Now().Format("2006-01-02 15:04:05")

	if err := DB.Create(&h).Error; err != nil {
		SendJSON(c, 1, "Failed to create history", nil)
		return
	}

	// Process Wrong Questions & Ability Tracking
	func(history History) {
		questionsBytes, _ := json.Marshal(history.Questions)
		var results []HistoryQuestionResult
		if err := json.Unmarshal(questionsBytes, &results); err == nil {

			// Ability tracking map: ObjectiveID -> {Correct, Total}
			objStats := make(map[string]struct{ Correct, Total int })

			for _, res := range results {
				isCorrect := res.Status == "correct"

				// 1. Process Error Logic
				wrongCount := 0
				if len(res.AttemptLog) > 0 {
					for _, att := range res.AttemptLog {
						if !att.IsCorrect {
							wrongCount++
						}
					}
				} else {
					if isCorrect {
						if res.Attempts > 1 {
							wrongCount = res.Attempts - 1
						}
					} else {
						wrongCount = res.Attempts
						if wrongCount == 0 {
							wrongCount = 1
						}
					}
				}
				processWrongQuestion(history.StudentID, res.ID, isCorrect, wrongCount)

				// 2. Track Ability (if objective is present)
				var q Question
				if err := DB.Select("objective_id").First(&q, "id = ?", res.ID).Error; err == nil {
					// Update global Question stats
					var fullQ Question
					if err := DB.First(&fullQ, "id = ?", res.ID).Error; err == nil {
						fullQ.Attempts++
						correctCount := 0
						if isCorrect {
							correctCount = 1
						}
						// Recalculate CorrectRate
						// Previous total correct = CorrectRate * (Attempts-1) / 100
						prevTotalCorrect := (fullQ.CorrectRate * float64(fullQ.Attempts-1)) / 100
						fullQ.CorrectRate = (prevTotalCorrect + float64(correctCount)) / float64(fullQ.Attempts) * 100
						DB.Model(&Question{}).Where("id = ?", fullQ.ID).Updates(map[string]interface{}{
							"attempts":     fullQ.Attempts,
							"correct_rate": fullQ.CorrectRate,
						})
					}

					if q.ObjectiveID != "" {
						stats := objStats[q.ObjectiveID]
						stats.Total++
						if isCorrect {
							stats.Correct++
						}
						objStats[q.ObjectiveID] = stats
					}
				}
			}

			// Save Ability Records
			dateStr := time.Now().Format("2006-01-02")
			for objID, stats := range objStats {
				acc := (float64(stats.Correct) / float64(stats.Total)) * 100
				status := "N"
				if acc >= 80 {
					status = "Y"
				} // Threshold 80%

				record := AbilityRecord{
					ID:          strconv.FormatInt(time.Now().UnixNano(), 36),
					StudentID:   history.StudentID,
					ObjectiveID: objID,
					Date:        dateStr,
					Status:      status,
					Accuracy:    acc,
				}
				DB.Create(&record)
			}
		}
	}(h)

	AddAuditLog(c, "PRACTICE_FINISH", fmt.Sprintf("Completed session: %s (Score: %d/%s)", h.Name, h.CorrectCount, h.Total))
	if h.HomeworkID != "" {
		var hw Homework
		if DB.First(&hw, "id = ?", h.HomeworkID).Error == nil {
			var count int64
			DB.Model(&History{}).Where("homework_id = ?", hw.ID).Distinct("student_id").Count(&count)
			status := "pending"
			if hw.Total > 0 && int(count) >= hw.Total {
				status = "completed"
			}
			DB.Model(&hw).Updates(map[string]interface{}{"completed": int(count), "status": status})
		}
	}
	SendJSON(c, 0, "", h)
}

// processWrongQuestion implements the Error Logic state machine
func processWrongQuestion(studentID string, questionID string, isCorrect bool, wrongIncrement int) {
	var state StudentWrongQuestion
	// Check if record exists
	err := DB.Where("student_id = ? AND question_id = ?", studentID, questionID).First(&state).Error
	exists := err == nil

	now := time.Now().Format("2006-01-02 15:04:05")

	// Load Config
	var sysConf SystemConfig
	var conf ErrorLogicConfig
	// Default hardcoded logic if config missing
	conf = ErrorLogicConfig{
		GlobalEnabled: true,
		Stages: map[int]StageConfig{
			1: {NextWrong: 2, NextCorrect: 4, ShowAnswer: false, Label: "Error"},
			2: {NextWrong: 3, NextCorrect: 4, ShowAnswer: true, Label: "Retry (Ans)"},
			3: {NextWrong: 5, NextCorrect: 4, ShowAnswer: false, Label: "Retry (No Ans)"},
			4: {NextWrong: 1, NextCorrect: 4, ShowAnswer: false, Label: "Known"},
			5: {NextWrong: 5, NextCorrect: 5, ShowAnswer: false, Label: "Difficult"},
		},
	}

	if err := DB.Where("`key` = ?", "error_logic").First(&sysConf).Error; err == nil {
		json.Unmarshal([]byte(sysConf.Value), &conf)
	}

	if !conf.GlobalEnabled {
		return // Logic disabled
	}

	if isCorrect {
		if exists {
			state.ErrorCount += wrongIncrement

			currentStage := state.Status
			if stageConf, ok := conf.Stages[currentStage]; ok {
				state.Status = stageConf.NextCorrect
			} else {
				state.Status = 4 // Default fallback
			}

			state.LastUpdated = now
			DB.Save(&state)
		} else if wrongIncrement > 0 {
			// Correct now, but had errors -> Known (4)
			newState := StudentWrongQuestion{
				ID:          strconv.FormatInt(time.Now().UnixNano(), 36),
				StudentID:   studentID,
				QuestionID:  questionID,
				Status:      4, // Usually straight to known
				ErrorCount:  wrongIncrement,
				LastUpdated: now,
			}
			DB.Create(&newState)
		}
		return
	}

	// If Wrong (Final status is wrong)
	if !exists {
		// New Error -> Stage 1
		newState := StudentWrongQuestion{
			ID:          strconv.FormatInt(time.Now().UnixNano(), 36),
			StudentID:   studentID,
			QuestionID:  questionID,
			Status:      1,
			ErrorCount:  wrongIncrement,
			LastUpdated: now,
		}
		DB.Create(&newState)
	} else {
		// Existing Error -> State Transition
		state.ErrorCount += wrongIncrement
		state.LastUpdated = now

		currentStage := state.Status
		if stageConf, ok := conf.Stages[currentStage]; ok {
			state.Status = stageConf.NextWrong
		} else {
			state.Status = 1 // Default reset
		}
		DB.Save(&state)
	}
}

// Student Stats
func GetStudentStats(c *gin.Context) {
	userId, _ := c.Get("userId")
	studentId := fmt.Sprintf("%v", userId)

	var histories []History
	DB.Where("student_id = ?", studentId).Find(&histories)

	practiceTrendMap := make(map[string]struct {
		Count   int
		Correct int
		Total   int
	})
	homeworkTrendMap := make(map[string]struct {
		Count   int
		Correct int
		Total   int
	})

	totalPracticeCorrect := 0
	totalPracticeQuestions := 0

	for _, h := range histories {
		date := strings.Split(h.Date, " ")[0]
		t, _ := strconv.Atoi(h.Total)

		if h.Type == "homework" {
			entry := homeworkTrendMap[date]
			entry.Count++
			entry.Correct += h.CorrectCount
			entry.Total += t
			homeworkTrendMap[date] = entry
		} else {
			entry := practiceTrendMap[date]
			entry.Count += t
			entry.Correct += h.CorrectCount
			entry.Total += t
			practiceTrendMap[date] = entry

			totalPracticeCorrect += h.CorrectCount
			totalPracticeQuestions += t
		}
	}

	type TrendPoint struct {
		Date     string `json:"date"`
		Count    int    `json:"count"`
		Accuracy int    `json:"accuracy"`
	}

	processMap := func(m map[string]struct{ Count, Correct, Total int }) []TrendPoint {
		keys := make([]string, 0, len(m))
		for k := range m {
			keys = append(keys, k)
		}
		sortStrings(keys)

		res := make([]TrendPoint, 0)
		for _, k := range keys {
			v := m[k]
			acc := 0
			if v.Total > 0 {
				acc = int((float64(v.Correct) / float64(v.Total)) * 100)
			}
			res = append(res, TrendPoint{Date: k, Count: v.Count, Accuracy: acc})
		}
		if len(res) > 14 {
			res = res[len(res)-14:]
		}
		return res
	}

	accuracy := "0%"
	if totalPracticeQuestions > 0 {
		accuracy = strconv.Itoa(int((float64(totalPracticeCorrect)/float64(totalPracticeQuestions))*100)) + "%"
	}

	SendJSON(c, 0, "", gin.H{
		"accuracy":       accuracy,
		"practiceTrends": processMap(practiceTrendMap),
		"homeworkTrends": processMap(homeworkTrendMap),
	})
}

func sortStrings(s []string) {
	for i := 0; i < len(s); i++ {
		for j := i + 1; j < len(s); j++ {
			if s[i] > s[j] {
				s[i], s[j] = s[j], s[i]
			}
		}
	}
}

func GetTeacherStats(c *gin.Context) {
	userId, _ := c.Get("userId")
	teacherId := fmt.Sprintf("%v", userId)
	today := time.Now().Format("2006-01-02")

	var todayAssigned int64
	DB.Model(&Homework{}).Where("teacher_id = ? AND start_date LIKE ?", teacherId, today+"%").Count(&todayAssigned)

	var totalAssigned int64
	var totalCompleted int64

	// Calculate totals in one go to ensure consistency
	DB.Table("homeworks").
		Where("teacher_id = ?", teacherId).
		Select(`
			COALESCE(SUM(total), 0) as assigned,
			COALESCE(SUM((SELECT COUNT(DISTINCT student_id) FROM histories WHERE histories.homework_id = homeworks.id)), 0) as completed
		`).
		Row().Scan(&totalAssigned, &totalCompleted)

	completionRate := 0.0
	if totalAssigned > 0 {
		completionRate = (float64(totalCompleted) / float64(totalAssigned)) * 100
	}

	var results struct {
		Correct int
		Total   int
	}
	DB.Table("histories").
		Joins("JOIN homeworks ON homeworks.id = histories.homework_id").
		Where("homeworks.teacher_id = ?", teacherId).
		Select("SUM(histories.correct_count) as correct, SUM(CAST(histories.total AS UNSIGNED)) as total").
		Scan(&results)

	accuracy := 0.0
	if results.Total > 0 {
		accuracy = float64(results.Correct) / float64(results.Total)
	}

	// Use aggregated query for recent homeworks to ensure consistency
	type RecentHWStat struct {
		ID        string `json:"id"`
		Name      string `json:"name"`
		Date      string `json:"date"`
		Completed int    `json:"completed"`
		Total     int    `json:"total"`
	}
	var recentStats []RecentHWStat

	DB.Table("homeworks").
		Select("homeworks.id, homeworks.name, homeworks.start_date as date, homeworks.total, (SELECT COUNT(DISTINCT student_id) FROM histories WHERE histories.homework_id = homeworks.id) as completed").
		Where("homeworks.teacher_id = ?", teacherId).
		Order("homeworks.start_date DESC").
		Limit(5).
		Scan(&recentStats)

	recentFormatted := make([]gin.H, len(recentStats))
	for i, h := range recentStats {
		recentFormatted[i] = gin.H{
			"id":        h.ID,
			"name":      h.Name,
			"date":      h.Date,
			"completed": h.Completed,
			"total":     h.Total,
		}
	}

	// Calculate per-student summaries
	var students []User
	DB.Omit("password").Where("role = ?", RoleStudent).Find(&students)

	studentSummaries := make([]gin.H, 0)
	for _, s := range students {
		// 1. Accuracy
		var res struct {
			Correct int
			Total   int
		}
		DB.Model(&History{}).
			Select("SUM(correct_count) as correct, SUM(CAST(total AS UNSIGNED)) as total").
			Where("student_id = ?", s.ID).
			Scan(&res)

		acc := 0.0
		if res.Total > 0 {
			acc = (float64(res.Correct) / float64(res.Total)) * 100
		}

		// 2. Homework completion
		var hwAssigned int64
		var hwCompleted int64

		// Count homeworks where the student is targeted
		DB.Model(&Homework{}).
			Where("teacher_id = ? AND student_ids LIKE ?", teacherId, "%\""+s.ID+"\"%").
			Count(&hwAssigned)

		// Count unique homeworks the student has submitted (latest only)
		DB.Table("histories").
			Select("COUNT(DISTINCT homework_id)").
			Where("student_id = ? AND homework_id != ''", s.ID).
			Where("id IN (?)",
				DB.Table("histories").
					Select("MAX(id)").
					Where("student_id = ?", s.ID).
					Group("homework_id"),
			).
			Count(&hwCompleted)

		studentSummaries = append(studentSummaries, gin.H{
			"id":             s.ID,
			"username":       s.Username,
			"accuracy":       acc,
			"hwAssigned":     hwAssigned,
			"hwCompleted":    hwCompleted,
			"lastActiveDate": "", // Can be extended later
		})
	}

	SendJSON(c, 0, "", gin.H{
		"todayAssigned":    int(todayAssigned),
		"completionRate":   completionRate,
		"accuracyRate":     accuracy,
		"recentHomeworks":  recentFormatted,
		"studentSummaries": studentSummaries,
	})
}

// Admin Handlers
func AdminGetHomeworks(c *gin.Context) {
	hws := make([]Homework, 0)
	DB.Find(&hws)

	type HomeworkDetail struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		TeacherName string `json:"teacherName"`
		ClassName   string `json:"className"`
		StartDate   string `json:"startDate"`
		Total       int    `json:"total"`
		Completed   int    `json:"completed"`
		Status      string `json:"status"`
		Results     []any  `json:"results"`
	}

	res := make([]HomeworkDetail, 0)
	for _, h := range hws {
		var teacher User
		DB.First(&teacher, "id = ?", h.TeacherID)

		var histories []History
		DB.Where("homework_id = ?", h.ID).Find(&histories)

		var count int64
		DB.Model(&History{}).Where("homework_id = ?", h.ID).Distinct("student_id").Count(&count)

		results := make([]any, 0)
		for _, rec := range histories {
			var student User
			DB.First(&student, "id = ?", rec.StudentID)

			results = append(results, gin.H{
				"id":           rec.ID,
				"studentName":  student.Username,
				"date":         rec.Date,
				"correctCount": rec.CorrectCount,
				"total":        rec.Total,
				"questions":    rec.Questions,
			})
		}

		res = append(res, HomeworkDetail{
			ID:          h.ID,
			Name:        h.Name,
			TeacherName: teacher.Username,
			ClassName:   h.ClassID,
			StartDate:   h.StartDate,
			Total:       h.Total,
			Completed:   int(count),
			Status:      h.Status,
			Results:     results,
		})
	}
	SendJSON(c, 0, "", res)
}

func AdminGetPractices(c *gin.Context) {
	histories := make([]History, 0)
	DB.Find(&histories)

	type PracticeDetail struct {
		ID          string `json:"id"`
		StudentName string `json:"studentName"`
		Date        string `json:"date"`
		Name        string `json:"name"`
		Score       string `json:"score"`
		Accuracy    string `json:"accuracy"`
		Questions   []any  `json:"questions"`
	}

	res := make([]PracticeDetail, 0)
	for _, h := range histories {
		var student User
		DB.First(&student, "id = ?", h.StudentID)

		acc := "0%"
		total, _ := strconv.Atoi(h.Total)
		if total > 0 {
			acc = strconv.Itoa(int((float64(h.CorrectCount)/float64(total))*100)) + "%"
		}

		res = append(res, PracticeDetail{
			ID:          h.ID,
			StudentName: student.Username,
			Date:        h.Date,
			Name:        h.Name,
			Score:       fmt.Sprintf("%d/%d", h.CorrectCount, total),
			Accuracy:    acc,
			Questions:   h.Questions,
		})
	}
	SendJSON(c, 0, "", res)
}

// Reinforcement Handlers
func GetReinforcements(c *gin.Context) {
	list := make([]Reinforcement, 0)
	DB.Find(&list)
	SendJSON(c, 0, "", list)
}

func CreateReinforcement(c *gin.Context) {
	var r Reinforcement
	if err := c.ShouldBindJSON(&r); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	r.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	DB.Create(&r)
	SendJSON(c, 0, "", r)
}

func UpdateReinforcement(c *gin.Context) {
	id := c.Param("id")
	var r Reinforcement
	if err := DB.First(&Reinforcement{}, "id = ?", id).Error; err != nil {
		SendJSON(c, 1, "Reinforcement not found", nil)
		return
	}
	if err := c.ShouldBindJSON(&r); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	r.ID = id
	DB.Save(&r)
	SendJSON(c, 0, "", r)
}

func DeleteReinforcement(c *gin.Context) {
	id := c.Param("id")
	DB.Delete(&Reinforcement{}, "id = ?", id)
	SendJSON(c, 0, "", gin.H{"message": "Deleted"})
}

// Resource Handlers
func GetResources(c *gin.Context) {
	userId, _ := c.Get("userId")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}
	keyword := strings.ToLower(c.Query("keyword"))

	list := make([]Resource, 0)
	var total int64

	query := DB.Model(&Resource{}).Where("visibility = 'public' OR creator_id = ?", fmt.Sprintf("%v", userId))
	if keyword != "" {
		query = query.Where("LOWER(name) LIKE ? OR LOWER(tags) LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	query.Count(&total)
	query.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list)

	SendJSON(c, 0, "", gin.H{
		"list":     list,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func CreateResource(c *gin.Context) {
	var r Resource
	if err := c.ShouldBindJSON(&r); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	userId, _ := c.Get("userId")

	if strings.HasPrefix(r.URL, "data:image") {
		url, err := UploadBase64ToOSS(r.URL)
		if err == nil {
			r.URL = url
		}
	}

	r.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	r.CreatorID = fmt.Sprintf("%v", userId)
	r.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
	if r.Type == "" {
		r.Type = "image"
	}
	if r.Tags == nil {
		r.Tags = make([]string, 0)
	}

	DB.Create(&r)
	AddAuditLog(c, "CREATE_RESOURCE", fmt.Sprintf("Uploaded resource: %s", r.Name))
	SendJSON(c, 0, "", r)
}

func UpdateResource(c *gin.Context) {
	id := c.Param("id")
	userId, _ := c.Get("userId")

	var r Resource
	if err := DB.First(&r, "id = ? AND creator_id = ?", id, fmt.Sprintf("%v", userId)).Error; err != nil {
		SendJSON(c, 1, "Resource not found or permission denied", nil)
		return
	}

	var updateData Resource
	if err := c.ShouldBindJSON(&updateData); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	r.Name = updateData.Name
	r.URL = updateData.URL
	r.Type = updateData.Type
	r.Visibility = updateData.Visibility
	r.Tags = updateData.Tags
	DB.Save(&r)
	SendJSON(c, 0, "", r)
}

func DeleteResource(c *gin.Context) {
	id := c.Param("id")
	userId, _ := c.Get("userId")

	if err := DB.Delete(&Resource{}, "id = ? AND creator_id = ?", id, fmt.Sprintf("%v", userId)).Error; err != nil {
		SendJSON(c, 1, "Failed to delete resource", nil)
		return
	}
	SendJSON(c, 0, "", gin.H{"message": "Deleted"})
}

// Audit Log Handlers
func GetAuditLogs(c *gin.Context) {
	var logs []AuditLog
	DB.Order("timestamp DESC").Limit(50).Find(&logs)
	SendJSON(c, 0, "", logs)
}

func AddAuditLog(c *gin.Context, action, details string) {
	userId, _ := c.Get("userId")
	role, _ := c.Get("role")

	username := "system"
	if uid, ok := userId.(string); ok {
		var user User
		if err := DB.First(&user, "id = ?", uid).Error; err == nil {
			username = user.Username
		} else {
			username = "UID:" + uid
		}
	} else if action == "LOGIN" {
		username = "guest"
	}

	log := AuditLog{
		ID:        strconv.FormatInt(time.Now().UnixNano(), 36),
		UserID:    fmt.Sprintf("%v", userId),
		Username:  fmt.Sprintf("%s (%v)", username, role),
		Action:    action,
		Details:   details,
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
	}

	DB.Create(&log)
	fmt.Printf("[AUDIT] %s | %s | %s\n", log.Username, log.Action, log.Details)
}

// Wrong Question Handlers
func GetWrongBook(c *gin.Context) {
	// If student: get own. If teacher: get specific student's or ALL if empty
	requesterId, _ := c.Get("userId")
	role, _ := c.Get("role")

	targetStudentId := c.Query("studentId")

	query := DB.Preload("Question").Where("status != 4")

	if fmt.Sprintf("%v", role) == string(RoleStudent) {
		query = query.Where("student_id = ?", fmt.Sprintf("%v", requesterId))
	} else {
		// Teacher/Admin
		if targetStudentId != "" {
			query = query.Where("student_id = ?", targetStudentId)
		}
		// If empty, return all (Teacher view)
	}

	var wrongs []StudentWrongQuestion
	query.Find(&wrongs)

	conf := ErrorLogicConfig{GlobalEnabled: true, Stages: map[int]StageConfig{2: {ShowAnswer: true}}}
	var stored SystemConfig
	if DB.Where("`key` = ?", "error_logic").First(&stored).Error == nil {
		json.Unmarshal([]byte(stored.Value), &conf)
	}
	for i := range wrongs {
		wrongs[i].ShowAnswer = conf.GlobalEnabled && conf.Stages[wrongs[i].Status].ShowAnswer
	}

	SendJSON(c, 0, "", wrongs)
}

// Admin Config Handlers
func GetSystemConfig(c *gin.Context) {
	var conf SystemConfig
	if err := DB.Where("`key` = ?", "error_logic").First(&conf).Error; err != nil {
		// Return default if not found
		defaultConf := ErrorLogicConfig{
			GlobalEnabled:               true,
			ExcludeMistakesFromPractice: false,
			Stages: map[int]StageConfig{
				1: {NextWrong: 2, NextCorrect: 4, ShowAnswer: false, Label: "Error"},
				2: {NextWrong: 3, NextCorrect: 4, ShowAnswer: true, Label: "Retry (Ans)"},
				3: {NextWrong: 5, NextCorrect: 4, ShowAnswer: false, Label: "Retry (No Ans)"},
				4: {NextWrong: 1, NextCorrect: 4, ShowAnswer: false, Label: "Known"},
				5: {NextWrong: 5, NextCorrect: 5, ShowAnswer: false, Label: "Difficult"},
			},
		}
		SendJSON(c, 0, "", defaultConf)
		return
	}

	// Parse JSON
	var parsedConf ErrorLogicConfig
	if err := json.Unmarshal([]byte(conf.Value), &parsedConf); err != nil {
		SendJSON(c, 1, "Invalid config format", nil)
		return
	}

	SendJSON(c, 0, "", parsedConf)
}

func UpdateSystemConfig(c *gin.Context) {
	var parsedConf ErrorLogicConfig
	if err := c.ShouldBindJSON(&parsedConf); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	confJSON, _ := json.Marshal(parsedConf)

	// Create or Update
	var conf SystemConfig
	if err := DB.Where("`key` = ?", "error_logic").First(&conf).Error; err != nil {
		conf = SystemConfig{
			Key:   "error_logic",
			Value: string(confJSON),
		}
		DB.Create(&conf)
	} else {
		conf.Value = string(confJSON)
		DB.Save(&conf)
	}

	SendJSON(c, 0, "", parsedConf)
}

func GetSystemSettings(c *gin.Context) {
	var conf SystemConfig
	var settings SystemSettingsConfig

	// Default settings
	settings.RegistrationEnabled = false

	if err := DB.Where("`key` = ?", "system_settings").First(&conf).Error; err == nil {
		json.Unmarshal([]byte(conf.Value), &settings)
	}
	SendJSON(c, 0, "", settings)
}

func UpdateSystemSettings(c *gin.Context) {
	var settings SystemSettingsConfig
	if err := c.ShouldBindJSON(&settings); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	confJSON, _ := json.Marshal(settings)

	var conf SystemConfig
	if err := DB.Where("`key` = ?", "system_settings").First(&conf).Error; err != nil {
		conf = SystemConfig{
			Key:   "system_settings",
			Value: string(confJSON),
		}
		DB.Create(&conf)
	} else {
		conf.Value = string(confJSON)
		DB.Save(&conf)
	}
	SendJSON(c, 0, "", settings)
}

func GetPublicConfig(c *gin.Context) {
	var conf SystemConfig
	var settings SystemSettingsConfig
	if err := DB.Where("`key` = ?", "system_settings").First(&conf).Error; err == nil {
		json.Unmarshal([]byte(conf.Value), &settings)
	}
	// Only return public safe config
	SendJSON(c, 0, "", gin.H{
		"registrationEnabled": settings.RegistrationEnabled,
	})
}

// Role Permission Handlers
func GetMyPermissions(c *gin.Context) {
	role, _ := c.Get("role")
	var perms []RolePermission
	DB.Where("role = ?", role).Find(&perms)
	for i := range perms {
		perms[i].WorkspaceSections = teacherWorkspaceSections(perms[i])
	}
	SendJSON(c, 0, "", perms)
}

func GetRolePermissions(c *gin.Context) {
	var perms []RolePermission
	DB.Find(&perms)
	SendJSON(c, 0, "", perms)
}

func UpdateRolePermissions(c *gin.Context) {
	var perms []RolePermission
	if err := c.ShouldBindJSON(&perms); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	selfAccess := false
	for _, p := range perms {
		if p.Role == Role(c.GetString("role")) && p.ModuleID == "permissions" && p.UIAccess && p.APIAccess {
			selfAccess = true
		}
	}
	if !selfAccess {
		SendJSON(c, 1, "Cannot remove your own permission management access", nil)
		return
	}
	if len(perms) == 0 {
		SendJSON(c, 1, "Permissions cannot be empty", nil)
		return
	}
	if err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&RolePermission{}).Error; err != nil {
			return err
		}
		return tx.Create(&perms).Error
	}); err != nil {
		SendJSON(c, 1, "Failed to update permissions", nil)
		return
	}

	AddAuditLog(c, "UPDATE_PERMISSIONS", fmt.Sprintf("Updated %d permission rules", len(perms)))
	SendJSON(c, 0, "", perms)
}

// Ability Tracking Handlers

func GetSkillTopics(c *gin.Context) {
	var topics []SkillTopic
	DB.Preload("Objectives", func(db *gorm.DB) *gorm.DB {
		return db.Order("skill_objectives.sort_order ASC")
	}).Order("sort_order ASC").Find(&topics)
	SendJSON(c, 0, "", topics)
}

func CreateSkillTopic(c *gin.Context) {
	var topic SkillTopic
	if err := c.ShouldBindJSON(&topic); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	topic.ID = strconv.FormatInt(time.Now().UnixNano(), 36)

	var maxOrder int
	DB.Model(&SkillTopic{}).Select("COALESCE(MAX(sort_order), 0)").Scan(&maxOrder)
	topic.SortOrder = maxOrder + 1

	DB.Create(&topic)
	SendJSON(c, 0, "", topic)
}

func UpdateSkillTopic(c *gin.Context) {
	id := c.Param("id")
	var topic SkillTopic
	if err := DB.First(&topic, "id = ?", id).Error; err != nil {
		SendJSON(c, 1, "Topic not found", nil)
		return
	}
	var updateData SkillTopic
	if err := c.ShouldBindJSON(&updateData); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	topic.Name = updateData.Name
	topic.Subject = updateData.Subject
	topic.Grade = updateData.Grade
	DB.Save(&topic)
	SendJSON(c, 0, "", topic)
}

func DeleteSkillTopic(c *gin.Context) {
	id := c.Param("id")
	DB.Delete(&SkillObjective{}, "topic_id = ?", id)
	DB.Delete(&SkillTopic{}, "id = ?", id)
	SendJSON(c, 0, "", gin.H{"message": "Deleted"})
}

func CreateSkillObjective(c *gin.Context) {
	var obj SkillObjective
	if err := c.ShouldBindJSON(&obj); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	obj.ID = strconv.FormatInt(time.Now().UnixNano(), 36)

	var maxOrder int
	DB.Model(&SkillObjective{}).Where("topic_id = ?", obj.TopicID).Select("COALESCE(MAX(sort_order), 0)").Scan(&maxOrder)
	obj.SortOrder = maxOrder + 1

	DB.Create(&obj)
	SendJSON(c, 0, "", obj)
}

func UpdateSkillObjective(c *gin.Context) {
	id := c.Param("id")
	var obj SkillObjective
	if err := DB.First(&obj, "id = ?", id).Error; err != nil {
		SendJSON(c, 1, "Objective not found", nil)
		return
	}
	var updateData SkillObjective
	if err := c.ShouldBindJSON(&updateData); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	obj.Name = updateData.Name
	obj.Target = updateData.Target
	DB.Save(&obj)
	SendJSON(c, 0, "", obj)
}

func DeleteSkillObjective(c *gin.Context) {
	id := c.Param("id")
	DB.Delete(&SkillObjective{}, "id = ?", id)
	SendJSON(c, 0, "", gin.H{"message": "Deleted"})
}

func UpdateSkillOrder(c *gin.Context) {
	var body struct {
		IDs []string `json:"ids"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	for i, id := range body.IDs {
		DB.Model(&SkillTopic{}).Where("id = ?", id).Update("sort_order", i+1)
	}
	SendJSON(c, 0, "", nil)
}

func UpdateObjectiveOrder(c *gin.Context) {
	var body struct {
		TopicID string   `json:"topicId"`
		IDs     []string `json:"ids"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	for i, id := range body.IDs {
		DB.Model(&SkillObjective{}).Where("id = ? AND topic_id = ?", id, body.TopicID).Update("sort_order", i+1)
	}
	SendJSON(c, 0, "", nil)
}

func GetSkillQuestions(c *gin.Context) {
	subject := c.Query("subject")
	gradeStr := c.Query("grade")
	grade, _ := strconv.Atoi(gradeStr)

	var topics []SkillTopic
	query := DB.Preload("Objectives", func(db *gorm.DB) *gorm.DB {
		return db.Order("skill_objectives.sort_order ASC")
	})

	if subject != "" {
		query = query.Where("subject = ?", subject)
	}
	if grade > 0 {
		query = query.Where("grade = ?", grade)
	}

	query.Order("sort_order ASC").Find(&topics)

	// Fetch all questions for these topics/objectives to group them
	type ObjectiveDetail struct {
		ID        string     `json:"id"`
		Name      string     `json:"name"`
		Target    string     `json:"target"`
		SortOrder int        `json:"sortOrder"`
		Questions []Question `json:"questions"`
	}

	type TopicDetail struct {
		ID         string            `json:"id"`
		Name       string            `json:"name"`
		Objectives []ObjectiveDetail `json:"objectives"`
	}

	var result []TopicDetail
	for _, t := range topics {
		var td TopicDetail
		td.ID = t.ID
		td.Name = t.Name
		for _, o := range t.Objectives {
			var od ObjectiveDetail
			od.ID = o.ID
			od.Name = o.Name
			od.Target = o.Target
			od.SortOrder = o.SortOrder

			var qs []Question
			DB.Where("objective_id = ?", o.ID).Order("id ASC").Find(&qs)
			od.Questions = qs
			td.Objectives = append(td.Objectives, od)
		}
		result = append(result, td)
	}

	SendJSON(c, 0, "", result)
}

func GetAbilityMatrix(c *gin.Context) {
	// Returns a flat list of records for a student to be rendered as a matrix
	studentId := c.Query("studentId")
	if studentId == "" {
		SendJSON(c, 1, "Student ID required", nil)
		return
	}

	var records []AbilityRecord
	DB.Where("student_id = ?", studentId).Order("date DESC").Find(&records)
	SendJSON(c, 0, "", records)
}

// --- Application (Scenario Games) Handlers ---

func GetScenarios(c *gin.Context) {
	var scenarios []Scenario
	if err := DB.Find(&scenarios).Error; err != nil {
		c.JSON(200, Response{Code: 1, Err: err.Error()})
		return
	}
	c.JSON(200, Response{Code: 0, Data: scenarios, Timestamp: time.Now().Unix()})
}

func CreateScenario(c *gin.Context) {
	var scenario Scenario
	if err := c.ShouldBindJSON(&scenario); err != nil {
		c.JSON(200, Response{Code: 1, Err: err.Error()})
		return
	}
	if scenario.ID == "" {
		scenario.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	if err := DB.Create(&scenario).Error; err != nil {
		c.JSON(200, Response{Code: 1, Err: err.Error()})
		return
	}
	c.JSON(200, Response{Code: 0, Data: scenario, Timestamp: time.Now().Unix()})
}

func UpdateScenario(c *gin.Context) {
	id := c.Param("id")
	var scenario Scenario
	if err := DB.Where("id = ?", id).First(&scenario).Error; err != nil {
		c.JSON(200, Response{Code: 1, Err: "Scenario not found"})
		return
	}
	if err := c.ShouldBindJSON(&scenario); err != nil {
		c.JSON(200, Response{Code: 1, Err: err.Error()})
		return
	}
	DB.Save(&scenario)
	c.JSON(200, Response{Code: 0, Data: scenario, Timestamp: time.Now().Unix()})
}

func DeleteScenario(c *gin.Context) {
	id := c.Param("id")
	DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("scenario_id = ?", id).Delete(&ScenarioItem{}).Error; err != nil {
			return err
		}
		return tx.Delete(&Scenario{}, "id = ?", id).Error
	})
	DB.Delete(&ScenarioItem{}, "scenario_id = ?", id)
	c.JSON(200, Response{Code: 0, Timestamp: time.Now().Unix()})
}

func GetScenarioItems(c *gin.Context) {
	id := c.Param("id")
	var items []ScenarioItem
	if err := DB.Where("scenario_id = ?", id).Find(&items).Error; err != nil {
		c.JSON(200, Response{Code: 1, Err: err.Error()})
		return
	}
	c.JSON(200, Response{Code: 0, Data: items, Timestamp: time.Now().Unix()})
}

func CreateScenarioItem(c *gin.Context) {
	id := c.Param("id")
	var item ScenarioItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(200, Response{Code: 1, Err: err.Error()})
		return
	}
	item.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	item.ScenarioID = id
	if err := DB.Create(&item).Error; err != nil {
		c.JSON(200, Response{Code: 1, Err: err.Error()})
		return
	}
	c.JSON(200, Response{Code: 0, Data: item, Timestamp: time.Now().Unix()})
}

// --- VB-MAPP Assessment Handlers ---

func GetAssessments(c *gin.Context) {
	studentID := c.Query("studentId")
	if c.GetString("role") == string(RoleStudent) {
		studentID = c.GetString("userId")
	}
	var assessments []VBMAPPAssessment
	query := DB.Model(&VBMAPPAssessment{})
	if studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}
	if err := query.Find(&assessments).Error; err != nil {
		c.JSON(200, Response{Code: 1, Err: err.Error()})
		return
	}
	c.JSON(200, Response{Code: 0, Data: assessments, Timestamp: time.Now().Unix()})
}

func CreateAssessment(c *gin.Context) {
	var assessment VBMAPPAssessment
	if err := c.ShouldBindJSON(&assessment); err != nil {
		c.JSON(200, Response{Code: 1, Err: err.Error()})
		return
	}
	assessment.AssessorID = c.GetString("userId")
	assessment.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	assessment.Date = time.Now().Format("2006-01-02")
	if assessment.Status == "" {
		assessment.Status = "ongoing"
	}
	if err := DB.Create(&assessment).Error; err != nil {
		c.JSON(200, Response{Code: 1, Err: err.Error()})
		return
	}
	c.JSON(200, Response{Code: 0, Data: assessment, Timestamp: time.Now().Unix()})
}

func GetAssessmentDetail(c *gin.Context) {
	if !allowAssessment(c) {
		return
	}

	id := c.Param("id")
	var assessment VBMAPPAssessment
	if err := DB.Where("id = ?", id).First(&assessment).Error; err != nil {
		c.JSON(200, Response{Code: 1, Err: "Assessment not found"})
		return
	}
	c.JSON(200, Response{Code: 0, Data: assessment, Timestamp: time.Now().Unix()})
}

func UpdateAssessment(c *gin.Context) {
	if !allowAssessment(c) {
		return
	}

	id := c.Param("id")
	var assessment VBMAPPAssessment
	if err := DB.Where("id = ?", id).First(&assessment).Error; err != nil {
		c.JSON(200, Response{Code: 1, Err: "Assessment not found"})
		return
	}
	if err := c.ShouldBindJSON(&assessment); err != nil {
		c.JSON(200, Response{Code: 1, Err: err.Error()})
		return
	}
	DB.Save(&assessment)
	c.JSON(200, Response{Code: 0, Data: assessment, Timestamp: time.Now().Unix()})
}

func GetAssessmentScores(c *gin.Context) {
	if !allowAssessment(c) {
		return
	}

	id := c.Param("id")
	var scores []VBMAPPScore
	if err := DB.Where("assessment_id = ?", id).Find(&scores).Error; err != nil {
		c.JSON(200, Response{Code: 1, Err: err.Error()})
		return
	}
	c.JSON(200, Response{Code: 0, Data: scores, Timestamp: time.Now().Unix()})
}

func SaveAssessmentScore(c *gin.Context) {
	if !allowAssessment(c) {
		return
	}

	assessmentID := c.Param("id")
	var score VBMAPPScore
	if err := c.ShouldBindJSON(&score); err != nil {
		c.JSON(200, Response{Code: 1, Err: err.Error()})
		return
	}
	score.AssessmentID = assessmentID

	// Check if already exists
	var existing VBMAPPScore
	result := DB.Where("assessment_id = ? AND area = ? AND category = ? AND item_number = ?",
		assessmentID, score.Area, score.Category, score.ItemNumber).First(&existing)

	if result.Error == nil {
		existing.Score = score.Score
		DB.Save(&existing)
		c.JSON(200, Response{Code: 0, Data: existing, Timestamp: time.Now().Unix()})
	} else {
		score.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
		DB.Create(&score)
		c.JSON(200, Response{Code: 0, Data: score, Timestamp: time.Now().Unix()})
	}
}

// --- Mood Diary Handlers ---

func GetMoodStats(c *gin.Context) {
	studentID := c.Query("studentId")
	if c.GetString("role") == string(RoleStudent) {
		studentID = c.GetString("userId")
	}
	if studentID == "" {
		c.JSON(200, Response{Code: 1, Err: "studentId is required"})
		return
	}

	var stats []struct {
		Date string `json:"date"`
		Mood int    `json:"mood"`
	}
	DB.Model(&MoodDiary{}).Where("student_id = ?", studentID).
		Order("date asc").Limit(30).
		Select("date, mood").Scan(&stats)

	c.JSON(200, Response{Code: 0, Data: stats, Timestamp: time.Now().Unix()})
}
