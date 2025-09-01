# Build stage
FROM golang:1.21-alpine AS builder

# Install git and ca-certificates
RUN apk add --no-cache git ca-certificates

# Set working directory
WORKDIR /app

# Clone Open Accounting server
RUN git clone https://github.com/openaccounting/oa-server.git .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./core/server.go

# Runtime stage
FROM alpine:latest

# Install necessary packages
RUN apk add --no-cache bash

# Copy the binary from builder stage
COPY --from=builder /app/server /app/server

# Copy schema files
COPY --from=builder /app/schema.sql /app/schema.sql
COPY --from=builder /app/indexes.sql /app/indexes.sql

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh

# Make entrypoint script executable
RUN chmod +x /app/entrypoint.sh

# Set working directory
WORKDIR /app

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["/app/server"]
