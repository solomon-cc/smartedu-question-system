package main

import "time"

// Retained only to preserve requests saved before the assessment-center redesign.
// Appointment requests are independent from formal assessment records and scores.
type AssessmentAppointment struct {
	ID          string    `json:"id" gorm:"primaryKey;type:varchar(191)"`
	ContactName string    `json:"contactName" gorm:"type:varchar(100)"`
	Phone       string    `json:"phone" gorm:"type:varchar(40);index"`
	ChildAge    int       `json:"childAge"`
	Focus       string    `json:"focus" gorm:"type:varchar(80)"`
	ContactTime string    `json:"contactTime" gorm:"type:varchar(80)"`
	Notes       string    `json:"notes" gorm:"type:text"`
	Status      string    `json:"status" gorm:"type:varchar(30);index"`
	StaffNotes  string    `json:"staffNotes" gorm:"type:text"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
