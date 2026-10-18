package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type AssessmentMethodInfo struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	CurrentVersion string   `json:"currentVersion"`
	Versions       []string `json:"versions"`
	Renderer       string   `json:"renderer"`
	CanLinkTargets bool     `json:"canLinkTargets"`
	CanCompare     bool     `json:"canCompare"`
}
type AssessmentModule struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
type AssessmentScoreOption struct {
	Value float64 `json:"value"`
	Title string  `json:"title"`
}
type AssessmentScoring struct {
	ReviewValues      []float64               `json:"reviewValues,omitempty"`
	ReviewToggleLabel string                  `json:"reviewToggleLabel,omitempty"`
	Label             string                  `json:"label"`
	Options           []AssessmentScoreOption `json:"options"`
	Min               *float64                `json:"min,omitempty"`
	Max               *float64                `json:"max,omitempty"`
	Step              *float64                `json:"step,omitempty"`
}
type AssessmentItem struct {
	Module     string   `json:"module"`
	Category   string   `json:"category"`
	Code       string   `json:"code"`
	Title      string   `json:"title"`
	Script     string   `json:"script,omitempty"`
	Materials  []string `json:"materials,omitempty"`
	Definition any      `json:"definition,omitempty"` // Optional, method-specific presentation data.
}
type AssessmentDefinition struct {
	MethodID     string             `json:"methodId"`
	Version      string             `json:"version"`
	Modules      []AssessmentModule `json:"modules"`
	Items        []AssessmentItem   `json:"items"`
	Scoring      AssessmentScoring  `json:"scoring"`
	Instructions string             `json:"instructions"`
}
type AssessmentRecord struct {
	MethodID   string `json:"methodId" gorm:"primaryKey;type:varchar(40)"`
	ID         string `json:"id" gorm:"primaryKey;type:varchar(191)"`
	StudentID  string `json:"studentId" gorm:"type:varchar(191);index"`
	AssessorID string `json:"assessorId" gorm:"type:varchar(191)"`
	Date       string `json:"date" gorm:"type:varchar(20)"`
	Module     string `json:"module" gorm:"type:varchar(80)"`
	Version    string `json:"version" gorm:"type:varchar(80)"`
	Status     string `json:"status" gorm:"type:varchar(20)"`
}
type AssessmentResponse struct {
	MethodID     string         `json:"methodId" gorm:"primaryKey;type:varchar(40)"`
	AssessmentID string         `json:"assessmentId" gorm:"primaryKey;type:varchar(191)"`
	Code         string         `json:"code" gorm:"primaryKey;type:varchar(80)"`
	Score        *float64       `json:"score"`
	Response     string         `json:"response" gorm:"type:text"`
	Notes        string         `json:"notes" gorm:"type:text"`
	Values       map[string]any `json:"values,omitempty" gorm:"serializer:json"` // Non-numeric methods may use structured observations.
}
type AssessmentComparisonItem struct {
	Code        string              `json:"code"`
	Title       string              `json:"title"`
	Before      *AssessmentResponse `json:"before"`
	After       *AssessmentResponse `json:"after"`
	Observation string              `json:"observation"`
}

// The service owns authorization, student identity, transactions and lifecycle locking.
// Each method owns versioned content, scoring/completion rules and interpretation.
type AssessmentMethod interface {
	Info() AssessmentMethodInfo
	Definition(version string) (AssessmentDefinition, error)
	Repository() AssessmentRepository
	ValidateResponse(record AssessmentRecord, response AssessmentResponse) error
	ValidateCompletion(record AssessmentRecord, responses []AssessmentResponse) error
	Compare(record AssessmentRecord, before, after *AssessmentResponse) string
}
type AssessmentRepository interface {
	List(db *gorm.DB, studentID string) ([]AssessmentRecord, error)
	Find(db *gorm.DB, id string, lock bool) (AssessmentRecord, error)
	Create(db *gorm.DB, record AssessmentRecord) error
	Responses(db *gorm.DB, id string) ([]AssessmentResponse, error)
	SaveResponse(db *gorm.DB, response AssessmentResponse) error
	Complete(db *gorm.DB, id string) error
}
type AssessmentRegistry struct{ methods map[string]AssessmentMethod }

