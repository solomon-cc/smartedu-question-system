package main

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// A teacher-confirmed link, not an automatic mapping of assessment items to training questions.
// Baseline assessments and assigned paper snapshots remain independent immutable records.
type StudentLearningPlan struct {
	ID                   string   `json:"id" gorm:"primaryKey;type:varchar(191)"`
	StudentID            string   `json:"studentId" gorm:"type:varchar(191);index"`
	AssessmentID         string   `json:"assessmentId" gorm:"type:varchar(191);index"`
	MethodID             string   `json:"methodId" gorm:"type:varchar(40);default:peak"`
	Module               string   `json:"module" gorm:"type:varchar(80)"`
	Version              string   `json:"version" gorm:"type:varchar(80)"`
	SourceCodes          []string `json:"sourceCodes" gorm:"serializer:json"`
	ObjectiveID          string   `json:"objectiveId" gorm:"type:varchar(191)"`
	ObjectiveName        string   `json:"objectiveName" gorm:"type:varchar(191)"`
	Target               string   `json:"target" gorm:"type:text"`
	Notes                string   `json:"notes" gorm:"type:text"`
	ConfirmedBy          string   `json:"confirmedBy" gorm:"type:varchar(191)"`
	ConfirmedAt          string   `json:"confirmedAt" gorm:"type:varchar(40)"`
	PaperID              string   `json:"paperId" gorm:"type:varchar(191)"`
	HomeworkID           string   `json:"homeworkId" gorm:"type:varchar(191)"`
	FollowupAssessmentID string   `json:"followupAssessmentId" gorm:"type:varchar(191)"`
}

func planAccess(c *gin.Context, modules ...string) bool {
	if !assessmentWriter(c) {
		return false
	}
	for _, module := range modules {
		var perm RolePermission
		err := DB.Where("role = ? AND module_id = ?", c.GetString("role"), module).First(&perm).Error
		if err != nil && strings.Contains(module, "_") {
			err = DB.Where("role = ? AND module_id = ?", c.GetString("role"), strings.Split(module, "_")[0]).First(&perm).Error
		}
		if err != nil || !perm.APIAccess {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "缺少模块权限：" + module})
			return false
		}
	}
	return true
}

func GetStudentLearningPlans(c *gin.Context) {
	if !planAccess(c, "ability_tracking", "assessment_history") {
		return
	}
	plans := []StudentLearningPlan{}
	if err := DB.Where("student_id = ?", c.Param("id")).Order("confirmed_at desc, id desc").Find(&plans).Error; err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	SendJSON(c, 0, "", plans)
}

func CreateStudentLearningPlan(c *gin.Context) {
	if !planAccess(c, "ability_tracking", "assessment_history") {
		return
	}
	var input struct {
		AssessmentID string   `json:"assessmentId"`
		MethodID     string   `json:"methodId"`
		SourceCodes  []string `json:"sourceCodes"`
		ObjectiveID  string   `json:"objectiveId"`
		Target       string   `json:"target"`
		Notes        string   `json:"notes"`
	}
	if c.ShouldBindJSON(&input) != nil || strings.TrimSpace(input.Target) == "" || len(input.Target) > 12000 || len(input.Notes) > 12000 || len(input.SourceCodes) == 0 || len(input.SourceCodes) > 1000 {
		SendJSON(c, 1, "请选择评估发现、教学目标并填写可观察的训练目标", nil)
		return
	}
	if input.MethodID == "" {
		input.MethodID = "peak"
	} // Existing callers and existing plans retain their method identity.
	method, methodErr := assessmentMethods.Get(input.MethodID)
	if methodErr != nil || !method.Info().CanLinkTargets {
		SendJSON(c, 1, "该评估方法尚不支持关联教学目标", nil)
		return
	}
	plan := StudentLearningPlan{MethodID: input.MethodID, ID: "lp-" + strconv.FormatInt(time.Now().UnixNano(), 36), StudentID: c.Param("id"), AssessmentID: input.AssessmentID, SourceCodes: input.SourceCodes, ObjectiveID: input.ObjectiveID, Target: strings.TrimSpace(input.Target), Notes: strings.TrimSpace(input.Notes), ConfirmedBy: c.GetString("userId"), ConfirmedAt: time.Now().Format(time.RFC3339Nano)}
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := activePlanStudent(tx, plan.StudentID); err != nil {
			return err
		}
		baseline, err := method.Repository().Find(tx, plan.AssessmentID, false)
		if err != nil || baseline.StudentID != plan.StudentID || baseline.Status != "completed" {
			return errors.New("请选择该学生已完成的评估")
		}
		if err := recordedItems(tx, method, baseline, plan.SourceCodes); err != nil {
			return err
		}
		var objective SkillObjective
		if tx.First(&objective, "id = ?", plan.ObjectiveID).Error != nil {
			return errors.New("请选择有效的教学目标")
		}
		plan.Module, plan.Version, plan.ObjectiveName = baseline.Module, baseline.Version, objective.Name
		return tx.Create(&plan).Error
	})
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	AddAuditLog(c, "确认学生教学目标", plan.ID)
	SendJSON(c, 0, "", plan)
}

