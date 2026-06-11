# -*- coding: utf-8 -*-
"""Print full database structure."""
import pymysql, sys

c = pymysql.connect(host='localhost', port=3306, user='root', password='root123', database='journeycraft', charset='utf8mb4').cursor()
c.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'journeycraft' AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME")
tables = [r[0] for r in c.fetchall()]

for t in tables:
    print('\n## %s' % t)
    c.execute("SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'journeycraft' AND TABLE_NAME = %s ORDER BY ORDINAL_POSITION", (t,))
    for col in c.fetchall():
        flags = []
        if col[3] == 'PRI': flags.append('PK')
        if col[3] == 'UNI': flags.append('UQ')
        if col[3] == 'MUL': flags.append('IDX')
        if col[5]: flags.append(col[5])
        flg = ' [' + ','.join(flags) + ']' if flags else ''
        nullable = 'Y' if col[2] == 'YES' else 'N'
        print('  %-30s %-25s %s %-20s%s' % (col[0], col[1], nullable, col[4] or '-', flg))

c.close()
