package main

import (
	"github.com/gin-gonic/gin"
	"strings"
	"time"
	"unicode/utf8"
)

type MoodObservation struct {
	ID        string `json:"id" gorm:"primaryKey;type:varchar(191)"`
	DiaryID   string `json:"diaryId" gorm:"type:varchar(191);index"`
	TeacherID string `json:"teacherId" gorm:"type:varchar(191)"`
	Notes     string `json:"notes" gorm:"type:text"`
	CreatedAt string `json:"createdAt" gorm:"type:varchar(40)"`
}

func moodTeacher(c *gin.Context) bool {
	if c.GetString("role") != string(RoleTeacher) && c.GetString("role") != string(RoleAdmin) {
		c.AbortWithStatusJSON(403, gin.H{"error": "此功能仅供老师查看与跟进"})
		return false
	}
	return true
}
func GetMoodDiaries(c *gin.Context) {
	student := c.Query("studentId")
	if c.GetString("role") == string(RoleStudent) {
		student = c.GetString("userId")
	}
	q := DB.Model(&MoodDiary{})
	if student != "" {
		q = q.Where("student_id = ?", student)
	}
	for key, column := range map[string]string{"dateFrom": "date >= ?", "dateTo": "date <= ?"} {
		if value := c.Query(key); value != "" {
			if _, err := time.Parse("2006-01-02", value); err != nil {
				SendJSON(c, 1, "日期格式无效", nil)
				return
			}
			q = q.Where(column, value)
		}
	}
	if source := c.Query("source"); source != "" {
		q = q.Where("source = ?", source)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	page, size := gamePagination(c)
	paged := c.Query("page") != "" || c.Query("pageSize") != ""
	if paged {
		q = q.Limit(size).Offset((page - 1) * size)
	}
	list := []MoodDiary{}
	if err := q.Order("date desc, recorded_at desc, id desc").Find(&list).Error; err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	if !paged {
		SendJSON(c, 0, "", list)
		return
	}
	SendJSON(c, 0, "", gin.H{"list": list, "total": total, "page": page, "pageSize": size})
}
func CreateMoodDiary(c *gin.Context) {
	var d MoodDiary
	if c.ShouldBindJSON(&d) != nil {
		SendJSON(c, 1, "记录格式无效", nil)
		return
	}
	d.Source = "teacher"
	if c.GetString("role") == string(RoleStudent) {
		d.StudentID = c.GetString("userId")
		d.Source = "student"
	}
	if err := activePlanStudent(DB, d.StudentID); err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	if d.Mood < 1 || d.Mood > 5 || d.Intensity < 1 || d.Intensity > 10 {
		SendJSON(c, 1, "请选择心情与强度", nil)
		return
	}
	if d.Date == "" {
		d.Date = time.Now().Format("2006-01-02")
	}
	date, err := time.Parse("2006-01-02", d.Date)
	if err != nil || date.Format("2006-01-02") > time.Now().Format("2006-01-02") {
		SendJSON(c, 1, "记录日期无效", nil)
		return
	}
	for _, value := range []string{d.Event, d.Feeling, d.Thought, d.PhysicalSensation} {
		if utf8.RuneCountInString(value) > 2000 {
			SendJSON(c, 1, "每段记录最多 2000 字", nil)
			return
		}
	}
	d.ID = "mood-" + time.Now().Format("20060102150405.000000000")
	d.RecorderID = c.GetString("userId")
	d.RecordedAt = time.Now().Format(time.RFC3339Nano)
	if err := DB.Create(&d).Error; err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	SendJSON(c, 0, "", d)
}
func GetMoodStudents(c *gin.Context) {
	if !moodTeacher(c) {
		return
	}
	list := []struct {
		ID       string `json:"id"`
		Name     string `json:"name"`
		Username string `json:"username"`
	}{}
	err := DB.Model(&User{}).Select("id,name,username").Where("id IN (?)", DB.Model(&MoodDiary{}).Select("student_id")).Order("name").Scan(&list).Error
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	SendJSON(c, 0, "", list)
}
func GetMoodObservations(c *gin.Context) {
	if !moodTeacher(c) {
		return
	}
	var diary MoodDiary
	if DB.First(&diary, "id = ?", c.Param("id")).Error != nil {
		SendJSON(c, 1, "心情记录不存在", nil)
		return
	}
	list := []MoodObservation{}
	if err := DB.Where("diary_id = ?", diary.ID).Order("created_at desc").Find(&list).Error; err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	SendJSON(c, 0, "", list)
}
func CreateMoodObservation(c *gin.Context) {
	if !moodTeacher(c) {
		return
	}
	var input struct {
		Notes string `json:"notes"`
	}
	if c.ShouldBindJSON(&input) != nil || strings.TrimSpace(input.Notes) == "" || utf8.RuneCountInString(input.Notes) > 2000 {
		SendJSON(c, 1, "请填写跟进记录（最多 2000 字）", nil)
		return
	}
	var diary MoodDiary
	if DB.First(&diary, "id = ?", c.Param("id")).Error != nil {
		SendJSON(c, 1, "心情记录不存在", nil)
		return
	}
	o := MoodObservation{ID: "follow-" + time.Now().Format("20060102150405.000000000"), DiaryID: diary.ID, TeacherID: c.GetString("userId"), Notes: strings.TrimSpace(input.Notes), CreatedAt: time.Now().Format(time.RFC3339Nano)}
	if err := DB.Create(&o).Error; err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	SendJSON(c, 0, "", o)
}
