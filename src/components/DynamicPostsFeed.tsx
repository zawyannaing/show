import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  PlusCircle, 
  RefreshCw, 
  Search, 
  ExternalLink, 
  Sparkles, 
  FileText, 
  Image as ImageIcon,
  Share2,
  Check,
  Edit3,
  Trash2,
  Loader2,
  Radio,
  Clock,
  ShieldCheck,
  Flame,
  ArrowRight,
  Info,
  Lock,
  LogOut,
  Crown,
  AlertCircle,
  User,
  X
} from 'lucide-react';
import { supabase, Post } from '../lib/supabaseClient';
import { EditPostModal } from './EditPostModal';
import { GoogleAuthModal } from './GoogleAuthModal';
import { useAuth } from '../hooks/useAuth';
import { INITIAL_BULLETINS, getPostCategory, cleanPostTitle } from '../data/initialBulletins';

interface DynamicPostsFeedProps {
  language: 'en' | 'my';
  onNavigateAdmin: () => void;
}

export const DynamicPostsFeed: React.FC<DynamicPostsFeedProps> = ({ language, onNavigateAdmin }) => {
  const [posts, setPosts] = useState<Post[]>(INITIAL_BULLETINS);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'daily'>('all');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Google authentication and admin verification via useAuth
  const { user, userName, userEmail, userAvatar, isAdmin, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // Edit and Delete states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [confirmDeletePost, setConfirmDeletePost] = useState<Post | null>(null);

  const fetchPosts = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch error, using initial bulletins:', error.message);
      } else if (data) {
        // Merge Supabase posts (newest first) with default seed bulletins
        const supabaseTitles = new Set(data.map(p => cleanPostTitle(p.title).toLowerCase()));
        const filteredInitial = INITIAL_BULLETINS.filter(
          b => !supabaseTitles.has(cleanPostTitle(b.title).toLowerCase())
        );
        setPosts([...data, ...filteredInitial]);
      } else {
        setPosts(INITIAL_BULLETINS);
      }
    } catch (err) {
      console.warn('Error querying posts:', err);
      setPosts(INITIAL_BULLETINS);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchPosts(false);

    // 1. Subscribe to Supabase WebSocket real-time changes
    const channel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          fetchPosts(true);
        }
      )
      .subscribe();

    // 2. Facebook-style auto-polling fallback every 8 seconds across all devices
    const pollInterval = setInterval(() => {
      fetchPosts(true);
    }, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, []);

  const handleShare = (post: Post) => {
    const cleanTitle = cleanPostTitle(post.title);
    if (navigator.share) {
      navigator.share({
        title: cleanTitle,
        text: post.content.slice(0, 140),
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${cleanTitle}\n\n${post.content}`);
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDeletePost = async (id: string) => {
    setDeletingPostId(id);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) {
        console.error('Delete error:', error);
      } else {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        if (selectedPost?.id === id) setSelectedPost(null);
        setConfirmDeletePost(null);
      }
    } catch (err) {
      console.error('Delete exception:', err);
    } finally {
      setDeletingPostId(null);
    }
  };

  // Filter posts by search term and active tab ('all', 'live', 'daily')
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const category = getPostCategory(p);
      const matchesTab = activeTab === 'all' || category === activeTab;
      const cleanTitle = cleanPostTitle(p.title);
      const matchesSearch = 
        cleanTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.content.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [posts, activeTab, searchTerm]);

  // Counts for each category
  const counts = useMemo(() => {
    let live = 0;
    let daily = 0;
    posts.forEach((p) => {
      if (getPostCategory(p) === 'daily') daily++;
      else live++;
    });
    return { all: posts.length, live, daily };
  }, [posts]);

  // Featured Today's Daily Bulletin (first daily post found, or fallback)
  const todayBulletin = useMemo(() => {
    return posts.find(p => getPostCategory(p) === 'daily') || posts[0];
  }, [posts]);

  // Today's formatted date
  const todayDateStr = useMemo(() => {
    const d = new Date();
    if (language === 'my') {
      const months = ['ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်', 'ဇူလိုင်', 'ဩဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'];
      const days = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];
      return `${months[d.getMonth()]} ${d.getDate()} ရက်၊ ၂၀၂၆ (${days[d.getDay()]}နေ့)`;
    }
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  }, [language]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Top Header & Bulletin Live Status */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 font-myanmar flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{language === 'my' ? 'တိုက်ရိုက်လွှင့်တင် ချိတ်ဆက်ထားသည်' : 'Live Community Network'}</span>
            </span>
            <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
              {todayDateStr}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-black dark:text-white comfort:text-[#231f1a] font-myanmar tracking-tight leading-tight">
            {language === 'my' ? 'ကျန်းမာရေး သတင်းလွှာနှင့် ပို့စ်များ' : 'Community Bulletins & Posts'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 comfort:text-[#645a4e] mt-1 font-myanmar leading-relaxed">
            {language === 'my' 
              ? 'တိုက်ရိုက်လွှင့်တင် ပို့စ်များ (Live Posts) နှင့် အထူးကုဆရာဝန်များ၏ နေ့စဉ် ကျန်းမာရေး သတင်းလွှာများ (Daily Bulletins)' 
              : 'Real-time community health advisories, dynamic live posts, and verified daily clinical bulletins.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => fetchPosts()}
            disabled={loading}
            className="h-10 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] hover:bg-neutral-200 dark:hover:bg-neutral-700 text-black dark:text-white comfort:text-[#231f1a] text-xs font-bold flex items-center justify-center gap-2 transition border border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1] cursor-pointer flex-1 sm:flex-initial"
            title="Refresh feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="font-myanmar">{language === 'my' ? 'အသစ်ရယူ' : 'Refresh'}</span>
          </button>

          {/* Admin Upload Button: Conditionally rendered only if user's email exists in VITE_ADMIN_EMAILS */}
          {isAdmin && (
            <button
              type="button"
              onClick={onNavigateAdmin}
              className="h-10 px-5 rounded-xl bg-black text-white dark:bg-white dark:text-black comfort:bg-[#231f1a] comfort:text-[#faf6ee] hover:opacity-90 text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer flex-1 sm:flex-initial animate-in fade-in duration-200"
              id="admin-upload-btn"
              title={language === 'my' ? 'ပို့စ်အသစ်တင်ရန် (Admin သာလျှင်)' : 'Upload New Post (Admin Only)'}
            >
              <PlusCircle className="w-4 h-4" />
              <span className="font-myanmar">{language === 'my' ? '+ ပို့စ်အသစ်တင်ရန်' : '+ New Post'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Privilege Warning Notice */}
      {adminNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 font-myanmar shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-semibold">{adminNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setAdminNotice(null)}
            className="text-neutral-500 hover:text-black dark:hover:text-white px-2 py-1 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Featured Today's Daily Bulletin Card */}
      {todayBulletin && (activeTab === 'all' || activeTab === 'daily') && (
        <div className="mb-8 p-5 sm:p-7 rounded-3xl bg-linear-to-br from-amber-500/10 via-emerald-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                  <Calendar className="w-3 h-3" />
                  <span>{language === 'my' ? 'ယနေ့ နေ့စဉ်သတင်းလွှာ' : "Today's Daily Bulletin"}</span>
                </span>
                <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 comfort:text-amber-950 font-myanmar">
                  {todayDateStr}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'ဆရာဝန် စိစစ်ပြီး' : 'Doctor Vetted'}</span>
                </span>
              </div>

              <h2 
                onClick={() => setSelectedPost(todayBulletin)}
                className="text-lg sm:text-xl font-extrabold text-black dark:text-white comfort:text-[#231f1a] font-myanmar cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors leading-snug"
              >
                {cleanPostTitle(todayBulletin.title)}
              </h2>

              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 comfort:text-[#4a4035] mt-2 font-myanmar leading-relaxed line-clamp-3">
                {todayBulletin.content}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-amber-500/20">
              <button
                type="button"
                onClick={() => setSelectedPost(todayBulletin)}
                className="px-4 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black comfort:bg-[#231f1a] comfort:text-[#faf6ee] text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <span className="font-myanmar">{language === 'my' ? 'အပြည့်အစုံဖတ်မည်' : 'Read Full Bulletin'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleShare(todayBulletin)}
                className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition cursor-pointer"
                title="Share bulletin"
              >
                {copiedId === todayBulletin.id ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode Switcher Tabs: All | Live Posts | Daily Posts */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 comfort:bg-[#f2e9d8] border border-border-subtle dark:border-neutral-700/80 comfort:border-[#ded4c1]">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all font-myanmar ${
              activeTab === 'all'
                ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-black dark:text-white comfort:text-[#231f1a] shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <span>{language === 'my' ? 'အားလုံး' : 'All Posts'}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-[10px]">
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all font-myanmar ${
              activeTab === 'live'
                ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-black dark:text-white comfort:text-[#231f1a] shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>{language === 'my' ? 'တိုက်ရိုက် ပို့စ်များ' : 'Live Posts'}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 text-[10px]">
              {counts.live}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all font-myanmar ${
              activeTab === 'daily'
                ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-black dark:text-white comfort:text-[#231f1a] shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'my' ? 'နေ့စဉ် သတင်းလွှာများ' : 'Daily Bulletins'}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px]">
              {counts.daily}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder={language === 'my' ? 'သတင်းလွှာနှင့် ပို့စ်များ ရှာဖွေပါ...' : 'Search bulletins & posts...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 comfort:bg-[#f2e9d8] border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] text-xs sm:text-sm text-black dark:text-white comfort:text-[#231f1a] focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white font-myanmar"
          />
        </div>
      </div>

      {/* Posts Grid */}
      {loading && posts.length === 0 ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-neutral-400 mb-3" />
          <p className="text-xs text-neutral-500 font-myanmar">
            {language === 'my' ? 'Supabase မှ တိုက်ရိုက်သတင်းလွှာများကို ရယူနေပါသည်...' : 'Loading dynamic bulletins from Supabase...'}
          </p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-16 px-4 text-center rounded-3xl border border-dashed border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] max-w-lg mx-auto">
          <FileText className="w-10 h-10 mx-auto text-neutral-400 mb-3" />
          <h3 className="text-base font-bold text-black dark:text-white comfort:text-[#231f1a] font-myanmar">
            {language === 'my' ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော ပို့စ်မရှိပါ' : 'No posts found in this category'}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 comfort:text-[#645a4e] mt-1 font-myanmar max-w-sm mx-auto">
            {language === 'my'
              ? 'အပေါ်ရှိ + ပို့စ်အသစ်တင်ရန် မှတစ်ဆင့် ဆောင်းပါး သို့မဟုတ် ကျန်းမာရေး သတင်းလွှာ ပို့စ်များကို စတင်တင်သွင်းနိုင်ပါသည်။'
              : 'Publish your first post using the Admin Upload panel. Live and daily posts sync instantly.'}
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={onNavigateAdmin}
              className="mt-4 px-5 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black comfort:bg-[#231f1a] comfort:text-[#faf6ee] text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer font-myanmar animate-in fade-in"
            >
              {language === 'my' ? '+ ပို့စ်အသစ် စတင်ရေးသားရန်' : 'Go to Post Upload'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            const category = getPostCategory(post);
            const isDaily = category === 'daily';
            const cleanTitle = cleanPostTitle(post.title);
            const dateStr = new Date(post.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            return (
              <article
                key={post.id}
                className="group bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] rounded-3xl border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Image banner or decorative placeholder */}
                  {post.image_url ? (
                    <div 
                      className="w-full h-48 overflow-hidden bg-neutral-100 dark:bg-neutral-800 relative cursor-pointer" 
                      onClick={() => setSelectedPost(post)}
                    >
                      <img
                        src={post.image_url}
                        alt={cleanTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3">
                        {isDaily ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs font-myanmar">
                            <Calendar className="w-3 h-3" />
                            <span>{language === 'my' ? 'နေ့စဉ် သတင်းလွှာ' : 'Daily Bulletin'}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs font-myanmar">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            <span>{language === 'my' ? 'တိုက်ရိုက် ပို့စ်' : 'Live Post'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="w-full h-32 bg-linear-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 comfort:from-[#f2e9d8] comfort:to-[#faf6ee] p-4 flex flex-col justify-between cursor-pointer"
                      onClick={() => setSelectedPost(post)}
                    >
                      <div>
                        {isDaily ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-xs font-myanmar">
                            <Calendar className="w-3 h-3" />
                            <span>{language === 'my' ? 'နေ့စဉ် သတင်းလွှာ' : 'Daily Bulletin'}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-xs font-myanmar">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            <span>{language === 'my' ? 'တိုက်ရိုက် ပို့စ်' : 'Live Post'}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{language === 'my' ? 'စာသား သတင်းလွှာ' : 'Text Bulletin'}</span>
                      </div>
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="p-5">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 mb-2">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{dateStr}</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 font-bold uppercase tracking-wider text-neutral-500">
                        {isDaily ? (language === 'my' ? 'နေ့စဉ်' : 'Daily') : (language === 'my' ? 'တိုက်ရိုက်' : 'Live')}
                      </span>
                    </div>

                    <h3 
                      onClick={() => setSelectedPost(post)}
                      className="text-base sm:text-lg font-bold text-black dark:text-white comfort:text-[#231f1a] font-myanmar group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 cursor-pointer leading-snug"
                    >
                      {cleanTitle}
                    </h3>

                    <p className="text-xs text-neutral-600 dark:text-neutral-300 comfort:text-[#4a4035] mt-2.5 font-myanmar leading-relaxed line-clamp-3 whitespace-pre-line">
                      {post.content}
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-3.5 border-t border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedPost(post)}
                    className="font-bold text-black dark:text-white comfort:text-[#231f1a] hover:underline flex items-center gap-1 cursor-pointer font-myanmar"
                  >
                    <span>{language === 'my' ? 'အပြည့်အစုံဖတ်မည်' : 'Read Post'}</span>
                    <span>&rarr;</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Edit Post Button */}
                    {/* Admin Edit and Delete Buttons: Conditionally rendered only if user's email exists in VITE_ADMIN_EMAILS */}
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingPostId(post.id)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                          title={language === 'my' ? 'ပို့စ်ပြင်ဆင်ရန် (Admin သာလျှင်)' : 'Edit Post (Admin Only)'}
                          id={`edit-post-${post.id}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmDeletePost(post)}
                          disabled={deletingPostId === post.id}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer disabled:opacity-50"
                          title={language === 'my' ? 'ပို့စ်ဖျက်မည် (Admin သာလျှင်)' : 'Delete Post (Admin Only)'}
                          id={`delete-post-${post.id}`}
                        >
                          {deletingPostId === post.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    )}

                    {/* Share Button */}
                    <button
                      type="button"
                      onClick={() => handleShare(post)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                      title="Share post"
                    >
                      {copiedId === post.id ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] rounded-3xl max-w-2xl w-full border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col relative">
            {/* Top Right Corner Floating Close Button for Mobile & Desktop */}
            <button
              type="button"
              onClick={() => setSelectedPost(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center shadow-lg border border-white/20 backdrop-blur-md transition-transform cursor-pointer hover:scale-105 active:scale-95"
              aria-label="Close reading view"
              title={language === 'my' ? 'ပိတ်မည်' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
            {selectedPost.image_url && (
              <div className="w-full max-h-72 shrink-0 overflow-hidden bg-black relative">
                <img
                  src={selectedPost.image_url}
                  alt={cleanPostTitle(selectedPost.title)}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="p-6 sm:p-8 overflow-y-auto flex-1">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-3">
                <span className="font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(selectedPost.created_at).toLocaleString()}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold font-myanmar">
                  {getPostCategory(selectedPost) === 'daily'
                    ? (language === 'my' ? '📅 နေ့စဉ်သတင်းလွှာ' : '📅 Daily Bulletin')
                    : (language === 'my' ? '🔴 တိုက်ရိုက်ပို့စ်' : '🔴 Live Post')}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-black dark:text-white comfort:text-[#231f1a] font-myanmar mb-4 leading-snug">
                {cleanPostTitle(selectedPost.title)}
              </h2>

              <div className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 comfort:text-[#383027] font-myanmar leading-relaxed whitespace-pre-line space-y-3 mb-6">
                {selectedPost.content}
              </div>

              {/* Action Bar inside detail */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1]">
                <div className="flex items-center gap-2">
                  {/* Admin Edit and Delete inside Post Detail Modal */}
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingPostId(selectedPost.id)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-emerald-500/30 font-myanmar"
                        id="modal-edit-post-btn"
                        title={language === 'my' ? 'ပို့စ်ပြင်ဆင်မည် (Admin သာလျှင်)' : 'Edit Post (Admin Only)'}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{language === 'my' ? 'ပြင်ဆင်မည်' : 'Edit'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDeletePost(selectedPost)}
                        className="px-3.5 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer font-myanmar"
                        id="modal-delete-post-btn"
                        title={language === 'my' ? 'ပို့စ်ဖျက်မည် (Admin သာလျှင်)' : 'Delete Post (Admin Only)'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{language === 'my' ? 'ဖျက်မည်' : 'Delete'}</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleShare(selectedPost)}
                    className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedId === selectedPost.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{language === 'my' ? 'မျှဝေပါ' : 'Share'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPost(null)}
                    className="px-5 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black comfort:bg-[#231f1a] comfort:text-[#faf6ee] text-xs font-bold cursor-pointer"
                  >
                    {language === 'my' ? 'ပိတ်မည်' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal with Supabase update() integration */}
      <EditPostModal
        postId={editingPostId}
        isOpen={!!editingPostId}
        onClose={() => setEditingPostId(null)}
        onUpdated={(updatedPost) => {
          setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
          if (selectedPost?.id === updatedPost.id) {
            setSelectedPost(updatedPost);
          }
        }}
        onDeleted={(deletedId) => {
          setPosts((prev) => prev.filter((p) => p.id !== deletedId));
          if (selectedPost?.id === deletedId) {
            setSelectedPost(null);
          }
        }}
        language={language}
      />

      {/* Delete Confirmation Dialog */}
      {confirmDeletePost && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!deletingPostId) setConfirmDeletePost(null);
          }}
        >
          <div 
            className="bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] rounded-3xl max-w-md w-full border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] overflow-hidden shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-labelledby="delete-dialog-title"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 border border-red-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-base font-bold text-black dark:text-white comfort:text-[#231f1a] font-myanmar">
                  {language === 'my' ? 'ပို့စ်ကို ဖျက်ရန် သေချာပါသလား?' : 'Delete Post Confirmation'}
                </h3>
                <p className="text-xs text-neutral-500 font-myanmar">
                  {language === 'my' ? 'ဤလုပ်ဆောင်ချက်ကို ပြန်လည်ပြင်၍မရပါ' : 'This action cannot be undone.'}
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/50 comfort:bg-[#f7f2e7] p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 comfort:border-[#ded4c1] mb-6">
              <span className="font-bold text-black dark:text-white comfort:text-[#231f1a] block mb-1 truncate text-xs sm:text-sm font-myanmar">
                "{cleanPostTitle(confirmDeletePost.title)}"
              </span>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 comfort:text-[#645a4e] font-myanmar">
                {language === 'my' 
                  ? 'ဤပို့စ်ကို Supabase Database မှ အပြီးအပိုင် ဖျက်ပစ်မည်ဖြစ်ပါသည်။' 
                  : 'This record will be permanently deleted from the Supabase posts table.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeletePost(null)}
                disabled={!!deletingPostId}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50 font-myanmar"
              >
                {language === 'my' ? 'မဖျက်တော့ပါ' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => handleDeletePost(confirmDeletePost.id)}
                disabled={!!deletingPostId}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50 font-myanmar"
                id="confirm-delete-action-btn"
              >
                {deletingPostId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === 'my' ? 'ဖျက်နေသည်...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'my' ? 'အပြီးဖျက်မည်' : 'Delete'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Gmail Authentication Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        language={language}
      />
    </div>
  );
};