func NewAssessmentRegistry(methods ...AssessmentMethod) *AssessmentRegistry {
	r := &AssessmentRegistry{methods: map[string]AssessmentMethod{}}
	for _, m := range methods {
		if err := r.Register(m); err != nil {
			panic(err)
		}
	}
	return r
}
func (r *AssessmentRegistry) Register(m AssessmentMethod) error {
	info := m.Info()
	if info.ID == "" || info.Name == "" || info.CurrentVersion == "" || r.methods[info.ID] != nil {
		return errors.New("评估方法标识无效或重复")
	}
	if m.Repository() == nil {
		return errors.New("评估方法缺少存储适配器")
	}
	if _, err := assessmentDefinition(m, info.CurrentVersion); err != nil {
		return err
	}
	r.methods[info.ID] = m
	return nil
}
func (r *AssessmentRegistry) Get(id string) (AssessmentMethod, error) {
	method := r.methods[id]
	if method == nil {
		return nil, fmt.Errorf("评估方法未接入：%s", id)
	}
	return method, nil
}
func (r *AssessmentRegistry) Infos() []AssessmentMethodInfo {
	list := []AssessmentMethodInfo{}
	for _, m := range r.methods {
		list = append(list, m.Info())
	}
	sort.Slice(list, func(i, j int) bool { return list[i].ID < list[j].ID })
	return list
}

var assessmentMethods = NewAssessmentRegistry()

// Reusable storage for new methods; PEAK uses its existing tables through its adapter.
type SQLAssessmentRepository struct{ MethodID string }

func (r SQLAssessmentRepository) List(db *gorm.DB, student string) ([]AssessmentRecord, error) {
	records := []AssessmentRecord{}
	q := db.Where("method_id = ?", r.MethodID)
	if student != "" {
		q = q.Where("student_id = ?", student)
	}
	err := q.Order("date desc, id desc").Find(&records).Error
	return records, err
}
func (r SQLAssessmentRepository) Find(db *gorm.DB, id string, lock bool) (AssessmentRecord, error) {
	var record AssessmentRecord
	if lock {
		db = db.Clauses(clause.Locking{Strength: "UPDATE"})
	}
	err := db.First(&record, "method_id = ? AND id = ?", r.MethodID, id).Error
	return record, err
}
func (r SQLAssessmentRepository) Create(db *gorm.DB, record AssessmentRecord) error {
	record.MethodID = r.MethodID
	return db.Create(&record).Error
}
func (r SQLAssessmentRepository) Responses(db *gorm.DB, id string) ([]AssessmentResponse, error) {
	responses := []AssessmentResponse{}
	err := db.Where("method_id = ? AND assessment_id = ?", r.MethodID, id).Find(&responses).Error
	return responses, err
}
func (r SQLAssessmentRepository) SaveResponse(db *gorm.DB, response AssessmentResponse) error {
	response.MethodID = r.MethodID
	return db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "method_id"}, {Name: "assessment_id"}, {Name: "code"}}, DoUpdates: clause.AssignmentColumns([]string{"score", "response", "notes", "values"})}).Create(&response).Error
}
func (r SQLAssessmentRepository) Complete(db *gorm.DB, id string) error {
	return db.Model(&AssessmentRecord{}).Where("method_id = ? AND id = ?", r.MethodID, id).Update("status", "completed").Error
}

