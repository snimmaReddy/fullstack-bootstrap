#!/usr/bin/env bash
# Runs a MongoDB server for this project with its own data folder (.data/mongo),
# separate from any other MongoDB data on this machine. Authentication is always on.
#
#   scripts/db.sh start        start mongod (auth on, localhost only)
#   scripts/db.sh init-users   first run only: create admin / upstart_api / upstart_viewer
#   scripts/db.sh stop | status
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/.data/mongo"
LOG="$ROOT/.data/mongod.log"
PIDFILE="$ROOT/.data/mongod.pid"
CREDS="$ROOT/.data/credentials.txt"
DEV_SETTINGS="$ROOT/api/appsettings.Development.json"
PORT="${MONGO_PORT:-27017}"
DB="${MONGO_DB:-upstart}"
MONGOD="${MONGOD:-/opt/homebrew/opt/mongodb-community/bin/mongod}"

ping() { mongosh --quiet --port "$PORT" --eval 'db.runCommand({ping:1}).ok' >/dev/null 2>&1; }

case "${1:-}" in
  start)
    if ping; then echo "Something is already listening on port $PORT"; exit 0; fi
    mkdir -p "$DATA"
    # --fork is not supported on macOS, so background the process ourselves.
    nohup "$MONGOD" --auth --dbpath "$DATA" --port "$PORT" --bind_ip 127.0.0.1 \
      --logpath "$LOG" --logappend --pidfilepath "$PIDFILE" >/dev/null 2>&1 &
    for _ in $(seq 1 30); do
      ping && { echo "MongoDB started on port $PORT (auth on, data: .data/mongo)"; exit 0; }
      sleep 0.5
    done
    echo "MongoDB did not start; see $LOG" >&2; exit 1
    ;;

  init-users)
    ping || { echo "MongoDB is not running. Run: scripts/db.sh start" >&2; exit 1; }
    ADMIN_PW="$(openssl rand -hex 20)"
    API_PW="$(openssl rand -hex 20)"
    VIEW_PW="$(openssl rand -hex 20)"

    # MongoDB's localhost exception allows creating the first user only while no users exist.
    if ! mongosh --quiet --port "$PORT" admin \
         --eval "db.createUser({user: 'admin', pwd: '$ADMIN_PW', roles: ['root']})" >/dev/null 2>&1; then
      echo "Users already exist, so nothing was changed. Credentials are in .data/credentials.txt" >&2
      exit 1
    fi

    mongosh --quiet --port "$PORT" -u admin -p "$ADMIN_PW" --authenticationDatabase admin "$DB" --eval "
      db.createUser({user: 'upstart_api', pwd: '$API_PW',
                     roles: [{role: 'readWrite', db: '$DB'}, {role: 'dbAdmin', db: '$DB'}]});
      db.createUser({user: 'upstart_viewer', pwd: '$VIEW_PW', roles: [{role: 'read', db: '$DB'}]});
    " >/dev/null

    API_URL="mongodb://upstart_api:$API_PW@localhost:$PORT/$DB?authSource=$DB"
    VIEW_URL="mongodb://upstart_viewer:$VIEW_PW@localhost:$PORT/$DB?authSource=$DB"
    ADMIN_URL="mongodb://admin:$ADMIN_PW@localhost:$PORT/?authSource=admin"

    (
      umask 077
      cat > "$CREDS" <<EOF
# MongoDB credentials for this project (local dev only, git-ignored). Created $(date '+%Y-%m-%d %H:%M').

# MongoDB Compass, read-only (view data, schema, validation, indexes):
$VIEW_URL

# MongoDB Compass / mongosh, full admin (edit data, manage users):
$ADMIN_URL

# The API (already written to api/appsettings.Development.json):
$API_URL
EOF
    )

    node -e '
      const fs = require("fs"); const [p, url] = process.argv.slice(1);
      const j = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
      j.Mongo = { ...(j.Mongo || {}), ConnectionString: url };
      fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
    ' "$DEV_SETTINGS" "$API_URL"

    echo "Created users admin, upstart_api, upstart_viewer."
    echo "API connection string written to api/appsettings.Development.json"
    echo "Compass connection strings: .data/credentials.txt"
    ;;

  stop)
    if [[ -f "$PIDFILE" ]] && kill "$(cat "$PIDFILE")" 2>/dev/null; then
      for _ in $(seq 1 30); do ping || break; sleep 0.5; done
      rm -f "$PIDFILE"; echo "MongoDB stopped"
    else
      echo "MongoDB is not running (no live pid in $PIDFILE)"
    fi
    ;;

  status)
    mongosh --quiet --port "$PORT" --eval 'print("MongoDB " + db.version() + " is up on port '"$PORT"'")' 2>/dev/null \
      || echo "MongoDB is down"
    ;;

  *)
    echo "Usage: scripts/db.sh start | init-users | stop | status" >&2; exit 1 ;;
esac
