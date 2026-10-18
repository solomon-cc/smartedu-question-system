package main

import (
	"embed"
	"encoding/json"
	"github.com/gin-gonic/gin"
)

//go:embed assessment_data/peak.json
var peakFiles embed.FS

type PEAKItem struct {
	Module        string `json:"module"`
	Category      string `json:"category"`
	ItemNumber    int    `json:"itemNumber"`
	Code          string `json:"code"`
	Title         string `json:"title"`
	Script        string `json:"script"`
	ScriptPages   []int  `json:"scriptPages"`
	StimulusPages []int  `json:"stimulusPages"`
	ResponsePage  int    `json:"responsePage"`
	Note          string `json:"note"`
}

var peakCatalog = func() []PEAKItem {
	data, err := peakFiles.ReadFile("assessment_data/peak.json")
	if err != nil {
		panic(err)
	}
	var items []PEAKItem
	if err := json.Unmarshal(data, &items); err != nil {
		panic(err)
	}
	return items
}()

type PEAKAssessment struct {
	ID         string `json:"id" gorm:"primaryKey;type:varchar(191)"`
	StudentID  string `json:"studentId" gorm:"type:varchar(191);index"`
	AssessorID string `json:"assessorId" gorm:"type:varchar(191)"`
	Date       string `json:"date" gorm:"type:varchar(20)"`
	Module     string `json:"module" gorm:"type:varchar(10)"`
	Version    string `json:"version" gorm:"type:varchar(40)"`
	Status     string `json:"status" gorm:"type:varchar(20)"`
}
type PEAKScore struct {
	AssessmentID string `json:"assessmentId" gorm:"primaryKey;type:varchar(191)"`
	Code         string `json:"code" gorm:"primaryKey;type:varchar(20)"`
	Score        int    `json:"score"`
	Response     string `json:"response" gorm:"type:text"`
	Notes        string `json:"notes" gorm:"type:text"`
}

// Compatibility endpoints delegate writes to the shared assessment service.
func peakContext(c *gin.Context) {
	c.Params = append(c.Params, gin.Param{Key: "method", Value: "peak"})
}
func GetPEAKCatalog(c *gin.Context) {
	items := append([]PEAKItem(nil), peakCatalog...)
	if c.GetString("role") == string(RoleStudent) {
		for i := range items {
			items[i].Script = ""
			items[i].ScriptPages = nil
		}
	}
	SendJSON(c, 0, "", items)
}
func GetPEAKAssessments(c *gin.Context)   { peakContext(c); GetMethodAssessmentRecords(c) }
func peakWriter(c *gin.Context) bool      { return assessmentWriter(c) }
func CreatePEAKAssessment(c *gin.Context) { peakContext(c); CreateMethodAssessment(c) }
func GetPEAKScores(c *gin.Context)        { peakContext(c); GetMethodAssessmentResponses(c) }
func SavePEAKScore(c *gin.Context)        { peakContext(c); SaveMethodAssessmentResponse(c) }
func CompletePEAKAssessment(c *gin.Context) {
	if !assessmentWriter(c) {
		return
	}
	var input struct {
		Status string `json:"status"`
	}
	if c.ShouldBindJSON(&input) != nil || input.Status != "completed" {
		SendJSON(c, 1, "只支持完成评估", nil)
		return
	}
	peakContext(c)
	CompleteMethodAssessment(c)
}
