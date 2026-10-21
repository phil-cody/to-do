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

В текущем интерфейсе сначала используйте «Импорт проектов и задач» → «Скачать текущие задачи». Файл включает текущий снимок, а в серверном аккаунте — и ожидающие отправки правки. Ниже оставлен способ через Console для старой версии, в которой ещё нет этой кнопки.

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

### Если VPS уже используется

При работающем SSH-доступе не нужно заново создавать ключ, пользователя или добавлять .pub в панель провайдера. Используйте существующего пользователя с sudo и SSH-псевдоним; для команд release он задаётся аргументом `-- my-vps`. Создание deploy ниже нужно только если решили завести отдельного пользователя.

В authorized_keys нового deploy добавляется публичный ключ **Mac → VPS**. Ключ для доступа **VPS → GitHub** его не заменяет. Если новый ключ ещё не разрешён, первый root-вход может происходить по паролю; не отключайте текущий доступ до проверки нового пользователя в отдельном терминале.

Основной способ доставки собирает код на Mac и не требует GitHub-ключа на VPS. Рабочий бот или VPN на сервере не останавливается для установки Todo. Сначала проверьте занятые порты в разделе 6.

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

Перед установкой на уже используемый VPS проверьте существующие службы и инструменты:

```sh
node --version
command -v node
sudo ss -ltnp | grep -E ':(80|443|8443)\b'
sudo systemctl status nginx --no-pager
```

Отсутствие Node/Nginx на этом этапе допустимо. Если системный Node 24 или Nginx уже установлен, соответствующую установку повторять не нужно. Не заменяйте runtime другой службы вслепую. Если 443 занимает VPN/контейнер, используйте отдельный свободный 8443 по альтернативе раздела 10; порты чужой службы не меняйте. Если занят 80, сначала согласуйте общий HTTP-прокси — команды ниже предполагают доступный для Nginx порт 80.

