package main

import "time"

// Portal content is independent of the retired workspaces.
type TrainingCourse struct {
	ID         string           `json:"id" gorm:"primaryKey;type:varchar(191)"`
	Title      string           `json:"title"`
	Summary    string           `json:"summary" gorm:"type:text"`
	Audience   string           `json:"audience"`
	Instructor string           `json:"instructor"`
	OwnerID    string           `json:"ownerId" gorm:"index"`
	Published  bool             `json:"published"`
	Visibility string           `json:"visibility"`
	UserIDs    []string         `json:"userIds" gorm:"serializer:json"`
	Lessons    []TrainingLesson `json:"lessons,omitempty" gorm:"foreignKey:CourseID"`
	UpdatedAt  time.Time        `json:"updatedAt"`
}
type TrainingLesson struct {
	ID        string  `json:"id" gorm:"primaryKey;type:varchar(191)"`
	CourseID  string  `json:"courseId" gorm:"index"`
	Title     string  `json:"title"`
	Kind      string  `json:"kind"`
	Text      string  `json:"text" gorm:"type:text"`
	UploadID  string  `json:"uploadId"`
	Duration  float64 `json:"duration"`
	SortOrder int     `json:"sortOrder"`
}
type TrainingProgress struct {
	UserID    string    `json:"userId" gorm:"primaryKey;type:varchar(191)"`
	LessonID  string    `json:"lessonId" gorm:"primaryKey;type:varchar(191)"`
	Position  float64   `json:"position"`
	Completed bool      `json:"completed"`
	UpdatedAt time.Time `json:"updatedAt"`
}
type TrainingUpload struct {
	ID          string    `json:"id" gorm:"primaryKey;type:varchar(191)"`
	OwnerID     string    `json:"-" gorm:"uniqueIndex:owner_fingerprint;type:varchar(191)"`
	Fingerprint string    `json:"-" gorm:"uniqueIndex:owner_fingerprint;type:varchar(191)"`
	Name        string    `json:"name"`
	Size        int64     `json:"size"`
	Received    int64     `json:"received"`
	Complete    bool      `json:"complete"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
type PortalAttempt struct {
	ActorID       string    `json:"actorId" gorm:"type:varchar(191)"`
	QuestionTitle string    `json:"questionTitle"`
	Subject       string    `json:"subject"`
	Grade         int       `json:"grade"`
	ID            string    `json:"id" gorm:"primaryKey;type:varchar(191)"`
	UserID        string    `json:"userId" gorm:"index"`
	QuestionID    string    `json:"questionId" gorm:"index"`
	ObjectiveID   string    `json:"objectiveId" gorm:"index"`
	Answer        string    `json:"answer"`
	Correct       bool      `json:"correct"`
	CreatedAt     time.Time `json:"createdAt"`
}
