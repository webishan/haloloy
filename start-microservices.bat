@echo off
echo Starting KOMARCE Microservices Architecture...
echo.

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker Compose is not available. Please install Docker Compose and try again.
    pause
    exit /b 1
)

echo Docker is running. Starting services...
echo.

REM Create environment file if it doesn't exist
if not exist .env (
    echo Creating .env file from template...
    copy env.example .env
    echo.
    echo IMPORTANT: Please edit the .env file with your actual configuration values.
    echo Default values are set for development.
    echo.
)

REM Start all services
echo Starting all microservices...
docker-compose up -d

echo.
echo Waiting for services to start...
timeout /t 30 /nobreak >nul

echo.
echo Checking service health...
echo.

REM Check API Gateway
curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ API Gateway is running on http://localhost:3000
) else (
    echo ✗ API Gateway is not responding
)

REM Check Auth Service
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Auth Service is running on http://localhost:3001
) else (
    echo ✗ Auth Service is not responding
)

REM Check User Service
curl -s http://localhost:3002/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ User Service is running on http://localhost:3002
) else (
    echo ✗ User Service is not responding
)

REM Check Product Service
curl -s http://localhost:3003/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Product Service is running on http://localhost:3003
) else (
    echo ✗ Product Service is not responding
)

echo.
echo ========================================
echo KOMARCE Microservices Status
echo ========================================
echo.
echo Frontend Application: http://localhost:80
echo API Gateway: http://localhost:3000
echo.
echo Service URLs:
echo - Auth Service: http://localhost:3001
echo - User Service: http://localhost:3002
echo - Product Service: http://localhost:3003
echo - Order Service: http://localhost:3004
echo - Payment Service: http://localhost:3005
echo - Loyalty Service: http://localhost:3006
echo - Notification Service: http://localhost:3007
echo - Analytics Service: http://localhost:3008
echo.
echo Monitoring:
echo - Prometheus: http://localhost:9090
echo - Grafana: http://localhost:3001 (admin/admin123)
echo.
echo ========================================
echo.
echo To stop all services, run: docker-compose down
echo To view logs, run: docker-compose logs -f [service-name]
echo.
echo Press any key to continue...
pause >nul
