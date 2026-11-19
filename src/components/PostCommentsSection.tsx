import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Trash2, User, Loader2, Sparkles } from 'lucide-react';
import { fetchPostComments, addPostComment, deletePostComment, PostComment } from '../lib/postCommentsService';
import { useAuth } from '../hooks/useAuth';
import { formatFacebookDate } from '../utils/dateFormatter';

export interface PostCommentsSectionProps {
  postId: string;
  language: 'en' | 'my';
}

export const PostCommentsSection: React.FC<PostCommentsSectionProps> = ({ postId, language }) => {
  const { user, userInfo, isAdmin } = useAuth();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [guestName, setGuestName] = useState(() => {
    return localStorage.getItem('showcare_guest_commenter_name') || '';
  });

  // Load comments
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchPostComments(postId).then((res) => {
      if (mounted) {
        setComments(res);
        setLoading(false);
      }
    });

    const handleUpdate = (e: any) => {
      if (e.detail?.postId === postId) {
        setComments(e.detail.comments);
      }
    };
    window.addEventListener('showcare_comments_updated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('showcare_comments_updated', handleUpdate);
    };
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const authorName = user
      ? (userInfo?.name || user.email?.split('@')[0] || 'Member')
      : (guestName.trim() || (language === 'my' ? 'ဧည့်သည် အသုံးပြုသူ' : 'Guest Member'));

    if (!user && guestName.trim()) {
      localStorage.setItem('showcare_guest_commenter_name', guestName.trim());
    }

    setSubmitting(true);
    try {
      const newComment = await addPostComment(postId, content, {
        id: user?.id,
        name: authorName,
        avatarUrl: userInfo?.avatarUrl
      });
      setContent('');
      setComments((prev) => [...prev, newComment]);
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm(language === 'my' ? 'ဤမှတ်ချက်ကို ဖျက်ရန် သေချာပါသလား?' : 'Delete this comment?')) return;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    await deletePostComment(commentId, postId);
  };

  return (
    <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 comfort:border-[#ded4c1] font-myanmar">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <h4 className="font-extrabold text-sm sm:text-base text-neutral-900 dark:text-white comfort:text-[#231f1a] flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{language === 'my' ? 'လူထု ဆွေးနွေးချက်နှင့် မေးခွန်းများ' : 'Community Discussion & Q&A'}</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            {comments.length}
          </span>
        </h4>
      </div>

      {/* Comments List */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-6 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{language === 'my' ? 'မှတ်ချက်များ ရယူနေပါသည်...' : 'Loading comments...'}</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-6 text-center rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 p-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'my'
                ? 'မေးခွန်း သို့မဟုတ် ဆွေးနွေးချက် မရှိသေးပါ။ ပထမဆုံး စတင်မေးမြန်းနိုင်ပါသည်!'
                : 'No comments yet. Be the first to start the discussion!'}
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const isAuthor = user?.id && comment.author_id === user.id;
            const canDelete = isAuthor || isAdmin;

            return (
              <div
                key={comment.id}
                className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 comfort:bg-[#f2e9d8]/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {comment.author_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-xs text-neutral-900 dark:text-white comfort:text-[#231f1a] truncate">
                      {comment.author_name}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {formatFacebookDate(comment.created_at, language)}
                    </span>
                  </div>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-red-500 transition cursor-pointer"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-neutral-700 dark:text-neutral-300 comfort:text-[#231f1a] leading-relaxed whitespace-pre-line pl-8">
                  {comment.content}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Add Comment Input Form */}
      <form onSubmit={handleSubmit} className="space-y-2 pt-2">
        {!user && (
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={language === 'my' ? 'သင့်အမည် (သို့မဟုတ် ဧည့်သည်အဖြစ် ထားမည်)' : 'Your name (optional for guest)'}
              className="w-full sm:max-w-xs px-3 py-1.5 rounded-xl text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-hidden"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              language === 'my'
                ? 'မေးခွန်း သို့မဟုတ် ဆွေးနွေးချက် ရေးသားပါ...'
                : 'Write a comment or question...'
            }
            className="flex-1 px-3.5 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm text-neutral-900 dark:text-white comfort:text-[#231f1a] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
          />
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-40 cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="Post comment"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>

    </div>
  );
};

export default PostCommentsSection;
