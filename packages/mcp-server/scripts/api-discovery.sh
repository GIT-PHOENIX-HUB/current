#!/bin/bash
# =============================================================================
# Service Fusion API v1 — Endpoint Discovery Script
# =============================================================================
# Probes plausible v1 endpoints to discover what's actually available.
# Authenticates via POST /oauth/access_token with JSON body.
#
# Prerequisites:
#   export SF_CLIENT_ID="your-client-id"
#   export SF_CLIENT_SECRET="your-client-secret"
#
# Usage:
#   ./api-discovery.sh                    # Run full discovery
#   ./api-discovery.sh --auth-only        # Just test authentication
#   ./api-discovery.sh --output FILE      # Save results to file
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BASE_URL="https://api.servicefusion.com"
AUTH_URL="$BASE_URL/oauth/access_token"
API_BASE="$BASE_URL/v1"
OUTPUT_FILE=""
AUTH_ONLY=false

# Parse args
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --auth-only) AUTH_ONLY=true ;;
        --output) OUTPUT_FILE="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Check credentials
if [[ -z "${SF_CLIENT_ID:-}" ]] || [[ -z "${SF_CLIENT_SECRET:-}" ]]; then
    echo -e "${RED}ERROR: Set SF_CLIENT_ID and SF_CLIENT_SECRET environment variables${NC}"
    echo ""
    echo "  export SF_CLIENT_ID=\"your-client-id\""
    echo "  export SF_CLIENT_SECRET=\"your-client-secret\""
    exit 1
fi

# =============================================================================
# Authenticate
# =============================================================================

echo -e "${CYAN}[AUTH]${NC} Authenticating to $AUTH_URL..."

AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$AUTH_URL" \
    -H "Content-Type: application/json" \
    -d "{\"client_id\":\"$SF_CLIENT_ID\",\"client_secret\":\"$SF_CLIENT_SECRET\"}")

AUTH_STATUS=$(echo "$AUTH_RESPONSE" | tail -1)
AUTH_BODY=$(echo "$AUTH_RESPONSE" | sed '$d')

if [[ "$AUTH_STATUS" != "200" ]]; then
    echo -e "${RED}[AUTH FAILED]${NC} HTTP $AUTH_STATUS"
    echo "$AUTH_BODY" | head -5

    # Try form-encoded fallback
    echo -e "${YELLOW}[RETRY]${NC} Trying form-encoded auth..."
    AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$AUTH_URL" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=client_credentials&client_id=$SF_CLIENT_ID&client_secret=$SF_CLIENT_SECRET")

    AUTH_STATUS=$(echo "$AUTH_RESPONSE" | tail -1)
    AUTH_BODY=$(echo "$AUTH_RESPONSE" | sed '$d')

    if [[ "$AUTH_STATUS" != "200" ]]; then
        echo -e "${RED}[AUTH FAILED]${NC} Both JSON and form-encoded auth failed"
        echo "$AUTH_BODY" | head -5
        exit 1
    fi
    echo -e "${GREEN}[AUTH OK]${NC} Form-encoded auth succeeded (HTTP $AUTH_STATUS)"
else
    echo -e "${GREEN}[AUTH OK]${NC} JSON body auth succeeded (HTTP $AUTH_STATUS)"
fi

