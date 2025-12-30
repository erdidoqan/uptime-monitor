#!/bin/bash

# Monitör check sistemini test etmek için script

echo "🔍 Worker health check..."
curl -s http://localhost:8787/health | jq .

echo ""
echo "🚀 Scheduled task'i tetikliyorum..."
curl -X POST http://localhost:8787/trigger \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

echo ""
echo "✅ Test tamamlandı!"

