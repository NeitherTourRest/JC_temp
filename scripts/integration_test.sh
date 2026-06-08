# JourneyCraft Integration Test Script
# Tests the full user journey: register → login → search → navigate → diary → favorites

BASE="http://127.0.0.1:8080/api/v1"
PASS=0; FAIL=0

test() { 
  echo -n "TEST:  ... "
  if eval "" > /dev/null 2>&1; then echo "OK"; PASS=; else echo "FAIL"; FAIL=; fi
}

echo "=== JourneyCraft Integration Tests ==="
echo ""

# Auth
R=
TOKEN=

test "Register user" "echo '' | grep -q 'success.*true'"
test "Login user" "curl -s -X POST '/auth/login' -H 'Content-Type: application/json' -d '{\"username\":\"test1\",\"password\":\"123456\"}' | grep -q 'accessToken'"

# Spots
test "Search spots" "curl -s '/spots?size=3' | grep -q 'totalElements'"
test "Spot detail" "curl -s '/spots/1' | grep -q 'recommendedFoods'"
test "Spot recommend" "curl -s '/spots/recommend?topK=5' | grep -q 'success.*true'"

# Food
test "Food search" "curl -s '/foods/search?keyword=烤' | grep -q 'content'"

# Diary (needs auth)
test "Create diary" "curl -s -X POST '/diaries' -H 'Content-Type: application/json' -H 'Authorization: Bearer ' -d '{\"title\":\"IT Test Diary\",\"content\":\"Automated test content\"}' | grep -q 'id'"
test "List diaries" "curl -s '/diaries?size=1' | grep -q 'content'"

echo ""
echo "=== Results:  passed,  failed ==="
