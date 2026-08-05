#!/bin/bash
# Harness Pre-Commit Hook
# Install: cp .harness/scripts/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

echo "🛡️  Running Harness Pre-Commit Gates..."

# Check for console.log
if grep -r "console.log" src/ --include="*.ts" --include="*.js" | grep -v "test" | grep -v "spec"; then
    echo "❌ console.log found in production code. Remove before committing."
    exit 1
fi

# Check for secrets
if grep -r "password\|secret\|token\|key" src/ --include="*.ts" | grep -v "test" | grep -v "// "; then
    echo "⚠️  Potential secret detected. Review manually."
fi

# Run lint
npm run lint || exit 1

# Run tests
npm run test:unit || exit 1

echo "✅ Pre-commit gates passed!"
