# Статическая публикация с localStorage

Инструкция рассчитана на Ubuntu 24.04 LTS, домен `todo.example.com` и пользователя `deploy`. Замените домен, пользователя и `VPS_IP` своими значениями. Команды здесь — инструкция; приложение на ваш сервер ещё не отправлено.

Этот вариант размещает только клиент без серверных функций. Для аккаунтов и бота используйте [серверную инструкцию](vps.md).

В этом режиме: на VPS его раздаёт Nginx. Постоянный Node-процесс, PM2 и сервер разработки не нужны. По умолчанию задачи остаются в localStorage браузера, а не на VPS. Серверные маршруты этой конфигурацией не публикуются.

## 1. Проверка на своих данных до публикации

Продолжайте использовать **тот же браузер и адрес**, где уже есть ваши задачи: например `http://localhost:4000`. `127.0.0.1`, другой порт, HTTPS или домен VPS — другие хранилища. Не очищайте localStorage и не включайте `todo-api-url` для этой проверки.

До первой записи новой версии сохраните резервную копию. В консоли браузера на текущем адресе выполните:

```js
const todoBackup = localStorage.getItem("todo_app");
if (!todoBackup) throw new Error("todo_app отсутствует на этом адресе");
const todoBackupURL = URL.createObjectURL(
  new Blob([todoBackup], { type: "application/json" }),
);
const todoBackupLink = document.createElement("a");
todoBackupLink.href = todoBackupURL;
todoBackupLink.download = "todo_app.backup.json";
todoBackupLink.click();
setTimeout(() => URL.revokeObjectURL(todoBackupURL), 1000);
```

Положите файл вне папки проекта. Он содержит ваши задачи; не добавляйте его в Git и не помещайте в `dist/`.

Запустите `npm run watch`, откройте исходный адрес и проверьте создание/редактирование/удаление задач, Show more, перенос между проектами, Markdown, закрепление, фильтры, Grid/List/Kanban и перезагрузку страницы. Часы в хедере показывают местное время браузера и обновляются каждую секунду. Для проверки мобильного вида задайте ширину 360 px в инструментах разработчика.

Если нужно восстановить резервную копию, остановите изменения в интерфейсе, откройте консоль **на исходном адресе**, затем выберите JSON-файл:

```js
const todoRestoreInput = document.createElement("input");
todoRestoreInput.type = "file";
todoRestoreInput.accept = ".json,application/json";
todoRestoreInput.onchange = async () => {
  const file = todoRestoreInput.files[0];
  if (!file) return;
  const raw = await file.text();
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.projects)) throw new Error("Неверный файл");
  if (!confirm("Заменить данные этого адреса резервной копией?")) return;
  localStorage.setItem("todo_app", raw);
  location.reload();
};
todoRestoreInput.click();
```

На домене VPS localStorage сначала будет пустым. Чтобы перенести задачи туда, используйте этот же способ восстановления уже на **окончательном HTTPS-домене**. Исходные данные localhost останутся на месте. Файл читается браузером, автоматически на сервер не загружается. HTTP → HTTPS тоже меняет хранилище: переносите данные после настройки сертификата.

## 2. Коммит и сборка локально

Для сборки рекомендуется Node.js 24 LTS (см. `.nvmrc`, минимум 24), для браузерных проверок — установленный Chromium Playwright.

```sh
npm ci
npm run format:check
npm test
npx playwright install chromium
npm run test:e2e
npm audit
npm run build
```

После проверки выполните ваш коммит и push:

```sh
git status
git add src scripts tests deploy docs README.md package.json package-lock.json webpack.config.js playwright.config.js .gitignore .nvmrc
git commit -m "Refactor Todo workspace and document deployment"
git push
```

В старой истории репозитория некоторые файлы `dist/` уже отслеживаются, хотя папка находится в `.gitignore`. Чтобы Git хранил исходники, а сборка всегда создавалась заново, можно один раз выполнить `git rm -r --cached dist` и включить это в свой коммит. Это убирает `dist/` только из индекса Git, локальная сборка остаётся. Проверьте итоговый diff перед коммитом. Не публикуйте dev-сборку из `.cache/dev/`.

Соберите архив **всей** папки `dist/`: нужны также отдельные модули Markdown, CSS, иконки и лицензионные файлы. Одного `main.js` недостаточно.

```sh
tar -czf /tmp/todo-dist.tgz -C dist .
(cd /tmp && shasum -a 256 todo-dist.tgz > todo-dist.tgz.sha256)
git rev-parse HEAD > /tmp/todo-dist.revision
scp /tmp/todo-dist.tgz /tmp/todo-dist.tgz.sha256 /tmp/todo-dist.revision deploy@VPS_IP:/tmp/
scp deploy/todo.nginx.conf deploy@VPS_IP:/tmp/todo.nginx.conf
ssh deploy@VPS_IP
```

