package main

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

func containsStudent(ids []string, id string) bool {
	for _, candidate := range ids {
		if candidate == id {
			return true
		}
	}
	return false
}

// GetHomeworkQuestions returns the saved paper snapshot only to authorized students/teachers.
func GetHomeworkQuestions(c *gin.Context) {
	var hw Homework
	if DB.First(&hw, "id = ?", c.Param("id")).Error != nil {
		SendJSON(c, 1, "Homework not found", nil)
		return
	}
	role, uid := c.GetString("role"), c.GetString("userId")
	if role == string(RoleStudent) && !containsStudent(hw.StudentIDs, uid) || role == string(RoleTeacher) && hw.TeacherID != uid {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Homework access denied"})
		return
	}
	questions := make([]Question, 0)
	if hw.PaperID != "" {
		var paper Paper
		if DB.First(&paper, "id = ?", hw.PaperID).Error != nil {
			SendJSON(c, 1, "Paper not found", nil)
			return
		}
		questions = paper.Questions
	} else if len(hw.QuestionIDs) > 0 {
		DB.Where("id IN ?", hw.QuestionIDs).Find(&questions)
	}
	SendJSON(c, 0, "", gin.H{"name": hw.Name, "questions": questions})
}

func allowAssessment(c *gin.Context) bool {
	var assessment VBMAPPAssessment
	if DB.First(&assessment, "id = ?", c.Param("id")).Error != nil {
		c.AbortWithStatusJSON(404, gin.H{"error": "Assessment not found"})
		return false
	}
	if c.GetString("role") == string(RoleStudent) && assessment.StudentID != c.GetString("userId") {
		c.AbortWithStatusJSON(403, gin.H{"error": "Assessment access denied"})
		return false
	}
	if c.Request.Method != "GET" && assessment.Status == "completed" {
		SendJSON(c, 1, "Completed assessments are read-only", nil)
		return false
	}
	return true
}
