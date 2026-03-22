#!/bin/bash

echo "🔍 SYSTEM CHECK STARTED..."
echo "----------------------------------"

echo "1️⃣ Checking music inference service..."
health=$(curl -s http://127.0.0.1:8000/health)

if [[ $health == *"ok"* ]]; then
  echo "✅ Music inference is running"
else
  echo "❌ Music inference NOT running"
  exit 1
fi

echo "----------------------------------"

echo "2️⃣ Generating test song..."

response=$(curl -s -X POST http://127.0.0.1:8000/generate-song \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer super_secret_token" \
  -d '{
    "title":"Test Song",
    "prompt":"emotional pop",
    "lyrics":"this is a test song",
    "language":"en",
    "durationSec":30,
    "plan":"free",
    "vocalType":"ai_female"
  }')

echo "$response"

if [[ $response == *"audioUrl"* ]]; then
  echo "✅ Song generation working"
else
  echo "❌ Song generation failed"
  exit 1
fi

echo "----------------------------------"

audio=$(echo $response | sed -n 's/.*"audioUrl":"\([^"]*\)".*/\1/p')

if [[ $audio == /* ]]; then
  full_url="http://127.0.0.1:8000$audio"
else
  full_url="$audio"
fi

echo "3️⃣ Checking audio file..."

status=$(curl -s -o /dev/null -w "%{http_code}" $full_url)

if [[ $status == "200" ]]; then
  echo "✅ Audio file accessible"
else
  echo "❌ Audio file NOT accessible"
  exit 1
fi

echo "----------------------------------"
echo "🎉 ALL SYSTEMS WORKING PERFECTLY"
