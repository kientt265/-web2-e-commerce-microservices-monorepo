#!/bin/bash

CONNECT_URL="http://localhost:8083"

echo "🔍 Checking connector status..."

connectors=$(curl -s $CONNECT_URL/connectors?expand=status)

echo "$connectors" | jq -r 'to_entries[] | @base64' | while read -r row; do
  _jq() {
    echo "$row" | base64 --decode | jq -r "$1"
  }

  name=$(_jq '.key')

  # Check task state
  task_states=$(echo "$row" | base64 --decode | jq -r '.value.status.tasks[].state')

  failed=false

  for state in $task_states; do
    if [ "$state" != "RUNNING" ]; then
      failed=true
    fi
  done

  echo "👉 $name tasks: $task_states"

  if [ "$failed" = true ]; then
    echo "⚠️ Restarting $name ..."
    curl -s -X POST "$CONNECT_URL/connectors/$name/restart?includeTasks=true&onlyFailed=true" > /dev/null
    echo "✅ Restarted $name"
  fi

done

echo "🎯 Done"