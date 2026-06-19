import codecs
import re

app_path = r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx'

with codecs.open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace local providers state with useAppStore
providers_regex = r"const \[providers, setProviders\] = useState\(\[\s*\{.*?\}\s*\]\);"
content = re.sub(providers_regex, "const { providers, setProviders } = useAppStore();", content, flags=re.DOTALL)

with codecs.open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Providers migration script complete.")
