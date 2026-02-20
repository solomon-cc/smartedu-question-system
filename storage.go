package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
)

// OSS Configuration (Fetched from environment variables)
var (
	OSSEndpoint   = getEnv("OSS_ENDPOINT", "oss-cn-chengdu.aliyuncs.com")
	OSSAccessKey  = os.Getenv("OSS_ACCESS_KEY")
	OSSSecretKey  = os.Getenv("OSS_SECRET_KEY")
	OSSBucketName = getEnv("OSS_BUCKET_NAME", "ylmz-wheat")
	OSSUrlPrefix  = getEnv("OSS_URL_PREFIX", "https://img.ylmz.com.cn/")
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
	bucketName := getEnv("OSS_BUCKET_NAME", "smartedu-assets")
	urlPrefix := getEnv("OSS_URL_PREFIX", "https://smartedu-assets.oss-cn-beijing.aliyuncs.com/")

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

type DataStore struct {
	Users          []User          `json:"users"`
	Questions      []Question      `json:"questions"`
	Papers         []Paper         `json:"papers"`
	Homeworks      []Homework      `json:"homeworks"`
	History        []History       `json:"history"`
	Reinforcements []Reinforcement `json:"reinforcements"`
	Logs           []AuditLog      `json:"logs"`
}

var (
	dataMu    sync.RWMutex
	dataFile  = "data.json"
)

var storeLogs = make([]AuditLog, 0)

func LoadData() error {
	dataMu.Lock()
	defer dataMu.Unlock()

	file, err := os.ReadFile(dataFile)
	if err != nil {
		if os.IsNotExist(err) {
			return saveDataUnlocked() 
		}
		return err
	}

	var store DataStore
	if err := json.Unmarshal(file, &store); err != nil {
		return err
	}

	// Sync to globals
	storeUsers = store.Users
	if storeUsers == nil { storeUsers = make([]User, 0) }
	storeQuestions = store.Questions
	if storeQuestions == nil { storeQuestions = make([]Question, 0) }
	storePapers = store.Papers
	if storePapers == nil { storePapers = make([]Paper, 0) }
	storeHomeworks = store.Homeworks
	if storeHomeworks == nil { storeHomeworks = make([]Homework, 0) }
	storeHistory = store.History
	if storeHistory == nil { storeHistory = make([]History, 0) }
	storeReinforcements = store.Reinforcements
	if storeReinforcements == nil { storeReinforcements = make([]Reinforcement, 0) }
	storeLogs = store.Logs
	if storeLogs == nil { storeLogs = make([]AuditLog, 0) }

	return nil
}

func SaveData() error {
	dataMu.Lock()
	defer dataMu.Unlock()
	return saveDataUnlocked()
}

func saveDataUnlocked() error {
	store := DataStore{
		Users:          storeUsers,
		Questions:      storeQuestions,
		Papers:         storePapers,
		Homeworks:      storeHomeworks,
		History:        storeHistory,
		Reinforcements: storeReinforcements,
		Logs:           storeLogs,
	}

	data, err := json.MarshalIndent(store, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(dataFile, data, 0644)
}
