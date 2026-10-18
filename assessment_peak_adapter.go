package main

import (
	"errors"
	"fmt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func init() {
	if err := assessmentMethods.Register(PEAKMethod{}); err != nil {
		panic(err)
	}
}

const peakVersion = "peak-pa-user-docs-v1"

type PEAKMethod struct{}

func (PEAKMethod) Info() AssessmentMethodInfo {
	return AssessmentMethodInfo{ID: "peak", Name: "PEAK 预评估", CurrentVersion: peakVersion, Versions: []string{peakVersion}, Renderer: "peak", CanLinkTargets: true, CanCompare: true}
}
func (PEAKMethod) Definition(version string) (AssessmentDefinition, error) {
	if version != peakVersion {
		return AssessmentDefinition{}, errors.New("不支持该 PEAK 评估版本，请核对记录对应的材料")
	}
	def := AssessmentDefinition{MethodID: "peak", Version: version, Modules: []AssessmentModule{{ID: "D", Name: "直接训练预评估"}, {ID: "G", Name: "泛化预评估"}}, Items: []AssessmentItem{}, Scoring: AssessmentScoring{ReviewValues: []float64{0}, ReviewToggleLabel: "包含正确反应项目", Label: "记录反应", Options: []AssessmentScoreOption{{Value: 0, Title: "未通过"}, {Value: 1, Title: "正确反应"}}}, Instructions: "PEAK D / G 各 64 项，按材料记录正确反应（1）或未通过（0），未评单独保留。汇总为本次反应记录，不作标准分或诊断解释。D 翻页册未附评分指南，当前沿用二元反应记录方式。"}
	for _, item := range peakCatalog {
		def.Items = append(def.Items, AssessmentItem{Module: item.Module, Category: item.Category, Code: item.Code, Title: item.Title, Script: item.Script, Definition: item})
	}
	return def, nil
}
func (PEAKMethod) Repository() AssessmentRepository { return peakAssessmentRepository{} }
func (PEAKMethod) ValidateResponse(_ AssessmentRecord, r AssessmentResponse) error {
	if r.Score == nil || (*r.Score != 0 && *r.Score != 1) || len(r.Values) > 0 {
		return errors.New("PEAK 评分必须为 0 或 1")
	}
	return nil
}
func (p PEAKMethod) ValidateCompletion(record AssessmentRecord, responses []AssessmentResponse) error {
	def, err := p.Definition(record.Version)
	if err != nil {
		return err
	}
	allowed := map[string]bool{}
	for _, item := range def.Items {
		if item.Module == record.Module {
			allowed[item.Code] = true
		}
	}
	seen := map[string]bool{}
	for _, r := range responses {
		if !allowed[r.Code] || seen[r.Code] {
			return errors.New("评估包含无效项目")
		}
		if err := p.ValidateResponse(record, r); err != nil {
			return err
		}
		seen[r.Code] = true
	}
	if len(seen) != len(allowed) || len(allowed) == 0 {
		return fmt.Errorf("已记录 %d/%d 项，请完成所有项目后再提交", len(seen), len(allowed))
	}
	return nil
}
func (PEAKMethod) Compare(_ AssessmentRecord, before, after *AssessmentResponse) string {
	if before == nil || after == nil || before.Score == nil || after.Score == nil {
		return "未评 · 暂不比较"
	}
	if *before.Score == 0 && *after.Score == 1 {
		return "本次出现正确反应"
	}
	if *before.Score == 1 && *after.Score == 0 {
		return "本次需继续观察"
	}
	if *before.Score == 1 {
		return "两次均正确"
	}
	return "两次均未通过"
}

type peakAssessmentRepository struct{}

func peakRecord(item PEAKAssessment) AssessmentRecord {
	return AssessmentRecord{MethodID: "peak", ID: item.ID, StudentID: item.StudentID, AssessorID: item.AssessorID, Date: item.Date, Module: item.Module, Version: item.Version, Status: item.Status}
}
func (peakAssessmentRepository) List(db *gorm.DB, student string) ([]AssessmentRecord, error) {
	items := []PEAKAssessment{}
	if student != "" {
		db = db.Where("student_id = ?", student)
	}
	err := db.Order("date desc, id desc").Find(&items).Error
	records := []AssessmentRecord{}
	for _, item := range items {
		records = append(records, peakRecord(item))
	}
	return records, err
}
func (peakAssessmentRepository) Find(db *gorm.DB, id string, lock bool) (AssessmentRecord, error) {
	var item PEAKAssessment
	if lock {
		db = db.Clauses(clause.Locking{Strength: "UPDATE"})
	}
	err := db.First(&item, "id = ?", id).Error
	return peakRecord(item), err
}
func (peakAssessmentRepository) Create(db *gorm.DB, r AssessmentRecord) error {
	return db.Create(&PEAKAssessment{ID: r.ID, StudentID: r.StudentID, AssessorID: r.AssessorID, Date: r.Date, Module: r.Module, Version: r.Version, Status: r.Status}).Error
}
func (peakAssessmentRepository) Responses(db *gorm.DB, id string) ([]AssessmentResponse, error) {
	items := []PEAKScore{}
	err := db.Where("assessment_id = ?", id).Find(&items).Error
	responses := []AssessmentResponse{}
	for _, item := range items {
		score := float64(item.Score)
		responses = append(responses, AssessmentResponse{MethodID: "peak", AssessmentID: id, Code: item.Code, Score: &score, Response: item.Response, Notes: item.Notes})
	}
	return responses, err
}
func (peakAssessmentRepository) SaveResponse(db *gorm.DB, r AssessmentResponse) error {
	return db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "assessment_id"}, {Name: "code"}}, DoUpdates: clause.AssignmentColumns([]string{"score", "response", "notes"})}).Create(&PEAKScore{AssessmentID: r.AssessmentID, Code: r.Code, Score: int(*r.Score), Response: r.Response, Notes: r.Notes}).Error
}
func (peakAssessmentRepository) Complete(db *gorm.DB, id string) error {
	return db.Model(&PEAKAssessment{}).Where("id = ?", id).Update("status", "completed").Error
}
