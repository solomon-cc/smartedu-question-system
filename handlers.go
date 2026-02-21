package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

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
		},
	})
}

// User Handlers (Admin)
func GetUsers(c *gin.Context) {
	var users []User
	DB.Find(&users)
	SendJSON(c, 0, "", users)
}

func GetStudents(c *gin.Context) {
	var students []User
	DB.Where("role = ?", RoleStudent).Find(&students)
	SendJSON(c, 0, "", students)
}

func CreateUser(c *gin.Context) {
	var newUser User
	if err := c.ShouldBindJSON(&newUser); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
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
	user.Username = updateData.Username
	user.Role = updateData.Role
	user.Status = updateData.Status

	DB.Save(&user)
	SendJSON(c, 0, "", user)
}

func DeleteUser(c *gin.Context) {
	id := c.Param("id")
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
		day := now.AddDate(0, 0, - (6 - i))
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

// Question Handlers
func GetQuestions(c *gin.Context) {
	subject := c.Query("subject")
	gradeStr := c.Query("grade")
	
	query := DB.Model(&Question{})

	if subject != "" {
		// Map English subject enums to Chinese stored values
		subjectMap := map[string]string{
			"MATH":     "数学",
			"LANGUAGE": "语文",
			"READING":  "阅读",
			"LITERACY": "识字",
		}
		
		if mapped, ok := subjectMap[subject]; ok {
			query = query.Where("subject = ? OR subject = ?", subject, mapped)
		} else {
			query = query.Where("subject = ?", subject)
		}
	}

	if gradeStr != "" {
		if g, err := strconv.Atoi(gradeStr); err == nil {
			query = query.Where("grade = ?", g)
		}
	}

	questions := make([]Question, 0)
	query.Find(&questions)
	SendJSON(c, 0, "", questions)
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
	p.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	
	// Populate Questions from IDs if provided
	if len(p.QuestionIDs) > 0 {
		var questions []Question
		DB.Where("id IN ?", p.QuestionIDs).Find(&questions)
		p.Questions = questions
	}
	p.Total = len(p.Questions)

	if err := DB.Create(&p).Error; err != nil {
		SendJSON(c, 1, "Failed to create paper", nil)
		return
	}
	SendJSON(c, 0, "", p)
}

func UpdatePaper(c *gin.Context) {
	id := c.Param("id")
	var p Paper
	if err := c.ShouldBindJSON(&p); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	p.ID = id
	// Populate questions
	if len(p.QuestionIDs) > 0 {
		var questions []Question
		DB.Where("id IN ?", p.QuestionIDs).Find(&questions)
		p.Questions = questions
	}
	p.Total = len(p.Questions)
	
	if err := DB.Save(&p).Error; err != nil {
		SendJSON(c, 1, "Failed to update paper", nil)
		return
	}
	SendJSON(c, 0, "", p)
}

func DeletePaper(c *gin.Context) {
	id := c.Param("id")
	if err := DB.Delete(&Paper{}, "id = ?", id).Error; err != nil {
		SendJSON(c, 1, "Failed to delete paper", nil)
		return
	}
	SendJSON(c, 0, "", gin.H{"message": "Deleted"})
}

// Homework Handlers
func GetHomeworks(c *gin.Context) {
	userId, _ := c.Get("userId")
	role, _ := c.Get("role")

	type HomeworkStat struct {
		ID           string  `json:"id"`
		TeacherID    string  `json:"teacherId"`
		PaperID      string  `json:"paperId"`
		Name         string  `json:"name"`
		ClassID      string  `json:"classId"`
		StartDate    string  `json:"startDate"`
		EndDate      string  `json:"endDate"`
		Status       string  `json:"status"`
		Total        int     `json:"total"`       // Assigned count
		Completed    int     `json:"completed"`   // Submitted count
		StudentIDs   json.RawMessage `json:"studentIds"`
	}

	var results []HomeworkStat
	
	query := DB.Table("homeworks").
		Select(`
			homeworks.*,
			(SELECT COUNT(DISTINCT student_id) FROM histories WHERE histories.homework_id = homeworks.id) as completed
		`)

	if fmt.Sprintf("%v", role) == string(RoleTeacher) {
		query = query.Where("homeworks.teacher_id = ?", fmt.Sprintf("%v", userId))
	}
	
	query.Scan(&results)

	// Update status logic in memory/DB if needed, but primary source is now the query
	for i := range results {
		if results[i].Total > 0 && results[i].Completed >= results[i].Total {
			if results[i].Status != "completed" {
				results[i].Status = "completed"
				DB.Model(&Homework{}).Where("id = ?", results[i].ID).Update("status", "completed")
			}
		} else {
             if results[i].Status == "completed" {
                 results[i].Status = "pending"
                 DB.Model(&Homework{}).Where("id = ?", results[i].ID).Update("status", "pending")
             }
        }
	}

	SendJSON(c, 0, "", results)
}

func AssignHomework(c *gin.Context) {
	userId, _ := c.Get("userId")
	var h Homework
	if err := c.ShouldBindJSON(&h); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}

	h.TeacherID = fmt.Sprintf("%v", userId)
	h.Total = len(h.StudentIDs)
	
	h.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	h.Status = "pending"
	if err := DB.Create(&h).Error; err != nil {
		SendJSON(c, 1, "Failed to assign homework", nil)
		return
	}
	AddAuditLog(c, "ASSIGN_HOMEWORK", fmt.Sprintf("Assigned homework: %s", h.Name))
	SendJSON(c, 0, "", h)
}

