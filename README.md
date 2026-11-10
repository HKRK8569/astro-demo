## 概要

Astro + Drizzle + PostgreSQL のTODOアプリ。追加・完了・削除と30秒ごとの自動更新に対応。

## 起動方法

Node.js 22.23.4以上・pnpm・Docker Compose v2が必要です。

### 初回手順

```sh
pnpm install
cp -n .env.example .env
pnpm db:up
pnpm db:migrate
pnpm dev --background
```

### 2回目以降

```sh
pnpm db:up
pnpm dev --background
```

http://localhost:4321 で開きます。
