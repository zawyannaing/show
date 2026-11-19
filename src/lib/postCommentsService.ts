import { supabase } from './supabaseClient';

export interface PostComment {
  id: string;
  post_id: string;
  author_id?: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  created_at: string;
}

const LOCAL_COMMENTS_PREFIX = 'showcare_comments_';

function getLocalComments(postId: string): PostComment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_COMMENTS_PREFIX}${postId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {}
  return [];
}

function setLocalComments(postId: string, comments: PostComment[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_COMMENTS_PREFIX}${postId}`, JSON.stringify(comments));
    window.dispatchEvent(new CustomEvent('showcare_comments_updated', { detail: { postId, comments } }));
  } catch {}
}

/**
 * Fetch comments for a post (offline cache + Supabase Cloud)
 */
export async function fetchPostComments(postId: string): Promise<PostComment[]> {
  const local = getLocalComments(postId);

  try {
    const { data, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase post_comments fetch notice (using local):', error.message);
      return local;
    }

    if (data) {
      const cloudComments: PostComment[] = data.map((row: any) => ({
        id: row.id,
        post_id: row.post_id,
        author_id: row.author_id,
        author_name: row.author_name || 'အသုံးပြုသူ',
        author_avatar: row.author_avatar,
        content: row.content,
        created_at: row.created_at
      }));

      setLocalComments(postId, cloudComments);
      return cloudComments;
    }
  } catch (err) {
    console.warn('Network error fetching comments:', err);
  }

  return local;
}

/**
 * Add a new comment to a post
 */
export async function addPostComment(
  postId: string,
  content: string,
  author: { id?: string; name: string; avatarUrl?: string }
): Promise<PostComment> {
  const newComment: PostComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    post_id: postId,
    author_id: author.id,
    author_name: author.name.trim() || 'အသုံးပြုသူ',
    author_avatar: author.avatarUrl,
    content: content.trim(),
    created_at: new Date().toISOString()
  };

  // 1. Save to local first for instant responsive UI
  const current = getLocalComments(postId);
  const updated = [...current, newComment];
  setLocalComments(postId, updated);

  // 2. Sync to Supabase table 'post_comments'
  try {
    const { data, error } = await supabase.from('post_comments').insert([
      {
        id: newComment.id,
        post_id: newComment.post_id,
        author_id: newComment.author_id,
        author_name: newComment.author_name,
        author_avatar: newComment.author_avatar,
        content: newComment.content
      }
    ]).select();

    if (error) {
      console.warn('Notice: Cloud comment sync (table may need creation, saved locally):', error.message);
    }
  } catch (err) {
    console.warn('Failed to upload comment to Supabase, saved locally:', err);
  }

  return newComment;
}

/**
 * Delete a comment (author or admin)
 */
export async function deletePostComment(commentId: string, postId: string): Promise<void> {
  const current = getLocalComments(postId);
  const updated = current.filter((c) => c.id !== commentId);
  setLocalComments(postId, updated);

  try {
    await supabase.from('post_comments').delete().eq('id', commentId);
  } catch (err) {
    console.warn('Cloud comment delete error:', err);
  }
}
