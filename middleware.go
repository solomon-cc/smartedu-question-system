
package main

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte("yilmz-secret-key-2024")
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

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if ok {
			uid := claims["userId"].(string)
			c.Set("userId", uid)
			c.Set("role", claims["role"])
			
			// Update active status
			ActiveUsers.Store(uid, time.Now().Unix())
		}
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

		// Map paths to Module IDs
		module := ""
		if strings.HasPrefix(path, "/api/questions") {
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
		} else if strings.HasPrefix(path, "/api/history") {
			module = "assignments"
		} else if strings.HasPrefix(path, "/api/wrong-book") {
			module = "dashboard"
		}

		if module != "" {
			var perm RolePermission
			err := DB.Where("role = ? AND module_id = ?", role, module).First(&perm).Error
			
			if err != nil {
				// If no record, default to no access
				c.JSON(http.StatusForbidden, gin.H{"error": "Access denied for module: " + module})
				c.Abort()
				return
			}

			// All API calls (GET, POST, PUT, DELETE) now strictly require APIAccess to be true
			// This ensures that "Read/Write" controls the actual data capability
			if !perm.APIAccess {
				c.JSON(http.StatusForbidden, gin.H{"error": "API access denied (Read/Write) for module: " + module})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}
