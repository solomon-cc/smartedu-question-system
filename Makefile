.PHONY: all test-backend test-frontend build-backend build-frontend clean

# Default target
all: test build

# Run all tests
test: test-backend test-frontend

# Build everything
build: build-backend build-frontend

# Backend targets
test-backend:
	@echo "Running backend tests..."
	go test -v -cover ./...

build-backend: test-backend
	@echo "Building backend..."
	go build -o server .

# Frontend targets
test-frontend:
	@echo "Running frontend tests..."
	cd web && npm run test -- --watchAll=false --passWithNoTests

build-frontend: test-frontend
	@echo "Building frontend..."
	cd web && npm run build

# Coverage targets
coverage-backend:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out

coverage-frontend:
	cd web && npm run test:coverage

# Cleanup
clean:
	rm -f server
	rm -rf web/dist
	rm -f coverage.out
