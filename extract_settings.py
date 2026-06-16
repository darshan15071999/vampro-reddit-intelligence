import codecs
import re
with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_index = content.find("activeTab === 'settings' && (")
if start_index != -1:
    end_index = content.find("activeTab ===", start_index + 100)
    if end_index == -1: end_index = content.find("</main>", start_index)
    with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\settings_block.txt', 'w', encoding='utf-8') as out:
        out.write(content[start_index:end_index])
    print('Successfully extracted settings block')
else:
    print('Settings block not found')
