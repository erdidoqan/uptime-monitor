#!/bin/bash

# Test screenshot API endpoint
# Usage: ./test-screenshot.sh <incident-id>

INCIDENT_ID=${1:-"46e2efe3-c108-4fd2-802e-cc2765393aa8"}
INTERNAL_TOKEN=${INTERNAL_API_TOKEN:-"28b63a105e10d8849405f7305fb997bf4caf793b7810598eabb1c161b299a4bf"}
BASE_URL=${BASE_URL:-"http://localhost:3000"}

echo "Testing screenshot API for incident: $INCIDENT_ID"
echo "URL: $BASE_URL/api/incidents/$INCIDENT_ID/screenshot"
echo ""

curl -X POST \
  "$BASE_URL/api/incidents/$INCIDENT_ID/screenshot" \
  -H "Authorization: Bearer $INTERNAL_TOKEN" \
  -H "Content-Type: application/json" \
  -v

echo ""
echo ""
echo "Done!"

