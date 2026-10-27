package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func portalValidRole(r Role) bool {
	return r == RoleAdmin || r == RoleTeacher || r == RoleStudent || r == RoleParent || r == RoleTrainer
}
func portalID() string { return strconv.FormatInt(time.Now().UnixNano(), 36) }
func portalFail(c *gin.Context, status int, msg string) {
	c.AbortWithStatusJSON(status, gin.H{"code": 1, "err": msg})
}
func portalRoles(roles ...Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		for _, r := range roles {
			if c.GetString("role") == string(r) {
				c.Next()
				return
			}
		}
		portalFail(c, 403, "此账号没有操作权限")
	}
}
func registerPortalRoutes(api *gin.RouterGroup) {
	p := api.Group("/portal")
	p.GET("/catalog", PortalCatalog)

	p.GET("/courses", PortalCourseCatalog)
	p.GET("/media/:id", PortalMedia)
	a := p.Group("")
	a.Use(AuthMiddleware())
	registerPortalTools(a)
	registerPortalAssessments(p, a)
	a.GET("/assessment-presentation", portalRoles(RoleAdmin, RoleTeacher), PortalAssessmentPresentation)
	a.GET("/assessment-assets/:file", portalRoles(RoleAdmin, RoleTeacher), PortalAssessmentAsset)
	a.GET("/courses/:id", PortalCourse)
	a.PUT("/progress/:id", PortalSaveProgress)
	a.GET("/progress", PortalProgress)
	a.GET("/media-link/:id", PortalMediaLink)
	a.GET("/practice", portalRoles(RoleStudent, RoleTeacher, RoleAdmin, RoleParent), PortalPractice)
	a.POST("/practice/:id", portalRoles(RoleStudent, RoleTeacher, RoleAdmin, RoleParent), PortalAnswer)
	a.GET("/attempts", PortalAttempts)
	a.GET("/manage/courses", portalRoles(RoleAdmin, RoleTrainer), PortalManageCourses)
	a.POST("/manage/courses", portalRoles(RoleAdmin, RoleTrainer), PortalSaveCourse)
	a.PUT("/manage/courses/:id", portalRoles(RoleAdmin, RoleTrainer), PortalSaveCourse)
	a.DELETE("/manage/courses/:id", portalRoles(RoleAdmin, RoleTrainer), PortalDeleteCourse)
	a.GET("/recipients", portalRoles(RoleAdmin, RoleTrainer), PortalRecipients)
	a.POST("/uploads", portalRoles(RoleAdmin, RoleTrainer), PortalStartUpload)
	a.PUT("/uploads/:id", portalRoles(RoleAdmin, RoleTrainer), PortalUploadChunk)
	a.POST("/uploads/:id/complete", portalRoles(RoleAdmin, RoleTrainer), PortalCompleteUpload)
	a.GET("/manage/questions", portalRoles(RoleAdmin, RoleTeacher), GetQuestions)
	a.POST("/manage/questions", portalRoles(RoleAdmin, RoleTeacher), PortalSaveQuestion)
	a.PUT("/manage/questions/:id", portalRoles(RoleAdmin, RoleTeacher), PortalSaveQuestion)
	a.DELETE("/manage/questions/:id", portalRoles(RoleAdmin, RoleTeacher), DeleteQuestion)
	a.POST("/manage/topics", portalRoles(RoleAdmin, RoleTeacher), PortalSaveTopic)
	a.POST("/manage/objectives", portalRoles(RoleAdmin, RoleTeacher), PortalSaveObjective)
	a.GET("/manage/users", portalRoles(RoleAdmin), GetUsers)
	a.POST("/manage/users", portalRoles(RoleAdmin), CreateUser)
	a.PUT("/manage/users/:id", portalRoles(RoleAdmin), PortalUpdateUser)
}

type portalObjective struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Count int64  `json:"count"`
}
type portalTopic struct {
	ID         string            `json:"id"`
	Name       string            `json:"name"`
	Subject    string            `json:"subject"`
	Grade      int               `json:"grade"`
	Objectives []portalObjective `json:"objectives"`
}

