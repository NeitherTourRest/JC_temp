import shutil
# Copy the write-once template file to the actual location
shutil.copy(r'D:\JC\scripts\home_template.txt', r'D:\JC\frontend\src\views\home\HomeView.vue')
print('HomeView overwritten')
