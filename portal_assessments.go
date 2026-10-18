package main

import (
	"errors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"sort"
	"strings"
	"time"
)

// A verified account relationship, managed by administrators, never inferred from names.
type ParentStudentLink struct {
	ParentID  string `json:"parentId" gorm:"primaryKey;type:varchar(191)"`
	StudentID string `json:"studentId" gorm:"primaryKey;type:varchar(191)"`
}

func registerPortalAssessments(p, a *gin.RouterGroup) {
	p.GET("/assessment-methods", GetAssessmentMethods)
	a.GET("/assessment-students", portalRoles(RoleAdmin, RoleTeacher, RoleStudent, RoleParent), PortalAssessmentStudents)
	g := a.Group("/assessments")
	g.Use(portalRoles(RoleAdmin, RoleTeacher, RoleStudent, RoleParent))
	g.GET("", PortalAssessmentRecords)
	g.POST("/:method/records", portalRoles(RoleAdmin, RoleTeacher), CreateMethodAssessment)
	g.GET("/:method/records/:id", PortalAssessmentDetail)
	g.POST("/:method/records/:id/responses", portalRoles(RoleAdmin, RoleTeacher), SaveMethodAssessmentResponse)
	g.POST("/:method/records/:id/complete", portalRoles(RoleAdmin, RoleTeacher), CompleteMethodAssessment)
	g.POST("/:method/records/:id/targets", portalRoles(RoleAdmin, RoleTeacher), PortalAssessmentTarget)
	a.GET("/manage/parent-links", portalRoles(RoleAdmin), PortalParentLinks)
	a.PUT("/manage/parent-links/:id", portalRoles(RoleAdmin), PortalSaveParentLinks)
}
func portalAssessmentStudent(c *gin.Context, id string) bool {
	role := c.GetString("role")
	if role == string(RoleAdmin) || role == string(RoleTeacher) {
		return true
	}
	if role == string(RoleStudent) {
		return id == c.GetString("userId")
	}
	if role == string(RoleParent) {
		var n int64
		return DB.Model(&ParentStudentLink{}).Where("parent_id = ? AND student_id = ?", c.GetString("userId"), id).Count(&n).Error == nil && n > 0
	}
	return false
}
func portalAssessmentStudents(c *gin.Context) ([]User, error) {
	list := []User{}
	q := DB.Select("id, name, username").Where("role = ? AND status = ?", RoleStudent, "active")
	switch c.GetString("role") {
	case string(RoleStudent):
		q = q.Where("id = ?", c.GetString("userId"))
	case string(RoleParent):
		q = q.Where("id IN (?)", DB.Model(&ParentStudentLink{}).Select("student_id").Where("parent_id = ?", c.GetString("userId")))
	}
	err := q.Order("name, username").Find(&list).Error
	return list, err
}
func PortalAssessmentStudents(c *gin.Context) {
	list, err := portalAssessmentStudents(c)
	if err != nil {
		portalFail(c, 500, "学生列表加载失败")
		return
	}
	SendJSON(c, 0, "", list)
}
func PortalParentLinks(c *gin.Context) {
	list := []ParentStudentLink{}
	if DB.Find(&list).Error != nil {
		portalFail(c, 500, "关联加载失败")
		return
	}
	SendJSON(c, 0, "", list)
}
func PortalSaveParentLinks(c *gin.Context) {
	var b struct {
		StudentIDs []string `json:"studentIds"`
	}
	if c.ShouldBindJSON(&b) != nil || len(b.StudentIDs) > 100 {
		portalFail(c, 400, "关联内容无效")
		return
	}
	var parent User
	if DB.First(&parent, "id = ? AND role = ? AND status = ?", c.Param("id"), RoleParent, "active").Error != nil {
		portalFail(c, 400, "请选择正常的家长账号")
		return
	}
	links := []ParentStudentLink{}
	seen := map[string]bool{}
	for _, id := range b.StudentIDs {
		if seen[id] {
			continue
		}
		seen[id] = true
		if activePlanStudent(DB, id) != nil {
			portalFail(c, 400, "请选择正常的学生账号")
			return
		}
		links = append(links, ParentStudentLink{parent.ID, id})
	}
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("parent_id = ?", parent.ID).Delete(&ParentStudentLink{}).Error; err != nil {
			return err
		}
		if len(links) > 0 {
			return tx.Create(&links).Error
		}
		return nil
	})
	if err != nil {
		portalFail(c, 500, "关联保存失败")
		return
	}
	SendJSON(c, 0, "", links)
}

