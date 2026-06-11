# -*- coding: utf-8 -*-
"""Test search endpoints."""
import urllib.request, json, sys, os

sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://localhost:8080/api/v1'

def test(path, label):
    try:
        r = urllib.request.urlopen(BASE + path, timeout=5)
        d = json.loads(r.read())
        if d.get('success'):
            data = d.get('data', {})
            items = data.get('content', data if isinstance(data, list) else [])
            if not isinstance(items, list):
                items = [items]
            n = data.get('totalElements', len(items))
            print('OK: {} => {} results'.format(label, n))
            for item in items[:2]:
                if isinstance(item, dict):
                    name = item.get('name') or item.get('title') or '?'
                    print('   - ' + name)
        else:
            print('FAIL: {} => {}'.format(label, d.get('message', 'unknown')))
    except Exception as e:
        print('ERROR: {} => {}'.format(label, e))


if __name__ == '__main__':
    tests = [
        ('/foods/search?keyword=Lanzhou', 'Food by restaurant name'),
        ('/foods/search?keyword=spicy', 'Food by description'),
        ('/foods/search?keyword=Pizza', 'Food by name'),
    ]

    try:
        r = urllib.request.urlopen(BASE + '/diaries?size=1', timeout=5)
        d = json.loads(r.read())
        if d.get('success') and d['data']['content']:
            first = d['data']['content'][0]
            title = first['title'][:4]
            content = first['content'][:4]
            dest = first.get('destination', '')[:4]
            if title: tests.append(('/diaries/search?keyword=' + title, 'Diary by title'))
            if content: tests.append(('/diaries/search?keyword=' + content, 'Diary by content'))
            if dest: tests.append(('/diaries/search?keyword=' + dest, 'Diary by destination'))
    except Exception as e:
        print('SKIP diary test: ' + str(e))

    print()
    for path, label in tests:
        test(path, label)
