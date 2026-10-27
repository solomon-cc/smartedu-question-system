package main

import (
	_ "embed"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"regexp"

	"github.com/gin-gonic/gin"
)

var portalAssessmentFile = regexp.MustCompile(`^(D|G|response)(-[1-9][0-9]*)?\.(pdf|png)$`)

// Materials contain evaluator instructions and are never a public static endpoint.
func PortalAssessmentAsset(c *gin.Context) {
	name := c.Param("file")
	if !portalAssessmentFile.MatchString(name) {
		c.Status(http.StatusNotFound)
		return
	}
	root := os.Getenv("ASSESSMENT_ASSET_DIR")
	if root == "" {
		root = "web/public/peak"
	}
	path := filepath.Join(root, name)
	info, err := os.Stat(path)
	if err != nil || !info.Mode().IsRegular() {
		c.Status(http.StatusNotFound)
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.Header("X-Content-Type-Options", "nosniff")
	c.File(path)
}

//go:embed web/src/lib/peakPresentation.json
var portalAssessmentPresentation []byte

func PortalAssessmentPresentation(c *gin.Context) {
	c.Header("Cache-Control", "private, no-store")
	SendJSON(c, 0, "", json.RawMessage(portalAssessmentPresentation))
}
