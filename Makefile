# Source files
BACKEND_SRCS := $(wildcard *.go) go.mod go.sum
FRONTEND_SRCS := $(shell find web -type f -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/dist.tar.gz")

.PHONY: all test-backend test-frontend clean deploy test

# Default target
all: test build

# Run all tests
test: test-backend test-frontend

# Build everything
build: smartedu-question-bank web/dist.tar.gz

deploy: smartedu-question-bank web/dist.tar.gz
	@echo "Deploying to production server..."
	scp smartedu-question-bank root@ylmz:/data/
	scp web/dist.tar.gz root@ylmz:/data/web/go
	ssh root@ylmz "bash /data/web/go/deploy.sh"

# Backend targets
test-backend:
	@echo "Running backend tests..."
	go test -v -cover ./...

smartedu-question-bank: $(BACKEND_SRCS)
	@echo "Detected backend changes. Building backend for Linux (amd64)..."
	GOOS=linux GOARCH=amd64 go build -o smartedu-question-bank .

# Frontend targets
test-frontend:
	@echo "Running frontend tests..."
	cd web && npm run test -- --watchAll=false --passWithNoTests || true

web/node_modules: web/package.json
	@echo "Detected changes in package.json, installing dependencies..."
	cd web && npm install
	@touch web/node_modules

web/dist.tar.gz: $(FRONTEND_SRCS) web/node_modules
	@echo "Detected frontend changes. Building frontend..."
	cd web && npm run build
	@echo "Packaging frontend (including dist directory)..."
	cd web && tar -czf dist.tar.gz dist

# Coverage targets
coverage-backend:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out

coverage-frontend:
	cd web && npm run test:coverage

# Cleanup
clean:
	rm -f server smartedu-question-bank
	rm -rf web/dist web/dist.tar.gz
	rm -f coverage.out
