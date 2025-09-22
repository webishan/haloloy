@echo off
echo ========================================
echo KOMARCE Microservices Deployment Script
echo ========================================
echo.

REM Check if Docker is running
echo Checking Docker status...
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

echo Docker is running. Proceeding with deployment...
echo.

REM Create environment file if it doesn't exist
if not exist .env (
    echo Creating .env file from template...
    copy env.example .env
    echo.
    echo IMPORTANT: Please edit the .env file with your actual configuration values.
    echo Default values are set for development.
    echo.
    pause
)

REM Stop any existing containers
echo Stopping existing containers...
docker-compose down

REM Remove old images (optional)
echo.
set /p remove_images="Do you want to remove old images? (y/n): "
if /i "%remove_images%"=="y" (
    echo Removing old images...
    docker-compose down --rmi all
)

REM Build and start all services
echo.
echo Building and starting all microservices...
echo This may take several minutes on first run...
echo.

docker-compose up -d --build

echo.
echo Waiting for services to initialize...
timeout /t 60 /nobreak >nul

echo.
echo Checking service health...
echo.

REM Function to check service health
:check_service
set service_name=%1
set service_port=%2
set service_url=http://localhost:%service_port%/health

curl -s %service_url% >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ %service_name% is running on port %service_port%
) else (
    echo ✗ %service_name% is not responding on port %service_port%
)
goto :eof

REM Check all services
call :check_service "API Gateway" "3000"
call :check_service "Auth Service" "3001"
call :check_service "User Service" "3002"
call :check_service "Product Service" "3003"
call :check_service "Order Service" "3004"

REM Check if we have more services
if exist "services\payment-service" (
    call :check_service "Payment Service" "3005"
)
if exist "services\loyalty-service" (
    call :check_service "Loyalty Service" "3006"
)
if exist "services\notification-service" (
    call :check_service "Notification Service" "3007"
)
if exist "services\analytics-service" (
    call :check_service "Analytics Service" "3008"
)

echo.
echo ========================================
echo KOMARCE Microservices Deployment Status
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

REM Show container status
echo Container Status:
docker-compose ps

echo.
echo ========================================
echo Deployment Commands
echo ========================================
echo.
echo To view logs:
echo   docker-compose logs -f [service-name]
echo.
echo To stop all services:
echo   docker-compose down
echo.
echo To restart a specific service:
echo   docker-compose restart [service-name]
echo.
echo To scale a service:
echo   docker-compose up -d --scale [service-name]=[number]
echo.
echo To view resource usage:
echo   docker stats
echo.
echo ========================================
echo.

REM Performance recommendations
echo Performance Recommendations:
echo.
echo 1. For production deployment:
echo    - Use managed database services (AWS RDS, Google Cloud SQL)
echo    - Use managed Redis service (AWS ElastiCache, Google Cloud Memorystore)
echo    - Use container orchestration (Kubernetes, Docker Swarm)
echo    - Set up auto-scaling based on CPU/memory usage
echo.
echo 2. For high load (100M+ users):
echo    - Scale services horizontally (multiple replicas)
echo    - Use database read replicas
echo    - Implement CDN for static assets
echo    - Use message queues for async processing
echo    - Set up proper monitoring and alerting
echo.
echo 3. Security considerations:
echo    - Use HTTPS in production
echo    - Implement proper secrets management
echo    - Set up network security groups
echo    - Regular security updates and patches
echo.

echo Deployment completed!
echo.
echo Press any key to continue...
pause >nul