func PortalCatalog(c *gin.Context) {
	var topics []SkillTopic
	if err := DB.Preload("Objectives", func(d *gorm.DB) *gorm.DB { return d.Order("sort_order ASC") }).Order("sort_order ASC").Find(&topics).Error; err != nil {
		portalFail(c, 500, "题库暂不可用")
		return
	}
	type count struct {
		ObjectiveID string
		Total       int64
	}
	var counts []count
	if err := DB.Model(&Question{}).Select("objective_id, count(*) AS total").Group("objective_id").Scan(&counts).Error; err != nil {
		portalFail(c, 500, "题目统计失败")
		return
	}
	m := map[string]int64{}
	for _, v := range counts {
		m[v.ObjectiveID] = v.Total
	}
	result := []portalTopic{}
	for _, t := range topics {
		v := portalTopic{ID: t.ID, Name: t.Name, Subject: t.Subject, Grade: t.Grade, Objectives: []portalObjective{}}
		for _, o := range t.Objectives {
			v.Objectives = append(v.Objectives, portalObjective{o.ID, o.Name, m[o.ID]})
		}
		result = append(result, v)
	}
	// Unclassified imported questions remain discoverable without inventing skill names.
	type bucket struct {
		Subject string
		Grade   int
		Total   int64
	}
	var buckets []bucket
	DB.Model(&Question{}).Select("subject,grade,count(*) AS total").Where("objective_id = '' OR objective_id IS NULL OR objective_id NOT IN (?)", DB.Model(&SkillObjective{}).Select("id")).Group("subject,grade").Order("grade ASC, subject ASC").Scan(&buckets)
	for _, b := range buckets {
		result = append(result, portalTopic{ID: fmt.Sprintf("general-%s-%d", b.Subject, b.Grade), Name: "综合练习", Subject: b.Subject, Grade: b.Grade, Objectives: []portalObjective{{ID: "", Name: "综合练习", Count: b.Total}}})
	}
	SendJSON(c, 0, "", result)
}
func PortalPractice(c *gin.Context) {
	plan, allowed := portalPracticePlan(c)
	if !allowed {
		return
	}
	var questions []Question
	q := DB.Where("1=1")
	if plan != nil {
		q = q.Where("objective_id = ?", plan.ObjectiveID)
	} else if id := c.Query("objectiveId"); id != "" {
		q = q.Where("objective_id = ?", id)
	} else {
		grade, err := strconv.Atoi(c.Query("grade"))
		if err != nil || grade < 1 || grade > 12 || c.Query("subject") == "" {
			portalFail(c, 400, "请选择学科和年级")
			return
		}
		q = q.Where("subject IN ? AND grade = ?", []string{c.Query("subject"), portalSubject(c.Query("subject"))}, grade)
		if c.Query("general") == "true" {
			q = q.Where("objective_id = '' OR objective_id IS NULL OR objective_id NOT IN (?)", DB.Model(&SkillObjective{}).Select("id"))
		}
	}
	if err := q.Order("id ASC").Limit(20).Find(&questions).Error; err != nil {
		portalFail(c, 500, "练习加载失败")
		return
	}
	for i := range questions {
		questions[i].Answer = ""
		questions[i].Hint = ""
	}
	SendJSON(c, 0, "", questions)
}
func portalSubject(s string) string {
	return map[string]string{"MATH": "数学", "LANGUAGE": "语言词汇", "READING": "阅读", "LITERACY": "识字"}[s]
}
func PortalAnswer(c *gin.Context) {
	plan, allowed := portalPracticePlan(c)
	if !allowed {
		return
	}
	var b struct {
		Answer    string `json:"answer"`
		RequestID string `json:"requestId"`
	}
	if c.ShouldBindJSON(&b) != nil || len(b.Answer) > 2000 || strings.TrimSpace(b.Answer) == "" || len(b.RequestID) > 128 {
		portalFail(c, 400, "请检查作答内容后重试")
		return
	}
	var q Question
	if DB.First(&q, "id = ?", c.Param("id")).Error != nil {
		portalFail(c, 404, "题目不存在")
		return
	}
	if plan != nil && q.ObjectiveID != plan.ObjectiveID {
		portalFail(c, 403, "题目不属于此练习目标")
		return
	}
	ok := normalizePortalAnswer(b.Answer, q.Type) == normalizePortalAnswer(q.Answer, q.Type)
	var reward *portalPracticeReward
	if c.GetString("role") == string(RoleStudent) || c.GetString("role") == string(RoleParent) && plan != nil {
		studentID := c.GetString("userId")
		if plan != nil {
			studentID = plan.StudentID
		}
		id := portalID()
		if b.RequestID != "" {
			id = portalRequestAttemptID(c.GetString("userId"), b.RequestID)
		}
		v := PortalAttempt{ID: id, UserID: studentID, ActorID: c.GetString("userId"), QuestionID: q.ID, QuestionTitle: q.StemText, Subject: q.Subject, Grade: q.Grade, ObjectiveID: q.ObjectiveID, Answer: b.Answer, Correct: ok}
		existing := PortalAttempt{}
		if DB.First(&existing, "id = ?", id).Error == nil {
			if existing.UserID != studentID || existing.QuestionID != q.ID || existing.Answer != b.Answer {
				portalFail(c, 409, "本次提交已记录，请刷新后开始新的作答")
				return
			}
			v = existing
			ok = v.Correct
		} else {
			if DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&v).Error != nil {
				portalFail(c, 500, "学习记录保存失败，请重试")
				return
			}
			if DB.First(&existing, "id = ?", id).Error != nil {
				portalFail(c, 500, "学习记录确认失败，请重试")
				return
			}
			if existing.UserID != studentID || existing.QuestionID != q.ID || existing.Answer != b.Answer {
				portalFail(c, 409, "本次提交已记录，请刷新后开始新的作答")
				return
			}
			v = existing
			ok = v.Correct
		}
		reward = portalRewardForAttempt(DB, v)
	}
	SendJSON(c, 0, "", gin.H{"correct": ok, "answer": q.Answer, "hint": q.Hint, "preview": c.GetString("role") != string(RoleStudent) && c.GetString("role") != string(RoleParent), "reward": reward})
}

