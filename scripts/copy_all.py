import shutil, os

files = {
    r'D:\JC\scripts\spot_list_v2.txt': r'D:\JC\frontend\src\views\spot\SpotListView.vue',
    r'D:\JC\scripts\diary_list_v2.txt': r'D:\JC\frontend\src\views\diary\DiaryListView.vue',
    r'D:\JC\scripts\login_v2.txt': r'D:\JC\frontend\src\views\auth\LoginView.vue',
}

for src, dst in files.items():
    shutil.copy(src, dst)
    print(f'Copied: {os.path.basename(src)} -> {os.path.basename(dst)}')
