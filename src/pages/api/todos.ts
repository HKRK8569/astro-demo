import type { APIRoute } from 'astro';
import { asc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { todos } from '../../db/schema';

const fields = { id: todos.id, text: todos.title, done: todos.completed };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export const GET: APIRoute = async () => {
  try {
    return json(await db.select(fields).from(todos).orderBy(asc(todos.id)));
  } catch (error) {
    console.error('Todo read failed', error);
    return json({ error: 'TODOの取得に失敗しました。' }, 500);
  }
};

const mutate: APIRoute = async ({ request, url }) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return json({ error: '不正なリクエストです。' }, 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSONを指定してください。' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: '入力が不正です。' }, 400);
  }
  try {
    if (request.method === 'POST') {
      if (typeof body.text !== 'string' || !body.text.trim()) {
        return json({ error: 'やることを入力してください。' }, 400);
      }
      const [todo] = await db.insert(todos).values({ title: body.text.trim() }).returning(fields);
      return json(todo, 201);
    }
    if (!Number.isSafeInteger(body.id) || body.id <= 0 || body.id > 2147483647) {
      return json({ error: 'IDが不正です。' }, 400);
    }
    if (request.method === 'PATCH') {
      if (typeof body.done !== 'boolean') return json({ error: '完了状態が不正です。' }, 400);
      const [todo] = await db.update(todos).set({ completed: body.done })
        .where(eq(todos.id, body.id)).returning(fields);
      return todo ? json(todo) : json({ error: 'TODOが見つかりません。' }, 404);
    }
    const [todo] = await db.delete(todos).where(eq(todos.id, body.id)).returning(fields);
    return todo ? json(todo) : json({ error: 'TODOが見つかりません。' }, 404);
  } catch (error) {
    console.error('Todo mutation failed', error);
    return json({ error: 'TODOの保存に失敗しました。もう一度お試しください。' }, 500);
  }
};

export const POST = mutate;
export const PATCH = mutate;
export const DELETE = mutate;