func PortalAttempts(c *gin.Context) {
	v := []PortalAttempt{}
	if DB.Where("user_id = ?", c.GetString("userId")).Order("created_at DESC").Limit(500).Find(&v).Error != nil {
		portalFail(c, 500, "记录加载失败")
		return
	}
	SendJSON(c, 0, "", v)
}
func PortalSaveQuestion(c *gin.Context) {
	var q Question
	if c.ShouldBindJSON(&q) != nil || strings.TrimSpace(q.StemText) == "" || strings.TrimSpace(q.Answer) == "" || q.Grade < 1 || q.Grade > 12 {
		portalFail(c, 400, "请填写完整题目、答案和年级")
		return
	}
	if !containsStudent([]string{"MATH", "LANGUAGE", "READING", "LITERACY"}, q.Subject) || !containsStudent([]string{"MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE", "FILL_BLANK", "CALCULATION"}, q.Type) {
		portalFail(c, 400, "学科或题型不正确")
		return
	}
	if q.Type == "MULTIPLE_CHOICE" || q.Type == "MULTIPLE_SELECT" || q.Type == "TRUE_FALSE" {
		values := map[string]bool{}
		for _, o := range q.Options {
			if o.Value == "" || values[o.Value] || (strings.TrimSpace(o.Text) == "" && o.Image == "") {
				portalFail(c, 400, "选项内容或编号不正确")
				return
			}
			values[o.Value] = true
		}
		if len(values) < 2 {
			portalFail(c, 400, "至少填写两个选项")
			return
		}
		answers := strings.Split(strings.ReplaceAll(q.Answer, "，", ","), ",")
		if q.Type != "MULTIPLE_SELECT" && len(answers) != 1 {
			portalFail(c, 400, "单选题和判断题只能设置一个正确答案")
			return
		}
		seen := map[string]bool{}
		for i, a := range answers {
			a = strings.TrimSpace(a)
			if !values[a] || seen[a] {
				portalFail(c, 400, "答案必须对应不重复的选项编号")
				return
			}
			seen[a] = true
			answers[i] = a
		}
		q.Answer = strings.Join(answers, ",")
	}
	if q.ObjectiveID != "" {
		var objective SkillObjective
		var topic SkillTopic
		if DB.First(&objective, "id = ?", q.ObjectiveID).Error != nil || DB.First(&topic, "id = ?", objective.TopicID).Error != nil || topic.Grade != q.Grade || (topic.Subject != q.Subject && topic.Subject != portalSubject(q.Subject)) {
			portalFail(c, 400, "知识点与学科、年级不一致")
			return
		}
	}
	q.ID = c.Param("id")
	if q.ID == "" {
		q.ID = portalID()
		if DB.Create(&q).Error != nil {
			portalFail(c, 500, "保存失败")
			return
		}
	} else {
		var old Question
		if DB.First(&old, "id = ?", q.ID).Error != nil {
			portalFail(c, 404, "题目不存在")
			return
		}
		q.Attempts = old.Attempts
		q.CorrectRate = old.CorrectRate
		if DB.Save(&q).Error != nil {
			portalFail(c, 500, "保存失败")
			return
		}
	}
	SendJSON(c, 0, "", q)
}
func PortalSaveTopic(c *gin.Context) {
	var body struct {
		SkillTopic
		Objective string `json:"objective"`
	}
	if c.ShouldBindJSON(&body) != nil || strings.TrimSpace(body.Name) == "" || body.Grade < 1 || body.Grade > 12 || portalSubject(body.Subject) == "" {
		portalFail(c, 400, "请填写名称、学科和年级")
		return
	}
	t := body.SkillTopic
	t.ID = portalID()
	t.Objectives = nil
	err := DB.Transaction(func(tx *gorm.DB) error {
		var max int
		tx.Model(&SkillTopic{}).Select("COALESCE(MAX(sort_order),0)").Scan(&max)
		t.SortOrder = max + 1
		if err := tx.Create(&t).Error; err != nil {
			return err
		}
		if strings.TrimSpace(body.Objective) != "" {
			o := SkillObjective{ID: portalID(), TopicID: t.ID, Name: strings.TrimSpace(body.Objective), SortOrder: 1}
			return tx.Create(&o).Error
		}
		return nil
	})
	if err != nil {
		portalFail(c, 500, "保存失败")
		return
	}
	SendJSON(c, 0, "", t)
}
func PortalSaveObjective(c *gin.Context) {
	var o SkillObjective
	var t SkillTopic
	if c.ShouldBindJSON(&o) != nil || strings.TrimSpace(o.Name) == "" || DB.First(&t, "id = ?", o.TopicID).Error != nil {
		portalFail(c, 400, "请填写知识点名称并选择主题")
		return
	}
	o.ID = portalID()
	if DB.Create(&o).Error != nil {
		portalFail(c, 500, "保存失败")
		return
	}
	SendJSON(c, 0, "", o)
}
func PortalUpdateUser(c *gin.Context) {
	var u User
	if c.ShouldBindJSON(&u) != nil || !portalValidRole(u.Role) || strings.TrimSpace(u.Username) == "" || !containsStudent([]string{"active", "disabled"}, u.Status) || (u.Password != "" && len(u.Password) < 8) {
		portalFail(c, 400, "请检查账号、角色、状态和密码（至少8位）")
		return
	}
	c.Request.Body = io.NopCloser(strings.NewReader(mustPortalJSON(u)))
	UpdateUser(c)
}

