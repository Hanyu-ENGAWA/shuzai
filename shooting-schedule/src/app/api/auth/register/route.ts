export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getDbOnly } from '@/lib/api-helpers';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    const db = await getDbOnly();

    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    const passwordHash = await bcryptjs.hash(password, 12);
    const now = new Date();

    const user = await db.insert(schema.users).values({
      id: uuidv4(),
      email,
      passwordHash,
      name,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json({
      success: true,
      data: { id: user[0].id, email: user[0].email, name: user[0].name },
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