func assessmentWriter(c *gin.Context) bool {
	if c.GetString("role") != string(RoleAdmin) && c.GetString("role") != string(RoleTeacher) {
		c.AbortWithStatusJSON(403, gin.H{"error": "只有评估人员可以修改评估记录"})
		return false
	}
	return true
}
func methodForContext(c *gin.Context) AssessmentMethod {
	method, err := assessmentMethods.Get(c.Param("method"))
	if err != nil {
		c.AbortWithStatusJSON(404, gin.H{"error": err.Error()})
		return nil
	}
	return method
}
func assessmentForContext(c *gin.Context, method AssessmentMethod) *AssessmentRecord {
	record, err := method.Repository().Find(DB, c.Param("id"), false)
	if err != nil {
		c.AbortWithStatusJSON(404, gin.H{"error": "评估不存在"})
		return nil
	}
	if c.GetString("role") == string(RoleStudent) && record.StudentID != c.GetString("userId") {
		c.AbortWithStatusJSON(403, gin.H{"error": "无权查看此评估"})
		return nil
	}
	return &record
}
func createMethodAssessment(tx *gorm.DB, method AssessmentMethod, record AssessmentRecord) (AssessmentRecord, error) {
	if record.Version == "" {
		record.Version = method.Info().CurrentVersion
	}
	def, err := assessmentDefinition(method, record.Version)
	if err != nil {
		return record, err
	}
	valid := false
	for _, module := range def.Modules {
		if module.ID == record.Module {
			valid = true
			break
		}
	}
	if !valid {
		return record, errors.New("请选择有效的评估模块")
	}
	if err := activePlanStudent(tx, record.StudentID); err != nil {
		return record, err
	}
	record.MethodID, record.Status = method.Info().ID, "ongoing"
	if record.ID == "" {
		record.ID = strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	record.Date = time.Now().Format("2006-01-02")
	return record, method.Repository().Create(tx, record)
}
func assessmentDefinition(method AssessmentMethod, version string) (AssessmentDefinition, error) {
	info := method.Info()
	listed := false
	for _, v := range info.Versions {
		if v == version {
			listed = true
			break
		}
	}
	if !listed {
		return AssessmentDefinition{}, errors.New("评估版本尚未接入")
	}
	def, err := method.Definition(version)
	if err != nil {
		return def, err
	}
	if def.MethodID != info.ID || def.Version != version || len(def.Modules) == 0 || len(def.Items) == 0 {
		return def, errors.New("评估定义与方法版本不匹配")
	}
	modules := map[string]bool{}
	for _, module := range def.Modules {
		if module.ID == "" || modules[module.ID] {
			return def, errors.New("评估模块定义无效")
		}
		modules[module.ID] = true
	}
	codes := map[string]bool{}
	for _, item := range def.Items {
		key := item.Module + ":" + item.Code
		if item.Code == "" || !modules[item.Module] || codes[key] {
			return def, errors.New("评估项目定义无效")
		}
		codes[key] = true
	}
	return def, nil
}
func definitionForRecord(method AssessmentMethod, record AssessmentRecord) (AssessmentDefinition, error) {
	def, err := assessmentDefinition(method, record.Version)
	if err == nil && def.MethodID != record.MethodID {
		return def, errors.New("评估定义与记录方法不匹配")
	}
	return def, err
}
func recordedItems(db *gorm.DB, method AssessmentMethod, record AssessmentRecord, codes []string) error {
	def, err := definitionForRecord(method, record)
	if err != nil {
		return err
	}
	allowed := map[string]bool{}
	for _, item := range def.Items {
		if item.Module == record.Module {
			allowed[item.Code] = true
		}
	}
	scores, err := method.Repository().Responses(db, record.ID)
	if err != nil {
		return err
	}
	recorded := map[string]bool{}
	for _, s := range scores {
		recorded[s.Code] = true
	}
	seen := map[string]bool{}
	for _, code := range codes {
		if seen[code] || !allowed[code] || !recorded[code] {
			return errors.New("评估发现必须来自本次评估的已记录项目，且不能重复")
		}
		seen[code] = true
	}
	return nil
}
func validateResponseEnvelope(record AssessmentRecord, method AssessmentMethod, response AssessmentResponse) error {
	def, err := definitionForRecord(method, record)
	if err != nil {
		return err
	}
	found := false
	for _, item := range def.Items {
		if item.Module == record.Module && item.Code == response.Code {
			found = true
			break
		}
	}
	if !found {
		return errors.New("该项目不属于本次评估模块")
	}
	values, err := json.Marshal(response.Values)
	if err != nil || len(values) > 12000 || len(response.Response) > 12000 || len(response.Notes) > 12000 || (response.Score != nil && (math.IsNaN(*response.Score) || math.IsInf(*response.Score, 0))) {
		return errors.New("评估反应或备注格式无效，单项内容不得超过 12000 字节")
	}
	return method.ValidateResponse(record, response)
}
func GetAssessmentMethods(c *gin.Context) { SendJSON(c, 0, "", assessmentMethods.Infos()) }
func GetMethodAssessmentDefinition(c *gin.Context) {
	method := methodForContext(c)
	if method == nil {
		return
	}
	version := c.Query("version")
	if version == "" {
		version = method.Info().CurrentVersion
	}
	def, err := assessmentDefinition(method, version)
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	if c.GetString("role") == string(RoleStudent) {
		def.Items = append([]AssessmentItem(nil), def.Items...)
		for i := range def.Items {
			def.Items[i].Script = ""
			def.Items[i].Definition = nil
			def.Items[i].Materials = nil
		}
		def.Instructions = ""
	}
	SendJSON(c, 0, "", def)
}
func GetMethodAssessmentRecords(c *gin.Context) {
	method := methodForContext(c)
	if method == nil {
		return
	}
	student := c.Query("studentId")
	if c.GetString("role") == string(RoleStudent) {
		student = c.GetString("userId")
	}
	records, err := method.Repository().List(DB, student)
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	SendJSON(c, 0, "", records)
}
func GetAllAssessmentRecords(c *gin.Context) {
	student := c.Query("studentId")
	if c.GetString("role") == string(RoleStudent) {
		student = c.GetString("userId")
	}
	records := []AssessmentRecord{}
	for _, info := range assessmentMethods.Infos() {
		method, _ := assessmentMethods.Get(info.ID)
		list, err := method.Repository().List(DB, student)
		if err != nil {
			SendJSON(c, 1, err.Error(), nil)
			return
		}
		records = append(records, list...)
	}
	sort.Slice(records, func(i, j int) bool {
		if records[i].Date == records[j].Date {
			return records[i].ID > records[j].ID
		}
		return records[i].Date > records[j].Date
	})
	SendJSON(c, 0, "", records)
}
func CreateMethodAssessment(c *gin.Context) {
	if !assessmentWriter(c) {
		return
	}
	method := methodForContext(c)
	if method == nil {
		return
	}
	var input struct {
		StudentID string `json:"studentId"`
		Module    string `json:"module"`
		Version   string `json:"version"`
	}
	if c.ShouldBindJSON(&input) != nil {
		SendJSON(c, 1, "评估参数无效", nil)
		return
	}
	var record AssessmentRecord
	err := DB.Transaction(func(tx *gorm.DB) error {
		var err error
		record, err = createMethodAssessment(tx, method, AssessmentRecord{StudentID: input.StudentID, Module: input.Module, Version: input.Version, AssessorID: c.GetString("userId")})
		return err
	})
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	SendJSON(c, 0, "", record)
}
func GetMethodAssessment(c *gin.Context) {
	method := methodForContext(c)
	if method == nil {
		return
	}
	record := assessmentForContext(c, method)
	if record != nil {
		SendJSON(c, 0, "", record)
	}
}
func GetMethodAssessmentResponses(c *gin.Context) {
	method := methodForContext(c)
	if method == nil || assessmentForContext(c, method) == nil {
		return
	}
	responses, err := method.Repository().Responses(DB, c.Param("id"))
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	SendJSON(c, 0, "", responses)
}
func SaveMethodAssessmentResponse(c *gin.Context) {
	if !assessmentWriter(c) {
		return
	}
	method := methodForContext(c)
	if method == nil {
		return
	}
	var response AssessmentResponse
	if c.ShouldBindJSON(&response) != nil {
		SendJSON(c, 1, "评估反应格式无效", nil)
		return
	}
	response.MethodID, response.AssessmentID = method.Info().ID, c.Param("id")
	err := DB.Transaction(func(tx *gorm.DB) error {
		record, err := method.Repository().Find(tx, response.AssessmentID, true)
		if err != nil {
			return errors.New("评估不存在")
		}
		if record.Status != "ongoing" {
			return errors.New("已完成的评估为只读")
		}
		if err := validateResponseEnvelope(record, method, response); err != nil {
			return err
		}
		return method.Repository().SaveResponse(tx, response)
	})
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	SendJSON(c, 0, "", response)
}
func CompleteMethodAssessment(c *gin.Context) {
	if !assessmentWriter(c) {
		return
	}
	method := methodForContext(c)
	if method == nil {
		return
	}
	var record AssessmentRecord
	err := DB.Transaction(func(tx *gorm.DB) error {
		var err error
		record, err = method.Repository().Find(tx, c.Param("id"), true)
		if err != nil {
			return errors.New("评估不存在")
		}
		if record.Status != "ongoing" {
			return errors.New("已完成的评估为只读")
		}
		if _, err := definitionForRecord(method, record); err != nil {
			return err
		}
		responses, err := method.Repository().Responses(tx, record.ID)
		if err != nil {
			return err
		}
		for _, response := range responses {
			if err := validateResponseEnvelope(record, method, response); err != nil {
				return err
			}
		}
		if err := method.ValidateCompletion(record, responses); err != nil {
			return err
		}
		record.Status = "completed"
		return method.Repository().Complete(tx, record.ID)
	})
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	SendJSON(c, 0, "", record)
}
