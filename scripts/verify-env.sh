#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# AI Content Studio - Environment Variable Verification
# =============================================================================
# Run before deployment to verify all required variables are set.
# Usage: ./scripts/verify-env.sh
# Exit code: 0 = all required set, 1 = missing required variables
# =============================================================================

REQUIRED_VARS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  NEXT_PUBLIC_APP_URL
  SUPABASE_SERVICE_ROLE_KEY
  DATABASE_URL
  ANTHROPIC_API_KEY
  BFL_API_KEY
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  STRIPE_STARTER_PRICE_ID
  STRIPE_PRO_PRICE_ID
  STRIPE_BUSINESS_PRICE_ID
)

OPTIONAL_VARS=(
  N8N_WEBHOOK_URL
  N8N_WEBHOOK_SECRET
  FAL_KEY
  RUNWAYML_API_SECRET
  ELEVENLABS_API_KEY
  ELEVENLABS_VOICE_ID_JP_FEMALE
  HEYGEN_API_KEY
  HEYGEN_DEFAULT_AVATAR_ID
  HEYGEN_JP_VOICE_ID
)

required_set=0
required_total=${#REQUIRED_VARS[@]}
optional_set=0
optional_total=${#OPTIONAL_VARS[@]}
missing_required=0

echo "============================================"
echo " AI Content Studio - Environment Check"
echo "============================================"
echo ""

echo "--- Required Variables ---"
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "  MISSING (required): $var"
    missing_required=$((missing_required + 1))
  else
    echo "  OK: $var"
    required_set=$((required_set + 1))
  fi
done

echo ""
echo "--- Optional Variables ---"
for var in "${OPTIONAL_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "  MISSING (optional): $var"
  else
    echo "  OK: $var"
    optional_set=$((optional_set + 1))
  fi
done

echo ""
echo "============================================"
echo " Summary: ${required_set}/${required_total} required set, ${optional_set}/${optional_total} optional set"
echo "============================================"

if [[ $missing_required -gt 0 ]]; then
  echo ""
  echo "ERROR: ${missing_required} required variable(s) missing. Deployment will fail."
  exit 1
else
  echo ""
  echo "All required variables are set."
  exit 0
fi
