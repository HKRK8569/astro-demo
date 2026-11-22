import type { APIRoute } from 'astro';
import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../../db';
import { todos } from '../../db/schema';

const path = '/api/todos';
const app = new Hono<{ Variables: { body: Record<string, unknown> } }>({ strict: false });
const fields = { id: todos.id, text: todos.title, done: todos.completed };

function isTodoId(id: unknown): id is number {
  return typeof id === 'number' && Number.isSafeInteger(id) && id > 0 && id <= 2147483647;
}

app.use(path, async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
});

app.onError((error, c) => {
  if (c.req.method === 'GET' || c.req.method === 'HEAD') {
    console.error('Todo read failed', error);
    return c.json({ error: 'TODOの取得に失敗しました。' }, 500);
  }
  console.error('Todo mutation failed', error);
  return c.json({ error: 'TODOの保存に失敗しました。もう一度お試しください。' }, 500);
});

app.get(path, async (c) => {
  return c.json(await db.select(fields).from(todos).orderBy(asc(todos.id)));
});

app.on(['POST', 'PATCH', 'DELETE'], path, async (c, next) => {
  const origin = c.req.header('Origin');
  if (origin && origin !== new URL(c.req.url).origin) {
    return c.json({ error: '不正なリクエストです。' }, 403);
  }
  let body;
  try {
    body = await c.req.json<Record<string, unknown>>();
  } catch {
    return c.json({ error: 'JSONを指定してください。' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json({ error: '入力が不正です。' }, 400);
  }
  c.set('body', body);
  await next();
});

app.post(path, async (c) => {
  const { text } = c.var.body;
  if (typeof text !== 'string' || !text.trim()) {
    return c.json({ error: 'やることを入力してください。' }, 400);
  }
  const [todo] = await db.insert(todos).values({ title: text.trim() }).returning(fields);
  return c.json(todo, 201);
});

app.patch(path, async (c) => {
  const { id, done } = c.var.body;
  if (!isTodoId(id)) return c.json({ error: 'IDが不正です。' }, 400);
  if (typeof done !== 'boolean') return c.json({ error: '完了状態が不正です。' }, 400);

  const [todo] = await db.update(todos).set({ completed: done })
    .where(eq(todos.id, id)).returning(fields);
  return todo ? c.json(todo) : c.json({ error: 'TODOが見つかりません。' }, 404);
});

app.delete(path, async (c) => {
  const { id } = c.var.body;
  if (!isTodoId(id)) return c.json({ error: 'IDが不正です。' }, 400);

  const [todo] = await db.delete(todos).where(eq(todos.id, id)).returning(fields);
  return todo ? c.json(todo) : c.json({ error: 'TODOが見つかりません。' }, 404);
});

const handle: APIRoute = ({ request }) => app.fetch(request);
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