## 3. Подготовка VPS

Создайте DNS A-запись домена на IP VPS. AAAA-запись добавляйте только при работающем IPv6. Далее команды выполняются на VPS под пользователем с sudo:

```sh
sudo apt update
sudo apt install nginx rsync snapd
sudo snap install --classic certbot
sudo install -d -o "$USER" -g www-data -m 755 /var/www/todo /var/www/todo/releases
```

Этот вариант устанавливает Certbot через Snap по официальной инструкции. Если Certbot уже установлен другим способом, не устанавливайте второй экземпляр: используйте существующую установку и её способ продления либо выполните миграцию по документации Certbot.

Разрешите входящие TCP 80 и 443 в firewall VPS/провайдера. SSH также должен оставаться доступным. Если уже используется UFW, сначала разрешите свой SSH-порт (ниже пример для стандартного OpenSSH), затем Nginx:

```sh
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
```

Не включайте и не меняйте остальные правила firewall вслепую на сервере с другими сервисами.

## 4. Установка сборки

Проверьте контрольную сумму и состав архива. Внутри должны быть только собранные HTML/JS/CSS, изображения и лицензии. Исходники, `.git`, `node_modules`, `.cache`, JSON-бэкапы и `.env` не публикуются.

```sh
(cd /tmp && sha256sum -c todo-dist.tgz.sha256)
tar -tzf /tmp/todo-dist.tgz
```

Продолжайте только при успешной проверке. Запишите цель текущего релиза перед переключением, чтобы иметь точный адрес для отката:

```sh
readlink -f /var/www/todo/current  # при первом выпуске ссылка ещё отсутствует
(
set -eu
test ! -e /var/www/todo/current.next
test ! -L /var/www/todo/current.next
if [ -e /var/www/todo/current ]; then
  test -L /var/www/todo/current
fi
todo_release="/var/www/todo/releases/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir "$todo_release"
tar -xzf /tmp/todo-dist.tgz -C "$todo_release"
test -f "$todo_release/index.html"
grep -q 'Content-Security-Policy' "$todo_release/index.html"
# Сохранить старые файлы с хешами для уже открытых вкладок после обновления.
if [ -L /var/www/todo/current ]; then
  rsync -a --ignore-existing /var/www/todo/current/ "$todo_release/"
fi
find "$todo_release" -type d -exec chmod 755 {} +
find "$todo_release" -type f -exec chmod 644 {} +
ln -s "$todo_release" /var/www/todo/current.next
mv -Tf /var/www/todo/current.next /var/www/todo/current
)
```

Подоболочка с `set -eu` останавливает установку при ошибке до переключения сайта. Если `current.next` остался от прерванного запуска, проверьте его цель и удалите только эту временную ссылку перед повтором. `current` должен быть символьной ссылкой, не директорией. Все дальнейшие обновления устанавливаются теми же командами.

Измените `server_name todo.example.com` в `/tmp/todo.nginx.conf` на свой домен, например редактором:

```sh
nano /tmp/todo.nginx.conf
sudo install -m 644 /tmp/todo.nginx.conf /etc/nginx/sites-available/todo
sudo ln -s /etc/nginx/sites-available/todo /etc/nginx/sites-enabled/todo
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx
```

При повторной настройке символьную ссылку создавать заново не нужно. Эта конфигурация не заменяет другие сайты на сервере. Nginx раздаёт только `/var/www/todo/current`, а не исходный репозиторий, `.git`, резервные копии или `node_modules`.

## 5. HTTPS и проверка

```sh
sudo /snap/bin/certbot --nginx -d todo.example.com --redirect
sudo /snap/bin/certbot renew --dry-run
curl -I https://todo.example.com
```

Выберите свой email для уведомлений Certbot. Установку Snap можно проверить через `snap services certbot`; имя механизма автоматического продления зависит от способа установки. Проверьте, что таймер продления сертификата включён: `systemctl list-timers --all | rg certbot` (если `rg` отсутствует, используйте `grep certbot`). Не запускайте приложение через HTTP перед переносом данных — `crypto.randomUUID()` требует защищённый контекст вне localhost.

На окончательном HTTPS-адресе проверьте:

- Интерфейс, создание задачи, часы, Markdown и перезагрузку страницы.
- Заголовки CSP, `X-Content-Type-Options`, `Referrer-Policy` и `X-Frame-Options` в ответе Nginx.
- Отсутствие внешних запросов в Network при пассивном просмотре задач; загрузку модулей только с вашего домена.
- Недоступность `/.git/config`, `/package.json`, `/api/workspace` (в статическом режиме API отключён).
- Перенос резервной копии только в браузере, если нужны ваши локальные задачи на новом адресе.

