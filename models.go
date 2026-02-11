
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
