package main

// Workspace sections organize existing permissions. They never grant access or
// change stored permissions. JWT role continues to come from the active user.
func teacherWorkspaceSections(p RolePermission) []string {
	if p.Role != RoleTeacher || !p.UIAccess || !p.APIAccess {
		return nil
	}
	switch p.ModuleID {
	case "assessment_history":
		return []string{"assessment"}
	case "students":
		return []string{"academic", "development", "personal"}
	case "questions", "papers", "assignments", "skills_practice", "skills_homework", "skills_history", "skills_wrongbook":
		return []string{"academic"}
	case "ability_tracking":
		return []string{"development", "personal"}
	case "application_games":
		return []string{"life", "games"}
	case "skills_stats", "mood_diary":
		return []string{"personal"}
	case "resources", "reinforcements":
		return []string{"materials"}
	}
	return nil
}
