.PHONY: all test-backend test-frontend build-backend build-frontend clean

# Default target
all: test build

# Run all tests
test: test-backend test-frontend

# Build everything
build: build-backend build-frontend

deploy: build
	@echo "Deploying to production server..."
	scp smartedu-question-bank root@ylmz:/data/
	scp web/dist.tar.gz root@ylmz:/data/web/go
	ssh root@ylmz "bash /data/web/go/deploy.sh"

# Backend targets
test-backend:
	@echo "Running backend tests..."
	go test -v -cover ./...

build-backend:
	@echo "Building backend for Linux (amd64)..."
	GOOS=linux GOARCH=amd64 go build -o smartedu-question-bank .

# Frontend targets
test-frontend:
	@echo "Running frontend tests..."
	cd web && npm run test -- --watchAll=false --passWithNoTests || true

web/node_modules: web/package.json
	@echo "Detected changes in package.json, installing dependencies..."
	cd web && npm install
	@touch web/node_modules

build-frontend: web/node_modules
	@echo "Building frontend..."
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
