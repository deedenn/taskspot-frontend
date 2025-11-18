# TaskSpot Frontend (API version)

React + Vite + Ant Design фронтенд для TaskSpot, подключённый к backend API (api.taskspot.ru).

## Запуск

```bash
npm install
# локально
echo "VITE_API_URL=http://localhost:4000" > .env.local
npm run dev
# приложение будет на http://localhost:3000
```

В проде установите `VITE_API_URL=https://api.taskspot.ru`.

## Основные страницы

- `/` — лендинг
- `/login` — вход
- `/register` — регистрация (+ поддержка приглашений по токену `?invite=...`)
- `/app` — основное приложение (дашборды, задачи, проекты, админка)
