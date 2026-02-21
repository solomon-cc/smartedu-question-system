package main

type Role string

const (
	RoleStudent Role = "STUDENT"
	RoleTeacher Role = "TEACHER"
	RoleAdmin   Role = "ADMIN"
)

type User struct {
	ID       string `json:"id" gorm:"primaryKey;type:varchar(191)"`
	Username string `json:"username" gorm:"type:varchar(191);unique"`
	Password string `json:"password,omitempty" gorm:"type:varchar(191)"`
	Role     Role   `json:"role" gorm:"type:varchar(191)"`
	Status   string `json:"status" gorm:"type:varchar(191)"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type Question struct {
	ID         string   `json:"id" gorm:"primaryKey;type:varchar(191)"`
	Subject    string   `json:"subject" gorm:"type:varchar(191)"`
	Grade      int      `json:"grade"`
	Type       string   `json:"type" gorm:"type:varchar(191)"`
	StemText   string   `json:"stemText" gorm:"type:text"`
	StemImage  string   `json:"stemImage,omitempty" gorm:"type:text"`
	Answer     string   `json:"answer" gorm:"type:text"`
	Options    []Option `json:"options,omitempty" gorm:"serializer:json"`
	Hint       string   `json:"hint,omitempty" gorm:"type:text"`
}

type Option struct {
	Text  string `json:"text,omitempty"`
	Image string `json:"image,omitempty"`
	Value string `json:"value"`
}

type StatPoint struct {
	Label string  `json:"label"`
	Value float64 `json:"value"`
}

type Response struct {
	Code      int         `json:"code"`
	Err       string      `json:"err"`
	Data      interface{} `json:"data"`
	Page      int         `json:"page,omitempty"`
	PageSize  int         `json:"pageSize,omitempty"`
	Total     int         `json:"total,omitempty"`
	RequestId string      `json:"requestId,omitempty"`
	Timestamp int64       `json:"timestamp"`
}

type DashboardStats struct {
	AccuracyTrend   []StatPoint `json:"accuracyTrend"`
	CompletionTrend []StatPoint `json:"completionTrend"`
	TotalUsers      int         `json:"totalUsers"`
	TotalQuestions  int         `json:"totalQuestions"`
	OnlineUsers     int         `json:"onlineUsers"`
}

type Reinforcement struct {
	ID        string `json:"id" gorm:"primaryKey;type:varchar(191)"`
	Name      string `json:"name" gorm:"type:varchar(191)"`
	Type      string `json:"type" gorm:"type:varchar(191)"`
	Image     string `json:"image,omitempty" gorm:"type:text"`
	Prompt    string `json:"prompt,omitempty" gorm:"type:text"`
	Duration  int    `json:"duration,omitempty"`
	Condition string `json:"condition" gorm:"type:varchar(191)"`
}

type Paper struct {
	ID          string     `json:"id" gorm:"primaryKey;type:varchar(191)"`
	Name        string     `json:"name" gorm:"type:varchar(191)"`
	Questions   []Question `json:"questions" gorm:"serializer:json"`
	QuestionIDs []string   `json:"questionIds,omitempty" gorm:"serializer:json"`
	Total       int        `json:"total"`
}

type Homework struct {
	ID         string   `json:"id" gorm:"primaryKey;type:varchar(191)"`
	TeacherID  string   `json:"teacherId" gorm:"type:varchar(191)"`
	PaperID    string   `json:"paperId" gorm:"type:varchar(191)"`
	Name       string   `json:"name" gorm:"type:varchar(191)"`
	ClassID    string   `json:"classId" gorm:"type:varchar(191)"`
	StartDate  string   `json:"startDate" gorm:"type:varchar(191)"`
	EndDate    string   `json:"endDate" gorm:"type:varchar(191)"`
	Status     string   `json:"status" gorm:"type:varchar(191)"`
	Completed  int      `json:"completed"`
	Total      int      `json:"total"`
	StudentIDs []string `json:"studentIds,omitempty" gorm:"serializer:json"`
}

type History struct {
	ID           string   `json:"id" gorm:"primaryKey;type:varchar(191)"`
	StudentID    string   `json:"studentId" gorm:"type:varchar(191)"`
	HomeworkID   string   `json:"homeworkId" gorm:"type:varchar(191)"`
	Type         string   `json:"type" gorm:"type:varchar(191)"`
	Name         string   `json:"name" gorm:"type:varchar(191)"`
	NameEn       string   `json:"nameEn" gorm:"type:varchar(191)"`
	Date         string   `json:"date" gorm:"type:varchar(191)"`
	Score        string   `json:"score,omitempty" gorm:"type:varchar(191)"`
	Total        string   `json:"total,omitempty" gorm:"type:varchar(191)"`
	CorrectCount int      `json:"correctCount,omitempty"`
	WrongCount   int      `json:"wrongCount,omitempty"`
	Questions    []any    `json:"questions" gorm:"serializer:json"`
}

type Resource struct {
	ID         string   `json:"id" gorm:"primaryKey;type:varchar(191)"`
	Name       string   `json:"name" gorm:"type:varchar(191)"`
	URL        string   `json:"url" gorm:"type:text"`
	Type       string   `json:"type" gorm:"type:varchar(191)"`
	Tags       []string `json:"tags" gorm:"serializer:json"`
	Visibility string   `json:"visibility" gorm:"type:varchar(191)"`
	CreatorID  string   `json:"creatorId" gorm:"type:varchar(191)"`
	CreatedAt  string   `json:"createdAt" gorm:"type:varchar(191)"`
}

type AuditLog struct {
	ID        string `json:"id" gorm:"primaryKey;type:varchar(191)"`
	UserID    string `json:"userId" gorm:"type:varchar(191)"`
	Username  string `json:"username" gorm:"type:varchar(191)"`
	Action    string `json:"action" gorm:"type:varchar(191)"`
	Details   string `json:"details" gorm:"type:text"`
	Timestamp string `json:"timestamp" gorm:"type:varchar(191)"`
}