Для личного приложения можно дополнительно ограничить доступ на уровне VPN или Nginx Basic Auth. В этом режиме вход в аккаунт отключён. Посетители сайта не получают ваши задачи: каждый видит своё localStorage. Пользователь с доступом к вашему профилю браузера может читать ваши локальные данные.

## 6. Обновление и откат

При обновлении: проверьте и закоммитьте исходники, выполните `npm ci`, тесты и `npm run build`, отправьте новый архив и повторите шаг 4. Настройки Nginx и сертификат менять не требуется. Обновление файлов приложения не очищает localStorage на неизменном домене.

Для отката выберите конкретную предыдущую папку из `/var/www/todo/releases`:

```sh
ls -1 /var/www/todo/releases
# Подставьте существующий идентификатор предыдущего релиза.
(
set -eu
test -f /var/www/todo/releases/PREVIOUS_RELEASE/index.html
test ! -e /var/www/todo/current.next
test ! -L /var/www/todo/current.next
ln -s /var/www/todo/releases/PREVIOUS_RELEASE /var/www/todo/current.next
mv -Tf /var/www/todo/current.next /var/www/todo/current
)
```

Обновите страницу в браузере. Откат файлов не откатывает данные — для этого используйте резервную копию. Старые релизы и резервные копии удаляйте только после проверки нового релиза.

## 7. Альтернатива: сборка из Git на VPS

Основной способ выше публикует готовую локальную сборку и не требует Node на VPS. Если предпочитаете `git push` → сборку на VPS, установите Node 24 LTS, клонируйте репозиторий **вне** `/var/www/todo/current`, например `~/build/to-do`, и собирайте конкретный уже проверенный commit:

```sh
git clone REPOSITORY_URL ~/build/to-do  # только при первом запуске
cd ~/build/to-do
git fetch origin
git checkout --detach COMMIT_SHA
npm ci
npm run build
tar -czf /tmp/todo-dist.tgz -C dist .
(cd /tmp && sha256sum todo-dist.tgz > todo-dist.tgz.sha256)
git rev-parse HEAD > /tmp/todo-dist.revision
```

Подставьте полный SHA своего коммита. Для приватного репозитория используйте SSH deploy key с доступом только на чтение; не помещайте токен в URL репозитория или HTML. Затем выполните шаг 4. Сам `git push` обновляет Git-репозиторий, но не переключает сайт. Отдельный build-hook/CI здесь не настроен.

## 8. Диагностика после выпуска

| Проблема                                       | Что проверить                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Nginx не запускается                           | `sudo nginx -t`, конфликт домена/порта с другими server-блоками                                  |
| 404 для JS или редактора                       | Передана ли вся папка dist, совпадает ли index.html с набором хешированных файлов                |
| Сертификат не выдаётся                         | DNS A/AAAA, доступность портов 80/443, отсутствие другого сайта для того же домена               |
| После обновления показывается старый интерфейс | Обновите страницу; index.html должен иметь запрет кеширования, ассеты — хеши                     |
| После переезда список пуст                     | Импортируйте backup на окончательном HTTPS-origin; VPS не имеет доступа к localStorage localhost |
| Ошибка при добавлении задачи                   | HTTPS, доступность localStorage, консоль браузера и CSP; backend по умолчанию отключён           |
| После rollback изменились задачи               | Откат кода не откатывает snapshot; восстановите backup отдельно                                  |

Полезные команды на сервере:

```sh
sudo systemctl status nginx --no-pager
sudo tail -n 50 /var/log/nginx/error.log
curl -I https://todo.example.com/index.html
curl -I https://todo.example.com/package.json
curl -I https://todo.example.com/.git/config
curl -I https://todo.example.com/api/workspace
```

Последние три запроса должны дать запрет/404, а не содержимое исходников или JSON задач. Для включения API перейдите на [серверную конфигурацию](vps.md). Не добавляйте `add_header` внутри location без повторения общей политики: Nginx может перестать наследовать заголовки уровня server.

Храните `/tmp/todo-dist.revision` вместе с записью релиза вне публичного каталога, чтобы связать релиз с commit. Контрольная сумма проверяет целостность передачи; она не заменяет проверку происхождения сборки.

## Источники

Конфигурация заголовков основана на [документации Nginx](https://nginx.org/en/docs/http/ngx_http_headers_module.html), TLS — на [инструкции Certbot для Nginx](https://certbot.eff.org/instructions?os=snap&ws=nginx) и [справке Ubuntu](https://ubuntu.com/server/docs/how-to/security/obtain-tls-certificates/). Действующий сервер и ваши DNS/SSH-параметры в этой работе не проверялись.

Runtime-рекомендация: [актуальные линии Node.js](https://nodejs.org/en/about/previous-releases). Инструкция предназначена для нового сайта на Ubuntu; параметры существующей инфраструктуры нужно согласовать с её настройками.
