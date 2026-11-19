import { supabase } from './supabaseClient';
import { ChatSession } from '../types';

export interface BookmarkItem {
  id: string; // key: `${itemType}:${itemId}`
  itemType: 'remedy' | 'acupoint' | 'herb' | 'post';
  itemId: string;
  title: string;
  titleMy?: string;
  subtitle?: string;
  category?: string;
  data?: Record<string, any>;
  createdAt: string;
}

const BOOKMARKS_LOCAL_KEY = 'showcare_user_bookmarks';
const SYNC_EVENT = 'showcare_bookmarks_changed';

/**
 * Get all bookmarks currently saved in localStorage
 */
export function getLocalBookmarks(): BookmarkItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_LOCAL_KEY);
    if (!raw) {
      // Migrate legacy acupoint-favorites if any
      const legacyAcupoints = localStorage.getItem('acupoint-favorites');
      if (legacyAcupoints) {
        try {
          const ids: string[] = JSON.parse(legacyAcupoints);
          if (Array.isArray(ids) && ids.length > 0) {
            const migrated: BookmarkItem[] = ids.map((id) => ({
              id: `acupoint:${id}`,
              itemType: 'acupoint',
              itemId: id,
              title: id,
              createdAt: new Date().toISOString()
            }));
            localStorage.setItem(BOOKMARKS_LOCAL_KEY, JSON.stringify(migrated));
            return migrated;
          }
        } catch {}
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse local bookmarks:', err);
    return [];
  }
}

/**
 * Save bookmarks array to localStorage and notify listeners
 */
export function setLocalBookmarks(items: BookmarkItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BOOKMARKS_LOCAL_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: items }));
  } catch (err) {
    console.warn('Failed to save local bookmarks:', err);
  }
}

/**
 * Check if an item is currently bookmarked
 */
export function isItemBookmarked(itemType: 'remedy' | 'acupoint' | 'herb' | 'post', itemId: string): boolean {
  const all = getLocalBookmarks();
  return all.some((b) => b.itemType === itemType && b.itemId === itemId);
}

/**
 * Toggle bookmark (add if not present, remove if present)
 */
export async function toggleBookmark(
  userId: string | null | undefined,
  item: {
    itemType: 'remedy' | 'acupoint' | 'herb' | 'post';
    itemId: string;
    title: string;
    titleMy?: string;
    subtitle?: string;
    category?: string;
    data?: Record<string, any>;
  }
): Promise<{ isBookmarked: boolean; items: BookmarkItem[] }> {
  const current = getLocalBookmarks();
  const existsIndex = current.findIndex(
    (b) => b.itemType === item.itemType && b.itemId === item.itemId
  );

  let updated: BookmarkItem[];
  let nowBookmarked = false;

  if (existsIndex >= 0) {
    // Remove
    updated = current.filter((_, idx) => idx !== existsIndex);
    nowBookmarked = false;

    // Cloud sync remove if logged in
    if (userId) {
      try {
        await supabase
          .from('user_bookmarks')
          .delete()
          .match({ user_id: userId, item_type: item.itemType, item_id: item.itemId });
      } catch (err) {
        console.warn('Supabase delete bookmark non-critical error:', err);
      }
    }
  } else {
    // Add
    const newItem: BookmarkItem = {
      id: `${item.itemType}:${item.itemId}`,
      itemType: item.itemType,
      itemId: item.itemId,
      title: item.title,
      titleMy: item.titleMy,
      subtitle: item.subtitle,
      category: item.category,
      data: item.data,
      createdAt: new Date().toISOString()
    };
    updated = [newItem, ...current];
    nowBookmarked = true;

    // Cloud sync insert if logged in
    if (userId) {
      try {
        await supabase.from('user_bookmarks').upsert(
          {
            user_id: userId,
            item_type: item.itemType,
            item_id: item.itemId,
            item_data: {
              title: item.title,
              titleMy: item.titleMy,
              subtitle: item.subtitle,
              category: item.category,
              data: item.data
            },
            created_at: newItem.createdAt
          },
          { onConflict: 'user_id,item_type,item_id' }
        );
      } catch (err) {
        console.warn('Supabase upsert bookmark non-critical error:', err);
      }
    }
  }

  setLocalBookmarks(updated);
  return { isBookmarked: nowBookmarked, items: updated };
}

/**
 * Sync Bookmarks with Supabase Cloud when user is logged in
 */
