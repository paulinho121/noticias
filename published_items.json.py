
import requests
import json

url = "https://aozbgeguelpphxhptrwy.supabase.co/rest/v1/feed_items?status=eq.published&select=id,rewritten_title,slug,published_url&order=processed_at.desc&limit=5"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvemJnZWd1ZWxwcGh4aHB0cnd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTc4NzEsImV4cCI6MjA4MjQzMzg3MX0.4aDZbNNbFlXfwr9sGuk6_CXwI-MaBea2IJATfpy7EQQ",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvemJnZWd1ZWxwcGh4aHB0cnd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1Nzg3MSwiZXhwIjoyMDgyNDMzODcxfQ.nJwzX_HCfXIICWzvfW5tI0gbCtxrU6oclCEYrUK82UM"
}

response = requests.get(url, headers=headers)
with open("published_items.json", "w", encoding="utf-8") as f:
    if response.status_code == 200:
        json.dump(response.json(), f, indent=2, ensure_ascii=False)
        print("Success: saved to published_items.json")
    else:
        print(f"Error {response.status_code}: {response.text}")
