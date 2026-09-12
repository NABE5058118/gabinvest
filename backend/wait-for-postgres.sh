#!/bin/sh
set -e

host="$1"
shift
cmd="$@"

until PGPASSWORD=postgres psql -h "$host" -U postgres -d gab_invest -c '\q' 2>/dev/null; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 2
done

>&2 echo "Postgres is up - executing command"
exec $cmd