type portalAssessmentSummary struct {
	AssessmentRecord
	StudentName string `json:"studentName"`
	MethodName  string `json:"methodName"`
	Total       int    `json:"total"`
	Recorded    int    `json:"recorded"`
	Correct     int    `json:"correct"`
}

func PortalAssessmentRecords(c *gin.Context) {
	students, err := portalAssessmentStudents(c)
	if err != nil {
		portalFail(c, 500, "评估列表加载失败")
		return
	}
	allowed := map[string]string{}
	for _, s := range students {
		allowed[s.ID] = s.Name
		if s.Name == "" {
			allowed[s.ID] = s.Username
		}
	}
	filter := c.Query("studentId")
	list := []portalAssessmentSummary{}
	for _, info := range assessmentMethods.Infos() {
		method, _ := assessmentMethods.Get(info.ID)
		records, err := method.Repository().List(DB, filter)
		if err != nil {
			portalFail(c, 500, "评估列表加载失败")
			return
		}
		for _, r := range records {
			name, ok := allowed[r.StudentID]
			if !ok {
				continue
			}
			def, err := definitionForRecord(method, r)
			if err != nil {
				portalFail(c, 409, "评估版本暂不可用，请联系管理员")
				return
			}
			responses, err := method.Repository().Responses(DB, r.ID)
			if err != nil {
				portalFail(c, 500, "评估进度加载失败")
				return
			}
			total := 0
			for _, i := range def.Items {
				if i.Module == r.Module {
					total++
				}
			}
			correct := 0
			for _, v := range responses {
				if v.Score != nil && *v.Score == 1 {
					correct++
				}
			}
			list = append(list, portalAssessmentSummary{r, name, info.Name, total, len(responses), correct})
		}
	}
	sort.Slice(list, func(i, j int) bool {
		if list[i].Date == list[j].Date {
			return list[i].ID > list[j].ID
		}
		return list[i].Date > list[j].Date
	})
	SendJSON(c, 0, "", list)
}
func portalAssessmentRecord(c *gin.Context) (AssessmentMethod, *AssessmentRecord) {
	method := methodForContext(c)
	if method == nil {
		return nil, nil
	}
	r, err := method.Repository().Find(DB, c.Param("id"), false)
	if err != nil {
		portalFail(c, 404, "评估不存在")
		return nil, nil
	}
	if !portalAssessmentStudent(c, r.StudentID) {
		portalFail(c, 403, "无权查看此学生的评估")
		return nil, nil
	}
	return method, &r
}
func PortalAssessmentDetail(c *gin.Context) {
	method, r := portalAssessmentRecord(c)
	if r == nil {
		return
	}
	def, err := definitionForRecord(method, *r)
	if err != nil {
		portalFail(c, 409, "评估材料版本不可用")
		return
	}
	responses, err := method.Repository().Responses(DB, r.ID)
	if err != nil {
		portalFail(c, 500, "反应记录加载失败")
		return
	}
	items := []AssessmentItem{}
	staff := c.GetString("role") == string(RoleAdmin) || c.GetString("role") == string(RoleTeacher)
	for _, i := range def.Items {
		if i.Module != r.Module {
			continue
		}
		if !staff {
			i.Script = ""
			i.Definition = nil
			i.Materials = nil
		}
		items = append(items, i)
	}
	def.Items = items
	if !staff {
		def.Instructions = ""
		for i := range responses {
			responses[i].Notes = ""
		}
	}
	plans := []StudentLearningPlan{}
	if DB.Where("assessment_id = ? AND method_id = ? AND student_id = ?", r.ID, r.MethodID, r.StudentID).Find(&plans).Error != nil {
		portalFail(c, 500, "训练目标加载失败")
		return
	}
	type target struct {
		StudentLearningPlan
		QuestionCount int64 `json:"questionCount"`
	}
	targets := []target{}
	for _, plan := range plans {
		var count int64
		DB.Model(&Question{}).Where("objective_id = ?", plan.ObjectiveID).Count(&count)
		targets = append(targets, target{plan, count})
	}
	var s User
	DB.Select("name, username").First(&s, "id = ?", r.StudentID)
	name := s.Name
	if name == "" {
		name = s.Username
	}
	SendJSON(c, 0, "", gin.H{"record": r, "studentName": name, "definition": def, "responses": responses, "targets": targets})
}
func PortalAssessmentTarget(c *gin.Context) {
	method, r := portalAssessmentRecord(c)
	if r == nil {
		return
	}
	var b struct {
		SourceCodes []string `json:"sourceCodes"`
		ObjectiveID string   `json:"objectiveId"`
		Target      string   `json:"target"`
	}
	if c.ShouldBindJSON(&b) != nil || strings.TrimSpace(b.Target) == "" || len(b.Target) > 12000 || len(b.SourceCodes) == 0 || len(b.SourceCodes) > 1000 {
		portalFail(c, 400, "请选择评估项目、题库目标并填写练习目标")
		return
	}
	var plan StudentLearningPlan
	err := DB.Transaction(func(tx *gorm.DB) error {
		record, err := method.Repository().Find(tx, r.ID, true)
		if err != nil {
			return err
		}
		if record.Status != "completed" {
			return errors.New("请先完成评估复核，再安排针对性练习")
		}
		if !method.Info().CanLinkTargets {
			return errors.New("此评估方法暂不支持目标关联")
		}
		if err := recordedItems(tx, method, record, b.SourceCodes); err != nil {
			return err
		}
		var objective SkillObjective
		if tx.First(&objective, "id = ?", b.ObjectiveID).Error != nil {
			return errors.New("题库目标不存在")
		}
		var count int64
		if tx.Model(&Question{}).Where("objective_id = ?", objective.ID).Count(&count).Error != nil || count == 0 {
			return errors.New("此目标尚无练习题，请先补充题目")
		}
		plan = StudentLearningPlan{ID: "lp-" + portalID(), StudentID: record.StudentID, AssessmentID: record.ID, MethodID: record.MethodID, Module: record.Module, Version: record.Version, SourceCodes: b.SourceCodes, ObjectiveID: objective.ID, ObjectiveName: objective.Name, Target: strings.TrimSpace(b.Target), ConfirmedBy: c.GetString("userId"), ConfirmedAt: time.Now().Format(time.RFC3339Nano)}
		return tx.Create(&plan).Error
	})
	if err != nil {
		portalFail(c, 400, err.Error())
		return
	}
	SendJSON(c, 0, "", plan)
}
func portalPracticePlan(c *gin.Context) (*StudentLearningPlan, bool) {
	id := c.Query("planId")
	if id == "" {
		if c.GetString("role") == string(RoleParent) {
			portalFail(c, 403, "请从孩子的评估报告进入针对性练习")
			return nil, false
		}
		return nil, true
	}
	var plan StudentLearningPlan
	if DB.First(&plan, "id = ?", id).Error != nil || plan.ConfirmedAt == "" {
		portalFail(c, 404, "练习目标不存在")
		return nil, false
	}
	if !portalAssessmentStudent(c, plan.StudentID) {
		portalFail(c, 403, "无权访问此练习目标")
		return nil, false
	}
	method, err := assessmentMethods.Get(plan.MethodID)
	if err != nil {
		portalFail(c, 409, "评估方法不可用")
		return nil, false
	}
	r, err := method.Repository().Find(DB, plan.AssessmentID, false)
	if err != nil || r.Status != "completed" || r.StudentID != plan.StudentID {
		portalFail(c, 409, "练习关联的评估尚未完成")
		return nil, false
	}
	return &plan, true
}
