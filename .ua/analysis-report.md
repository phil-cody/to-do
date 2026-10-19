# Граф знаний Just To Do It

Анализ выполнен 19 октября 2026 года стандартным workflow Understand Anything. Язык графа — английский.

Основа: HEAD `5ea1ce778d75402eb33ceb1b40f6d406b8e11dfb` и незакоммиченная рабочая копия после Ponytail-аудита. Сравнение только SHA не подтверждает свежесть графа. Автоматическое обновление не включалось.

## Охват

Обработано 122/122 файлов после исключений: code: 90, docs: 16, script: 1, config: 3, markup: 12. Категории infra и data: 0 по классификации сканера; операционные файлы представлены в слое Production Operations. Исключено дополнительно: 2 файла; зависимости, сборки, секреты, базы и копии не анализировались.

Узлы (229): file: 103, function: 96, class: 11, document: 16, config: 3. Остальные типы узлов: 0.

Связи (607): contains: 107, exports: 89, imports: 169, calls: 93, tested_by: 23, inherits: 1, documents: 107, configures: 13, related: 1, depends_on: 3, deploys: 1.

## Слои

- Browser Interface: 38 файлов. React application composition, task and project views, dialogs, interaction hooks and responsive styles.
- Workspace Domain and State: 5 файлов. Pure workspace transformations, normalization, import validation, dashboard selectors and guarded React workspace orchestration.
- Browser Persistence and Synchronization: 6 файлов. Local and remote repository selection, account-scoped IndexedDB storage, queued edits, HTTP transport and conflict merging.
- Shared Content and Localization: 7 файлов. Shared English and Russian messages, language subscriptions, Markdown compatibility and policy, downloads and interface constants.
- Server and Telegram: 5 файлов. Node.js API startup, session and ownership enforcement, SQLite persistence, validation and Telegram sign-in and reminders.
- Verification: 25 файлов. Synthetic fixtures and unit, server, synchronization and browser tests for application and release behavior.
- Build and Development: 11 файлов. Project runtime and package settings, Webpack, isolated development and preview servers, offline-shell generation and release or visual-check tooling.
- Production Operations: 7 файлов. Nginx and systemd configuration plus deployment, database backup verification and restoration procedures.
- Documentation and Import Examples: 18 файлов. Project working rules, architecture and operating guides, the Ponytail audit report and public project import templates.

## Маршрут

1. Project Overview
2. Browser Application Composition
3. Workspace Model and Mutations
4. Guarded Edits and Drafts
5. Task Views and Movement
6. Safe Content and Language
7. Storage and Offline Synchronization
8. Accounts and Server Persistence
9. Telegram and Account Controls
10. Additive Import and Export
11. Build and Offline Shell
12. Verification and Safety Evidence
13. Releases and Recovery

## Проверка и ограничения

Проверены все файлы инвентаря, 169 внутренних импортов, уникальность идентификаторов, ссылки, распределение по слоям и последовательность маршрута. Финальная проверка не обнаружила ошибок или предупреждений. Структурная основа fingerprints.json включает все 122 файла; meta.json записан только после её успешного создания.

Неподдержанные структурным парсером CSS, HTML, .nvmrc, Nginx и systemd-файлы дополнены анализом содержимого. Ошибок чтения и потерянных файлов нет. Связи tested_by показывают найденную связь кода с тестами и не означают измеренное покрытие.

Проверки приложения выполнены перед сборкой графа: 51 модульная и серверная проверка, 96 браузерных проверок, production-сборка в составе браузерного запуска, format:check и git diff --check. Полный браузерный набор и сравнение визуального эталона не запускались. Коммит, push и деплой не выполнялись.

Файлы: knowledge-graph.json, fingerprints.json, meta.json, config.json и .understandignore находятся в .ua/. Временные материалы исключены из Git; scan-result.json сохраняется локально для следующих обновлений.

## Просмотр графа

Попытка загрузить готовый просмотрщик версии 2.9.7 остановилась с `getaddrinfo ENOTFOUND github.com`. Запущен локальный Vite из уже установленного пакета dashboard; сервер сообщил готовность. Переустановка зависимостей не выполнялась. Ссылка с временным токеном передана только в интерфейс чата и не сохранена в проекте. Открытие вкладки Codex поставлено в очередь интерфейсом приложения.
