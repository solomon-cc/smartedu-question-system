package main

import (
	"encoding/json"
	"os"
	"sync"
)

type DataStore struct {
	Users          []User          `json:"users"`
	Questions      []Question      `json:"questions"`
	Papers         []Paper         `json:"papers"`
	Homeworks      []Homework      `json:"homeworks"`
	History        []History       `json:"history"`
	Reinforcements []Reinforcement `json:"reinforcements"`
}

var (
	dataMu    sync.RWMutex
	dataFile  = "data.json"
)

func LoadData() error {
	dataMu.Lock()
	defer dataMu.Unlock()

	file, err := os.ReadFile(dataFile)
	if err != nil {
		// If file doesn't exist, we keep the initial mock data defined in handlers.go
		// and save it to create the file.
		if os.IsNotExist(err) {
			return SaveData() 
		}
		return err
	}

	var store DataStore
	if err := json.Unmarshal(file, &store); err != nil {
		return err
	}

	// Sync to globals
	mockUsers = store.Users
	mockQuestions = store.Questions
	mockPapers = store.Papers
	mockHomeworks = store.Homeworks
	mockHistory = store.History
	mockReinforcements = store.Reinforcements

	return nil
}

func SaveData() error {
	dataMu.Lock()
	defer dataMu.Unlock()

	store := DataStore{
		Users:          mockUsers,
		Questions:      mockQuestions,
		Papers:         mockPapers,
		Homeworks:      mockHomeworks,
		History:        mockHistory,
		Reinforcements: mockReinforcements,
	}

	data, err := json.MarshalIndent(store, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(dataFile, data, 0644)
}
