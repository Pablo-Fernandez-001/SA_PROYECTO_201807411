:: 1. ¡REEMPLAZA ESTO CON TU PROJECT ID REAL DE GOOGLE CLOUD!
set PROJECT_ID=proyecto-sa-492706
set REGISTRY=us-central1-docker.pkg.dev/%PROJECT_ID%/delivereats
set VERSION=v1.6

:: ════════════════════════════════════════════════════════════
:: MICROSERVICIOS
:: ════════════════════════════════════════════════════════════

:: Auth Service
docker build -t %REGISTRY%/auth-service:%VERSION% -f ./auth-service/Dockerfile .
docker push %REGISTRY%/auth-service:%VERSION%

:: Catalog Service
docker build -t %REGISTRY%/catalog-service:%VERSION% -f ./catalog-service/Dockerfile .
docker push %REGISTRY%/catalog-service:%VERSION%

:: Orders Service
docker build -t %REGISTRY%/orders-service:%VERSION% -f ./orders-service/Dockerfile .
docker push %REGISTRY%/orders-service:%VERSION%

:: Delivery Service
docker build -t %REGISTRY%/delivery-service:%VERSION% -f ./delivery-service/Dockerfile .
docker push %REGISTRY%/delivery-service:%VERSION%

:: Notification Service
docker build -t %REGISTRY%/notification-service:%VERSION% -f ./notification-service/Dockerfile .
docker push %REGISTRY%/notification-service:%VERSION%

:: FX Service
docker build -t %REGISTRY%/fx-service:%VERSION% -f ./fx-service/Dockerfile .
docker push %REGISTRY%/fx-service:%VERSION%

:: Payment Service
docker build -t %REGISTRY%/payment-service:%VERSION% -f ./payment-service/Dockerfile .
docker push %REGISTRY%/payment-service:%VERSION%

:: ════════════════════════════════════════════════════════════
:: API GATEWAY & FRONTEND
:: ════════════════════════════════════════════════════════════

:: API Gateway
docker build -t %REGISTRY%/api-gateway:%VERSION% -f ./api-gateway/Dockerfile .
docker push %REGISTRY%/api-gateway:%VERSION%

:: Frontend
docker build -t %REGISTRY%/frontend:%VERSION% -f ./frontend/Dockerfile .
docker push %REGISTRY%/frontend:%VERSION%

echo ¡Todas las imagenes han sido construidas y subidas a Artifact Registry!


gcloud run deploy proyecto-iac-frontend --image us-central1-docker.pkg.dev/proyecto-sa-492706/delivereats/frontend:v1.6 --region us-central1 --allow-unauthenticated