package main

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GameTarget struct {
	ItemID   string `json:"itemId"`
	Quantity int    `json:"quantity"`
}
type GameMoney struct {
	Cents int `json:"cents"`
	Count int `json:"count"`
}
type GameChoice struct {
	ID      string `json:"id"`
	Label   string `json:"label"`
	Art     string `json:"art"`
	Correct bool   `json:"correct"`
}
type GameStep struct {
	ID      string       `json:"id"`
	Title   string       `json:"title"`
	Prompt  string       `json:"prompt"`
	Hint    string       `json:"hint"`
	Kind    string       `json:"kind"`
	Choices []GameChoice `json:"choices"`
}
type GameLevel struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Goal        string       `json:"goal"`
	BudgetCents int          `json:"budgetCents"`
	Targets     []GameTarget `json:"targets"`
	Wallet      []GameMoney  `json:"wallet"`
	Steps       []GameStep   `json:"steps"`
}
type ScenarioGameDefinition struct {
	Version     string      `json:"version"`
	Environment string      `json:"environment"`
	Background  string      `json:"background"`
	Goals       []string    `json:"goals"`
	Transfer    []string    `json:"transfer"`
	Levels      []GameLevel `json:"levels"`
}
type GameAction struct {
	Kind      string `json:"kind"`
	ItemID    string `json:"itemId"`
	Value     int    `json:"value"`
	ChoiceID  string `json:"choiceId"`
	RequestID string `json:"requestId"`
}
type GameState struct {
	Step       int            `json:"step"`
	Cart       map[string]int `json:"cart"`
	Money      map[string]int `json:"money"`
	TotalCents int            `json:"totalCents"`
	PaidCents  int            `json:"paidCents"`
	Finished   bool           `json:"finished"`
}
type GameEvent struct {
	StepID   string     `json:"stepId"`
	Kind     string     `json:"kind"`
	Action   GameAction `json:"action"`
	Correct  bool       `json:"correct"`
	Advanced bool       `json:"advanced"`
	Feedback string     `json:"feedback"`
	At       string     `json:"at"`
}
type ScenarioSession struct {
	ID           string                 `json:"id" gorm:"primaryKey;type:varchar(191)"`
	ScenarioID   string                 `json:"scenarioId" gorm:"type:varchar(191);index"`
	ScenarioName string                 `json:"scenarioName" gorm:"type:varchar(191)"`
	StudentID    string                 `json:"studentId" gorm:"type:varchar(191);index"`
	ActorID      string                 `json:"actorId" gorm:"type:varchar(191)"`
	Mode         string                 `json:"mode" gorm:"type:varchar(20)"`
	LevelID      string                 `json:"levelId" gorm:"type:varchar(40)"`
	Status       string                 `json:"status" gorm:"type:varchar(20)"`
	StartedAt    string                 `json:"startedAt" gorm:"type:varchar(40);index"`
	CompletedAt  string                 `json:"completedAt" gorm:"type:varchar(40)"`
	Definition   ScenarioGameDefinition `json:"definition" gorm:"serializer:json;type:longtext"`
	Items        []ScenarioItem         `json:"items" gorm:"serializer:json;type:longtext"`
	State        GameState              `json:"state" gorm:"serializer:json;type:longtext"`
	Events       []GameEvent            `json:"events" gorm:"serializer:json;type:longtext"`
}
type GameResult struct {
	Session  ScenarioSession `json:"session"`
	Feedback string          `json:"feedback"`
	Correct  bool            `json:"correct"`
}
type GameSessionSummary struct {
	ID               string `json:"id"`
	ScenarioID       string `json:"scenarioId"`
	ScenarioName     string `json:"scenarioName"`
	StudentID        string `json:"studentId"`
	StudentName      string `json:"studentName"`
	Mode             string `json:"mode"`
	LevelID          string `json:"levelId"`
	LevelName        string `json:"levelName"`
	Status           string `json:"status"`
	StartedAt        string `json:"startedAt"`
	CompletedAt      string `json:"completedAt"`
	StepsCompleted   int    `json:"stepsCompleted"`
	TotalSteps       int    `json:"totalSteps"`
	Errors           int    `json:"errors"`
	Hints            int    `json:"hints"`
	IndependentSteps int    `json:"independentSteps"`
}

