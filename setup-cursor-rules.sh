#!/bin/bash

# Cursor Rules Setup Script
# Bu script'i kullanarak yeni Next.js projelerine .cursorrules dosyasını ekleyebilirsin

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RULES_FILE="$SCRIPT_DIR/.cursorrules"
TARGET_PROJECT="$1"

# Renk kodları
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kullanım mesajı
if [ -z "$TARGET_PROJECT" ]; then
  echo -e "${YELLOW}Usage:${NC} ./setup-cursor-rules.sh <project-path>"
  echo ""
  echo "Examples:"
  echo "  ./setup-cursor-rules.sh ~/Projects/my-new-app"
  echo "  ./setup-cursor-rules.sh ../my-nextjs-project"
  exit 1
fi

# Rules dosyasının varlığını kontrol et
if [ ! -f "$RULES_FILE" ]; then
  echo -e "${RED}❌ Rules file not found at $RULES_FILE${NC}"
  exit 1
fi

# Target projenin varlığını kontrol et
if [ ! -d "$TARGET_PROJECT" ]; then
  echo -e "${RED}❌ Target project directory not found: $TARGET_PROJECT${NC}"
  exit 1
fi

# .cursorrules dosyasını kopyala
TARGET_RULES="$TARGET_PROJECT/.cursorrules"

if [ -f "$TARGET_RULES" ]; then
  echo -e "${YELLOW}⚠️  .cursorrules already exists in target project${NC}"
  read -p "Overwrite? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
fi

cp "$RULES_FILE" "$TARGET_RULES"
echo -e "${GREEN}✅ Cursor rules copied to $TARGET_PROJECT${NC}"
echo -e "${GREEN}✅ File: $TARGET_RULES${NC}"

