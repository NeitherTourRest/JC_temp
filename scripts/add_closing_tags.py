with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the position after the last indoor content and before <script
script_pos = content.find('<script')

# Go backwards from script_pos to find the end of the template content
# We need to find the last </template> (should be from v-else) and add closing tags after it
last_template_close = content.rfind('</template>', 0, script_pos)
print(f'Last </template> before script: {last_template_close}')

# Check if there are closing tags for el-dialog and DefaultLayout between here and script
between = content[last_template_close:script_pos]
print(f'Content between </template> and <script:')
print(repr(between[:50]))

# Check if el-dialog close exists
if '</el-dialog>' not in between and '</el-dialog>' not in content[:last_template_close]:
    print('Missing </el-dialog> after </template>')
    # Add all missing closing tags
    closing_tags = '\n        </div>\n      </div>\n    </el-dialog>\n  </DefaultLayout>\n</template>\n'
    insert_pos = last_template_close + len('</template>')
    content = content[:insert_pos] + closing_tags + content[insert_pos:]
    print(f'Added closing tags. New length: {len(content)}')
    with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'w', encoding='utf-8') as f:
        f.write(content)
else:
    print('Closing tags exist')
