package main

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"net/url"
	"strings"
)

func registerPortalTools(a *gin.RouterGroup) {
	staff := a.Group("")
	staff.Use(portalRoles(RoleAdmin, RoleTeacher))
	staff.GET("/students", PortalStudents)
	staff.GET("/manage/reinforcements", GetReinforcements)
	staff.POST("/manage/reinforcements", PortalSaveReinforcement)
	staff.PUT("/manage/reinforcements/:id", PortalSaveReinforcement)
	staff.DELETE("/manage/reinforcements/:id", PortalRemoveReinforcement)
}
func PortalStudents(c *gin.Context) {
	students := []User{}
	if DB.Select("id, username, name, role, status").Where("role = ? AND status = ?", RoleStudent, "active").Order("name, username").Find(&students).Error != nil {
		portalFail(c, 500, "学生列表暂不可用")
		return
	}
	SendJSON(c, 0, "", students)
}
func PortalSaveReinforcement(c *gin.Context) {
	var item Reinforcement
	if c.ShouldBindJSON(&item) != nil {
		portalFail(c, 400, "强化物参数无效")
		return
	}
	item.Name = strings.TrimSpace(item.Name)
	if item.Name == "" || len([]rune(item.Name)) > 100 || len(item.Prompt) > 12000 || len(item.Image) > 1000000 {
		portalFail(c, 400, "请填写名称，内容过长请缩短后保存")
		return
	}
	if item.Type != "sticker" && item.Type != "text" && item.Type != "game" && item.Type != "animation" {
		portalFail(c, 400, "请选择有效类型")
		return
	}
	if item.RuleType != "fixed" && item.RuleType != "correct_count" && item.RuleType != "average" {
		portalFail(c, 400, "请选择有效触发规则")
		return
	}
	if item.RuleValue < 1 || item.RuleValue > 1000 || item.Duration < 1 || item.Duration > 300 {
		portalFail(c, 400, "触发间隔为1至1000，展示时长为1至300秒")
		return
	}
	if strings.Contains(item.Image, "://") {
		u, err := url.Parse(item.Image)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
			portalFail(c, 400, "图片链接无效")
			return
		}
	}
	if !item.IsGlobal {
		if len(item.TargetStudentIDs) == 0 {
			portalFail(c, 400, "请选择适用学生")
			return
		}
		unique := map[string]bool{}
		for _, id := range item.TargetStudentIDs {
			unique[id] = true
		}
		var count int64
		if DB.Model(&User{}).Where("id IN ? AND role = ? AND status = ?", item.TargetStudentIDs, RoleStudent, "active").Count(&count).Error != nil || count != int64(len(unique)) {
			portalFail(c, 400, "适用学生不可用，请重新选择")
			return
		}
	} else {
		item.TargetStudentIDs = []string{}
	}
	id := c.Param("id")
	if id != "" {
		var old Reinforcement
		if DB.First(&old, "id = ?", id).Error != nil {
			portalFail(c, 404, "强化物不存在")
			return
		}
		item.ID = id
		// Select all fields so false and zero values are persisted rather than omitted.
		if DB.Model(&old).Select("name", "type", "image", "prompt", "duration", "is_global", "target_student_ids", "rule_type", "rule_value", "is_active").Updates(&item).Error != nil {
			portalFail(c, 500, "保存失败")
			return
		}
	} else {
		item.ID = portalID()
		active := item.IsActive
		if err := DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
			if !active {
				item.IsActive = false
				return tx.Model(&item).Update("is_active", false).Error
			}
			return nil
		}); err != nil {
			portalFail(c, 500, "创建失败")
			return
		}
	}
	SendJSON(c, 0, "", item)
}
func PortalRemoveReinforcement(c *gin.Context) {
	result := DB.Delete(&Reinforcement{}, "id = ?", c.Param("id"))
	if result.Error != nil {
		portalFail(c, 500, "删除失败")
		return
	}
	if result.RowsAffected == 0 {
		portalFail(c, 404, "强化物不存在")
		return
	}
	SendJSON(c, 0, "", gin.H{"deleted": true})
}
