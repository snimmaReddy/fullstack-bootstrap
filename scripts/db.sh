#!/usr/bin/env bash
# Runs a MongoDB server for this project with its own data folder (.data/mongo),
# separate from any other MongoDB data on this machine.
#   scripts/db.sh start | stop | status
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/.data/mongo"
LOG="$ROOT/.data/mongod.log"
PIDFILE="$ROOT/.data/mongod.pid"
PORT="${MONGO_PORT:-27017}"
MONGOD="${MONGOD:-/opt/homebrew/opt/mongodb-community/bin/mongod}"

ping() { mongosh --quiet --port "$PORT" --eval 'db.runCommand({ping:1}).ok' >/dev/null 2>&1; }

case "${1:-}" in
  start)
    if ping; then echo "Something is already listening on port $PORT"; exit 0; fi
    mkdir -p "$DATA"
    # --fork is not supported on macOS, so background the process ourselves.
    nohup "$MONGOD" --dbpath "$DATA" --port "$PORT" --bind_ip 127.0.0.1 \
      --logpath "$LOG" --logappend --pidfilepath "$PIDFILE" >/dev/null 2>&1 &
    for _ in $(seq 1 30); do ping && { echo "MongoDB started on port $PORT (data: .data/mongo)"; exit 0; }; sleep 0.5; done
    echo "MongoDB did not start; see $LOG" >&2; exit 1
    ;;
  stop)
    if [[ -f "$PIDFILE" ]] && kill "$(cat "$PIDFILE")" 2>/dev/null; then
      rm -f "$PIDFILE"; echo "MongoDB stopped"
    else
      echo "MongoDB is not running (no live pid in $PIDFILE)"
    fi
    ;;
  status)
    mongosh --quiet --port "$PORT" --eval 'print("MongoDB " + db.version() + " is up on port '"$PORT"'")' 2>/dev/null || echo "MongoDB is down"
    ;;
  *)
    echo "Usage: scripts/db.sh start|stop|status" >&2; exit 1 ;;
esac