func portalCanManage(c *gin.Context, v TrainingCourse) bool {
	return c.GetString("role") == string(RoleAdmin) || (c.GetString("role") == string(RoleTrainer) && v.OwnerID == c.GetString("userId"))
}
func portalCanLearn(uid string, role string, v TrainingCourse) bool {
	return v.Published && (v.Visibility == "all" || containsStudent(v.UserIDs, uid))
}
func portalCourseAllowed(c *gin.Context, v TrainingCourse) bool {
	return portalCanManage(c, v) || portalCanLearn(c.GetString("userId"), c.GetString("role"), v)
}
func PortalCourseCatalog(c *gin.Context) {
	v := []TrainingCourse{}
	if DB.Where("published = ? AND visibility = ?", true, "all").Order("updated_at DESC").Find(&v).Error != nil {
		portalFail(c, 500, "课程加载失败")
		return
	}
	for i := range v {
		v[i].UserIDs = nil
	}
	SendJSON(c, 0, "", v)
}
func PortalManageCourses(c *gin.Context) {
	v := []TrainingCourse{}
	q := DB.Preload("Lessons", func(d *gorm.DB) *gorm.DB { return d.Order("sort_order ASC") })
	if c.GetString("role") != string(RoleAdmin) {
		q = q.Where("owner_id = ?", c.GetString("userId"))
	}
	if q.Order("updated_at DESC").Find(&v).Error != nil {
		portalFail(c, 500, "课程加载失败")
		return
	}
	SendJSON(c, 0, "", v)
}
func PortalCourse(c *gin.Context) {
	var v TrainingCourse
	if DB.Preload("Lessons", func(d *gorm.DB) *gorm.DB { return d.Order("sort_order ASC") }).First(&v, "id = ?", c.Param("id")).Error != nil {
		portalFail(c, 404, "课程不存在")
		return
	}
	if !portalCourseAllowed(c, v) {
		portalFail(c, 403, "课程尚未发布或未向你开放")
		return
	}
	if !portalCanManage(c, v) {
		v.UserIDs = nil
	}
	SendJSON(c, 0, "", v)
}
func PortalProgress(c *gin.Context) {
	type lessonSummary struct {
		ID       string  `json:"id"`
		Title    string  `json:"title"`
		Kind     string  `json:"kind"`
		Duration float64 `json:"duration"`
	}
	type progressCourse struct {
		TrainingCourse
		Lessons []lessonSummary `json:"lessons"`
	}
	progress := []TrainingProgress{}
	courses := []progressCourse{}
	var all []TrainingCourse
	if DB.Preload("Lessons", func(d *gorm.DB) *gorm.DB {
		return d.Select("id", "course_id", "title", "kind", "duration", "sort_order").Order("sort_order ASC")
	}).Where("published = ?", true).Order("updated_at DESC").Find(&all).Error != nil {
		portalFail(c, 500, "课程加载失败")
		return
	}
	for _, v := range all {
		if portalCanLearn(c.GetString("userId"), c.GetString("role"), v) {
			v.UserIDs = nil
			lessons := make([]lessonSummary, 0, len(v.Lessons))
			for _, l := range v.Lessons {
				lessons = append(lessons, lessonSummary{ID: l.ID, Title: l.Title, Kind: l.Kind, Duration: l.Duration})
			}
			v.Lessons = nil
			courses = append(courses, progressCourse{TrainingCourse: v, Lessons: lessons})
		}
	}
	if DB.Where("user_id = ?", c.GetString("userId")).Find(&progress).Error != nil {
		portalFail(c, 500, "进度加载失败")
		return
	}
	SendJSON(c, 0, "", gin.H{"courses": courses, "progress": progress})
}
func PortalSaveCourse(c *gin.Context) {
	var v TrainingCourse
	if c.ShouldBindJSON(&v) != nil {
		portalFail(c, 400, "课程格式不正确")
		return
	}
	if strings.TrimSpace(v.Title) == "" || len(v.Title) > 200 || !containsStudent([]string{"parent", "teacher"}, v.Audience) || !containsStudent([]string{"all", "assigned"}, v.Visibility) || len(v.Lessons) > 200 || (v.Published && len(v.Lessons) == 0) || (v.Visibility == "assigned" && len(v.UserIDs) == 0) {
		portalFail(c, 400, "请检查课程标题、分类、发布范围和章节")
		return
	}
	v.ID = c.Param("id")
	old := TrainingCourse{}
	if v.ID != "" {
		if DB.Preload("Lessons").First(&old, "id = ?", v.ID).Error != nil {
			portalFail(c, 404, "课程不存在")
			return
		}
		if !portalCanManage(c, old) {
			portalFail(c, 403, "只能管理自己创建的课程")
			return
		}
		v.OwnerID = old.OwnerID
	} else {
		v.ID = portalID()
		v.OwnerID = c.GetString("userId")
	}
	if len(v.UserIDs) > 0 {
		var n int64
		unique := map[string]bool{}
		for _, id := range v.UserIDs {
			unique[id] = true
		}
		DB.Model(&User{}).Where("id IN ? AND status = ?", v.UserIDs, "active").Count(&n)
		if int64(len(unique)) != n {
			portalFail(c, 400, "指定学员包含停用或不存在的账号")
			return
		}
	}
	oldIDs := map[string]bool{}
	for _, l := range old.Lessons {
		oldIDs[l.ID] = true
	}
	seen := map[string]bool{}
	for i := range v.Lessons {
		l := &v.Lessons[i]
		if l.ID != "" && (!oldIDs[l.ID] || seen[l.ID]) {
			portalFail(c, 400, "章节标识不正确")
			return
		}
		if l.ID == "" {
			l.ID = portalID()
		}
		seen[l.ID] = true
		l.CourseID = v.ID
		l.SortOrder = i
		if strings.TrimSpace(l.Title) == "" || !containsStudent([]string{"text", "video", "document"}, l.Kind) || len(l.Text) > 1000000 {
			portalFail(c, 400, "请补齐章节名称和类型")
			return
		}
		if l.Kind == "text" && strings.TrimSpace(l.Text) == "" {
			portalFail(c, 400, "文字章节不能为空")
			return
		}
		if l.Kind != "text" {
			var u TrainingUpload
			if DB.First(&u, "id = ? AND complete = ?", l.UploadID, true).Error != nil {
				portalFail(c, 400, "请先完成课程文件上传")
				return
			}
			oldAttachment := false
			for _, prior := range old.Lessons {
				if prior.UploadID == u.ID {
					oldAttachment = true
				}
			}
			if u.OwnerID != c.GetString("userId") && c.GetString("role") != string(RoleAdmin) && !oldAttachment {
				portalFail(c, 403, "不能使用其他人的文件")
				return
			}
			video := containsStudent([]string{".mp4", ".webm", ".mov"}, strings.ToLower(filepath.Ext(u.Name)))
			if (l.Kind == "video") != video {
				portalFail(c, 400, "文件与章节类型不匹配")
				return
			}
		}
	}
	lessons := v.Lessons
	v.Lessons = nil
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Omit("Lessons").Save(&v).Error; err != nil {
			return err
		}
		ids := []string{}
		for _, l := range lessons {
			ids = append(ids, l.ID)
		}
		q := tx.Where("course_id = ?", v.ID)
		if len(ids) > 0 {
			q = q.Where("id NOT IN ?", ids)
		}
		if err := q.Delete(&TrainingLesson{}).Error; err != nil {
			return err
		}
		for _, l := range lessons {
			if err := tx.Save(&l).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		portalFail(c, 500, "课程保存失败")
		return
	}
	v.Lessons = lessons
	SendJSON(c, 0, "", v)
}
func PortalDeleteCourse(c *gin.Context) {
	var v TrainingCourse
	if DB.First(&v, "id = ?", c.Param("id")).Error != nil {
		portalFail(c, 404, "课程不存在")
		return
	}
	if !portalCanManage(c, v) {
		portalFail(c, 403, "只能删除自己的课程")
		return
	}
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("course_id = ?", v.ID).Delete(&TrainingLesson{}).Error; err != nil {
			return err
		}
		return tx.Delete(&v).Error
	})
	if err != nil {
		portalFail(c, 500, "删除失败")
		return
	}
	SendJSON(c, 0, "", true)
}
func PortalRecipients(c *gin.Context) {
	v := []User{}
	if DB.Select("id", "name", "username", "role").Where("status = ?", "active").Find(&v).Error != nil {
		portalFail(c, 500, "学员加载失败")
		return
	}
	SendJSON(c, 0, "", v)
}
func portalLessonAccess(c *gin.Context, id string) (TrainingLesson, bool) {
	var l TrainingLesson
	var v TrainingCourse
	if DB.First(&l, "id = ?", id).Error != nil || DB.First(&v, "id = ?", l.CourseID).Error != nil {
		portalFail(c, 404, "章节不存在")
		return l, false
	}
	if !portalCourseAllowed(c, v) {
		portalFail(c, 403, "无权学习此课程")
		return l, false
	}
	return l, true
}
func PortalSaveProgress(c *gin.Context) {
	l, ok := portalLessonAccess(c, c.Param("id"))
	if !ok {
		return
	}
	var b struct {
		Position  float64 `json:"position"`
		Completed bool    `json:"completed"`
	}
	if c.ShouldBindJSON(&b) != nil || b.Position < 0 || math.IsNaN(b.Position) || math.IsInf(b.Position, 0) || b.Position > 172800 {
		portalFail(c, 400, "进度格式不正确")
		return
	}
	if l.Duration > 0 && b.Position > l.Duration+5 {
		portalFail(c, 400, "进度超出章节时长")
		return
	}
	v := TrainingProgress{UserID: c.GetString("userId"), LessonID: l.ID, Position: b.Position, Completed: b.Completed}
	err := DB.Transaction(func(tx *gorm.DB) error {
		var old TrainingProgress
		err := tx.First(&old, "user_id = ? AND lesson_id = ?", v.UserID, v.LessonID).Error
		if err != nil && err != gorm.ErrRecordNotFound {
			return err
		}
		v.Completed = v.Completed || old.Completed
		return tx.Clauses(clause.OnConflict{UpdateAll: true}).Create(&v).Error
	})
	if err != nil {
		portalFail(c, 500, "学习进度保存失败")
		return
	}
	SendJSON(c, 0, "", v)
}

