#!/usr/bin/env bash
# Обновление существующего Todo; первоначальная установка описана в docs/vps.md.
set -euo pipefail
incoming=${1:?Укажите каталог архива}
expected=${2:?Укажите полный SHA ожидаемого коммита}
[[ "$expected" =~ ^[a-f0-9]{40}$ ]] || { echo 'Некорректный SHA' >&2; exit 1; }
cd "$incoming"
sha256sum -c todo-server.tgz.sha256
[[ "$(tar -xOf todo-server.tgz REVISION)" == "$expected" ]] || { echo 'Архив содержит другой коммит' >&2; exit 1; }
test -L /opt/todo/current
exec 9>/opt/todo/.deploy.lock
flock -n 9 || { echo 'Уже выполняется другое обновление' >&2; exit 1; }
previous=$(readlink -f /opt/todo/current)
if [[ "$(cat "$previous/REVISION")" == "$expected" ]]; then
    echo "Коммит $expected уже установлен."
    exit 0
fi
sudo -v
configuration=$(sudo /usr/local/bin/node --env-file=/etc/todo.env --input-type=module -e 'console.log(new URL(process.env.APP_ORIGIN).host); console.log(process.env.DATABASE_PATH || "/var/lib/todo/todo.sqlite")')
health_host=${configuration%%$'\n'*}
database=${configuration#*$'\n'}
[[ "$database" == /* ]] || { echo 'DATABASE_PATH должен быть абсолютным' >&2; exit 1; }
stamp=$(date -u +%Y%m%dT%H%M%SZ)
release=$(mktemp -d "/opt/todo/releases/$stamp-XXXXXX")
tar --no-same-owner -xzf todo-server.tgz -C "$release"
[[ "$(cat "$release/REVISION")" == "$expected" ]]
test -f "$release/server/index.js"
test -f "$release/dist/sw.js"
grep -q 'Content-Security-Policy' "$release/dist/index.html"
cp -a --update=none "$previous/dist/." "$release/dist/"
find "$release" -type d -exec chmod 755 {} +
find "$release" -type f -exec chmod 644 {} +
sudo install -d -m 700 /var/backups/todo
sudo /usr/local/bin/node "$previous/deploy/backup.mjs" "$database" "/var/backups/todo/before-update-$stamp-$$.sqlite"
next="/opt/todo/current.next-$stamp-$$"
ln -s "$release" "$next"
mv -Tf "$next" /opt/todo/current
if ! sudo systemctl restart todo || ! curl -fsS --retry 5 --retry-connrefused --retry-delay 1 --max-time 10 -H "Host: $health_host" http://127.0.0.1:4001/api/health; then
    echo 'Проверка запуска не прошла. Возвращаем предыдущий код.' >&2
    ln -s "$previous" "$next"
    mv -Tf "$next" /opt/todo/current
    sudo systemctl restart todo
    exit 1
fi
printf '\nУстановлен коммит: %s\nПредыдущий релиз: %s\n' "$(cat /opt/todo/current/REVISION)" "$previous"
sudo systemctl status todo --no-pager