```sh
sudo apt update
sudo apt install ca-certificates curl xz-utils nginx snapd ufw dnsutils nano cron util-linux
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

**Где: Mac, папка проекта.** Сначала выполните проверки, коммит и push из разделов 2–3. Команды релиза находятся в репозитории, их не нужно каждый раз переписывать.

```sh
npm run release:prepare
npm run release:upload
```

Первая команда проверяет чистоту рабочей папки, получает актуальный origin/main и требует совпадения с HEAD. Затем она собирает **именно этот коммит** в отдельной временной папке и создаёт `.cache/releases/ПОЛНЫЙ_SHA/todo-server.tgz`, checksum и универсальный update.sh. Архив не содержит .env, базы, node_modules и незакоммиченных файлов. Внутри есть REVISION, backend, общие модули (включая attachments.js и его зависимость sync/client-store.js), production dist и deploy. После проверки checksum и REVISION архив распаковывается во временный каталог, и Node.js проверяет импорт server/app.js и server/telegram.js именно из него. Эти модули не запускают сервер или Telegram-поллер. Отсутствие любой их транзитивной зависимости останавливает prepare/upload/install до обращения к VPS. Расширенные атрибуты macOS исключаются.

Вторая команда снова проверяет Git, checksum и REVISION и передаёт файлы через SSH-псевдоним todo-vps в `/tmp/todo-release-ПОЛНЫЙ_SHA/` на VPS. Она возвращает вас в терминал Mac и **не устанавливает релиз**. Готовому backend не нужен npm ci на VPS: зависимости интерфейса включены в сборку, сервер использует встроенные модули Node.

Для другого SSH-псевдонима укажите его аргументом:

```sh
npm run release:upload -- my-vps
```

Идентификатор коммита напечатан в результате подготовки; для первого запуска он нужен в разделе 8. Для обновления уже работающего приложения используйте раздел 13.

Не используйте старые `/tmp/todo-server.tgz` и `/tmp/todo-update.sh`: это файлы предыдущего ручного способа, push не обновляет их. Успешный checksum подтверждает целостность, но не новизну; новые команды дополнительно сверяют архив с ожидаемым коммитом. Если после подготовки сделали новый коммит, повторите prepare: для нового SHA нужен новый архив.

## 8. Установить релиз и задать настройки

### 8.1. Первый релиз

**Где: VPS, deploy.**

```sh
(
set -eu
todo_revision='ВСТАВЬТЕ_ПОЛНЫЙ_SHA_ИЗ_RELEASE_PREPARE'
todo_incoming="/tmp/todo-release-$todo_revision"
(cd "$todo_incoming" && sha256sum -c todo-server.tgz.sha256)
test "$(tar -xOf "$todo_incoming/todo-server.tgz" REVISION)" = "$todo_revision"
test ! -e /opt/todo/current
test ! -L /opt/todo/current
test ! -e /opt/todo/current.next
test ! -L /opt/todo/current.next
todo_release="/opt/todo/releases/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir "$todo_release"
tar --no-same-owner -xzf "$todo_incoming/todo-server.tgz" -C "$todo_release"
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
sudo install -d -m 755 /var/www/letsencrypt/.well-known/acme-challenge
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

Этот основной путь требует свободный 443. Если 443 занят VPN/другим сервисом, **пропустите этот подраздел** и используйте вариант 8443 ниже. Не запускайте certbot --nginx по умолчанию поверх занятого 443.

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

### Если сертификат выдан, но пробное продление возвращает 404

Общий redirect на уровне HTTP-server может отправлять ACME-запросы в HTTPS-блок с запретом скрытых путей. Не удаляйте действующий сертификат. Для предсказуемого продления настройте отдельный webroot. На VPS:

```sh
sudo cp -a /etc/nginx/sites-available/todo "/etc/nginx/sites-available/todo.backup.$(date -u +%Y%m%dT%H%M%SZ)"
sudo install -d -m 755 /var/www/letsencrypt/.well-known/acme-challenge
sudo nano /etc/nginx/sites-available/todo
```

Сохраните HTTPS-блок с сертификатом и proxy. Замените **только HTTP-блок с listen 80**, подставив свой домен:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name my-todo-unique.duckdns.org;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type text/plain;
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
```

В этом HTTP-блоке не должно остаться server-level `if` с redirect или общего `return 404`: они выполняются до обработки location. Остальные сайты не меняйте. Сохраните файл в nano через Ctrl+O, Enter, Ctrl+X. Затем:

```sh
sudo nginx -t && sudo systemctl reload nginx
printf '%s
' 'todo-acme-ok' | sudo tee /var/www/letsencrypt/.well-known/acme-challenge/todo-check > /dev/null
curl -fsS http://my-todo-unique.duckdns.org/.well-known/acme-challenge/todo-check
```

Повторите curl с Mac. Ожидается `todo-acme-ok` без redirect. Если проверка не прошла, остановитесь и проверьте DNS, порт 80 и конфигурацию. После успешной проверки на VPS:

```sh
sudo /snap/bin/certbot reconfigure --cert-name my-todo-unique.duckdns.org --authenticator webroot --webroot-path /var/www/letsencrypt --deploy-hook '/usr/sbin/nginx -t && /usr/bin/systemctl reload nginx'
sudo /snap/bin/certbot renew --cert-name my-todo-unique.duckdns.org --dry-run --run-deploy-hooks
```

`reconfigure` проверяет новые параметры на тестовом центре сертификации и сохраняет их только при успехе; deploy-hook применяет обновлённый сертификат через reload Nginx. Ожидается успешная симуляция продления. Таймер Snap остаётся прежним; состояние `inactive (timer-activated)` между запусками нормально. [Официальная инструкция по изменению параметров продления](https://eff-certbot.readthedocs.io/en/stable/using.html#modifying-the-renewal-configuration-of-existing-certificates).

### Вариант HTTPS на 8443, если 443 занят VPN

Это альтернатива основному выпуску сертификата, а не дополнительный второй сайт. Сначала нужен HTTP-блок Nginx из 10.1 с доступным 80 и location для ACME. Если уже есть неработающий TLS-блок на 443, временно верните только HTTP-конфигурацию из 10.1, сохранив её копию. Не трогайте Docker/VPN. Проверьте, что 8443 свободен: `sudo ss -ltnp | grep ':8443\b'`.

На VPS создайте и проверьте тестовый файл:

```sh
printf '%s\n' 'todo-acme-ok' | sudo tee /var/www/letsencrypt/.well-known/acme-challenge/todo-check > /dev/null
curl -fsS http://my-todo-unique.duckdns.org/.well-known/acme-challenge/todo-check
```

Повторите curl на Mac. Оба запроса должны вернуть todo-acme-ok. Если нет — не продолжайте выпуск, проверьте DNS/HTTP/Nginx. Для **нового** сертификата на VPS:

```sh
todo_domain='my-todo-unique.duckdns.org'
sudo /snap/bin/certbot certonly --webroot -w /var/www/letsencrypt -d "$todo_domain" --deploy-hook '/usr/sbin/nginx -t && /usr/bin/systemctl reload nginx'
```

Если действующий сертификат для этого имени уже есть, повторный выпуск не нужен; при необходимости сохраните webroot через reconfigure из предыдущего подраздела.

Откройте `/etc/nginx/sites-available/todo` и замените конфигурацию этого сайта следующей, подставив **свой домен во всех местах** (server_name в двух блоках и каталог сертификата в двух путях):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name my-todo-unique.duckdns.org;
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type text/plain;
        try_files $uri =404;
    }
    location / { return 301 https://$host:8443$request_uri; }
}
server {
    listen 8443 ssl;
    listen [::]:8443 ssl;
    server_name my-todo-unique.duckdns.org;
    ssl_certificate /etc/letsencrypt/live/my-todo-unique.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/my-todo-unique.duckdns.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    server_tokens off;
    client_max_body_size 2m;
    location ~ /\. { return 404; }
    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 75s;
    }
}
```

В `/etc/todo.env` задайте `APP_ORIGIN=https://my-todo-unique.duckdns.org:8443` (со своим доменом). На VPS:

```sh
sudo ufw allow 8443/tcp
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl restart todo
sudo /snap/bin/certbot renew --cert-name "$todo_domain" --dry-run --run-deploy-hooks
```

Разрешите TCP 8443 и в firewall провайдера, если он включён. Порт 80 остаётся доступным для продления, 443 продолжает обслуживать VPN. Итоговый адрес — `https://my-todo-unique.duckdns.org:8443`; используйте его во всех дальнейших браузерных проверках и curl вместо примера без порта.

Если приложение отвечает «Неверный адрес приложения», проверьте APP_ORIGIN и `proxy_set_header Host $http_host;`: переменная $host убирает нестандартный порт. Успешный nginx -t проверяет только синтаксис; после reload также проверьте `sudo ss -ltnp` и error.log на ошибки bind. Reload может оставить старую рабочую конфигурацию при занятом порте.

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

На новом домене локальное хранилище пустое; у VPS нет доступа к localStorage localhost. Для переноса:

1. Сохраните исходную копию по разделу 1 на Mac.
2. Войдите в нужный Telegram-аккаунт на окончательном HTTPS-адресе приложения (включая :8443, если используете этот порт).
3. Нажмите «Импорт проектов и задач», выберите файл todo_app.backup.json и проверьте предпросмотр.
4. Нажмите «Добавить проекты и задачи», дождитесь синхронизации и проверьте данные на втором устройстве.
5. Сохраните исходную копию до завершения проверки.

Загружать файл в localStorage через Console больше не нужно. Исходный localhost и файл не меняются; существующие серверные задачи сохраняются. Если старый localStorage находится на текущем адресе, его можно прочитать через «Telegram и аккаунт» → «Перенести локальные задачи» → «Прочитать локальные задачи». Повторный импорт создаёт копии. [Подробности и шаблон проекта](import.md).

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

**Один раз перед использованием новых команд:** закоммитьте и отправьте в GitHub файлы `scripts/release.mjs`, `deploy/update.sh`, изменения package.json и документации. Не запускайте подготовку с незакоммиченными файлами: команда намеренно остановится.

**При каждом обновлении на Mac:** дождитесь отправки офлайн-очередей, выполните проверки проекта, коммит и push. Затем в папке проекта:

После установки обновления безопасности от 15.10.2026 закройте старые вкладки и окна приложения, затем откройте снова. Старый клиент без X-Account-ID не сможет сохранять данные (428); это защита от отправки очереди в чужой аккаунт при смене общей сессии. Не очищайте хранилище с неотправленными изменениями: сначала сохраните копию и войдите в исходный аккаунт для синхронизации.

```sh
npm run release:prepare
npm run release:upload
npm run release:install
```

Все три команды запускаются **на Mac**. Install сама подключается по SSH с терминалом и запрашивает пароль sudo пользователя VPS. Отдельно заходить на сервер и вставлять длинный блок больше не нужно. Для другого SSH-псевдонима передайте `-- my-vps` и upload, и install.

Установщик получает ожидаемый SHA автоматически, сверяет checksum и REVISION **до переключения**, проверяет защиту от параллельной установки, создаёт резервную копию SQLite в `/var/backups/todo/` и атомарно переключает ссылку current. Старые публичные ассеты сохраняются для открытых вкладок. После перезапуска проверяется `/api/health`; если запуск не прошёл, возвращается предыдущий код. Данные при откате кода не откатываются. Если этот SHA уже установлен, повторная установка не нужна и скрипт завершится соответствующим сообщением.

В конце ожидаются `{"ok":true}`, статус active (running), **новый полный SHA** и путь предыдущего релиза. Откройте приложение, проверьте функции. Если интерфейс остался прежним, закройте все старые вкладки/окна ярлыка и откройте снова, чтобы активировался новый service worker.

База, `/etc/todo.env`, настройки Nginx, сертификат и VPN при обновлении не заменяются. Адрес с портом 8443 берётся из APP_ORIGIN при проверке backend. Текущий установщик рассчитан на существующую установку по этой инструкции: Ubuntu 24.04, системный Node в /usr/local/bin, абсолютный DATABASE_PATH, служба todo на loopback 4001. Для первой установки используйте разделы 8–10.

Если менялся todo.service, установите его из нового current/deploy и выполните daemon-reload/restart отдельно. Изменения Nginx объединяйте с действующей конфигурацией, сохраняя свой порт и HTTPS. Скрипт специально не подменяет эти системные настройки. Клиент получает только публичные файлы dist. Серверный архив также содержит server, общую модель с description.js, deploy, package-файлы и REVISION; шаблоны импорта уже встроены в клиент при сборке. Папка docs на VPS для работы формы не нужна. Резервные копии и старые ассеты накапливаются: перенос внешних копий и срок хранения задайте отдельно.

При ошибке любой команды остановитесь. Не переходите к install, если prepare/upload не завершились успешно. Старый архив нельзя исправить переименованием или правкой REVISION — нужна новая сборка из нужного коммита.

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

Откат кода не откатывает задачи. Перед будущими изменениями схемы проверяйте совместимость старой версии с новой базой. Автоматический возврат кода в update.sh не является откатом миграции базы; перед такими релизами нужен отдельный план восстановления. Старый service worker может ждать закрытия вкладок; проверяйте релиз также в новом браузерном сеансе.

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
