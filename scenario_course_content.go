package main

import (
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Authored teaching content, seeded once into the real scenario library. All
// learner task definitions and prices are served by the backend, not UI fixtures.
func seedLifeSkillCourses(db *gorm.DB) error {
	var count int64
	if err := db.Model(&SystemConfig{}).Where("`key` = ?", "life_skills_content_v1").Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	return db.Transaction(func(tx *gorm.DB) error {
		for _, course := range lifeSkillCourses() {
			result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&course.scenario)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected > 0 {
				if err := tx.Create(&course.items).Error; err != nil {
					return err
				}
			}
		}
		return tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&SystemConfig{Key: "life_skills_content_v1", Value: "installed"}).Error
	})
}

type lifeCourse struct {
	scenario Scenario
	items    []ScenarioItem
}

func lifeSkillCourses() []lifeCourse {
	market := "life-market-v1"
	cafe := "life-cafe-v1"
	bag := "life-schoolbag-v1"
	goods := func(id, name, art string, price float64, scene string) ScenarioItem {
		return ScenarioItem{ID: id, Name: name, Price: price, ScenarioID: scene, Art: art}
	}
	money := []GameMoney{{Cents: 1000, Count: 1}, {Cents: 500, Count: 1}, {Cents: 100, Count: 5}}
	choice := func(id, label, art string, correct bool) GameChoice {
		return GameChoice{ID: id, Label: label, Art: art, Correct: correct}
	}
	shopSteps := func() []GameStep {
		return []GameStep{
			{ID: "plan", Title: "看清单", Prompt: "先看看今天要买什么。", Hint: "看看清单上的图片和数量。准备好后，去选物品。", Kind: "ack"},
			{ID: "shop", Title: "选物品", Prompt: "把清单上的物品放进购物篮。", Hint: "一件一件对照图片；数量不对时，可以从购物篮减少。", Kind: "shop"},
			{ID: "total", Title: "算总价", Prompt: "这些物品一共多少钱？", Hint: "按单价和数量算每一种物品，再把金额加起来。", Kind: "total"},
			{ID: "request", Title: "请结账", Prompt: "到收银台了。选择一张结账沟通卡。", Hint: "可以说出来，也可以点选图片表达：请帮我结账。", Kind: "choice", Choices: []GameChoice{choice("checkout", "请帮我结账", "cashier", true), choice("help", "我需要帮忙结账", "help", true), choice("later", "我先不结账", "clock", false)}},
			{ID: "pay", Title: "付钱", Prompt: "从钱包取出钱，交到收银台。", Hint: "付款金额至少要够支付总价，也不能超过钱包里的预算。", Kind: "pay"},
			{ID: "change", Title: "核对找零", Prompt: "付出的钱减去总价，还应找回多少钱？", Hint: "从刚才付出的钱中减去商品总价。", Kind: "change"},
		}
	}
	marketItems := []ScenarioItem{goods("market-apple", "苹果", "apple", 3, market), goods("market-milk", "牛奶", "milk", 5, market), goods("market-bread", "面包", "bread", 4, market), goods("market-water", "水", "water", 2, market), goods("market-banana", "香蕉", "banana", 2.5, market), goods("market-rice", "大米", "rice", 8, market)}
	marketGame := &ScenarioGameDefinition{Version: "life-market-1", Environment: "supermarket", Background: "/life/supermarket-v1.jpg", Goals: []string{"按清单选物", "数量核对", "价格计算", "付款与找零", "表达需求"}, Transfer: []string{"带着同样的图片清单，在实际超市辨认物品和价签。", "老师或家长陪同，从两件熟悉物品开始练习付款和核对小票。"}, Levels: []GameLevel{
		{ID: "starter", Name: "基础 · 两件物品", Goal: "买 1 个苹果和 1 盒牛奶，练习加法与付款。", BudgetCents: 2000, Targets: []GameTarget{{ItemID: "market-apple", Quantity: 1}, {ItemID: "market-milk", Quantity: 1}}, Wallet: money, Steps: shopSteps()},
		{ID: "quantity", Name: "进阶 · 数量与价格", Goal: "买 2 个苹果和 1 个面包，先算数量再算总价。", BudgetCents: 2000, Targets: []GameTarget{{ItemID: "market-apple", Quantity: 2}, {ItemID: "market-bread", Quantity: 1}}, Wallet: money, Steps: shopSteps()},
		{ID: "decimal", Name: "挑战 · 元与角", Goal: "买 1 根香蕉、1 盒牛奶和 1 瓶水，练习带角的金额。", BudgetCents: 2000, Targets: []GameTarget{{ItemID: "market-banana", Quantity: 1}, {ItemID: "market-milk", Quantity: 1}, {ItemID: "market-water", Quantity: 1}}, Wallet: []GameMoney{{Cents: 1000, Count: 1}, {Cents: 500, Count: 1}, {Cents: 100, Count: 4}, {Cents: 50, Count: 2}}, Steps: shopSteps()},
	}}
	cafeItems := []ScenarioItem{goods("cafe-sandwich", "三明治", "sandwich", 8, cafe), goods("cafe-juice", "果汁", "juice", 6, cafe), goods("cafe-water", "水", "water", 2, cafe), goods("cafe-bread", "面包", "bread", 4, cafe)}
	cafeSteps := []GameStep{{ID: "plan", Title: "看餐单", Prompt: "先看今天准备点的食物。", Hint: "先辨认餐单上的图片，再去柜台选择。", Kind: "ack"}, {ID: "order", Title: "选餐", Prompt: "选择餐单上的食物和饮品。", Hint: "按图片餐单选择数量，暂时不用的食物不放进托盘。", Kind: "shop"}, {ID: "ask", Title: "表达需求", Prompt: "服务员来了，你可以怎样点餐？", Hint: "可以使用沟通卡，说出想要的食物，也可以用自己的沟通方式。", Kind: "choice", Choices: []GameChoice{choice("order", "我想要托盘里的食物", "meal", true), choice("help", "请帮我点餐", "help", true), choice("leave", "我先离开餐厅", "door", false)}}, {ID: "total", Title: "算餐费", Prompt: "这一餐需要多少钱？", Hint: "把选好的食物价格加起来。", Kind: "total"}, {ID: "pay", Title: "付餐费", Prompt: "取出足够的钱支付餐费。", Hint: "看看总价，再从钱包取出足够的金额。", Kind: "pay"}, {ID: "finish", Title: "核对餐品", Prompt: "取餐时先做什么？", Hint: "先核对是不是自己点的餐品，再带着餐品去用餐。", Kind: "choice", Choices: []GameChoice{choice("check", "核对食物和饮品", "checklist", true), choice("take-any", "拿走旁边任意一份餐", "meal", false)}}}
	cafeGame := &ScenarioGameDefinition{Version: "life-cafe-1", Environment: "cafe", Background: "/life/cafe-v1.jpg", Goals: []string{"按餐单选择", "表达需求", "计算餐费", "核对餐品"}, Transfer: []string{"在熟悉的餐厅，用自己的沟通方式向服务员表达想要的食物。", "陪同者帮助核对餐品；无需强求口语或眼神接触。"}, Levels: []GameLevel{{ID: "starter", Name: "基础 · 一份餐点", Goal: "点 1 个面包和 1 瓶水，练习选择与表达。", BudgetCents: 2000, Targets: []GameTarget{{ItemID: "cafe-bread", Quantity: 1}, {ItemID: "cafe-water", Quantity: 1}}, Wallet: money, Steps: cafeSteps}, {ID: "meal", Name: "进阶 · 组合餐", Goal: "点 1 份三明治和 1 杯果汁，核对餐单并支付餐费。", BudgetCents: 2000, Targets: []GameTarget{{ItemID: "cafe-sandwich", Quantity: 1}, {ItemID: "cafe-juice", Quantity: 1}}, Wallet: money, Steps: cafeSteps}}}
	bagItems := []ScenarioItem{goods("bag-book", "课本", "book", 0, bag), goods("bag-pencil", "笔袋", "pencil", 0, bag), goods("bag-water", "水杯", "water", 0, bag), goods("bag-toy", "玩具", "toy", 0, bag), goods("bag-lunch", "午餐盒", "lunchbox", 0, bag), goods("bag-towel", "毛巾", "towel", 0, bag)}
	bagSteps := []GameStep{{ID: "schedule", Title: "看安排", Prompt: "出门前，先看看今天的物品清单。", Hint: "把清单放在看得见的位置，一件一件准备。", Kind: "ack"}, {ID: "pack", Title: "装书包", Prompt: "把需要的物品放进书包。", Hint: "对照清单放入；多放的物品可以取出来。", Kind: "pack"}, {ID: "check", Title: "检查", Prompt: "准备好以后，接下来做什么？", Hint: "先对照清单核对数量，再拉好书包。", Kind: "choice", Choices: []GameChoice{choice("check", "对照清单检查书包", "checklist", true), choice("play", "先拿出玩具玩", "toy", false)}}, {ID: "ready", Title: "准备出门", Prompt: "核对完成了。现在可以带好书包出门。", Hint: "带好准备过的物品，有需要时可以向陪同者求助。", Kind: "ack"}}
	bagGame := &ScenarioGameDefinition{Version: "life-schoolbag-1", Environment: "schoolbag", Background: "/life/schoolbag-v1.jpg", Goals: []string{"看图计划", "物品分类", "数量核对", "按步骤准备"}, Transfer: []string{"在真实书包旁放置同样的图片清单，让学生逐件准备。", "根据当天安排调整清单，逐渐减少提示；保留学生需要的支持。"}, Levels: []GameLevel{{ID: "starter", Name: "基础 · 上学准备", Goal: "准备课本、笔袋和水杯。", Targets: []GameTarget{{ItemID: "bag-book", Quantity: 1}, {ItemID: "bag-pencil", Quantity: 1}, {ItemID: "bag-water", Quantity: 1}}, Wallet: []GameMoney{}, Steps: bagSteps}, {ID: "outing", Name: "进阶 · 外出准备", Goal: "准备水杯、午餐盒和毛巾，练习按当天安排选择物品。", Targets: []GameTarget{{ItemID: "bag-water", Quantity: 1}, {ItemID: "bag-lunch", Quantity: 1}, {ItemID: "bag-towel", Quantity: 1}}, Wallet: []GameMoney{}, Steps: bagSteps}}}
	return []lifeCourse{{scenario: Scenario{ID: market, Name: "小小超市", Description: "从选物品到结账，完成一次有计划的购物。", Type: "supermarket", Icon: "mdi-storefront-outline", Game: marketGame}, items: marketItems}, {scenario: Scenario{ID: cafe, Name: "今天我来点餐", Description: "选择餐品，用适合自己的方式表达需要。", Type: "cafe", Icon: "mdi-food-outline", Game: cafeGame}, items: cafeItems}, {scenario: Scenario{ID: bag, Name: "出门前的书包", Description: "照着清单准备物品，一步一步完成出门准备。", Type: "schoolbag", Icon: "mdi-bag-personal-outline", Game: bagGame}, items: bagItems}}
}
