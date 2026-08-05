#!/bin/bash
# Validate spec.md after changes

SPEC_PATH=$1

if [ -z "$SPEC_PATH" ]; then
    echo "Usage: validate-spec.sh <path-to-spec.md>"
    exit 1
fi

echo "🔍 Validating spec: $SPEC_PATH"

# Check EARS notation
if ! grep -q "shall\|When\|While\|Where\|If" "$SPEC_PATH"; then
    echo "⚠️  Warning: No EARS notation found in spec"
fi

# Check required sections
for section in "Overview" "Requirements" "Acceptance Criteria" "Definition of Done"; do
    if ! grep -q "$section" "$SPEC_PATH"; then
        echo "❌ Missing section: $section"
        exit 1
    fi
done

echo "✅ Spec validation passed!"
