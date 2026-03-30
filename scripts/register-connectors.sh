#!/bin/bash

CONNECT_URL="http://localhost:8083/connectors"

for file in connectors/*.json
do
  name=$(jq -r .name "$file")

  echo "Processing $name..."

  status=$(curl -s -o /dev/null -w "%{http_code}" "$CONNECT_URL/$name")

  if [ "$status" = "200" ]; then
    echo "Updating $name..."
    curl -s -X PUT "$CONNECT_URL/$name/config" \
      -H "Content-Type: application/json" \
      -d @<(jq .config "$file")
  else
    echo "Creating $name..."
    curl -s -X POST "$CONNECT_URL" \
      -H "Content-Type: application/json" \
      -d @"$file"
  fi

  echo ""
done