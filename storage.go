package main

import (
	"encoding/base64"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
)

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func UploadBase64ToOSS(base64Str string) (string, error) {
	if !strings.HasPrefix(base64Str, "data:image") {
		return base64Str, nil
	}

	// Fetch keys inside function to ensure we catch changes
	accessKey := os.Getenv("OSS_ACCESS_KEY")
	secretKey := os.Getenv("OSS_SECRET_KEY")
	endpoint := getEnv("OSS_ENDPOINT", "oss-cn-chengdu.aliyuncs.com")
	bucketName := getEnv("OSS_BUCKET_NAME", "yilmz-assets")
	urlPrefix := getEnv("OSS_URL_PREFIX", "https://yilmz-assets.oss-cn-beijing.aliyuncs.com/")

	if accessKey == "" || secretKey == "" {
		fmt.Printf("[OSS] Warning: Missing OSS_ACCESS_KEY or OSS_SECRET_KEY. Falling back to base64.\n")
		return base64Str, nil
	}

	// 1. Parse Base64
	parts := strings.Split(base64Str, ";base64,")
	if len(parts) != 2 {
		return base64Str, nil
	}
	
	data, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		fmt.Printf("[OSS] Error decoding base64: %v\n", err)
		return base64Str, nil
	}

	// 2. Initialize OSS
	client, err := oss.New(endpoint, accessKey, secretKey)
	if err != nil {
		fmt.Printf("[OSS] Error creating client: %v\n", err)
		return base64Str, nil
	}

	bucket, err := client.Bucket(bucketName)
	if err != nil {
		fmt.Printf("[OSS] Error getting bucket: %v\n", err)
		return base64Str, nil
	}

	// 3. Generate Filename
	ext := "png"
	if strings.Contains(parts[0], "jpeg") { ext = "jpg" }
	
	filename := fmt.Sprintf("questions/%d.%s", time.Now().UnixNano(), ext)

	// 4. Upload
	err = bucket.PutObject(filename, strings.NewReader(string(data)))
	if err != nil {
		fmt.Printf("[OSS] Upload failed: %v\n", err)
		return base64Str, nil
	}

	finalURL := urlPrefix + filename
	fmt.Printf("[OSS] Success: Uploaded to %s\n", finalURL)
	return finalURL, nil
}