# Extract token
TOKEN=$(echo "$AUTH_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

if [[ -z "$TOKEN" ]]; then
    echo -e "${RED}[ERROR]${NC} Could not extract access_token from response"
    echo "$AUTH_BODY" | head -3
    exit 1
fi

echo -e "${GREEN}[TOKEN]${NC} Got token: ${TOKEN:0:20}..."

# Show token details
TOKEN_TYPE=$(echo "$AUTH_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"type={d.get('token_type','?')}, expires_in={d.get('expires_in','?')}\")" 2>/dev/null || echo "unknown")
echo -e "${CYAN}[TOKEN INFO]${NC} $TOKEN_TYPE"

if [[ "$AUTH_ONLY" == true ]]; then
    echo -e "\n${GREEN}Auth test complete.${NC}"
    exit 0
fi

# =============================================================================
# Discover Endpoints
# =============================================================================

echo ""
echo "============================================"
echo "  Service Fusion v1 API Discovery"
echo "============================================"
echo ""

# Results arrays
declare -a CONFIRMED_200=()
declare -a CONFIRMED_404=()
declare -a UNEXPECTED=()

# Endpoints to probe
# Known working (from existing tools):
#   /me, /customers, /jobs, /estimates, /invoices, /techs
#   /calendar-tasks, /job-statuses, /payment-types, /sources, /job-categories
#
# Candidates to discover:
ENDPOINTS=(
    # Known working
    "/me"
    "/customers"
    "/jobs"
    "/estimates"
    "/invoices"
    "/techs"
    "/calendar-tasks"
    "/job-statuses"
    "/payment-types"
    "/sources"
    "/job-categories"
    # Plausible new endpoints
    "/calls"
    "/services"
    "/materials"
    "/equipment"
    "/categories"
    "/appointments"
    "/bookings"
    "/contacts"
    "/locations"
    "/memberships"
    "/campaigns"
    "/employees"
    "/zones"
    "/shifts"
    "/notes"
    "/tags"
    "/documents"
    "/payments"
    "/voicemails"
    "/dispatch"
    "/technician-shifts"
    "/work-orders"
    "/leads"
    "/proposals"
    "/contracts"
    "/time-entries"
    "/time-logs"
    "/purchase-orders"
    "/vendors"
    "/warehouses"
    "/inventory"
    "/task-types"
    "/priorities"
    "/customer-types"
    "/job-types"
    "/estimate-statuses"
    "/invoice-statuses"
    "/business-units"
    "/tax-rates"
    "/terms"
    "/custom-fields"
    "/webhooks"
    "/reports"
    "/settings"
    "/users"
    "/roles"
    "/teams"
    "/areas"
    "/rate-sheets"
    "/labor-rates"
    "/discounts"
    "/line-items"
    "/service-agreements"
    "/recurring-services"
    "/membership-types"
    "/marketing"
)

probe_endpoint() {
    local endpoint=$1
    local url="$API_BASE$endpoint?per-page=1"

    local RESPONSE
    RESPONSE=$(curl -s -w "\n%{http_code}" -m 10 "$url" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" 2>/dev/null || echo -e "\n000")

    local STATUS=$(echo "$RESPONSE" | tail -1)
    local BODY=$(echo "$RESPONSE" | sed '$d')
    local PREVIEW=$(echo "$BODY" | head -c 200)

    if [[ "$STATUS" == "200" ]]; then
        echo -e "  ${GREEN}200${NC}  $endpoint  ${CYAN}$(echo "$PREVIEW" | head -c 80)${NC}"
        CONFIRMED_200+=("$endpoint")
    elif [[ "$STATUS" == "404" ]]; then
        echo -e "  ${RED}404${NC}  $endpoint"
        CONFIRMED_404+=("$endpoint")
    elif [[ "$STATUS" == "401" ]]; then
        echo -e "  ${YELLOW}401${NC}  $endpoint  (auth rejected)"
        UNEXPECTED+=("$STATUS $endpoint")
    elif [[ "$STATUS" == "403" ]]; then
        echo -e "  ${YELLOW}403${NC}  $endpoint  (forbidden — exists but no access)"
        UNEXPECTED+=("$STATUS $endpoint")
    elif [[ "$STATUS" == "000" ]]; then
        echo -e "  ${RED}---${NC}  $endpoint  (timeout/connection error)"
        UNEXPECTED+=("TIMEOUT $endpoint")
    else
        echo -e "  ${YELLOW}${STATUS}${NC}  $endpoint  ${PREVIEW:0:60}"
        UNEXPECTED+=("$STATUS $endpoint")
    fi

    # Rate limit: don't hammer the API
    sleep 0.3
}

# Also test POST availability on key endpoints
probe_post() {
    local endpoint=$1
    local url="$API_BASE$endpoint"

    # Send empty body to see if POST is accepted (expecting 400/422, not 404/405)
    local RESPONSE
    RESPONSE=$(curl -s -w "\n%{http_code}" -m 10 -X POST "$url" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{}' 2>/dev/null || echo -e "\n000")

    local STATUS=$(echo "$RESPONSE" | tail -1)

    if [[ "$STATUS" == "405" || "$STATUS" == "404" ]]; then
        echo -e "  POST ${RED}${STATUS}${NC}  $endpoint  (not supported)"
    elif [[ "$STATUS" == "400" || "$STATUS" == "422" || "$STATUS" == "200" || "$STATUS" == "201" ]]; then
        echo -e "  POST ${GREEN}${STATUS}${NC}  $endpoint  (POST supported!)"
    else
        echo -e "  POST ${YELLOW}${STATUS}${NC}  $endpoint"
    fi

    sleep 0.3
}

echo "Probing ${#ENDPOINTS[@]} GET endpoints..."
echo "──────────────────────────────────────────"

for ep in "${ENDPOINTS[@]}"; do
    probe_endpoint "$ep"
done

echo ""
echo "Testing POST support on confirmed endpoints..."
echo "──────────────────────────────────────────"

for ep in "${CONFIRMED_200[@]}"; do
    # Skip read-only endpoints
    if [[ "$ep" == "/me" || "$ep" == "/job-statuses" || "$ep" == "/payment-types" || "$ep" == "/sources" || "$ep" == "/job-categories" ]]; then
        continue
    fi
    probe_post "$ep"
done

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "============================================"
echo "  DISCOVERY RESULTS"
echo "============================================"
echo ""
echo -e "${GREEN}Confirmed 200 (${#CONFIRMED_200[@]} endpoints):${NC}"
for ep in "${CONFIRMED_200[@]}"; do
    echo "  ✅ GET $ep"
done

echo ""
echo -e "${RED}Confirmed 404 (${#CONFIRMED_404[@]} endpoints):${NC}"
for ep in "${CONFIRMED_404[@]}"; do
    echo "  ❌ $ep"
done

if [[ ${#UNEXPECTED[@]} -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}Unexpected (${#UNEXPECTED[@]} endpoints):${NC}"
    for item in "${UNEXPECTED[@]}"; do
        echo "  ⚠️  $item"
    done
fi

# =============================================================================
# Write output file
# =============================================================================

if [[ -n "$OUTPUT_FILE" ]]; then
    {
        echo "# Service Fusion v1 API Surface"
        echo ""
        echo "**Discovery Date:** $(date '+%Y-%m-%d %H:%M:%S')"
        echo "**Base URL:** $API_BASE"
        echo "**Auth:** POST $AUTH_URL"
        echo ""
        echo "## Confirmed Working (HTTP 200)"
        echo ""
        for ep in "${CONFIRMED_200[@]}"; do
            echo "- \`GET $ep\`"
        done
        echo ""
        echo "## Confirmed Not Found (HTTP 404)"
        echo ""
        for ep in "${CONFIRMED_404[@]}"; do
            echo "- \`$ep\`"
        done
        if [[ ${#UNEXPECTED[@]} -gt 0 ]]; then
            echo ""
            echo "## Unexpected Responses"
            echo ""
            for item in "${UNEXPECTED[@]}"; do
                echo "- $item"
            done
        fi
        echo ""
        echo "## Summary"
        echo ""
        echo "| Category | Count |"
        echo "|----------|-------|"
        echo "| Confirmed 200 | ${#CONFIRMED_200[@]} |"
        echo "| Confirmed 404 | ${#CONFIRMED_404[@]} |"
        echo "| Unexpected | ${#UNEXPECTED[@]} |"
        echo "| Total Probed | ${#ENDPOINTS[@]} |"
    } > "$OUTPUT_FILE"

    echo ""
    echo -e "${GREEN}Results saved to: $OUTPUT_FILE${NC}"
fi

echo ""
echo "Done. ${#CONFIRMED_200[@]} working / ${#CONFIRMED_404[@]} not found / ${#UNEXPECTED[@]} unexpected"