export async function syncBookmarksWithCloud(userId: string): Promise<BookmarkItem[]> {
  if (!userId) return getLocalBookmarks();

  const local = getLocalBookmarks();

  try {
    // 1. Fetch cloud bookmarks
    const { data: cloudData, error } = await supabase
      .from('user_bookmarks')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      // Table may not exist yet in Supabase
      console.warn('Cloud bookmarks fetch skipped (table may not exist yet):', error.message);
      return local;
    }

    const cloudBookmarks: BookmarkItem[] = (cloudData || []).map((row: any) => ({
      id: `${row.item_type}:${row.item_id}`,
      itemType: row.item_type,
      itemId: row.item_id,
      title: row.item_data?.title || row.item_id,
      titleMy: row.item_data?.titleMy,
      subtitle: row.item_data?.subtitle,
      category: row.item_data?.category,
      data: row.item_data?.data,
      createdAt: row.created_at || new Date().toISOString()
    }));

    // 2. Merge local + cloud (cloud takes precedence for same id)
    const map = new Map<string, BookmarkItem>();
    local.forEach((b) => map.set(b.id, b));
    cloudBookmarks.forEach((b) => map.set(b.id, b));

    const merged = Array.from(map.values());
    setLocalBookmarks(merged);

    // 3. Upload any local items that were missing in cloud
    const missingInCloud = local.filter(
      (loc) => !cloudBookmarks.some((c) => c.itemType === loc.itemType && c.itemId === loc.itemId)
    );

    if (missingInCloud.length > 0) {
      const inserts = missingInCloud.map((item) => ({
        user_id: userId,
        item_type: item.itemType,
        item_id: item.itemId,
        item_data: {
          title: item.title,
          titleMy: item.titleMy,
          subtitle: item.subtitle,
          category: item.category,
          data: item.data
        },
        created_at: item.createdAt
      }));
      await supabase.from('user_bookmarks').upsert(inserts, { onConflict: 'user_id,item_type,item_id' });
    }

    return merged;
  } catch (err: any) {
    console.warn('Cloud bookmarks sync error (using local cache):', err?.message || err);
    return local;
  }
}

// ----------------------------------------------------
// AI Doctor Chat Sessions Cloud Sync
// ----------------------------------------------------

/**
 * Sync AI Doctor chat sessions with Supabase Cloud
 */
export async function syncChatSessionsWithCloud(
  userId: string,
  localSessions: ChatSession[]
): Promise<ChatSession[]> {
  if (!userId) return localSessions;

  try {
    const { data: cloudData, error } = await supabase
      .from('user_chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.warn('Cloud chat sessions fetch skipped:', error.message);
      return localSessions;
    }

    const cloudSessions: ChatSession[] = (cloudData || []).map((row: any) => {
      const msgs = Array.isArray(row.messages) ? row.messages : [];
      const lastMsg = msgs[msgs.length - 1];
      return {
        id: row.id,
        title: row.title,
        preview: lastMsg ? String(lastMsg.text || '').substring(0, 70) : '',
        messages: msgs,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.last_message_at).getTime()
      };
    });

    // Merge sessions: if same id, pick the one with more messages or newer updatedAt
    const sessionMap = new Map<string, ChatSession>();

    localSessions.forEach((s) => sessionMap.set(s.id, s));
    cloudSessions.forEach((cs) => {
      const existing = sessionMap.get(cs.id);
      if (!existing || cs.messages.length >= existing.messages.length) {
        sessionMap.set(cs.id, cs);
      }
    });

    const merged = Array.from(sessionMap.values()).sort(
      (a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
    );

    // Upload local-only or newer sessions to Supabase
    const sessionsToUpload = merged.map((s) => ({
      id: s.id,
      user_id: userId,
      title: s.title || 'Consultation',
      messages: s.messages,
      last_message_at: new Date(s.updatedAt || s.createdAt || Date.now()).toISOString(),
      created_at: new Date(s.createdAt || Date.now()).toISOString()
    }));

    if (sessionsToUpload.length > 0) {
      await supabase.from('user_chat_sessions').upsert(sessionsToUpload, { onConflict: 'id' });
    }

    return merged;
  } catch (err: any) {
    console.warn('Cloud chat sync non-critical warning:', err?.message || err);
    return localSessions;
  }
}

/**
 * Save single chat session to cloud
 */
export async function saveCloudChatSession(userId: string, session: ChatSession): Promise<void> {
  if (!userId) return;
  try {
    await supabase.from('user_chat_sessions').upsert(
      {
        id: session.id,
        user_id: userId,
        title: session.title || 'Consultation',
        messages: session.messages,
        last_message_at: new Date(session.updatedAt || session.createdAt || Date.now()).toISOString(),
        created_at: new Date(session.createdAt || Date.now()).toISOString()
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('Failed to upsert chat session to cloud:', err);
  }
}

/**
 * Delete single chat session from cloud
 */
export async function deleteCloudChatSession(userId: string, sessionId: string): Promise<void> {
  if (!userId) return;
  try {
    await supabase.from('user_chat_sessions').delete().match({ id: sessionId, user_id: userId });
  } catch (err) {
    console.warn('Failed to delete chat session from cloud:', err);
  }
}