func activePlanStudent(tx *gorm.DB, id string) error {
	var user User
	if tx.First(&user, "id = ? AND role = ? AND status = ?", id, RoleStudent, "active").Error != nil {
		return errors.New("学生不存在或已停用")
	}
	return nil
}
func lockedPlan(tx *gorm.DB, c *gin.Context) (*StudentLearningPlan, error) {
	var plan StudentLearningPlan
	if tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&plan, "id = ? AND student_id = ?", c.Param("planId"), c.Param("id")).Error != nil {
		return nil, errors.New("目标计划不存在")
	}
	if c.GetString("role") != string(RoleAdmin) && plan.ConfirmedBy != c.GetString("userId") {
		return nil, errors.New("只能操作自己确认的目标计划")
	}
	if err := activePlanStudent(tx, plan.StudentID); err != nil {
		return nil, err
	}
	return &plan, nil
}

func AssignStudentLearningPlan(c *gin.Context) {
	if !planAccess(c, "ability_tracking", "assessment_history", "questions", "papers", "assignments") {
		return
	}
	var input struct {
		QuestionIDs []string `json:"questionIds"`
		Name        string   `json:"name"`
		StartDate   string   `json:"startDate"`
		EndDate     string   `json:"endDate"`
	}
	if c.ShouldBindJSON(&input) != nil || strings.TrimSpace(input.Name) == "" || utf8.RuneCountInString(input.Name) > 100 || len(input.QuestionIDs) == 0 || len(input.QuestionIDs) > 100 {
		SendJSON(c, 1, "请选择训练题并填写任务名称（最多 100 题）", nil)
		return
	}
	start, e1 := time.Parse("2006-01-02", input.StartDate)
	end, e2 := time.Parse("2006-01-02", input.EndDate)
	if e1 != nil || e2 != nil || end.Before(start) {
		SendJSON(c, 1, "任务日期无效，截止日期不能早于开始日期", nil)
		return
	}
	var result *StudentLearningPlan
	err := DB.Transaction(func(tx *gorm.DB) error {
		plan, err := lockedPlan(tx, c)
		if err != nil {
			return err
		}
		result = plan
		// Retried requests do not create duplicate tasks or papers.
		if plan.HomeworkID != "" {
			return nil
		}
		if plan.ConfirmedBy == "" || plan.ConfirmedAt == "" {
			return errors.New("请先由老师确认目标")
		}
		questions := make([]Question, 0, len(input.QuestionIDs))
		seen := map[string]bool{}
		for _, id := range input.QuestionIDs {
			if seen[id] {
				return errors.New("不能重复选择训练题")
			}
			seen[id] = true
			var question Question
			if tx.First(&question, "id = ?", id).Error != nil || question.ObjectiveID != plan.ObjectiveID {
				return errors.New("训练题必须关联老师确认的教学目标")
			}
			questions = append(questions, question)
		}
		paper := Paper{ID: plan.ID + "-paper", Name: strings.TrimSpace(input.Name), Questions: questions, QuestionIDs: input.QuestionIDs, Total: len(questions)}
		homework := Homework{ID: plan.ID + "-task", TeacherID: c.GetString("userId"), PaperID: paper.ID, Name: paper.Name, StudentIDs: []string{plan.StudentID}, StartDate: input.StartDate, EndDate: input.EndDate, Total: 1, Status: "pending", RepeatInterval: "none"}
		if err := tx.Create(&paper).Error; err != nil {
			return err
		}
		if err := tx.Create(&homework).Error; err != nil {
			return err
		}
		plan.PaperID, plan.HomeworkID = paper.ID, homework.ID
		return tx.Save(plan).Error
	})
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	AddAuditLog(c, "布置目标训练任务", result.ID)
	SendJSON(c, 0, "", result)
}

