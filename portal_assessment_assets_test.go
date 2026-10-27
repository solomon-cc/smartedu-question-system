package main

import (
	"github.com/stretchr/testify/require"
	"os"
	"path/filepath"
	"testing"
)

func TestPortalAssessmentMaterialsRequireStaff(t *testing.T) {
	r, tokens := portalTestRouter(t)
	dir := t.TempDir()
	t.Setenv("ASSESSMENT_ASSET_DIR", dir)
	require.NoError(t, os.WriteFile(filepath.Join(dir, "D.pdf"), []byte("%PDF-test-material"), 0600))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "D-1.png"), []byte("test-image"), 0600))
	for _, role := range []string{"", "student", "parent", "trainer"} {
		w, _ := portalRequest(t, r, tokens[role], "GET", "/assessment-assets/D.pdf", nil)
		want := 403
		if role == "" {
			want = 401
		}
		require.Equal(t, want, w.Code, role)
		w, _ = portalRequest(t, r, tokens[role], "GET", "/assessment-presentation", nil)
		require.Equal(t, want, w.Code, role)
	}
	for _, role := range []string{"admin", "teacher"} {
		w, out := portalRequest(t, r, tokens[role], "GET", "/assessment-presentation", nil)
		require.Equal(t, 200, w.Code)
		require.Contains(t, string(out["data"]), `"steps"`)
		for _, file := range []string{"D.pdf", "D-1.png"} {
			w, _ := portalRequest(t, r, tokens[role], "GET", "/assessment-assets/"+file, nil)
			require.Equal(t, 200, w.Code)
			require.Equal(t, "private, no-store", w.Header().Get("Cache-Control"))
		}
	}
	for _, file := range []string{"secret.env", "D-0.png", "D-99999.png", "response.exe"} {
		w, _ := portalRequest(t, r, tokens["teacher"], "GET", "/assessment-assets/"+file, nil)
		require.Equal(t, 404, w.Code)
	}
}
