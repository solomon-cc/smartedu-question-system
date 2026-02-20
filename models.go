package main

type Role string

const (
	RoleStudent Role = "STUDENT"
	RoleTeacher Role = "TEACHER"
	RoleAdmin   Role = "ADMIN"
)

type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Password string `json:"password,omitempty"` // omitempty in response for security
	Role     Role   `json:"role"`
	Status   string `json:"status"` // "active", "inactive"
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type Question struct {
	ID         string   `json:"id"`
	Subject    string   `json:"subject"`
	Grade      int      `json:"grade"`
	Type       string   `json:"type"`
	StemText   string   `json:"stemText"`
	StemImage  string   `json:"stemImage,omitempty"`
	Answer     string   `json:"answer"`
	Options    []Option `json:"options,omitempty"`
	Hint       string   `json:"hint,omitempty"`
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

type DashboardStats struct {
	AccuracyTrend   []StatPoint `json:"accuracyTrend"`
	CompletionTrend []StatPoint `json:"completionTrend"`
}

// New Models

type Reinforcement struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Type      string `json:"type"` // e.g., "sticker", "animation"
	Image     string `json:"image,omitempty"`
	Condition string `json:"condition"` // e.g., "streak_10"
}

type Paper struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Questions   []Question `json:"questions"`
	QuestionIDs []string   `json:"questionIds,omitempty"` // For input binding
	Total       int        `json:"total"`
}

type Homework struct {
	ID        string `json:"id"`
	PaperID   string `json:"paperId"`
	Name      string `json:"name"`
	ClassID   string `json:"classId"`
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
	Status    string `json:"status"` // "pending", "completed"
	Completed int    `json:"completed"`
	Total     int    `json:"total"`
}

type History struct {
	ID           string   `json:"id"`
	StudentID    string   `json:"studentId"`
	HomeworkID   string   `json:"homeworkId"`
	Type         string   `json:"type"` // "exam", "practice", "homework"
	Name         string   `json:"name"`
	NameEn       string   `json:"nameEn"`
	Date         string   `json:"date"`
	Score        string   `json:"score,omitempty"`
	Total        string   `json:"total,omitempty"`
	CorrectCount int      `json:"correctCount,omitempty"`
	WrongCount   int      `json:"wrongCount,omitempty"`
	Questions    []any    `json:"questions"` // Detail records
}