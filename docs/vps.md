# Полная публикация Todo: GitHub → VPS → поддомен → HTTPS → запуск

Это последовательная инструкция для **вашего Mac и нового VPS с Ubuntu 24.04 LTS**, публичным IPv4 и доступом root/sudo. Она использует существующий репозиторий `https://github.com/phil-cody/to-do`, Node.js 24, Nginx, systemd, SQLite и бота `@just_to_do_it_bot`.

Результат — приложение на адресе вида `https://my-todo-unique.duckdns.org`: любой пользователь Telegram входит в свой аккаунт и получает собственный Inbox. Данные хранятся на VPS; интерфейс поддерживает синхронизацию и офлайн-очередь. Бесплатными здесь могут быть поддомен и TLS-сертификат; сам VPS оплачивается или предоставляется отдельно.

Команды ниже — инструкция для самостоятельного выполнения. Git push, регистрация имени и установка на реальный сервер из этого чата не выполнялись. Для существующего VPS с другими сайтами используйте отдельный server-блок и предварительно проверьте занятые порты/правила firewall.

## Маршрут и обозначения

| Этап  | Где выполнять                               | Результат                                               |
| ----- | ------------------------------------------- | ------------------------------------------------------- |
| 1–3   | На Mac, в проекте                           | Копия задач, проверенный коммит, push в GitHub          |
| 4     | Панель VPS, Mac и первоначальный root-сеанс | Вход отдельным пользователем deploy по SSH              |
| 5     | Сайт DNS-сервиса и терминал                 | Бесплатный поддомен указывает на VPS                    |
| 6     | На VPS под deploy                           | Системный Node 24, Nginx, отдельный пользователь todo   |
| 7     | На Mac                                      | Архив точного коммита и доставка на VPS                 |
| 8–10  | На VPS под deploy                           | Настройки бота, служба, Nginx и HTTPS                   |
| 11    | В браузере и Telegram                       | Проверка аккаунтов, перенос старых задач, синхронизация |
| 12–15 | На VPS / на Mac по подписям                 | Копии, обновления, откат и диагностика                  |

Заменяйте следующие примеры своими значениями:

- `VPS_IP` — публичный IPv4 из панели провайдера, не адрес вашего Mac.
- `my-todo-unique.duckdns.org` — **ваш зарегистрированный** поддомен; это пример, его доступность не проверялась.
- `deploy` — пользователь для установки; `todo` — отдельный системный пользователь приложения.
- `main` — текущая ветка этого проекта. Если выберете другую ветку, замените её в командах Git.

Не вставляйте весь документ в терминал целиком. Выполняйте разделы по порядку; при ошибке остановитесь и устраните причину до следующего этапа.

## 1. Сохранить существующие задачи

**Где: браузер на прежнем `http://localhost:4000`.** Данные зависят от протокола, хоста, порта и профиля браузера. Не подменяйте localhost на 127.0.0.1 и не очищайте хранилище перед переносом.

Откройте инструменты разработчика → Console и выполните:

```js
const todoBackup = localStorage.getItem("todo_app");
if (!todoBackup) throw new Error("На этом адресе нет todo_app");
const todoBackupURL = URL.createObjectURL(
  new Blob([todoBackup], { type: "application/json" }),
);
const todoBackupLink = document.createElement("a");
todoBackupLink.href = todoBackupURL;
todoBackupLink.download = "todo_app.backup.json";
todoBackupLink.click();
setTimeout(() => URL.revokeObjectURL(todoBackupURL), 1000);
```

Сохраните файл **вне репозитория**, например в личной папке резервных копий. Он содержит ваши задачи, не предназначен для Git и публичной папки сайта. Проверьте, что файл скачался и содержит JSON с массивом `projects`.

## 2. Проверить проект локально

**Где: терминал Mac, папка проекта.**

```sh
cd /Users/dmitrij/Documents/development/to-do
node --version
npm ci
npx playwright install chromium
npm run format:check
npm test
npm run test:e2e
npm audit
npm run build
```

Если dev-сервер уже запущен, остановите его перед `npm ci`, затем запустите заново для ручной проверки: переустановка зависимостей может нарушить состояние работающего Webpack. Перезапуск сервера не очищает localStorage.