const portalChunkSize int64 = 4 * 1024 * 1024

var portalUploadMu sync.Mutex

func portalUploadRoot() string {
	if s := os.Getenv("TRAINING_UPLOAD_DIR"); s != "" {
		return s
	}
	return ".local/training-uploads"
}
func portalUploadPath(u TrainingUpload) string {
	return filepath.Join(portalUploadRoot(), u.ID+strings.ToLower(filepath.Ext(u.Name)))
}
func PortalStartUpload(c *gin.Context) {
	var b struct {
		Name        string `json:"name"`
		Size        int64  `json:"size"`
		Fingerprint string `json:"fingerprint"`
	}
	if c.ShouldBindJSON(&b) != nil || b.Size <= 0 || b.Size > 2*1024*1024*1024 || len(b.Fingerprint) != 64 || len(b.Name) > 240 {
		portalFail(c, 400, "文件大小须在 0–2GB 之间")
		return
	}
	if _, err := hex.DecodeString(b.Fingerprint); err != nil {
		portalFail(c, 400, "文件标识不正确")
		return
	}
	if !containsStudent([]string{".mp4", ".webm", ".mov", ".pdf", ".docx", ".pptx", ".txt"}, strings.ToLower(filepath.Ext(b.Name))) {
		portalFail(c, 400, "支持 MP4、WebM、MOV、PDF、DOCX、PPTX、TXT")
		return
	}
	u := TrainingUpload{ID: portalID(), OwnerID: c.GetString("userId"), Fingerprint: b.Fingerprint, Name: filepath.Base(b.Name), Size: b.Size}
	attrs := u
	u = TrainingUpload{}
	if err := DB.Where("owner_id = ? AND fingerprint = ?", attrs.OwnerID, attrs.Fingerprint).Attrs(attrs).FirstOrCreate(&u).Error; err != nil {
		portalFail(c, 500, "无法建立上传任务")
		return
	}
	if u.Size != b.Size || u.Name != filepath.Base(b.Name) {
		portalFail(c, 409, "文件信息与原上传任务不一致")
		return
	}
	SendJSON(c, 0, "", gin.H{"upload": u, "chunkSize": portalChunkSize})
}
func portalOwnUpload(c *gin.Context) (TrainingUpload, bool) {
	var u TrainingUpload
	if DB.First(&u, "id = ? AND owner_id = ?", c.Param("id"), c.GetString("userId")).Error != nil {
		portalFail(c, 404, "上传任务不存在，请重新选择文件")
		return u, false
	}
	return u, true
}
func PortalUploadChunk(c *gin.Context) {
	portalUploadMu.Lock()
	defer portalUploadMu.Unlock()
	u, ok := portalOwnUpload(c)
	if !ok {
		return
	}
	offset, err := strconv.ParseInt(c.Query("offset"), 10, 64)
	if err != nil || offset < 0 || offset > u.Received {
		portalFail(c, 409, "上传位置已变化，请恢复任务")
		return
	}
	if offset < u.Received || u.Complete {
		SendJSON(c, 0, "", u)
		return
	}
	data, err := io.ReadAll(io.LimitReader(c.Request.Body, portalChunkSize+1))
	if err != nil || len(data) == 0 || int64(len(data)) > portalChunkSize || offset+int64(len(data)) > u.Size {
		portalFail(c, 400, "分片大小不正确")
		return
	}
	sum := sha256.Sum256(data)
	if hex.EncodeToString(sum[:]) != c.GetHeader("X-Chunk-SHA256") {
		portalFail(c, 400, "分片校验失败，请重新上传")
		return
	}
	if os.MkdirAll(portalUploadRoot(), 0700) != nil {
		portalFail(c, 500, "上传目录不可用")
		return
	}
	f, err := os.OpenFile(portalUploadPath(u)+".part", os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		portalFail(c, 500, "无法写入文件")
		return
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil || info.Size() < u.Received {
		portalFail(c, 500, "文件不完整，请联系管理员")
		return
	}
	if err = f.Truncate(u.Received); err == nil {
		_, err = f.WriteAt(data, u.Received)
	}
	if err == nil {
		err = f.Sync()
	}
	if err != nil {
		portalFail(c, 500, "分片保存失败，请重试")
		return
	}
	u.Received += int64(len(data))
	if DB.Save(&u).Error != nil {
		portalFail(c, 500, "上传位置保存失败，请重试")
		return
	}
	SendJSON(c, 0, "", u)
}
func PortalCompleteUpload(c *gin.Context) {
	portalUploadMu.Lock()
	defer portalUploadMu.Unlock()
	u, ok := portalOwnUpload(c)
	if !ok {
		return
	}
	if u.Received != u.Size {
		portalFail(c, 409, "文件尚未传输完成")
		return
	}
	path := portalUploadPath(u)
	if !u.Complete {
		if err := os.Rename(path+".part", path); err != nil {
			if info, e := os.Stat(path); e != nil || info.Size() != u.Size {
				portalFail(c, 500, "文件合并失败，请重试")
				return
			}
		}
		u.Complete = true
		if DB.Save(&u).Error != nil {
			portalFail(c, 500, "文件状态保存失败")
			return
		}
	}
	SendJSON(c, 0, "", u)
}
func portalMediaAccess(uid, role, id string) bool {
	var u TrainingUpload
	if DB.First(&u, "id = ? AND complete = ?", id, true).Error != nil {
		return false
	}
	if role == string(RoleAdmin) || role == string(RoleTrainer) && u.OwnerID == uid {
		return true
	}
	var lessons []TrainingLesson
	DB.Where("upload_id = ?", id).Find(&lessons)
	for _, l := range lessons {
		var v TrainingCourse
		if DB.First(&v, "id = ?", l.CourseID).Error == nil && portalCanLearn(uid, role, v) {
			return true
		}
	}
	return false
}
func portalSignature(s string) string {
	h := hmac.New(sha256.New, jwtSecret)
	h.Write([]byte(s))
	return hex.EncodeToString(h.Sum(nil))
}
func PortalMediaLink(c *gin.Context) {
	id := c.Param("id")
	uid := c.GetString("userId")
	if !portalMediaAccess(uid, c.GetString("role"), id) {
		portalFail(c, 403, "无权访问此文件")
		return
	}
	expires := strconv.FormatInt(time.Now().Add(6*time.Hour).Unix(), 10)
	sig := portalSignature(id + "|" + uid + "|" + expires)
	SendJSON(c, 0, "", gin.H{"url": "/api/portal/media/" + id + "?user=" + uid + "&expires=" + expires + "&signature=" + sig})
}
func PortalMedia(c *gin.Context) {
	id, uid, expires := c.Param("id"), c.Query("user"), c.Query("expires")
	exp, err := strconv.ParseInt(expires, 10, 64)
	if err != nil || exp < time.Now().Unix() || !hmac.Equal([]byte(c.Query("signature")), []byte(portalSignature(id+"|"+uid+"|"+expires))) {
		portalFail(c, 403, "文件链接已过期，请刷新页面")
		return
	}
	var user User
	if DB.First(&user, "id = ? AND status = ?", uid, "active").Error != nil || !portalMediaAccess(uid, string(user.Role), id) {
		portalFail(c, 403, "文件不可访问")
		return
	}
	var u TrainingUpload
	if DB.First(&u, "id = ?", id).Error != nil {
		portalFail(c, 404, "文件不存在")
		return
	}
	f, err := os.Open(portalUploadPath(u))
	if err != nil {
		portalFail(c, 404, "文件不存在")
		return
	}
	defer f.Close()
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Cache-Control", "private, no-store")
	ext := strings.ToLower(filepath.Ext(u.Name))
	types := map[string]string{".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8"}
	if t := types[ext]; t != "" {
		c.Header("Content-Type", t)
	} else {
		c.Header("Content-Disposition", "attachment; filename=\"course"+ext+"\"")
	}
	http.ServeContent(c.Writer, c.Request, u.Name, u.UpdatedAt, f)
}

func mustPortalJSON(v interface{}) string { b, _ := json.Marshal(v); return string(b) }
