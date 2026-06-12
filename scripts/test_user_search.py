import urllib.request, json, sys

BASE = 'http://localhost:8080/api/v1'

# Register a test user
data = json.dumps({'username':'searchtest', 'password':'test123', 'nickname':'SearchTest'}).encode()
req = urllib.request.Request(BASE + '/auth/register', data=data, headers={'Content-Type':'application/json'})
try:
    r = urllib.request.urlopen(req, timeout=5)
    d = json.loads(r.read())
    token = d['data']['accessToken']
    print('Registered OK, got token')
except Exception as e:
    print('Register failed:', e)
    # Try login instead
    data = json.dumps({'username':'searchtest', 'password':'test123'}).encode()
    req = urllib.request.Request(BASE + '/auth/login', data=data, headers={'Content-Type':'application/json'})
    try:
        r = urllib.request.urlopen(req, timeout=5)
        d = json.loads(r.read())
        token = d['data']['accessToken']
        print('Login OK, got token')
    except Exception as e2:
        print('Login also failed:', e2)
        sys.exit(1)

# Search users (requires auth)
req = urllib.request.Request(BASE + '/users/search?keyword=test',
    headers={'Authorization': 'Bearer ' + token})
try:
    r = urllib.request.urlopen(req, timeout=5)
    d = json.loads(r.read())
    print('User search: success=' + str(d.get('success')))
    users = d.get('data', [])
    print('Results: ' + str(len(users)))
    for u in users:
        print('  - ' + u.get('username','') + ' (' + u.get('nickname','') + ')')
except urllib.error.HTTPError as e:
    print('HTTP Error: ' + str(e.code))
    print(e.read().decode())
except Exception as e:
    print('Error: ' + str(e))
