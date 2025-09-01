#!/bin/sh

# Set default values
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_NAME=${DB_NAME:-openaccounting}
DB_PORT=${DB_PORT:-3306}
PORT=${PORT:-8080}
HOST=${HOST:-0.0.0.0}

# Create database address string - use Cloud SQL connector when available
if printf '%s' "$DB_HOST" | grep -q '^/cloudsql/'; then
    # For Cloud SQL Proxy, use Unix socket format
    DB_ADDRESS="unix(${DB_HOST})"
else
    # For TCP connections, use tcp wrapper
    DB_ADDRESS="tcp(${DB_HOST}:${DB_PORT})"
fi

# Generate config.json with Open Accounting Server format
printf '{\n  "WebUrl": "",\n  "Address": "%s",\n  "Port": %s,\n  "ApiPrefix": "",\n  "KeyFile": "",\n  "CertFile": "",\n  "DatabaseAddress": "%s",\n  "Database": "%s",\n  "User": "%s",\n  "Password": "%s",\n  "MailgunDomain": "",\n  "MailgunKey": "",\n  "MailgunEmail": "",\n  "MailgunSender": ""\n}\n' "$HOST" "$PORT" "$DB_ADDRESS" "$DB_NAME" "$DB_USER" "$DB_PASSWORD" > /app/config.json

# Debug: Show the final config
echo "=== Generated config.json ==="
cat /app/config.json
echo "=== Connection Info (sanitized, password hidden) ==="
echo "DatabaseAddress: ${DB_ADDRESS}"
echo "Database: ${DB_NAME}"
echo "User: ${DB_USER}"
echo "Password: *****"
echo "=== Environment Variables ==="
echo "DB_HOST: $DB_HOST"
echo "DB_USER: $DB_USER" 
echo "DB_NAME: $DB_NAME"
echo "DB_PORT: $DB_PORT"
echo "PORT: $PORT"
echo "HOST: $HOST"
echo "============================="

# Execute the main command
exec "$@"