Нужен Node.js **24.x LTS**; `.nvmrc` содержит 24. Если уже используете nvm, выполните `nvm install 24` и `nvm use`. Иначе установите Node 24 с [официальной страницы](https://nodejs.org/en/download), затем заново откройте терминал.

Проверки используют временные базы и имитацию Telegram, не читают данные вашего обычного браузера. Тесты запускают собственные dev/preview на 4012/4013 и не используют открытый сервер 4000. Если тест не может занять 4010/4011/4012/4013/4018, остановите предыдущий тестовый процесс. `dist/` должен быть production-сборкой; предупреждения о размере Markdown-модулей не означают ошибку сборки.

Для ручной проверки старого localStorage:

```sh
npm run dev
```

Откройте прежний адрес 4000 и проверьте задачи, Markdown, закрепление, канбан и прокрутку. Этот сервер можно оставить для проверки интерфейса. Перед запуском бота на VPS остановите локальный **`npm run server` с настоящим токеном**, если запускали его: одному боту нужен один poller. Локальный `npm run dev` без бота этому не мешает.

## 3. Правильно сделать коммит и push

### 3.1. Проверить репозиторий и исключить служебные файлы

**Где: Mac, папка проекта.**

```sh
git status --short
git branch --show-current
git remote -v
```

В этом проекте ветка — `main`, origin — `https://github.com/phil-cody/to-do.git`. Если используете свой fork, адрес должен указывать на него. Убедитесь, что у вашего GitHub-аккаунта есть право записи.

В старой истории отслеживались dist и метаданные Finder. Один раз снимите их с отслеживания **до коммита**:

```sh
git rm -r --cached --ignore-unmatch dist
git rm --cached --ignore-unmatch .DS_Store
```

Эти команды меняют индекс Git, а не удаляют локальную сборку. `.gitignore` уже исключает dist, node_modules, .env, базы и стандартные backup-файлы. `.env.example` — публичный шаблон, его нужно коммитить.

Проверьте, нет ли уже отслеживаемых личных файлов:

```sh
git ls-files -- .env '.env.*' '*.sqlite' '*.sqlite-wal' '*.sqlite-shm' '*.backup.json'
```

Из этого списка нормален `.env.example`. Остальные реальные секреты/базы/копии сначала снимите с отслеживания через `git rm --cached -- ПУТЬ_К_ФАЙЛУ`. Если настоящий токен уже был опубликован, одного удаления недостаточно: отзовите его в BotFather и выпустите новый.

### 3.2. Настроить доступ к GitHub

Если push по текущему HTTPS-адресу уже работает через ваш менеджер учётных данных, пропустите этот пункт. Пароль GitHub-аккаунта не используйте как пароль Git: доступны SSH или авторизация через токен/менеджер учётных данных.

Ниже — вариант SSH без установки дополнительного CLI. Создайте **отдельный** ключ для GitHub, если такого файла ещё нет:

```sh
mkdir -p ~/.ssh
chmod 700 ~/.ssh
if [ ! -f ~/.ssh/todo_github_ed25519 ]; then
  ssh-keygen -t ed25519 -f ~/.ssh/todo_github_ed25519 -C "todo-github"
fi
cat ~/.ssh/todo_github_ed25519.pub
```

Задайте пароль ключа по запросу. Скопируйте содержимое файла с окончанием `.pub` в GitHub → Settings → SSH and GPG keys → New SSH key → Authentication key. **Закрытый файл без `.pub` не копируйте.** [Официальная инструкция GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account).

```sh
ssh -T -i ~/.ssh/todo_github_ed25519 -o IdentitiesOnly=yes git@github.com
```

При первом подключении проверьте отпечаток хоста по [справке GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints). Успешная проверка пишет, что аутентификация прошла, но shell не предоставляется; код выхода 1 у этого теста GitHub допустим.

Переключите origin этого репозитория на SSH и задайте ключ **только для него**:

```sh
git remote set-url origin git@github.com:phil-cody/to-do.git
git config core.sshCommand 'ssh -i ~/.ssh/todo_github_ed25519 -o IdentitiesOnly=yes'
```

Для своего fork замените владельца/имя репозитория. Ключ GitHub не нужно переносить на VPS при основном способе доставки ниже.

### 3.3. Закоммитить и отправить

```sh
git add src server scripts tests deploy docs README.md package.json package-lock.json webpack.config.js playwright.config.js .gitignore .nvmrc .env.example
git diff --cached --name-status
git diff --cached --check
git diff --cached
```

Просмотрите diff: должны быть исходники и документация, включая удаления старой реализации; секретов, реальных задач и сборки в нём быть не должно. Затем:

```sh
git commit -m "Добавить сервер, Telegram-вход, синхронизацию и офлайн-режим"
git fetch origin
git status -sb
```

Если main отстаёт от origin/main, после коммита и при чистой рабочей папке выполните `git rebase origin/main`. При конфликтах разрешите их, добавьте конкретные исправленные файлы и выполните `git rebase --continue`; для отмены незавершённого rebase есть `git rebase --abort`. После изменения кода повторите проверки из раздела 2. Не используйте force-push для обхода чужих изменений.

```sh
git push --set-upstream origin main
git status --short
git rev-parse HEAD
```

После успешного push откройте репозиторий в GitHub и проверьте новый коммит. `git status --short` должен быть пустым. Push сохраняет исходники в GitHub, **но сам не обновляет сайт** — доставка и переключение релиза выполняются ниже. [Справка о push](https://docs.github.com/en/get-started/using-git/pushing-commits-to-a-remote-repository).

## 4. Получить VPS и настроить SSH

### 4.1. Первое подключение

Нужен сервер с Ubuntu 24.04 LTS, публичным IPv4, доступом sudo и исходящим HTTPS. Практический стартовый ориентир для небольшого личного использования — 1–2 ГБ RAM; это не результат нагрузочного теста. Основной способ собирает проект на Mac, поэтому память VPS не расходуется на Webpack/Playwright.

В панели провайдера найдите IPv4 и способ первоначального входа: SSH-ключ, пароль или веб-консоль. Если сервер ещё создаётся, заранее добавьте туда публичный ключ для VPS.

**На Mac** создайте ключ VPS отдельно от GitHub:

```sh
mkdir -p ~/.ssh
chmod 700 ~/.ssh
if [ ! -f ~/.ssh/todo_vps_ed25519 ]; then
  ssh-keygen -t ed25519 -f ~/.ssh/todo_vps_ed25519 -C "todo-vps"
fi
cat ~/.ssh/todo_vps_ed25519.pub
```

Добавьте `.pub` в панель провайдера. Если сервер уже создан с другим ключом, используйте его или веб-консоль для первого входа; новый локальный ключ сам по себе не появляется на сервере.

```sh
ssh -i ~/.ssh/todo_vps_ed25519 root@VPS_IP
```

Проверьте отпечаток хоста через панель/консоль провайдера. Не обходите проверку хоста флагом StrictHostKeyChecking=no.

### 4.2. Создать deploy

**На VPS в первоначальном root-сеансе:**

```sh
adduser deploy
usermod -aG sudo deploy
install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
nano /home/deploy/.ssh/authorized_keys
```

Вставьте **одну строку публичного** `todo_vps_ed25519.pub`, сохраните файл. Затем:

```sh
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
```

Не закрывайте первоначальную сессию, пока не проверите новый вход.

**В новом терминале Mac:**

```sh
ssh -i ~/.ssh/todo_vps_ed25519 deploy@VPS_IP
sudo -v
```

В sudo вводится пароль deploy, заданный в adduser. Если всё работает, можно закрыть первоначальную root-сессию.

### 4.3. Короткий SSH-псевдоним

**На Mac** откройте `nano ~/.ssh/config` и добавьте отдельный блок, заменив VPS_IP:

```sshconfig
Host todo-vps
  HostName VPS_IP
  User deploy
  IdentityFile ~/.ssh/todo_vps_ed25519
  IdentitiesOnly yes
  Port 22
```

Если такой блок уже есть, отредактируйте его вместо дублирования. Для нестандартного SSH-порта задайте реальное значение вместо 22.

```sh
chmod 600 ~/.ssh/config
ssh todo-vps
```

Все следующие команды установки на VPS выполняйте **под deploy**, а не root. `sudo` добавляется только там, где нужны системные права.

## 5. Выбрать бесплатный поддомен и направить DNS

### Варианты

| Вариант                                          | Адрес                                           | Что учитывать                                                                                                                                                                                                             |
| ------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DuckDNS — рекомендуемый путь этой инструкции** | `выбранное-имя.duckdns.org`                     | Бесплатный DDNS-поддомен, можно указать фиксированный IPv4 VPS; [сервис](https://www.duckdns.org/) и [описание обновления адреса](https://www.duckdns.org/spec.jsp)                                                       |
| No-IP Free                                       | Поддомен на одном из предлагаемых сервисом имён | Бесплатный hostname нужно подтверждать каждые 30 дней, иначе он перестаёт работать; [официальные условия подтверждения](https://www.noip.com/support/knowledgebase/confirm-my-hostname-free-account-support-question-day) |
| Ваш уже имеющийся домен                          | Например `todo.ваш-домен`                       | Создайте A-запись у своего DNS-провайдера; покупать ещё один домен не нужно                                                                                                                                               |

Бесплатный поддомен зависит от правил и доступности чужого сервиса; он не даёт владения родительским доменом. Для постоянного публичного продукта позже можно перейти на собственное имя. Бесплатный TLS работает и на поддомене, если DNS и доступ к HTTP-проверке настроены.

### DuckDNS по шагам

1. Откройте [duckdns.org](https://www.duckdns.org/) и войдите способом, предлагаемым сервисом.
2. Создайте свободное имя латиницей, например своё уникальное `my-todo-unique`.
3. Укажите в IPv4 **публичный IP VPS из панели провайдера**, затем сохраните. Автоопределение может подставить IP вашего Mac — это другой адрес.
4. Получится имя вида `my-todo-unique.duckdns.org`. Именно его используйте целиком в APP_ORIGIN, Nginx и Certbot.
5. IPv6 добавляйте только при реально работающем публичном IPv6 VPS. Ошибочная AAAA-запись может мешать открытию сайта и выпуску сертификата.

Для VPS с постоянным IP достаточно сохранить адрес один раз и обновлять его при смене IP. Домашний DDNS-клиент для этого не нужен. Если провайдер меняет IP, настройте обновление по [спецификации DuckDNS](https://www.duckdns.org/spec.jsp), выполняя его с VPS и не публикуя DNS-токен. DNS-токен и Telegram BotFather token — разные секреты.

Если используете свой домен, создайте **A** `todo` → `VPS_IP` (TTL, например, 300). Не создавайте CNAME со значением IP. AAAA — только для рабочего IPv6. Имена DNS-серверов домена должны соответствовать той панели, в которой меняете записи.

### Проверка DNS

**На Mac:**

```sh
dig +short A my-todo-unique.duckdns.org
dig +short AAAA my-todo-unique.duckdns.org
dig @1.1.1.1 +short A my-todo-unique.duckdns.org
dig @8.8.8.8 +short A my-todo-unique.duckdns.org
```

A-запись должна вернуть IPv4 VPS. AAAA может быть пустой. Если она не пустая, проверьте, что IPv6 принадлежит вашему VPS и доступен снаружи. Подождите обновления DNS-кешей, если адрес ещё старый. До правильного результата не запускайте выпуск сертификата.

## 6. Подготовить VPS: пакеты, Node, пользователь приложения

**Где: VPS, deploy.**

```sh
sudo apt update
sudo apt install ca-certificates curl xz-utils nginx snapd ufw dnsutils nano cron
sudo systemctl enable --now nginx
```

### Системный Node.js 24

Для службы нужен системный бинарник, а не nvm в домашнем каталоге: у службы включён ProtectHome. Следующий блок скачивает актуальный архив ветки 24 с официального nodejs.org для x64/ARM64 и проверяет SHA-256 из того же официального каталога. Он предназначен для нового VPS без конфликтующей установки Node в /usr/local.

```sh
(
set -eu
case "$(dpkg --print-architecture)" in
  amd64) todo_node_arch=x64 ;;
  arm64) todo_node_arch=arm64 ;;
  *) echo "Нужна отдельная инструкция для архитектуры этого VPS" >&2; exit 1 ;;
esac
todo_node_tmp=$(mktemp -d)
trap 'rm -rf "$todo_node_tmp"' EXIT
cd "$todo_node_tmp"
curl -fsSLO https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt
todo_node_archive=$(awk -v arch="$todo_node_arch" '$2 ~ "^node-v24[.][0-9]+[.][0-9]+-linux-" arch "[.]tar[.]xz$" {print $2}' SHASUMS256.txt)
test -n "$todo_node_archive"
curl -fsSLO "https://nodejs.org/dist/latest-v24.x/$todo_node_archive"
awk -v file="$todo_node_archive" '$2 == file {print}' SHASUMS256.txt > CHECKSUM
sha256sum -c CHECKSUM
sudo tar -xJf "$todo_node_archive" -C /usr/local --strip-components=1 --no-same-owner
)
node --version
npm --version
command -v node
```

Ожидается `v24...`, обычно `/usr/local/bin/node`. HTTPS и контрольная сумма проверяют загрузку; дополнительная проверка подписи SHASUMS описана [официально](https://github.com/nodejs/node#verifying-binaries). Обновления Node, установленного этим способом, не приходят через apt: обновляйте ветку 24 отдельным проверенным выпуском.

Создайте пользователя службы и каталоги:

```sh
sudo useradd --system --user-group --home-dir /var/lib/todo --shell /usr/sbin/nologin todo
sudo install -d -o "$USER" -g "$(id -gn)" -m 755 /opt/todo /opt/todo/releases
sudo install -d -o todo -g todo -m 700 /var/lib/todo
sudo -u todo /usr/bin/env node --version
```

Пользователь `todo` создаётся один раз; при повторной установке сначала проверьте `id todo`, а не пытайтесь создать его заново. Последняя команда должна также показать Node 24: этим пользователем будет запускаться служба.

### Firewall и сертификаты

Убедитесь, что SSH-порт совпадает с вашим подключением. Для **стандартного 22** на новом VPS:

```sh
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Для другого SSH-порта сначала разрешите его, например `sudo ufw allow 2222/tcp`, и только потом включайте UFW. Не закрывайте рабочий SSH-сеанс до проверки второго подключения. Если firewall уже настроен для других служб, сохраните нужные им правила. В панели самого VPS-провайдера также разрешите SSH, TCP 80 и 443. Порт **4001 наружу не открывается**.

Certbot устанавливается одним способом — через Snap:

```sh
sudo snap install --classic certbot
sudo /snap/bin/certbot --version
```

Если Certbot уже установлен через apt/другой способ, не создавайте параллельную установку; сначала согласуйте её с [официальной инструкцией](https://certbot.eff.org/instructions?os=snap&ws=nginx).

## 7. Собрать точный коммит и доставить релиз

### Сборка из Git, а не из случайных локальных файлов

**Где: Mac, исходная папка проекта.** Сначала убедитесь, что push раздела 3 завершён. Основной путь собирает релиз из Git-коммита в отдельной временной папке: ignored .env, личные файлы и незакоммиченные правки в него не попадут.

```sh
cd /Users/dmitrij/Documents/development/to-do
git fetch origin main
git status --short
git rev-parse HEAD
git rev-parse origin/main
```

Оба SHA должны совпасть, а status быть пустым. Если после push меняли исходники или инструкцию, сначала сделайте следующий коммит/push.

```sh
(
set -eu
test -z "$(git status --porcelain)"
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
todo_revision=$(git rev-parse HEAD)
todo_build_dir=$(mktemp -d "${TMPDIR:-/tmp}/todo-build.XXXXXX")
trap 'rm -rf "$todo_build_dir"' EXIT
git archive --format=tar -o "$todo_build_dir/source.tar" HEAD
tar -xf "$todo_build_dir/source.tar" -C "$todo_build_dir"
rm "$todo_build_dir/source.tar"
cd "$todo_build_dir"
npm ci
npm run build
printf '%s\n' "$todo_revision" > REVISION
tar -czf /tmp/todo-server.tgz package.json package-lock.json server src/app/model.js src/app/description.js dist deploy REVISION
(cd /tmp && shasum -a 256 todo-server.tgz > todo-server.tgz.sha256)
tar -tzf /tmp/todo-server.tgz
)
```

В архиве должны быть backend, общая модель, весь production dist, конфигурации deploy и REVISION. Сервер использует встроенные модули Node: готовому релизу **не нужен npm ci на VPS**. Клиентские npm-зависимости уже включены в dist. Одного main.js для запуска недостаточно.

### Передача

**На Mac:**

```sh
scp /tmp/todo-server.tgz /tmp/todo-server.tgz.sha256 todo-vps:/tmp/
ssh todo-vps
```

Если используете другой SSH-порт, он уже задан в псевдониме todo-vps. Без псевдонима у scp порт задаётся флагом `-P`, у ssh — `-p`.

**На VPS под deploy:**

```sh
(cd /tmp && sha256sum -c todo-server.tgz.sha256)
tar -tzf /tmp/todo-server.tgz
```

Продолжайте только после `OK` и проверки состава архива. Контрольная сумма подтверждает целостность передачи, а соответствие кода коммиту обеспечивается сборкой из Git и файлом REVISION.

## 8. Установить релиз и задать настройки

### 8.1. Первый релиз

**Где: VPS, deploy.**

```sh
(
set -eu
test ! -e /opt/todo/current
test ! -L /opt/todo/current
test ! -e /opt/todo/current.next
test ! -L /opt/todo/current.next
todo_release="/opt/todo/releases/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir "$todo_release"
tar -xzf /tmp/todo-server.tgz -C "$todo_release"
test -f "$todo_release/server/index.js"
test -f "$todo_release/deploy/todo.service"
test -f "$todo_release/dist/sw.js"
grep -q 'Content-Security-Policy' "$todo_release/dist/index.html"
find "$todo_release" -type d -exec chmod 755 {} +
find "$todo_release" -type f -exec chmod 644 {} +
ln -s "$todo_release" /opt/todo/current.next
mv -Tf /opt/todo/current.next /opt/todo/current
)
cat /opt/todo/current/REVISION
```

SHA должен совпасть с опубликованным коммитом. Этот блок — именно первая установка; для следующих релизов используйте раздел 13. База находится отдельно в `/var/lib/todo/todo.sqlite` и не включается в релизы.

### 8.2. Получить токен бота

В Telegram откройте **официального BotFather** и получите токен своего `@just_to_do_it_bot` через `/mybots` → выбор бота → API Token. Это должен быть бот под вашим управлением. Не отправляйте токен в этот чат и не добавляйте в репозиторий.

Перед запуском на VPS остановите другие poller-процессы этого бота, в том числе локальный npm run server с этим токеном. Один экземпляр VPS обслуживает одну SQLite-базу и один Telegram poller.

### 8.3. EnvironmentFile

Создайте файл только при первой установке, чтобы повторный запуск не обнулил секрет:

```sh
if ! sudo test -e /etc/todo.env; then
  sudo install -m 600 /dev/null /etc/todo.env
fi
sudo nano /etc/todo.env
```

Вставьте, **заменив домен и токен**:

```dotenv
APP_ORIGIN=https://my-todo-unique.duckdns.org
PORT=4001
DATABASE_PATH=/var/lib/todo/todo.sqlite
DIST_DIR=/opt/todo/current/dist
TELEGRAM_BOT_USERNAME=just_to_do_it_bot
TELEGRAM_BOT_TOKEN=PASTE_BOTFATHER_TOKEN_HERE
TELEGRAM_OPEN_REGISTRATION=true
TELEGRAM_ALLOWED_IDS=
```

APP_ORIGIN — точный HTTPS-origin, без порта 4001, пути и завершающего слеша. Здесь нужен выбранный в разделе 5 поддомен. Регистрация открыта всем Telegram-пользователям; их снимки разделяются по числовому ID, подтверждённому Telegram.

```sh
sudo chown root:root /etc/todo.env
sudo chmod 600 /etc/todo.env
```

Служба читает EnvironmentFile через systemd; пользователю todo не нужно давать прямое чтение этого файла. Для ограничения регистрации позже задайте TELEGRAM_OPEN_REGISTRATION=false и TELEGRAM_ALLOWED_IDS, как описано в [server.md](server.md).

## 9. Запустить приложение как службу

**Где: VPS, deploy.**

```sh
sudo install -m 644 /opt/todo/current/deploy/todo.service /etc/systemd/system/todo.service
sudo systemctl daemon-reload
sudo systemctl enable --now todo
sudo systemctl status todo --no-pager
```

Ожидается `active (running)`. Проверьте backend, подставив **свой** домен:

```sh
todo_domain='my-todo-unique.duckdns.org'
curl -fsS -H "Host: $todo_domain" http://127.0.0.1:4001/api/health
curl -fsS -H "Host: $todo_domain" http://127.0.0.1:4001/api/config
```

Health должен дать `{"ok":true}`; config — имя бота и, после подключения к Telegram, `telegramReady: true`. Host обязателен: сервер отклоняет адрес, отличный от APP_ORIGIN. Пока HTTPS не установлен, авторизацию через HTTP не проверяйте — Secure-cookie предназначены для окончательного HTTPS-адреса.

При ошибке:

```sh
sudo journalctl -u todo -n 100 --no-pager
sudo -u todo /usr/bin/env node --version
```

Backend остаётся доступен для существующих сессий даже при временной недоступности Telegram; подключение бота повторяется в фоне. Вход новых пользователей становится доступен после успешного подключения.

## 10. Настроить Nginx и бесплатный HTTPS

### 10.1. Nginx

**Где: VPS, deploy.** Если это новый SSH-сеанс, задайте todo_domain заново:

```sh
todo_domain='my-todo-unique.duckdns.org'
sed "s/server_name todo.example.com;/server_name $todo_domain;/" /opt/todo/current/deploy/todo-server.nginx.conf | sudo tee /etc/nginx/sites-available/todo > /dev/null
sudo ln -s /etc/nginx/sites-available/todo /etc/nginx/sites-enabled/todo
sudo nginx -t
sudo systemctl reload nginx
```

Ссылка sites-enabled создаётся один раз. Если уже существует, проверьте `readlink /etc/nginx/sites-enabled/todo`; она должна указывать на `/etc/nginx/sites-available/todo`. Не нужно создавать её повторно. Не удаляйте конфигурации других сайтов.

Проверьте HTTP с **Mac**, то есть извне VPS:

```sh
curl -I http://my-todo-unique.duckdns.org
```

Должен отвечать ваш сайт/Nginx. До выпуска сертификата HTTP нужен для проверки владения доменом, а не для переноса личных данных. Если видна стандартная страница Nginx вместо Todo, проверьте server_name и загруженную конфигурацию; вывод `sudo nginx -T` помогает найти дубли.

### 10.2. Сертификат Let's Encrypt

Перед выпуском ещё раз проверьте DNS, публичные порты 80/443 и отсутствие ошибочной AAAA-записи. На VPS:

```sh
sudo /snap/bin/certbot --nginx -d "$todo_domain" --redirect
sudo /snap/bin/certbot renew --dry-run
sudo systemctl list-timers --all | grep certbot
sudo snap services certbot
```

Certbot запросит email и принятие условий, установит сертификат в конфигурацию Nginx и перенаправление с HTTP на HTTPS. Поддомен DuckDNS подходит для обычного HTTP-01: отдельный DNS-плагин, wildcard-сертификат и DNS-токен для этого пути не нужны. HTTP-01 требует входящий порт 80, включая дальнейшие проверки продления. [Certbot](https://certbot.eff.org/instructions?os=snap&ws=nginx), [Let's Encrypt HTTP-01](https://letsencrypt.org/docs/challenge-types/).

**На Mac:**

```sh
curl -I http://my-todo-unique.duckdns.org
curl -I https://my-todo-unique.duckdns.org
curl -fsS https://my-todo-unique.duckdns.org/api/health
```

Ожидается перенаправление HTTP → HTTPS, корректный сертификат и успешный health. В браузере не должно быть предупреждения о сертификате. **На VPS** включите Nginx и todo в автозапуск, если ещё не включены:

```sh
sudo systemctl enable nginx todo
```

### Если у бота ранее был webhook

Текущая реализация использует long polling, поэтому webhook должен быть выключен. В журнале будет явное сообщение об активном webhook. Если этот бот больше не обслуживает другой проект, можно **на VPS** отключить webhook **без удаления накопленных updates**, не раскрывая токен в аргументах команды:

```sh
sudo /usr/local/bin/node --env-file=/etc/todo.env --input-type=module <<'JS'
const response = await fetch(
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/deleteWebhook`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drop_pending_updates: false }),
  },
);
const result = await response.json();
if (!response.ok || !result.ok) throw new Error("Не удалось отключить webhook");
console.log("Webhook отключён; накопленные updates сохранены");
JS
```

Дождитесь фонового переподключения или выполните `sudo systemctl restart todo`. Не запускайте второго бота-процесса для проверки. `/setdomain` в BotFather для этой схемы входа не требуется: вход подтверждается личным диалогом, а не виджетом на странице.

## 11. Проверить запуск и перенести свои задачи

### Проверки работающего приложения

Откройте **окончательный HTTPS-адрес** в браузере:

1. Нажмите «Войти через Telegram», откройте @just_to_do_it_bot и подтвердите вход. Вернитесь в тот же браузер.
2. Создайте тестовую задачу. Откройте вторую вкладку, затем другое устройство с тем же Telegram-аккаунтом — изменения должны появляться без ручной перезагрузки.
3. Войдите другим Telegram-аккаунтом, если он у вас есть: у него должен быть собственный пустой Inbox, без ваших задач.
4. Отправьте боту обычный текст. Задача должна появиться в Inbox; первая строка — название, последующие — описание.
5. В «Telegram и аккаунт» включите отправку задач на сегодня, задайте время и свой IANA-часовой пояс. Для мгновенной проверки списка есть `/today`; для отключения — `/stop`. Вход сам по себе рассылку не включает.
6. После полной онлайн-загрузки обновите страницу ещё раз. Проверьте офлайн-режим через инструменты разработчика: измените задачу без сети, перезагрузите, восстановите сеть и дождитесь синхронизации. При одновременной правке одного поля на устройствах должен появиться выбор разрешения конфликта.
7. Проверьте Grid/List/Kanban, мобильный drawer, часы, Show more и независимую прокрутку.

Проверьте закрытые адреса:

```sh
curl -I https://my-todo-unique.duckdns.org/server/index.js
curl -I https://my-todo-unique.duckdns.org/.env
curl -I https://my-todo-unique.duckdns.org/.git/config
curl -I https://my-todo-unique.duckdns.org/package.json
```

Они должны возвращать 404/запрет, а не файлы. `GET /api/workspace` без cookie должен дать 401. На сервере слушается только loopback: `sudo ss -ltnp | grep ':4001'` должен показывать 127.0.0.1, не 0.0.0.0.

### Старый localStorage → свой серверный аккаунт

На новом домене локальное хранилище пустое. У публикации нет доступа к localStorage localhost. Для переноса:

1. Сохраните исходную копию из раздела 1.
2. Войдите в **нужный Telegram-аккаунт** на окончательном HTTPS-домене.
3. На этом HTTPS-адресе откройте Console и выберите файл резервной копии следующим кодом:

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
  if (!confirm("Записать копию в localStorage этого адреса?")) return;
  localStorage.setItem("todo_app", raw);
  console.log("Локальная копия подготовлена; выполните импорт в аккаунте");
};
todoRestoreInput.click();
```

4. Откройте «Telegram и аккаунт» → «Перенести локальные задачи», подтвердите импорт, дождитесь «Синхронизировано».
5. Проверьте данные на втором устройстве и сохраните копию до завершения проверки.

Выбор файла читает его локально; на сервер задачи отправляются после явного импорта. Исходный localhost не меняется. Повторный импорт создаёт новые копии, поэтому не выполняйте его повторно вместо обновления страницы. Уже существующие серверные задачи сохраняются, импорт добавляет новые.

## 12. Настроить резервные копии SQLite

**Где: VPS, deploy.** Обычный cp одного файла работающей WAL-базы может пропустить последние изменения. Скрипт проекта использует SQLite backup, который проверен на открытой базе.

Установите утилиты вне временной папки и публичного сайта:

```sh
sudo install -d -o root -g root -m 700 /var/backups/todo
sudo install -d -m 755 /usr/local/lib/todo
sudo install -m 644 /opt/todo/current/deploy/backup.mjs /opt/todo/current/deploy/backup-check.mjs /opt/todo/current/deploy/restore.mjs /usr/local/lib/todo/
todo_backup="/var/backups/todo/todo-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
sudo /usr/local/bin/node /usr/local/lib/todo/backup.mjs /var/lib/todo/todo.sqlite "$todo_backup"
sudo /usr/local/bin/node /usr/local/lib/todo/backup-check.mjs "$todo_backup"
```

Ожидаются сообщения об успешном создании и целостности. Копия содержит данные всех аккаунтов и хеши сессий, поэтому хранится с правами 600. Одна копия на том же VPS не защищает от потери всего диска: дополнительно сохраняйте закрытые, при необходимости зашифрованные копии вне VPS.

Для автоматической ежедневной копии в 03:15 **по времени ОС сервера** откройте:

```sh
sudo systemctl enable --now cron
sudo crontab -e
```

Добавьте одну строку, не дублируя её при обновлении:

```cron
15 3 * * * /usr/local/bin/node /usr/local/lib/todo/backup.mjs /var/lib/todo/todo.sqlite /var/backups/todo/todo-$(date -u +\%Y\%m\%dT\%H\%M\%SZ).sqlite >> /var/log/todo-backup.log 2>&1
```

Проверьте `sudo crontab -l`, часовой пояс через `timedatectl` и журнал после первого запуска. Символы `%` в crontab экранируются, а в обычном терминале — нет. Срок хранения и перенос внешней копии задайте отдельно под свои требования; автоматического удаления копий эта инструкция не включает.

## 13. Обновлять приложение без потери данных

**Перед каждым обновлением:** дождитесь отправки офлайн-очередей и сделайте копию базы по разделу 12.

**На Mac:** измените исходники → повторите проверки → коммит/push → соберите точный коммит по разделу 7 → передайте новый архив и checksum тем же scp. Не передавайте `.env` и базу поверх серверных.

**На VPS:**

```sh
(cd /tmp && sha256sum -c todo-server.tgz.sha256)
readlink -f /opt/todo/current
cat /opt/todo/current/REVISION
```

Запишите полный путь текущего релиза для отката. Затем:

```sh
(
set -eu
test -L /opt/todo/current
test ! -e /opt/todo/current.next
test ! -L /opt/todo/current.next
todo_release="/opt/todo/releases/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir "$todo_release"
tar -xzf /tmp/todo-server.tgz -C "$todo_release"
test -f "$todo_release/server/index.js"
test -f "$todo_release/dist/sw.js"
grep -q 'Content-Security-Policy' "$todo_release/dist/index.html"
cp -an /opt/todo/current/dist/. "$todo_release/dist/"
find "$todo_release" -type d -exec chmod 755 {} +
find "$todo_release" -type f -exec chmod 644 {} +
ln -s "$todo_release" /opt/todo/current.next
mv -Tf /opt/todo/current.next /opt/todo/current
sudo systemctl restart todo
)
cat /opt/todo/current/REVISION
sudo systemctl status todo --no-pager
```

База остаётся в `/var/lib/todo`; переключается только код. Копирование `cp -an` оставляет старые хешированные ассеты для уже открытых вкладок и не перезаписывает новые index.html/sw.js. Старые ассеты накапливаются: очищайте их позже, когда старые вкладки закрыты и новый релиз проверен.

Если менялся todo.service, установите его из нового `current/deploy`, выполните `sudo systemctl daemon-reload` и `sudo systemctl restart todo`. Если менялся Nginx, сравните изменения с действующей конфигурацией и сохраните секции HTTPS, добавленные Certbot: не заменяйте готовую HTTPS-конфигурацию начальным HTTP-шаблоном вслепую. Сертификат заново выпускать при обычном обновлении не нужно.

Сверьте REVISION с новым коммитом и повторите health/вход/создание задачи. Старый релиз не удаляйте до проверки. Незавершённая ссылка current.next после ошибки требует проверки `readlink`; удаляйте только эту временную ссылку, не рабочую директорию current.

## 14. Откат кода и восстановление данных

### Откат кода

Выберите предыдущий существующий релиз и подставьте его имя вместо PREVIOUS_RELEASE:

```sh
ls -1 /opt/todo/releases
(
set -eu
test -f /opt/todo/releases/PREVIOUS_RELEASE/server/index.js
test ! -e /opt/todo/current.next
test ! -L /opt/todo/current.next
ln -s /opt/todo/releases/PREVIOUS_RELEASE /opt/todo/current.next
mv -Tf /opt/todo/current.next /opt/todo/current
sudo systemctl restart todo
)
```

Откат кода не откатывает задачи. Перед будущими изменениями схемы проверяйте совместимость старой версии с новой базой. Старый service worker может ждать закрытия вкладок; проверяйте релиз также в новом браузерном сеансе.

### Восстановление базы

Это замена данных **всех аккаунтов**. Сначала сохраните отдельную копию текущего состояния, затем остановите службу:

```sh
sudo systemctl stop todo
sudo /usr/local/bin/node /usr/local/lib/todo/restore.mjs /var/backups/todo/ИМЯ_КОПИИ.sqlite /var/lib/todo/todo.sqlite
sudo chown todo:todo /var/lib/todo/todo.sqlite
sudo chmod 600 /var/lib/todo/todo.sqlite
sudo systemctl start todo
```

Скрипт проверяет копию и убирает WAL/SHM только у целевой базы. Не запускайте его при работающем приложении. После восстановления пользователям нужно закрыть старые вкладки, очистить данные сайта и войти заново, чтобы старые очереди не применились к восстановленному снимку. Если были локальные неотправленные правки, сначала сохраните их отдельной копией.

## 15. Диагностика и смена домена

**На VPS:**

```sh
sudo systemctl status todo nginx --no-pager
sudo journalctl -u todo -n 100 --no-pager
sudo nginx -t
sudo tail -n 50 /var/log/nginx/error.log
sudo ss -ltnp | grep ':4001'
sudo ufw status
```

| Симптом                                         | Что проверить                                                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| GitHub Permission denied / Repository not found | Аккаунт, SSH-ключ, право записи и адрес origin; пароль аккаунта GitHub не заменяет SSH/токен             |
| Push rejected / non-fast-forward                | Fetch, чистый коммит и rebase; не force-push                                                             |
| DNS возвращает другой IP                        | В DuckDNS сохранён IP Mac вместо VPS либо ещё действует кеш                                              |
| Certbot не выдаёт сертификат                    | A/AAAA, порты 80/443 в UFW и панели провайдера, правильный server_name, доступ к сайту снаружи           |
| 502                                             | Служба todo, Node 24, путь current, права файлов, журнал systemd                                         |
| 403 при запросе                                 | Точное совпадение домена/APP_ORIGIN/Host и HTTPS-origin                                                  |
| Telegram не готов                               | Настоящий токен выбранного бота, исходящий HTTPS к api.telegram.org, отсутствие webhook и второго poller |
| Вход истёк                                      | Начните новый вход и подтвердите в течение 5 минут в том же браузере                                     |
| Нет рассылки                                    | Согласие, время/часовой пояс, задачи со сроком сегодня, бот не заблокирован                              |
| Изменения не видны                              | Состояние очереди/конфликта, сеть, SSE без буферизации; версия REVISION                                  |
| Офлайн не открывается                           | Production-сборка, HTTPS, первый онлайн-запуск и активный service worker                                 |
| Пропал бесплатный hostname                      | Состояние аккаунта DNS-сервиса; у No-IP требуется подтверждение каждые 30 дней                           |

При смене домена обновите DNS, APP_ORIGIN, server_name и сертификат, затем перезапустите todo и проверьте nginx -t/reload. SQLite-аккаунты остаются на месте, но cookie и браузерные кеши нового origin другие. Войдите тем же Telegram-аккаунтом и загрузите данные с сервера; незавершённые офлайн-правки старого origin сначала синхронизируйте или сохраните.

Реальный VPS, DNS, сертификат и настоящий токен проверяются после выполнения инструкции. Локальные тесты с имитацией Telegram не подтверждают доступность этих внешних ресурсов.

## Первичные источники

- [DuckDNS](https://www.duckdns.org/) и [спецификация DDNS](https://www.duckdns.org/spec.jsp).
- [No-IP: подтверждение бесплатного hostname](https://www.noip.com/support/knowledgebase/confirm-my-hostname-free-account-support-question-day).
- [GitHub: SSH-ключ](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account) и [push](https://docs.github.com/en/get-started/using-git/pushing-commits-to-a-remote-repository).
- [Официальная загрузка Node.js](https://nodejs.org/en/download), [проверка бинарников](https://github.com/nodejs/node#verifying-binaries).
- [Nginx proxy](https://nginx.org/en/docs/http/ngx_http_proxy_module.html), [Certbot](https://certbot.eff.org/instructions?os=snap&ws=nginx), [HTTP-01](https://letsencrypt.org/docs/challenge-types/).
- [Bot API](https://core.telegram.org/bots/api), [Telegram-часть проекта](telegram.md), [API и модель хранения](server.md).

Для варианта без backend сохранена [статическая инструкция](vps-static.md), но она не включает аккаунты и Telegram-синхронизацию.
