
package main

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte("smartedu-secret-key-2024")
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