func BulkCreateQuestions(c *gin.Context) {
	var list []Question
	if err := c.ShouldBindJSON(&list); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	
	now := time.Now().Unix()
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
	homeworkId := c.Query("homeworkId")

	histories := make([]History, 0)
	var total int64
	role, _ := c.Get("role")
	
	query := DB.Model(&History{})
	if fmt.Sprintf("%v", role) == string(RoleStudent) {
		query = query.Where("student_id = ?", fmt.Sprintf("%v", userId))
	} else if fmt.Sprintf("%v", role) == string(RoleTeacher) {
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

	h.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	h.StudentID = fmt.Sprintf("%v", userId)
	h.Date = time.Now().Format("2006-01-02 15:04:05")

	if err := DB.Create(&h).Error; err != nil {
		SendJSON(c, 1, "Failed to create history", nil)
		return
	}
	
	AddAuditLog(c, "PRACTICE_FINISH", fmt.Sprintf("Completed session: %s (Score: %d/%s)", h.Name, h.CorrectCount, h.Total))
	SendJSON(c, 0, "", h)
}

// Student Stats
func GetStudentStats(c *gin.Context) {
	userId, _ := c.Get("userId")
	studentId := fmt.Sprintf("%v", userId)

	var histories []History
	DB.Where("student_id = ?", studentId).Find(&histories)

	practiceTrendMap := make(map[string]struct {
		Count    int
		Correct  int
		Total    int
	})
	homeworkTrendMap := make(map[string]struct {
		Count    int
		Correct  int
		Total    int
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
	
	processMap := func(m map[string]struct{Count, Correct, Total int}) []TrendPoint {
		keys := make([]string, 0, len(m))
		for k := range m { keys = append(keys, k) }
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
		if len(res) > 14 { res = res[len(res)-14:] }
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
			if s[i] > s[j] { s[i], s[j] = s[j], s[i] }
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

	SendJSON(c, 0, "", gin.H{
		"todayAssigned":   int(todayAssigned),
		"completionRate":  completionRate,
		"accuracyRate":    accuracy,
		"recentHomeworks": recentFormatted,
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
				"id": rec.ID,
				"studentName": student.Username,
				"date": rec.Date,
				"correctCount": rec.CorrectCount,
				"total": rec.Total,
				"questions": rec.Questions,
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
	keyword := strings.ToLower(c.Query("keyword"))

	list := make([]Resource, 0)
	var total int64
	
	query := DB.Model(&Resource{}).Where("visibility = 'public' OR creator_id = ?", fmt.Sprintf("%v", userId))
	if keyword != "" {
		query = query.Where("LOWER(name) LIKE ? OR JSON_CONTAINS(LOWER(tags), ?)", "%"+keyword+"%", "\""+keyword+"\"")
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
		if err == nil { r.URL = url }
	}

	r.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	r.CreatorID = fmt.Sprintf("%v", userId)
	r.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
	if r.Type == "" { r.Type = "image" }
	if r.Tags == nil { r.Tags = make([]string, 0) }

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
