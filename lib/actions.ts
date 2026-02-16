"use server";

import db from './db';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'ssjj_user_id';

export async function getUserId() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function createOrGetUser() {
  const userId = await getUserId();

  if (!userId) return null;

  try {
    const existing = db.prepare('SELECT * FROM User WHERE id = ?').get(userId) as any;
    if (existing) {
        return { ...existing, data: JSON.parse(existing.data || '{}') };
    }

    const info = db.prepare('INSERT INTO User (id, data) VALUES (?, ?)').run(userId, '{}');
    if (info.changes > 0) {
        return { id: userId, data: {} };
    }
    return null;
  } catch (e) {
    console.error('Failed to create or fetch user:', e);
    return null;
  }
}

export async function getUserData() {
  const userId = await getUserId();
  if (!userId) return {};

  try {
    const user = db.prepare('SELECT data FROM User WHERE id = ?').get(userId) as any;
    return user ? JSON.parse(user.data || '{}') : {};
  } catch (e) {
    console.error("Failed to fetch user data:", e);
    return {};
  }
}

export async function updateUserData(data: Record<string, number>) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'No user ID' };

  try {
    const info = db.prepare('UPDATE User SET data = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(JSON.stringify(data), userId);
    if (info.changes === 0) {
        // If update failed because user doesn't exist (shouldn't happen if createOrGetUser is called), create it
        db.prepare('INSERT INTO User (id, data) VALUES (?, ?)').run(userId, JSON.stringify(data));
    }
    return { success: true };
  } catch (e) {
    console.error("Failed to update user data:", e);
    return { success: false, error: 'Database error' };
  }
}

export async function syncUser(targetUserId: string) {
    // Switch current user to targetUserId
    // Verify target exists
    try {
        const target = db.prepare('SELECT * FROM User WHERE id = ?').get(targetUserId) as any;
        
        if (!target) return { success: false, error: 'User not found' };
        
        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, targetUserId, {
            expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            httpOnly: true,
            path: '/',
        });
        return { success: true, data: JSON.parse(target.data || '{}') };
    } catch (e) {
        console.error("Sync error:", e);
        return { success: false, error: 'Database error' };
    }
}

// Admin Action for SQL Page
export async function executeSql(sql: string) {
    try {
        // Simple check to prevent extremely dangerous commands if needed, though requirement implies full control.
        // For safety, let's just run it.
        const stmt = db.prepare(sql);
        
        // Determine if it's a SELECT (returns data) or others (returns info)
        if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
             const rows = stmt.all();
             return { success: true, data: rows };
        } else {
             const info = stmt.run();
             return { success: true, meta: info };
        }
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
