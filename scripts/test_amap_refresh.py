import urllib.request, json, sys

BASE = 'http://localhost:8080/api/v1'

# Register test user
data = json.dumps({'username':'admin','password':'admin123','nickname':'Admin'}).encode()
req = urllib.request.Request(BASE + '/auth/register', data=data, headers={'Content-Type':'application/json'})
try:
    r = urllib.request.urlopen(req, timeout=5)
    token = json.loads(r.read())['data']['accessToken']
except:
    # Login instead
    data = json.dumps({'username':'admin','password':'admin123'}).encode()
    req = urllib.request.Request(BASE + '/auth/login', data=data, headers={'Content-Type':'application/json'})
    r = urllib.request.urlopen(req, timeout=5)
    token = json.loads(r.read())['data']['accessToken']

print('Auth OK, token obtained')

# Test Amap info
print('\n--- Testing Amap API via backend ---')
req = urllib.request.Request(BASE + '/admin/spots/refresh', data=b'', headers={'Authorization':'Bearer '+token}, method='POST')
try:
    r = urllib.request.urlopen(req, timeout=180)
    d = json.loads(r.read())
    print('Refresh response:', d)
except Exception as e:
    print('Error:', e)
    if hasattr(e, 'read'):
        print(e.read().decode())
