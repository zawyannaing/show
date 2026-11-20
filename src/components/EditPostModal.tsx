import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  UploadCloud, 
  Image as ImageIcon, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  AlertTriangle,
  Calendar,
  Clock
} from 'lucide-react';
import { supabase, Post } from '../lib/supabaseClient';
import { compressImage, formatBytes } from '../utils/imageCompressor';

interface EditPostModalProps {
  postId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updatedPost: Post) => void;
  onDeleted?: (deletedPostId: string) => void;
  language: 'en' | 'my';
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  postId,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
  language
}) => {
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getNowLocalDatetime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  // Form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [customDateTime, setCustomDateTime] = useState<string>('');
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);

  // Status banners
  const [statusMessage, setStatusMessage] = useState<{
    type: 'error' | 'success' | 'info' | '';
    text: string;
  }>({ type: '', text: '' });

  // Fetch post data by ID when modal opens or postId changes
  useEffect(() => {
    if (!isOpen || !postId) {
      // Reset state when closed
      setTitle('');
      setContent('');
      setCustomDateTime('');
      setExistingImageUrl(null);
      setRemoveExistingImage(false);
      setNewImageFile(null);
      setNewImagePreview(null);
      setStatusMessage({ type: '', text: '' });
      setShowDeleteConfirm(false);
      return;
    }

    const fetchPostById = async () => {
      setFetching(true);
      setStatusMessage({ type: '', text: '' });
      setShowDeleteConfirm(false);

      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single();

        if (error) {
          throw new Error(error.message);
        }

        if (data) {
          setTitle(data.title || '');
          setContent(data.content || '');
          if (data.created_at) {
            const d = new Date(data.created_at);
            const offset = d.getTimezoneOffset() * 60000;
            setCustomDateTime(new Date(d.getTime() - offset).toISOString().slice(0, 16));
          } else {
            setCustomDateTime(getNowLocalDatetime());
          }
          setExistingImageUrl(data.image_url || null);
          setRemoveExistingImage(false);
          setNewImageFile(null);
          setNewImagePreview(null);
        }
      } catch (err: any) {
        console.error('Error fetching post by ID:', err);
        setStatusMessage({
          type: 'error',
          text: language === 'my'
            ? `ပို့စ်အချက်အလက် ရယူရာတွင် မအောင်မြင်ပါ: ${err.message}`
            : `Failed to load post data: ${err.message}`
        });
      } finally {
        setFetching(false);
      }
    };

    fetchPostById();
  }, [isOpen, postId, language]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (newImagePreview) {
        URL.revokeObjectURL(newImagePreview);
      }
    };
  }, [newImagePreview]);

  if (!isOpen || !postId) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({
        type: 'error',
        text: language === 'my'
          ? 'ကျေးဇူးပြု၍ ပုံဖိုင် (JPG, PNG, WEBP) ကိုသာ ရွေးချယ်ပါ'
          : 'Please select a valid image file (JPG, PNG, WEBP).'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({
        type: 'error',
        text: language === 'my'
          ? 'ဖိုင်အရွယ်အစားသည် 5MB ထက်မပိုရပါ'
          : 'Image file size must be less than 5MB.'
      });
      return;
    }

    setNewImageFile(file);
    if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    setNewImagePreview(URL.createObjectURL(file));
    setRemoveExistingImage(false);
    setStatusMessage({ type: '', text: '' });
  };

  const handleClearNewImage = () => {
    setNewImageFile(null);
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
      setNewImagePreview(null);
    }
  };

  const handleRemoveExistingPhoto = () => {
    setRemoveExistingImage(true);
    handleClearNewImage();
  };

  const handleRestoreExistingPhoto = () => {
    setRemoveExistingImage(false);
    handleClearNewImage();
  };

  // Update operation using Supabase client
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setStatusMessage({
        type: 'error',
        text: language === 'my'
          ? 'ခေါင်းစဉ်နှင့် အကြောင်းအရာကို ဖြည့်စွက်ပါ'
          : 'Title and content are required.'
      });
      return;
    }

    setSaving(true);
    setStatusMessage({
      type: 'info',
      text: language === 'my'
        ? 'Supabase သို့ ပို့စ်ပြင်ဆင်ချက်များကို သိမ်းဆည်းနေပါသည်...'
        : 'Updating post in Supabase...'
    });

    try {
      let finalImageUrl: string | null = existingImageUrl;

      // If user decided to remove existing photo and didn't upload a new one
      if (removeExistingImage && !newImageFile) {
        finalImageUrl = null;
      }

      // If user provided a new image file, upload it
      if (newImageFile) {
        const fileExt = newImageFile.name.split('.').pop() || 'webp';
        const cleanFileName = `edit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const roleFolder = isAdmin ? 'admin' : 'users';
        const typeFolder = postType === 'daily' ? 'daily_bulletins' : 'live_posts';
        const filePath = `${roleFolder}/${typeFolder}/${cleanFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, newImageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          const isRls = uploadError.message?.toLowerCase().includes('row-level security') ||
                        uploadError.message?.toLowerCase().includes('violates row-level security');
          
          if (isRls) {
            console.warn('Storage RLS triggered, compressing image to base64 fallback');
            // Safe canvas compression fallback
            finalImageUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const maxDim = 1000;
                  let width = img.width;
                  let height = img.height;
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
              reader.readAsDataURL(newImageFile);
            });
          } else {
            throw new Error(`Supabase Storage upload failed: ${uploadError.message}`);
          }
        } else {
          const { data: urlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(filePath);

          finalImageUrl = urlData.publicUrl;
        }
      }

      // Execute update() on 'posts' table
      const updatePayload: any = {
        title: title.trim(),
        content: content.trim(),
        image_url: finalImageUrl
      };
      if (customDateTime) {
        updatePayload.created_at = new Date(customDateTime).toISOString();
      }

      const { data: updatedRecord, error: updateError } = await supabase
        .from('posts')
        .update(updatePayload)
        .eq('id', postId)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      setStatusMessage({
        type: 'success',
        text: language === 'my'
          ? 'ပို့စ်ကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။'
          : 'Post updated successfully in Supabase!'
      });

      if (onUpdated && updatedRecord) {
        onUpdated(updatedRecord);
      }

      // Automatically close modal after brief confirmation
      setTimeout(() => {
        onClose();
      }, 700);

    } catch (err: any) {
      console.error('Update post error:', err);
      setStatusMessage({
        type: 'error',
        text: language === 'my'
          ? `ပို့စ်ပြင်ဆင်ရာတွင် အမှားဖြစ်ပေါ်ပါသည်: ${err.message}`
          : `Failed to update post: ${err.message}`
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete operation using Supabase client
  const handleDelete = async () => {
    if (!postId) return;

    setDeleting(true);
    setStatusMessage({
      type: 'info',
      text: language === 'my'
        ? 'ပို့စ်ကို Supabase မှ ဖျက်နေပါသည်...'
        : 'Deleting post from Supabase...'
    });

    try {
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setStatusMessage({
        type: 'success',
        text: language === 'my'
          ? 'ပို့စ်ကို အောင်မြင်စွာ ဖျက်လိုက်ပါပြီ။'
          : 'Post deleted successfully!'
      });

      if (onDeleted) {
        onDeleted(postId);
      }

      setTimeout(() => {
        onClose();
      }, 400);

    } catch (err: any) {
      console.error('Delete post error:', err);
      setStatusMessage({
        type: 'error',
        text: language === 'my'
          ? `ပို့စ်ဖျက်ရာတွင် အမှားဖြစ်ပေါ်ပါသည်: ${err.message}`
          : `Failed to delete post: ${err.message}`
      });
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving && !deleting) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] rounded-3xl max-w-2xl w-full border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] overflow-hidden shadow-2xl relative my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-post-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h2 
              id="edit-post-modal-title" 
              className="text-base sm:text-lg font-bold text-black dark:text-white comfort:text-[#231f1a] font-myanmar"
            >
              {language === 'my' ? 'ပို့စ် အချက်အလက် ပြင်ဆင်ရန်' : 'Edit Post Details'}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hidden sm:inline">
              ID: {postId.slice(0, 8)}...
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving || deleting}
            className="p-1.5 rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50"
            title="Close"
            id="close-edit-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {fetching ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs sm:text-sm text-neutral-500 font-myanmar">
                {language === 'my' 
                  ? 'Supabase မှ ပို့စ်အချက်အလက်များကို ရယူနေပါသည်...' 
                  : 'Fetching post data from Supabase...'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-5">
              {/* Status Message */}
              {statusMessage.text && (
                <div 
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm flex items-start gap-2.5 font-myanmar ${
                    statusMessage.type === 'error'
                      ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                      : statusMessage.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20'
                  }`}
                >
                  {statusMessage.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  ) : statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  ) : (
                    <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 text-sky-500 animate-spin" />
                  )}
                  <span className="leading-relaxed">{statusMessage.text}</span>
                </div>
              )}

              {/* Custom Publishing Date & Time */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label 
                    htmlFor="edit-post-datetime"
                    className="text-xs font-bold text-neutral-700 dark:text-neutral-300 comfort:text-[#4a4035] font-myanmar flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'my' ? 'ရက်စွဲနှင့် အချိန် (Publish Date & Time)' : 'Publish Date & Time'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomDateTime(getNowLocalDatetime())}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-myanmar"
                  >
                    <Clock className="w-3 h-3" />
                    <span>{language === 'my' ? 'လက်ရှိအချိန် ထားမည်' : 'Set to Now'}</span>
                  </button>
                </div>
                <input
                  id="edit-post-datetime"
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  disabled={saving || deleting}
                  className="w-full px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] border border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1] text-xs sm:text-sm text-black dark:text-white comfort:text-[#231f1a] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                />
              </div>

              {/* Title Field */}
              <div>
                <label 
                  htmlFor="edit-post-title" 
                  className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 comfort:text-[#4a4035] mb-1.5 font-myanmar"
                >
                  {language === 'my' ? 'ဆောင်းပါး / သတင်းလွှာ ခေါင်းစဉ် *' : 'Post Title *'}
                </label>
                <input
                  id="edit-post-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={language === 'my' ? 'ခေါင်းစဉ်ရိုက်ထည့်ပါ...' : 'Enter post title...'}
                  required
                  disabled={saving || deleting}
                  className="w-full px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] border border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1] text-xs sm:text-sm text-black dark:text-white comfort:text-[#231f1a] focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                />
              </div>

              {/* Content Field */}
              <div>
                <label 
                  htmlFor="edit-post-content" 
                  className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 comfort:text-[#4a4035] mb-1.5 font-myanmar"
                >
                  {language === 'my' ? 'အသေးစိတ် အကြောင်းအရာ *' : 'Post Content *'}
                </label>
                <textarea
                  id="edit-post-content"
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={language === 'my' ? 'ဆောင်းပါး အချက်အလက်များကို အသေးစိတ် ရေးသားပါ...' : 'Enter post content...'}
                  required
                  disabled={saving || deleting}
                  className="w-full px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 comfort:bg-[#f2e9d8] border border-border-subtle dark:border-neutral-700 comfort:border-[#ded4c1] text-xs sm:text-sm text-black dark:text-white comfort:text-[#231f1a] focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 leading-relaxed font-myanmar"
                />
              </div>

              {/* Image Management Section */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 comfort:bg-[#f7f2e7] border border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1] space-y-3">
                <span className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 comfort:text-[#4a4035] font-myanmar">
                  {language === 'my' ? 'ဓာတ်ပုံ စီမံခြင်း (Image)' : 'Post Image'}
                </span>

                {/* Case 1: Existing image available and not marked for removal */}
                {existingImageUrl && !removeExistingImage && !newImagePreview && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-xl bg-white dark:bg-neutral-900 comfort:bg-[#faf6ee] border border-border-subtle dark:border-neutral-800">
                    <img
                      src={existingImageUrl}
                      alt="Current post"
                      className="w-24 h-20 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-bold text-black dark:text-white font-myanmar">
                        {language === 'my' ? 'လက်ရှိ တင်ထားသော ဓာတ်ပုံ' : 'Current Post Image'}
                      </p>
                      <p className="text-[11px] text-neutral-500 font-mono truncate max-w-xs">
                        {existingImageUrl}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveExistingPhoto}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer font-myanmar"
                      id="remove-current-photo-btn"
                    >
                      {language === 'my' ? 'ပုံဖျက်မည်' : 'Remove Image'}
                    </button>
                  </div>
                )}

                {/* Case 2: User removed existing image */}
                {existingImageUrl && removeExistingImage && !newImagePreview && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                    <span className="text-amber-800 dark:text-amber-300 font-myanmar">
                      {language === 'my' ? 'လက်ရှိ ဓာတ်ပုံကို ဖယ်ရှားရန် သတ်မှတ်ထားသည်' : 'Current image marked for removal upon save.'}
                    </span>
                    <button
                      type="button"
                      onClick={handleRestoreExistingPhoto}
                      className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer font-myanmar"
                    >
                      {language === 'my' ? 'ပြန်ထားမည်' : 'Restore'}
                    </button>
                  </div>
                )}

                {/* Case 3: New image preview selected */}
                {newImagePreview && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <img
                      src={newImagePreview}
                      alt="New preview"
                      className="w-24 h-20 object-cover rounded-lg border border-emerald-500/30"
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 font-myanmar">
                        {language === 'my' ? 'အသစ် အစားထိုးမည့် ဓာတ်ပုံ' : 'New replacement image selected'}
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        {newImageFile?.name} ({(newImageFile ? newImageFile.size / 1024 : 0).toFixed(1)} KB)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearNewImage}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer font-myanmar"
                    >
                      {language === 'my' ? 'မရွေးတော့ပါ' : 'Cancel File'}
                    </button>
                  </div>
                )}

                {/* Upload file button / drop area */}
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="edit-post-image-file"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-bold text-black dark:text-white cursor-pointer transition border border-border-subtle dark:border-neutral-700 font-myanmar"
                  >
                    <UploadCloud className="w-4 h-4 text-emerald-500" />
                    <span>
                      {existingImageUrl && !removeExistingImage && !newImagePreview
                        ? (language === 'my' ? 'ဓာတ်ပုံ အသစ်လဲမည်' : 'Replace Image')
                        : (language === 'my' ? 'ဓာတ်ပုံ အသစ်တင်မည်' : 'Upload New Image')}
                    </span>
                  </label>
                  <input
                    id="edit-post-image-file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={saving || deleting}
                    className="hidden"
                  />
                  <span className="text-[11px] text-neutral-400 font-myanmar">
                    JPG, PNG, WEBP (Max 5MB)
                  </span>
                </div>
              </div>

              {/* Delete confirmation banner or trigger */}
              {showDeleteConfirm ? (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs space-y-3">
                  <div className="flex items-start gap-2 text-red-800 dark:text-red-300 font-myanmar">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-bold">
                        {language === 'my' 
                          ? 'ဤပို့စ်ကို အပြီးပိုင် ဖျက်ရန် သေချာပါသလား?' 
                          : 'Are you sure you want to permanently delete this post?'}
                      </p>
                      <p className="text-[11px] text-red-700 dark:text-red-400 mt-0.5">
                        {language === 'my' 
                          ? 'ဖျက်လိုက်ပါက ပြန်လည်ရယူနိုင်မည် မဟုတ်ပါ။ Supabase Database ထဲမှ အပြီးဖယ်ရှားသွားပါမည်။' 
                          : 'This will permanently remove the record from Supabase posts table.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      id="confirm-delete-post-btn"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{language === 'my' ? 'ဖျက်နေသည်...' : 'Deleting...'}</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{language === 'my' ? 'သေချာသည်၊ အပြီးဖျက်မည်' : 'Yes, Delete Post'}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="px-3.5 py-1.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-xs font-bold text-black dark:text-white transition cursor-pointer font-myanmar"
                    >
                      {language === 'my' ? 'မဖျက်တော့ပါ' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border-subtle dark:border-neutral-800 comfort:border-[#ded4c1]">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={saving || deleting}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer disabled:opacity-50 font-myanmar"
                    id="delete-post-trigger-btn"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{language === 'my' ? 'ပို့စ်ဖျက်မည်' : 'Delete Post'}</span>
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving || deleting}
                    className="px-4 py-2 rounded-2xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50 font-myanmar"
                  >
                    {language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className="px-5 py-2 rounded-2xl bg-black text-white dark:bg-white dark:text-black comfort:bg-[#231f1a] comfort:text-[#faf6ee] text-xs font-extrabold flex items-center gap-1.5 hover:opacity-90 transition shadow-sm cursor-pointer disabled:opacity-50"
                    id="save-post-changes-btn"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="font-myanmar">{language === 'my' ? 'သိမ်းဆည်းနေပါသည်...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span className="font-myanmar">{language === 'my' ? 'ပြင်ဆင်ချက် သိမ်းမည်' : 'Save Changes'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
