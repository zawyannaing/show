import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  ArrowLeft, 
  RefreshCw, 
  ExternalLink, 
  Sparkles, 
  Database, 
  Copy, 
  Check,
  Settings,
  Layers,
  Leaf,
  Activity,
  HeartPulse,
  Phone,
  Edit3,
  Calendar,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Crown,
  User,
  Mail,
  LogIn,
  UserPlus
} from 'lucide-react';
import { supabase, Post } from '../lib/supabaseClient';
import { SectionContentManager } from './SectionContentManager';
import { EditPostModal } from './EditPostModal';
import { 
  signInWithPassword, 
  signUpWithPassword,
  signInWithGoogle,
  signOutUser, 
  subscribeAuth, 
  getCurrentUserInfo, 
  AuthUserInfo,
  isEmailAdmin,
  getAdminEmails
} from '../lib/supabaseAuth';
import { useAuth } from '../hooks/useAuth';

interface AdminPostUploadProps {
  language: 'en' | 'my';
  onNavigateHome: () => void;
  initialTab?: 'post' | 'sections';
  initialSectionTab?: 'plants' | 'symptoms' | 'firstaid' | 'hotlines';
}

const SUPABASE_COMPLETE_SQL = `-- 1. Create posts table if not exists
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS) on posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 3. Table policies for public read, insert, delete
DROP POLICY IF EXISTS "Allow public read" ON public.posts;
DROP POLICY IF EXISTS "Allow public insert" ON public.posts;
DROP POLICY IF EXISTS "Allow public delete" ON public.posts;

CREATE POLICY "Allow public read" ON public.posts FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert" ON public.posts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public delete" ON public.posts FOR DELETE TO public USING (true);

-- 4. Create and configure 'uploads' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5. Storage RLS policies (Fixes "new row violates row-level security policy")
DROP POLICY IF EXISTS "Allow public upload to uploads bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from uploads bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from uploads bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update in uploads bucket" ON storage.objects;

CREATE POLICY "Allow public upload to uploads bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Allow public read from uploads bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'uploads');

CREATE POLICY "Allow public delete from uploads bucket"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'uploads');`;

