"use server";

import pool from './db';
import {cookies} from 'next/headers';
import {ResultSetHeader, RowDataPacket} from 'mysql2';

const COOKIE_NAME = 'ssjj_user_id';

export async function getUserId() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function createOrGetUser() {
  const userId = await getUserId();

  if (!userId) return null;

  try {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM User WHERE id = ?', [userId]);

      if (rows.length > 0) {
          const existing = rows[0];
          const parsedData = typeof existing.data === 'string' ? JSON.parse(existing.data) : (existing.data || {});
          return {...existing, data: parsedData};
    }

      const [result] = await pool.query<ResultSetHeader>('INSERT INTO User (id, data) VALUES (?, ?)', [userId, JSON.stringify({})]);

      if (result.affectedRows > 0) {
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
      const [rows] = await pool.query<RowDataPacket[]>('SELECT data FROM User WHERE id = ?', [userId]);
      const user = rows[0];
      if (user) {
          return typeof user.data === 'string' ? JSON.parse(user.data) : (user.data || {});
      }
      return {};
  } catch (e) {
    console.error("Failed to fetch user data:", e);
    return {};
  }
}

export async function updateUserData(data: Record<string, number>) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'No user ID' };

  try {
      const jsonData = JSON.stringify(data);
      const [result] = await pool.query<ResultSetHeader>('UPDATE User SET data = ? WHERE id = ?', [jsonData, userId]);

      if (result.affectedRows === 0) {
          await pool.query('INSERT INTO User (id, data) VALUES (?, ?)', [userId, jsonData]);
    }
    return { success: true };
  } catch (e) {
    console.error("Failed to update user data:", e);
    return { success: false, error: 'Database error' };
  }
}

export async function syncUser(targetUserId: string) {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM User WHERE id = ?', [targetUserId]);
        const target = rows[0];
        
        if (!target) return { success: false, error: 'User not found' };
        
        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, targetUserId, {
            expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            httpOnly: true,
            path: '/',
        });

        const parsedData = typeof target.data === 'string' ? JSON.parse(target.data) : (target.data || {});
        return {success: true, data: parsedData};
    } catch (e) {
        console.error("Sync error:", e);
        return { success: false, error: 'Database error' };
    }
}

export async function checkUserExists(targetUserId: string) {
    const trimmed = targetUserId.trim();
    if (!trimmed) return {success: false, error: 'Invalid ID'};
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM User WHERE id = ? LIMIT 1', [trimmed]);
        return {success: true, exists: rows.length > 0};
    } catch (e) {
        console.error("Check user error:", e);
        return {success: false, error: 'Database error'};
    }
}

// Clean up empty users
export async function cleanEmptyUsers() {
    try {
        const [result] = await pool.query<ResultSetHeader>(
            "DELETE FROM User WHERE data = '{}' OR data = JSON_OBJECT()"
        );
        return { success: true, deletedCount: result.affectedRows };
    } catch (e: any) {
        console.error("Cleanup error:", e);
        return { success: false, error: e.message };
    }
}
export async function executeSql(sql: string) {
    try {
        const [result] = await pool.query(sql);

        if (Array.isArray(result)) {
            return {success: true, data: result};
        } else {
            return {success: true, meta: result};
        }
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