func ReassessStudentLearningPlan(c *gin.Context) {
	if !planAccess(c, "ability_tracking", "assessment_history") {
		return
	}
	var result *StudentLearningPlan
	err := DB.Transaction(func(tx *gorm.DB) error {
		plan, err := lockedPlan(tx, c)
		if err != nil {
			return err
		}
		result = plan
		if plan.HomeworkID == "" {
			return errors.New("请先布置训练任务，再进行复测")
		}
		if plan.FollowupAssessmentID != "" {
			return nil
		}
		method, err := assessmentMethods.Get(plan.MethodID)
		if err != nil {
			return err
		}
		if !method.Info().CanLinkTargets {
			return errors.New("该评估方法尚不支持关联教学目标")
		}
		baseline, err := method.Repository().Find(tx, plan.AssessmentID, false)
		if err != nil || baseline.StudentID != plan.StudentID || baseline.Status != "completed" || baseline.Module != plan.Module || baseline.Version != plan.Version {
			return errors.New("基线评估版本或模块不匹配")
		}
		item, err := createMethodAssessment(tx, method, AssessmentRecord{ID: plan.ID + "-retest", StudentID: plan.StudentID, AssessorID: c.GetString("userId"), Module: plan.Module, Version: plan.Version})
		if err != nil {
			return err
		}
		plan.FollowupAssessmentID = item.ID
		return tx.Save(plan).Error
	})
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	SendJSON(c, 0, "", result)
}

func CompareStudentLearningPlan(c *gin.Context) {
	if !planAccess(c, "ability_tracking", "assessment_history") {
		return
	}
	var plan StudentLearningPlan
	if DB.First(&plan, "id = ? AND student_id = ?", c.Param("planId"), c.Param("id")).Error != nil {
		c.AbortWithStatusJSON(404, gin.H{"error": "目标计划不存在"})
		return
	}
	method, err := assessmentMethods.Get(plan.MethodID)
	if err != nil || !method.Info().CanCompare {
		SendJSON(c, 1, "该评估方法尚不支持复测对比", nil)
		return
	}
	before, err := method.Repository().Find(DB, plan.AssessmentID, false)
	if err != nil {
		SendJSON(c, 1, "基线评估不存在", nil)
		return
	}
	after := AssessmentRecord{MethodID: plan.MethodID}
	if plan.FollowupAssessmentID != "" {
		after, err = method.Repository().Find(DB, plan.FollowupAssessmentID, false)
		if err != nil {
			SendJSON(c, 1, "复测记录不存在", nil)
			return
		}
	}
	if before.StudentID != plan.StudentID || before.Module != plan.Module || before.Version != plan.Version || (after.ID != "" && (after.StudentID != plan.StudentID || after.Module != plan.Module || after.Version != plan.Version || after.MethodID != before.MethodID)) {
		SendJSON(c, 1, "只可对比同一学生、方法、版本及模块的评估", nil)
		return
	}
	def, err := definitionForRecord(method, before)
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	left, right := map[string]*AssessmentResponse{}, map[string]*AssessmentResponse{}
	for _, entry := range []struct {
		ID   string
		Dest map[string]*AssessmentResponse
	}{{before.ID, left}, {after.ID, right}} {
		if entry.ID == "" {
			continue
		}
		responses, err := method.Repository().Responses(DB, entry.ID)
		if err != nil {
			SendJSON(c, 1, err.Error(), nil)
			return
		}
		for i := range responses {
			entry.Dest[responses[i].Code] = &responses[i]
		}
	}
	rows := []AssessmentComparisonItem{}
	for _, code := range plan.SourceCodes {
		title := code
		for _, item := range def.Items {
			if item.Code == code && item.Module == plan.Module {
				title = item.Title
				break
			}
		}
		rows = append(rows, AssessmentComparisonItem{Code: code, Title: title, Before: left[code], After: right[code], Observation: method.Compare(before, left[code], right[code])})
	}
	SendJSON(c, 0, "", gin.H{"baseline": before, "followup": after, "items": rows, "scoring": def.Scoring, "method": method.Info()})
}
