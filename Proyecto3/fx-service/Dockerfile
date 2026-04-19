FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY fx-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY fx-service/ .

# Compile proto files
RUN python -m grpc_tools.protoc \
    -I./app/protos \
    --python_out=./app/protos \
    --grpc_python_out=./app/protos \
    ./app/protos/fx_service.proto \
 && sed -i 's/^import fx_service_pb2 as fx__service__pb2/from app.protos import fx_service_pb2 as fx__service__pb2/' app/protos/fx_service_pb2_grpc.py

# Expose ports
EXPOSE 5000 50053

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start command
CMD ["python", "-m", "app.main"]
