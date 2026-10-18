package main

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret []byte
var tokenDuration = 24 * time.Hour

// Track online users: map[userId]lastActiveTimestamp
var ActiveUsers sync.Map

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		allowedOrigins := map[string]bool{
			"https://go.ylmz.com.cn": true,
			"http://localhost:3000":  true,
			"http://localhost:5173":  true,
			"http://0.0.0.0:3000":    true,
		}

		if allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		c.Writer.Header().Set("Access-Control-Allow-Headers", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(401, gin.H{"error": "Invalid authorization header"})
			return
		}
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		}, jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired())

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatus(401)
			return
		}
		uid, valid := claims["userId"].(string)
		if !valid || uid == "" {
			c.AbortWithStatus(401)
			return
		}
		var current User
		if DB.First(&current, "id = ?", uid).Error != nil || current.Status != "active" {
			c.AbortWithStatusJSON(401, gin.H{"error": "Account unavailable"})
			return
		}
		c.Set("userId", uid)
		c.Set("role", string(current.Role))
		ActiveUsers.Store(uid, time.Now().Unix())

		c.Next()
	}
}

func PermissionMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Role not found"})
			c.Abort()
			return
		}

		// Skip check for Admin - but GEMINI.md says "everything based on backend"
		// Let's check even for Admin to be safe, but usually Admin has all true.

		path := c.Request.URL.Path
		if (role == string(RoleParent) || role == string(RoleTrainer)) && path != "/api/me" && path != "/api/me/permissions" {
			c.AbortWithStatusJSON(403, gin.H{"error": "请使用门户功能"})
			return
		}
		method := c.Request.Method

		// Map paths to Module IDs
		module := ""
		// Students can consume learning content, but cannot mutate teaching records.
		if role == string(RoleStudent) && method != "GET" && method != "OPTIONS" {
			allowed := method == "POST" && (path == "/api/scenario-sessions" || strings.HasPrefix(path, "/api/scenario-sessions/") && strings.HasSuffix(path, "/actions")) || path == "/api/history" && method == "POST" || path == "/api/mood-diaries" && method == "POST" || path == "/api/me" && method == "PUT"
			if !allowed {
				c.AbortWithStatusJSON(403, gin.H{"error": "学生账号不能修改教学内容"})
				return
			}
		}

		// 1. Special Handling for Shared APIs (Student access)
		if strings.HasPrefix(path, "/api/questions/stats/grades") {
			module = "skills_practice"
		} else if strings.HasPrefix(path, "/api/questions") && method == "GET" {
			module = "questions"
			if role == string(RoleStudent) {
				module = "skills_practice"
			}
		} else if strings.HasPrefix(path, "/api/homeworks") && method == "GET" {
			module = "assignments"
			if role == string(RoleStudent) {
				module = "skills_homework"
			}
		} else if strings.HasPrefix(path, "/api/reinforcements") && method == "GET" {
			module = "reinforcements"
			if role == string(RoleStudent) {
				module = "skills_practice"
			}
		} else if strings.HasPrefix(path, "/api/history") {
			module = "skills_history"
		} else if strings.HasPrefix(path, "/api/wrong-book") {
			module = "skills_wrongbook"
		} else if strings.HasPrefix(path, "/api/skills/questions") {
			module = "skills_practice"
		} else if strings.HasPrefix(path, "/api/skills") {
			if method == "GET" {
				module = "ability_tracking"
				if role == string(RoleStudent) {
					module = "skills_practice"
				}
			} else {
				module = "ability_tracking"
			}
		} else if strings.HasPrefix(path, "/api/questions") {
			module = "questions"
		} else if strings.HasPrefix(path, "/api/papers") {
			module = "papers"
		} else if strings.HasPrefix(path, "/api/homeworks") {
			module = "assignments"
		} else if strings.HasPrefix(path, "/api/reinforcements") {
			module = "reinforcements"
		} else if strings.HasPrefix(path, "/api/resources") {
			module = "resources"
		} else if strings.HasPrefix(path, "/api/admin/users") {
			module = "users"
		} else if strings.HasPrefix(path, "/api/admin/permissions") {
			module = "permissions"
		} else if strings.HasPrefix(path, "/api/admin/config") || strings.HasPrefix(path, "/api/admin/settings") {
			module = "system_config"
		} else if strings.HasPrefix(path, "/api/admin/logs") {
			module = "audit_logs"
		} else if strings.HasPrefix(path, "/api/admin/homeworks") || strings.HasPrefix(path, "/api/admin/practices") {
			module = "homework_audit"
		} else if strings.HasPrefix(path, "/api/students") {
			module = "students"
		} else if strings.HasPrefix(path, "/api/objectives") {
			module = "ability_tracking"
		} else if strings.HasPrefix(path, "/api/dashboard") {
			module = "dashboard"
		} else if strings.HasPrefix(path, "/api/student/stats") {
			module = "skills_stats"
		} else if strings.HasPrefix(path, "/api/teacher/stats") {
			module = "dashboard"
		} else if strings.HasPrefix(path, "/api/ability/matrix") {
			module = "ability_tracking"
		} else if strings.HasPrefix(path, "/api/scenarios") || strings.HasPrefix(path, "/api/scenario-sessions") {
			module = "application_games"
		} else if strings.HasPrefix(path, "/api/assessments") {
			module = "assessment_history"
		} else if strings.HasPrefix(path, "/api/mood-diaries") {
			module = "mood_diary"
		}

		if module != "" {
			var perm RolePermission
			// Check if the role has access to this specific module
			err := DB.Where("role = ? AND module_id = ?", role, module).First(&perm).Error

			if err != nil {
				// Fallback: If it's a sub-module, check if they have parent access
				// This is a safety measure for legacy data or broad permissions
				parentModule := strings.Split(module, "_")[0]
				if parentModule != module {
					var parentPerm RolePermission
					if DB.Where("role = ? AND module_id = ?", role, parentModule).First(&parentPerm).Error == nil {
						if parentPerm.APIAccess {
							c.Next()
							return
						}
					}
				}

				c.JSON(http.StatusForbidden, gin.H{"error": "Access denied for module: " + module})
				c.Abort()
				return
			}

			if !perm.APIAccess {
				c.JSON(http.StatusForbidden, gin.H{"error": "API access denied (Read/Write) for module: " + module})
				c.Abort()
				return
			}
		}
		c.Next()
	}
}