export const AdminPostUpload: React.FC<AdminPostUploadProps> = ({ 
  language, 
  onNavigateHome,
  initialTab = 'post',
  initialSectionTab = 'plants'
}) => {
  const [adminMode, setAdminMode] = useState<'post' | 'sections'>(initialTab);
  const [sectionSubTab, setSectionSubTab] = useState<'plants' | 'symptoms' | 'firstaid' | 'hotlines'>(initialSectionTab);

  useEffect(() => {
    setAdminMode(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSectionSubTab(initialSectionTab);
  }, [initialSectionTab]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'live' | 'daily'>('live');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success' | 'info' | ''; text: string }>({
    type: '',
    text: ''
  });

  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [fetchingPosts, setFetchingPosts] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [isStorageRlsError, setIsStorageRlsError] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // User authentication state (Email & Password via Supabase)
  const [currentUser, setCurrentUser] = useState<AuthUserInfo | null>(() => getCurrentUserInfo());
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginFullName, setLoginFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { user, userEmail, isAdmin: hookIsAdmin } = useAuth();
  const isAuthenticated = !!user || !!currentUser?.email;
  const isAdmin = hookIsAdmin || !!currentUser?.isAdmin || isEmailAdmin(userEmail || currentUser?.email);

  useEffect(() => {
    return subscribeAuth((_user, userInfo) => {
      setCurrentUser(userInfo);
    });
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setAuthError(language === 'my' ? 'အီးမေးလ်နှင့် စကားဝှက်ကို ဖြည့်စွက်ပါ' : 'Please enter email and password.');
      setAuthLoading(false);
      return;
    }

    try {
      if (authTab === 'signin') {
        const { error } = await signInWithPassword(loginEmail.trim(), loginPassword);
        if (error) {
          setAuthError(error);
        } else {
          setAuthSuccess(language === 'my' ? 'အောင်မြင်စွာ ဝင်ရောက်ပြီးပါပြီ' : 'Signed in successfully!');
        }
      } else {
        const { error } = await signUpWithPassword(loginEmail.trim(), loginPassword, loginFullName.trim());
        if (error) {
          setAuthError(error);
        } else {
          setAuthSuccess(
            language === 'my' 
              ? 'အကောင့်သစ် အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ။' 
              : 'Account created successfully!'
          );
        }
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUserLogout = async () => {
    setAuthLoading(true);
    await signOutUser();
    setCurrentUser(null);
    setAuthLoading(false);
  };


  // Fetch recent posts
  const fetchRecentPosts = async () => {
    setFetchingPosts(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.warn('Supabase fetch error:', error.message);
        if (error.message.includes('relation "public.posts" does not exist') || error.code === '42P01') {
          setShowSqlGuide(true);
        }
      } else if (data) {
        setRecentPosts(data);
      }
    } catch (err: any) {
      console.warn('Failed to query posts:', err);
    } finally {
      setFetchingPosts(false);
    }
  };

  useEffect(() => {
    fetchRecentPosts();
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_COMPLETE_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ 
        type: 'error', 
        text: language === 'my' ? 'ကျေးဇူးပြု၍ ပုံဖိုင် (JPG, PNG, WEBP) ကိုသာ ရွေးချယ်ပါ' : 'Please select a valid image file (JPG, PNG, WEBP).' 
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ 
        type: 'error', 
        text: language === 'my' ? 'ဖိုင်အရွယ်အစားသည် 5MB ထက်မပိုရပါ' : 'Image file size must be less than 5MB.' 
      });
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStatusMessage({ type: '', text: '' });
    setIsStorageRlsError(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    setIsStorageRlsError(false);
  };

  const handleSubmit = async (e: React.FormEvent, skipImage = false) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!isAdmin) {
      setStatusMessage({
        type: 'error',
        text: language === 'my'
          ? `ခွင့်ပြုချက်မရှိပါ: Admin Mail စာရင်း (${getAdminEmails().join(', ')}) တွင် ပါဝင်မှသာ ပို့စ်တင်ခွင့်ရှိပါသည်။`
          : 'Unauthorized: Only verified admin emails from VITE_ADMIN_EMAILS can upload posts.'
      });
      return;
    }

    if (!title.trim() || !content.trim()) {
      setStatusMessage({
        type: 'error',
        text: language === 'my' ? 'ခေါင်းစဉ်နှင့် အကြောင်းအရာကို ဖြည့်စွက်ပါ' : 'Title and content are required.'
      });
      return;
    }

    setLoading(true);
    setIsStorageRlsError(false);
    setStatusMessage({
      type: 'info',
      text: language === 'my' ? 'Supabase သို့ ပို့စ်တင်နေပါသည်...' : 'Uploading post to Supabase...'
    });

    try {
      let publicImageUrl: string | null = null;

      // 1. Upload image to Supabase Storage bucket 'uploads' if provided and not skipped
      if (imageFile && !skipImage) {
        const fileExt = imageFile.name.split('.').pop() || 'jpg';
        const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `posts/${cleanFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          const isRls = uploadError.message?.toLowerCase().includes('violates row-level security') ||
                        uploadError.message?.toLowerCase().includes('row-level security');
          
          if (isRls) {
            console.warn('Supabase Storage RLS blocked file upload; falling back to direct compressed Base64 image encoding so post is not lost.');
            setIsStorageRlsError(true);
            
            // Auto fallback: convert to compressed base64 data URL so the post uploads immediately!
            publicImageUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  // Max 1000px dimension for storage efficiency
                  let width = img.width;
                  let height = img.height;
                  const maxDim = 1000;
                  if (width > maxDim || height > maxDim) {
                    if (width > height) {
                      height = Math.round((height * maxDim) / width);
                      width = maxDim;
                    } else {
                      width = Math.round((width * maxDim) / height);
                      height = maxDim;
                    }
                  }
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.75));
                  } else {
                    resolve(reader.result as string);
                  }
                };
                img.onerror = () => resolve(reader.result as string);
                img.src = reader.result as string;
              };
              reader.readAsDataURL(imageFile);
            });
          } else {
            throw new Error(`Supabase Storage: ${uploadError.message}`);
          }
        } else {
          // 2. Retrieve public URL
          const { data: urlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(filePath);

          publicImageUrl = urlData.publicUrl;
        }
      }

      // 3. Insert record into 'posts' table
      const formattedTitle = postType === 'daily'
        ? (title.trim().startsWith('[Daily]') ? title.trim() : `[Daily] ${title.trim()}`)
        : (title.trim().startsWith('[Live]') ? title.trim() : `[Live] ${title.trim()}`);

      const { data: insertedData, error: insertError } = await supabase
        .from('posts')
        .insert([
          {
            title: formattedTitle,
            content: content.trim(),
            image_url: publicImageUrl
          }
        ])
        .select();

      if (insertError) {
        throw new Error(`Database error: ${insertError.message}`);
      }

      // 4. Success Reset
      setTitle('');
      setContent('');
      handleRemoveImage();
      const usedFallback = isStorageRlsError;
      setStatusMessage({
        type: 'success',
        text: language === 'my' 
          ? (usedFallback 
              ? 'ပို့စ်နှင့် ပုံကို အောင်မြင်စွာ တင်ပြီးပါပြီ။ (Storage Policy မရသေးသဖြင့် Backup ဖြင့် ထည့်သွင်းထားသည်)' 
              : 'ပို့စ်ကို အောင်မြင်စွာ တင်ပြီးပါပြီ။')
          : (usedFallback 
              ? 'Post and photo published successfully via smart fallback! To enable direct bucket storage, apply the SQL fix below.' 
              : 'Post published successfully to Supabase!')
      });

      // Refresh list
      fetchRecentPosts();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'An error occurred while uploading.'
      });
      if (err.message?.includes('relation "public.posts" does not exist') || err.message?.includes('row-level security')) {
        setShowSqlGuide(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm(language === 'my' ? 'ဤပို့စ်ကို ဖျက်ရန် သေချာပါသလား?' : 'Are you sure you want to delete this post?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) {
        alert(`Delete failed: ${error.message}`);
      } else {
        setRecentPosts(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-400 comfort:text-[#645a4e] hover:text-black dark:hover:text-white transition-colors cursor-pointer w-fit mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'my' ? 'ပင်မစာမျက်နှာသို့ ပြန်သွားမည်' : 'Back to Home'}</span>
        </button>

        <div className="max-w-md mx-auto p-6 sm:p-8 bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-6 text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-black dark:text-white comfort:text-[#231f1a] font-myanmar">
              {language === 'my' ? 'စီမံခန့်ခွဲသူ ခွင့်ပြုချက် လိုအပ်ပါသည်' : 'Admin Control Panel Restricted'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 comfort:text-[#645a4e] mt-2 leading-relaxed font-myanmar">
              {isAuthenticated ? (
                language === 'my' 
                  ? `လက်ရှိ ဝင်ရောက်ထားသော အကောင့် (${userEmail || currentUser?.email}) သည် Admin မဟုတ်ပါ။ ခွင့်ပြုထားသော Admin Mail ဖြင့် ဝင်ရောက်ပါရန်။`
                  : `Signed in as ${userEmail || currentUser?.email} (Standard User). This profile does not have Admin access. Please sign in with an authorized Admin email.`
              ) : (
                language === 'my'
                  ? 'ဤ စီမံခန့်ခွဲမှု ကဏ္ဍသို့ ဝင်ရောက်ရန် ခွင့်ပြုချက်ရရှိထားသော Admin Mail ဖြင့် ဝင်ရောက်ရန် လိုအပ်ပါသည်။'
                  : 'To access clinical posting and section management controls, sign in with an authorized Admin email.'
              )}
            </p>
          </div>

          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl text-[11px] text-neutral-500 dark:text-neutral-400 font-mono text-left space-y-1 border border-neutral-200 dark:border-neutral-700">
            <div className="font-bold font-myanmar text-neutral-700 dark:text-neutral-300">
              {language === 'my' ? 'ခွင့်ပြုထားသော Admin Email များ:' : 'Authorized Admin Emails:'}
            </div>
            <div>{getAdminEmails().join(', ')}</div>
          </div>

          {/* Admin Login Actions */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={async () => {
                setAuthLoading(true);
                const { error } = await signInWithPassword('admin', 'admin#$234');
                if (error) setAuthError(error);
                setAuthLoading(false);
              }}
              disabled={authLoading}
              className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-sm cursor-pointer font-myanmar disabled:opacity-50"
            >
              <Crown className="w-4 h-4" />
              <span>{language === 'my' ? 'Default Admin (admin / admin#$234) ဖြင့် ဝင်မည်' : 'Sign in with Default Admin (admin / admin#$234)'}</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setAuthLoading(true);
                const { error } = await signInWithGoogle();
                if (error) setAuthError(error);
                setAuthLoading(false);
              }}
              disabled={authLoading}
              className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition shadow-xs cursor-pointer font-myanmar disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{language === 'my' ? 'Google အကောင့်ဖြင့် Admin ဝင်မည်' : 'Sign in as Admin with Google'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Top Breadcrumb & User / System Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-400 comfort:text-[#645a4e] hover:text-black dark:hover:text-white transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'my' ? 'ပင်မစာမျက်နှာသို့ ပြန်သွားမည်' : 'Back to Home'}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentUser && (
            <div className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] border border-border-subtle dark:border-neutral-700">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover border border-emerald-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <span className="text-xs font-bold text-black dark:text-white comfort:text-[#231f1a] flex items-center gap-1.5 leading-tight">
                  <span>{currentUser.name}</span>
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-myanmar">
                      <Crown className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                      <span>Admin</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-myanmar">
                      <User className="w-2.5 h-2.5" />
                      <span>User</span>
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono block leading-tight">
                  {currentUser.email}
                </span>
              </div>
              <button
                type="button"
                onClick={handleUserLogout}
                disabled={authLoading}
                className="ml-2 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1 transition cursor-pointer font-myanmar"
                title="Sign out"
              >
                <LogOut className="w-3 h-3" />
                <span>{language === 'my' ? 'ထွက်မည်' : 'Sign Out'}</span>
              </button>
            </div>
          )}

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-myanmar">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {language === 'my' ? 'Supabase ချိတ်ဆက်ထားသည်' : 'Supabase Connected'}
          </span>

          <button
            type="button"
            onClick={() => setShowSqlGuide(prev => !prev)}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 comfort:text-[#4a4035] flex items-center gap-1.5 transition cursor-pointer font-myanmar"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{language === 'my' ? 'SQL ပြင်ဆင်ချက်' : 'SQL Setup & Fix'}</span>
          </button>
        </div>
      </div>

      {/* Storage RLS Resolution Banner if detected */}
      {isStorageRlsError && (
        <div className="mb-6 p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600/50 shadow-sm text-xs space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-amber-950 dark:text-amber-200 text-sm">
                  {language === 'my' ? 'Supabase Storage Policy လိုအပ်နေပါသည်' : 'Supabase Storage Policy Required'}
                </h4>
                <p className="text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                  {language === 'my' 
                    ? 'ပုံတင်နိုင်ရန် Supabase SQL Editor တွင် Storage INSERT policy ကို ထည့်သွင်းပေးရပါမည်။ အောက်ပါ "Copy Storage SQL Fix" ကို နှိပ်ပြီး Supabase SQL Editor ထဲသို့ paste လုပ်ကာ Run ပေးပါ။' 
                    : 'To allow photo uploads, Supabase Storage requires an INSERT policy for the "uploads" bucket. Click "Copy SQL Fix" below and paste it into the Supabase SQL Editor.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="px-4 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition shadow-sm cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copied!' : 'Copy SQL Fix'}</span>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-amber-200 dark:border-amber-900/60">
            <span className="text-neutral-500 dark:text-neutral-400">
              {language === 'my' ? 'ပုံမပါဘဲ စာသားသာ ယခုချက်ချင်း တင်လိုပါသလား?' : 'Want to publish text-only right now without image?'}
            </span>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="px-3 py-1 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold transition cursor-pointer"
            >
              {language === 'my' ? 'ပုံမပါဘဲ ပို့စ်တင်မည်' : 'Publish Text-Only Now'}
            </button>
          </div>
        </div>
      )}

      {/* SQL Setup Helper (Collapsible) */}
      {showSqlGuide && (
        <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-neutral-900 text-neutral-100 dark:bg-neutral-900 border border-neutral-700 text-xs font-mono space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Supabase Complete Database & Storage SQL:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySql}
                className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSqlGuide(false)}
                className="px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="text-[11px] text-neutral-300 font-sans leading-relaxed space-y-1">
            <p><strong>Instructions:</strong> Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline inline-flex items-center gap-0.5">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a> &rarr; Click <strong>SQL Editor</strong> on the left &rarr; Click <strong>New query</strong> &rarr; Paste this script &rarr; Click <strong>Run</strong>.</p>
          </div>

          <pre className="p-4 bg-black/70 rounded-2xl overflow-x-auto text-[11px] leading-relaxed text-emerald-300 max-h-72">
{SUPABASE_COMPLETE_SQL}
          </pre>
        </div>
      )}

      {/* Top Admin Mode Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 comfort:bg-[#f2e9d8] border border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1]">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setAdminMode('post')}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              adminMode === 'post'
                ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-black dark:text-white comfort:text-[#231f1a] shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-emerald-600" />
            <span>{language === 'my' ? 'ပို့စ်အသစ်တင်ရန် (Supabase Feed)' : 'Supabase Post Upload'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminMode('sections')}
            className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              adminMode === 'sections'
                ? 'bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] text-black dark:text-white comfort:text-[#231f1a] shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-500" />
            <span>{language === 'my' ? 'ကဏ္ဍများ ပြင်ဆင်/မွမ်းမံရန်' : 'Manage App Sections'}</span>
            <span className="hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300">
              Plants • Symptoms • ER • Phones
            </span>
          </button>
        </div>

        {adminMode === 'sections' && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 px-2 font-medium">
            {language === 'my' ? 'ကဏ္ဍ ၄ ခုလုံးကို တိုက်ရိုက် စီမံခန့်ခွဲနိုင်ပါသည်' : 'Full CRUD for all 4 clinical core categories'}
          </div>
        )}
      </div>

      {/* Render Active Admin View */}
      {adminMode === 'sections' ? (
        <SectionContentManager language={language} initialTab={sectionSubTab} />
      ) : (
        <>
          {/* Main Upload Card */}
          <div className="bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] rounded-3xl border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white comfort:text-[#231f1a] font-myanmar">
            {language === 'my' ? 'ပို့စ်အသစ် ရေးသားတင်ပြရန် (Admin Panel)' : 'Admin Post Upload'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 comfort:text-[#645a4e] mt-1 font-myanmar">
            {language === 'my' 
              ? 'ခေါင်းစဉ်၊ ဆောင်းပါးအကြောင်းအရာ နှင့် ပုံများကို Supabase Storage သို့ တိုက်ရိုက်တင်သွင်းနိုင်ပါသည်' 
              : 'Publish articles, clinical updates, and health announcements directly to Supabase.'}
          </p>
        </div>

        {/* Feedback Alert */}
        {statusMessage.text && (
          <div
            className={`p-4 mb-6 rounded-2xl text-xs sm:text-sm font-medium flex items-start gap-2.5 ${
              statusMessage.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'
                : statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900'
            }`}
          >
            {statusMessage.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />}
            {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />}
            {statusMessage.type === 'info' && <Loader2 className="w-5 h-5 shrink-0 text-blue-600 animate-spin mt-0.5" />}
            <span className="font-myanmar leading-relaxed">{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {/* Post Category: Live Post vs Daily Bulletin */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 comfort:text-[#4a4035] mb-2 font-myanmar">
              {language === 'my' ? 'ပို့စ် အမျိုးအစား ရွေးချယ်ရန် (Post Category)' : 'Post Category'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPostType('live')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
                  postType === 'live'
                    ? 'border-red-500 bg-red-500/10 text-red-950 dark:text-red-200 shadow-xs'
                    : 'border-border-subtle dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
                </div>
                <div>
                  <span className="font-bold text-xs sm:text-sm block font-myanmar">
                    {language === 'my' ? '🔴 တိုက်ရိုက် ပို့စ် (Live Post)' : '🔴 Live Post'}
                  </span>
                  <span className="text-[11px] opacity-75 font-myanmar block">
                    {language === 'my' ? 'လတ်တလော အခြေအနေနှင့် သတင်းများ' : 'Real-time field updates & news'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPostType('daily')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
                  postType === 'daily'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200 shadow-xs'
                    : 'border-border-subtle dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs sm:text-sm block font-myanmar">
                    {language === 'my' ? '📅 နေ့စဉ် သတင်းလွှာ (Daily Bulletin)' : '📅 Daily Bulletin'}
                  </span>
                  <span className="text-[11px] opacity-75 font-myanmar block">
                    {language === 'my' ? 'နေ့စဉ် ဆရာဝန် အကြံပြုချက်နှင့် လမ်းညွှန်' : 'Daily medical advisories & tips'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Post Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 comfort:text-[#4a4035] mb-2 font-myanmar">
              {language === 'my' ? 'ပို့စ်ခေါင်းစဉ် (Post Title)' : 'Post Title'} *
            </label>
            <input
              type="text"
              required
              placeholder={language === 'my' ? 'ဥပမာ - သွေးတိုးကျစေသော ဆေးဖက်ဝင်အပင်များ လေ့လာချက်' : 'e.g. Traditional Herbs for Healthy Blood Pressure'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] border border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1] text-black dark:text-white comfort:text-[#231f1a] text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white comfort:focus:ring-[#231f1a]"
            />
          </div>

          {/* Post Content */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 comfort:text-[#4a4035] mb-2 font-myanmar">
              {language === 'my' ? 'ဆောင်းပါး / အကြောင်းအရာ (Content)' : 'Post Content'} *
            </label>
            <textarea
              required
              rows={6}
              placeholder={language === 'my' ? 'ဤနေရာတွင် အသေးစိတ်အချက်အလက်များကို ရေးသားပါ...' : 'Write the complete article description, clinical advice, or update...'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] border border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1] text-black dark:text-white comfort:text-[#231f1a] text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white comfort:focus:ring-[#231f1a] leading-relaxed"
            />
          </div>

          {/* Image Upload Area */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 comfort:text-[#4a4035] mb-2 font-myanmar">
              {language === 'my' ? 'ပုံတင်သွင်းရန် (Featured Image - Optional)' : 'Featured Image (Optional)'}
            </label>

            {!imagePreview ? (
              <label className="border-2 border-dashed border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1] hover:border-black dark:hover:border-white rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-neutral-50 dark:bg-neutral-800/50 comfort:bg-[#f2e9d8]/50">
                <UploadCloud className="w-10 h-10 text-neutral-400 mb-2" />
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 comfort:text-[#231f1a] font-myanmar">
                  {language === 'my' ? 'ပုံရွေးချယ်ရန် နှိပ်ပါ (သို့မဟုတ် drag & drop)' : 'Click to select image (or drag & drop)'}
                </span>
                <span className="text-[11px] text-neutral-400 mt-1">
                  JPG, PNG, WEBP (Max 5MB) &bull; Uploads to Supabase Storage
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1] bg-neutral-100 dark:bg-neutral-800">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-56 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-full bg-black dark:bg-white comfort:bg-[#231f1a] hover:opacity-90 text-white dark:text-black comfort:text-[#faf6ee] text-xs sm:text-sm font-extrabold transition shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{language === 'my' ? 'တင်နေပါသည်...' : 'Publishing to Supabase...'}</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>{language === 'my' ? 'ပို့စ်ကို အတည်ပြု တင်မည်' : 'Publish Post Now'}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Live Recent Posts List from Supabase */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-black dark:text-white comfort:text-[#231f1a] font-myanmar">
            {language === 'my' ? 'မကြာသေးမီက တင်ထားသော ပို့စ်များ (Supabase Live Records)' : 'Recent Posts on Supabase'}
          </h2>
          <button
            type="button"
            onClick={fetchRecentPosts}
            disabled={fetchingPosts}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 comfort:text-[#4a4035] flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingPosts ? 'animate-spin' : ''}`} />
            <span>{language === 'my' ? 'ပြန်လည်ရယူပါ' : 'Refresh'}</span>
          </button>
        </div>

        {recentPosts.length === 0 ? (
          <div className="p-8 text-center rounded-3xl border border-dashed border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] text-neutral-500 text-xs font-myanmar">
            {language === 'my' 
              ? 'လတ်တလော တင်ထားသော ပို့စ်မရှိသေးပါ။ အပေါ်ရှိ Form မှတစ်ဆင့် စတင်တင်သွင်းပါ။' 
              : 'No posts found in Supabase table yet. Fill out the form above to add your first post.'}
          </div>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <div
                key={post.id}
                className="p-4 rounded-2xl bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-neutral-200 dark:border-neutral-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-5 h-5 text-neutral-400" />
                    </div>
                  )}

                  <div className="truncate">
                    <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white comfort:text-[#231f1a] truncate">
                      {post.title}
                    </h3>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {new Date(post.created_at).toLocaleDateString()} &bull; {post.content}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {post.image_url && (
                    <a
                      href={post.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                      title="View Image"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => setEditingPostId(post.id)}
                    className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-emerald-600 transition cursor-pointer"
                    title={language === 'my' ? 'ပို့စ်ပြင်ရန်' : 'Edit Post'}
                    aria-label="Edit post"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePost(post.id)}
                    disabled={deletingId === post.id}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 transition cursor-pointer disabled:opacity-50"
                    title={language === 'my' ? 'ပို့စ်ဖျက်မည်' : 'Delete Post'}
                    aria-label="Delete post"
                  >
                    {deletingId === post.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {/* Edit Post Modal */}
      <EditPostModal
        postId={editingPostId}
        isOpen={!!editingPostId}
        onClose={() => setEditingPostId(null)}
        onUpdated={() => {
          fetchRecentPosts();
        }}
        onDeleted={() => {
          fetchRecentPosts();
        }}
        language={language}
      />
    </div>
  );
};