func gameLevel(s ScenarioSession) (GameLevel, error) {
	for _, level := range s.Definition.Levels {
		if level.ID == s.LevelID {
			return level, nil
		}
	}
	return GameLevel{}, errors.New("练习难度不存在")
}
func newGameSession(db *gorm.DB, scenarioID, levelID, studentID, actorID, mode string) (ScenarioSession, error) {
	var scenario Scenario
	if db.First(&scenario, "id = ?", scenarioID).Error != nil || scenario.Game == nil {
		return ScenarioSession{}, errors.New("该场景尚未配置生活任务")
	}
	items := []ScenarioItem{}
	if err := db.Where("scenario_id = ?", scenarioID).Find(&items).Error; err != nil {
		return ScenarioSession{}, err
	}
	s := ScenarioSession{ID: "life-" + strconv.FormatInt(time.Now().UnixNano(), 36), ScenarioID: scenario.ID, ScenarioName: scenario.Name, StudentID: studentID, ActorID: actorID, Mode: mode, LevelID: levelID, Status: "ongoing", StartedAt: time.Now().Format(time.RFC3339Nano), Definition: *scenario.Game, Items: items, State: GameState{Cart: map[string]int{}, Money: map[string]int{}}, Events: []GameEvent{}}
	level, err := gameLevel(s)
	if err != nil {
		return s, err
	}
	if len(level.Steps) == 0 {
		return s, errors.New("场景任务还未准备好")
	}
	known := map[string]bool{}
	for _, item := range items {
		known[item.ID] = true
		if item.Price < 0 {
			return s, errors.New("物品价格配置无效")
		}
	}
	for _, target := range level.Targets {
		if !known[target.ItemID] || target.Quantity < 1 {
			return s, errors.New("任务清单中的物品配置无效")
		}
	}
	return s, nil
}
func gameTotal(s ScenarioSession) int {
	n := 0
	for _, item := range s.Items {
		n += int(item.Price*100+0.5) * s.State.Cart[item.ID]
	}
	return n
}
func gameCartMatches(s ScenarioSession, level GameLevel) bool {
	want := map[string]int{}
	for _, target := range level.Targets {
		want[target.ItemID] = target.Quantity
	}
	for id, qty := range s.State.Cart {
		if qty != want[id] {
			return false
		}
	}
	for id, qty := range want {
		if s.State.Cart[id] != qty {
			return false
		}
	}
	return true
}
func applyGameAction(s *ScenarioSession, action GameAction) (GameEvent, error) {
	level, err := gameLevel(*s)
	if err != nil {
		return GameEvent{}, err
	}
	if s.Status != "ongoing" || s.State.Finished || s.State.Step >= len(level.Steps) {
		return GameEvent{}, errors.New("本次练习已完成，记录为只读")
	}
	if len(s.Events) >= 500 {
		return GameEvent{}, errors.New("本次操作较多，请休息后重新开始练习")
	}
	step := level.Steps[s.State.Step]
	event := GameEvent{StepID: step.ID, Kind: action.Kind, Action: action, At: time.Now().Format(time.RFC3339Nano)}
	advance := false
	switch action.Kind {
	case "hint":
		event.Correct = true
		event.Feedback = step.Hint
		if step.Kind == "total" {
			lines := []string{}
			for _, item := range s.Items {
				qty := s.State.Cart[item.ID]
				if qty > 0 {
					lines = append(lines, fmt.Sprintf("%s：%s 元 × %d = %s 元", item.Name, moneyDescription(int(item.Price*100+0.5)), qty, moneyDescription(int(item.Price*100+0.5)*qty)))
				}
			}
			event.Feedback += " " + strings.Join(lines, "；") + "。把每种物品的金额加起来。"
		}
		if step.Kind == "change" {
			event.Feedback += fmt.Sprintf(" 付出 %s 元，商品 %s 元，可以算 %s − %s。", moneyDescription(s.State.PaidCents), moneyDescription(s.State.TotalCents), moneyDescription(s.State.PaidCents), moneyDescription(s.State.TotalCents))
		}

	case "add", "remove":
		if step.Kind != "shop" && step.Kind != "pack" {
			return event, errors.New("请按当前步骤操作")
		}
		found := false
		for _, item := range s.Items {
			if item.ID == action.ItemID {
				found = true
				break
			}
		}
		if !found {
			return event, errors.New("物品不属于此场景")
		}
		amount := 1
		if action.Kind == "remove" {
			amount = -1
		}
		next := s.State.Cart[action.ItemID] + amount
		if next < 0 || next > 9 {
			return event, errors.New("每件物品的数量为 0 到 9")
		}
		s.State.Cart[action.ItemID] = next
		event.Correct = true
		event.Feedback = "已调整，按清单核对数量。"
	case "money-add", "money-remove":
		if step.Kind != "pay" {
			return event, errors.New("现在还不是付款步骤")
		}
		key := strconv.Itoa(action.Value)
		limit := 0
		for _, money := range level.Wallet {
			if money.Cents == action.Value {
				limit = money.Count
			}
		}
		delta := 1
		if action.Kind == "money-remove" {
			delta = -1
		}
		next := s.State.Money[key] + delta
		if next < 0 || next > limit || limit == 0 {
			return event, errors.New("钱包中没有更多这个面额")
		}
		s.State.Money[key] = next
		event.Correct = true
		event.Feedback = "已调整付款金额。"
	case "check":
		switch step.Kind {
		case "shop", "pack":
			event.Correct = gameCartMatches(*s, level)
			if event.Correct {
				s.State.TotalCents = gameTotal(*s)
				if level.BudgetCents > 0 && s.State.TotalCents > level.BudgetCents {
					return event, errors.New("清单总价超过预算，请联系老师调整任务")
				}
			}
			event.Feedback = "再对照清单，看看物品和数量。"
		case "pay":
			paid := 0
			for _, money := range level.Wallet {
				paid += money.Cents * s.State.Money[strconv.Itoa(money.Cents)]
			}
			event.Correct = paid >= s.State.TotalCents && paid <= level.BudgetCents
			if event.Correct {
				s.State.PaidCents = paid
			}
			event.Feedback = "付款金额要够支付总价，并且不能超过钱包预算。"
		case "ack":
			event.Correct = true
		default:
			return event, errors.New("请先完成当前任务")
		}
		advance = event.Correct
	case "answer":
		expected := s.State.TotalCents
		if step.Kind == "change" {
			expected = s.State.PaidCents - s.State.TotalCents
		} else if step.Kind != "total" {
			return event, errors.New("当前步骤不需要计算")
		}
		if action.Value < 0 || action.Value > 1000000 {
			return event, errors.New("请输入有效的金额")
		}
		event.Correct = action.Value == expected
		advance = event.Correct
		event.Feedback = "可以再算一次，或点提示看看怎么算。"
	case "choice":
		if step.Kind != "choice" {
			return event, errors.New("当前步骤不需要选择沟通卡")
		}
		found := false
		for _, choice := range step.Choices {
			if choice.ID == action.ChoiceID {
				event.Correct = choice.Correct
				found = true
				break
			}
		}
		if !found {
			return event, errors.New("请选择当前任务的沟通卡")
		}
		advance = event.Correct
		event.Feedback = "看看这一步的目标，再选择合适的表达。"
	default:
		return event, errors.New("不支持的场景操作")
	}
	if advance {
		s.State.Step++
		event.Advanced = true
		event.Feedback = "这一步完成了。"
		if s.State.Step == len(level.Steps) {
			s.State.Finished = true
			s.Status = "completed"
			s.CompletedAt = event.At
			event.Feedback = "本次生活任务完成了！"
		}
	}
	s.Events = append(s.Events, event)
	return event, nil
}
func gameSummary(s ScenarioSession, name string) GameSessionSummary {
	level, _ := gameLevel(s)
	result := GameSessionSummary{ID: s.ID, ScenarioID: s.ScenarioID, ScenarioName: s.ScenarioName, StudentID: s.StudentID, StudentName: name, Mode: s.Mode, LevelID: s.LevelID, LevelName: level.Name, Status: s.Status, StartedAt: s.StartedAt, CompletedAt: s.CompletedAt, StepsCompleted: s.State.Step, TotalSteps: len(level.Steps)}
	supported := map[string]bool{}
	for _, e := range s.Events {
		if e.Kind == "hint" {
			result.Hints++
			supported[e.StepID] = true
		}
		if !e.Correct {
			result.Errors++
			supported[e.StepID] = true
		}
		if e.Advanced && !supported[e.StepID] {
			result.IndependentSteps++
		}
	}
	return result
}
func gameSessionAccess(c *gin.Context, s ScenarioSession, write bool) bool {
	role, user := c.GetString("role"), c.GetString("userId")
	if role == string(RoleStudent) && (s.StudentID != user || (write && s.ActorID != user)) {
		c.AbortWithStatusJSON(403, gin.H{"error": "只能操作本人开始的练习"})
		return false
	}
	if write && role == string(RoleTeacher) && s.ActorID != user {
		c.AbortWithStatusJSON(403, gin.H{"error": "当前记录只能查看，请由发起老师继续指导"})
		return false
	}
	return true
}
func CreateScenarioSession(c *gin.Context) {
	var input struct {
		ScenarioID string `json:"scenarioId"`
		LevelID    string `json:"levelId"`
		StudentID  string `json:"studentId"`
	}
	if c.ShouldBindJSON(&input) != nil {
		SendJSON(c, 1, "练习参数无效", nil)
		return
	}
	mode := "guided"
	if c.GetString("role") == string(RoleStudent) {
		input.StudentID = c.GetString("userId")
		mode = "student"
	} else if !planAccess(c, "students") {
		return
	}
	var s ScenarioSession
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := activePlanStudent(tx, input.StudentID); err != nil {
			return err
		}
		var err error
		s, err = newGameSession(tx, input.ScenarioID, input.LevelID, input.StudentID, c.GetString("userId"), mode)
		if err != nil {
			return err
		}
		return tx.Create(&s).Error
	})
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	SendJSON(c, 0, "", s)
}
func GetScenarioSession(c *gin.Context) {
	var s ScenarioSession
	if DB.First(&s, "id = ?", c.Param("id")).Error != nil {
		c.AbortWithStatusJSON(404, gin.H{"error": "练习记录不存在"})
		return
	}
	if gameSessionAccess(c, s, false) {
		SendJSON(c, 0, "", s)
	}
}
func SaveScenarioAction(c *gin.Context) {
	var action GameAction
	if c.ShouldBindJSON(&action) != nil || strings.TrimSpace(action.RequestID) == "" || len(action.RequestID) > 80 {
		SendJSON(c, 1, "操作参数无效", nil)
		return
	}
	var result GameResult
	denied := false
	err := DB.Transaction(func(tx *gorm.DB) error {
		var s ScenarioSession
		if tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&s, "id = ?", c.Param("id")).Error != nil {
			return errors.New("练习记录不存在")
		}
		if !gameSessionAccess(c, s, true) {
			denied = true
			return errors.New("无权修改")
		}
		for _, event := range s.Events {
			if event.Action.RequestID == action.RequestID {
				result = GameResult{Session: s, Feedback: event.Feedback, Correct: event.Correct}
				return nil
			}
		}
		event, err := applyGameAction(&s, action)
		if err != nil {
			return err
		}
		result = GameResult{Session: s, Feedback: event.Feedback, Correct: event.Correct}
		return tx.Save(&s).Error
	})
	if denied {
		return
	}
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	SendJSON(c, 0, "", result)
}
func PreviewScenarioGame(c *gin.Context) {
	if !assessmentWriter(c) {
		return
	}
	var input struct {
		LevelID string       `json:"levelId"`
		Actions []GameAction `json:"actions"`
	}
	if c.ShouldBindJSON(&input) != nil || len(input.Actions) > 500 {
		SendJSON(c, 1, "预览参数无效", nil)
		return
	}
	s, err := newGameSession(DB, c.Param("id"), input.LevelID, "", "", "preview")
	if err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	result := GameResult{Session: s}
	for _, action := range input.Actions {
		event, err := applyGameAction(&s, action)
		if err != nil {
			SendJSON(c, 1, err.Error(), nil)
			return
		}
		result = GameResult{Session: s, Feedback: event.Feedback, Correct: event.Correct}
	}
	SendJSON(c, 0, "", result)
}
func GetScenarioSessions(c *gin.Context) {
	page, size := gamePagination(c)
	q := DB.Model(&ScenarioSession{})
	student := c.Query("studentId")
	if c.GetString("role") == string(RoleStudent) {
		student = c.GetString("userId")
	}
	if student != "" {
		q = q.Where("student_id = ?", student)
	}
	if id := c.Query("scenarioId"); id != "" {
		q = q.Where("scenario_id = ?", id)
	}
	var total int64
	var sessions []ScenarioSession
	if err := q.Count(&total).Error; err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	if err := q.Order("started_at desc, id desc").Limit(size).Offset((page - 1) * size).Find(&sessions).Error; err != nil {
		SendJSON(c, 1, err.Error(), nil)
		return
	}
	list := []GameSessionSummary{}
	names := map[string]string{}
	ids := []string{}
	for _, s := range sessions {
		ids = append(ids, s.StudentID)
	}
	users := []User{}
	if len(ids) > 0 {
		DB.Select("id,name,username").Where("id IN ?", ids).Find(&users)
	}
	for _, u := range users {
		name := u.Name
		if name == "" {
			name = u.Username
		}
		names[u.ID] = name
	}
	for _, s := range sessions {
		list = append(list, gameSummary(s, names[s.StudentID]))
	}
	SendJSON(c, 0, "", gin.H{"list": list, "total": total, "page": page, "pageSize": size})
}
func gamePagination(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 20
	}
	if size > 100 {
		size = 100
	}
	return page, size
}

func moneyDescription(cents int) string { return fmt.Sprintf("%.2f", float64(cents)/100) }
