/**
 * Facebook-style date and time formatting utility.
 * Formats timestamps cleanly in English and Myanmar (Burmese).
 * 
 * Examples:
 * - Today: "Today at 2:30 PM" / "ယနေ့ 2:30 PM" (or "Just now" for recent)
 * - Yesterday: "Yesterday at 4:15 PM" / "မနေ့က 4:15 PM"
 * - Older this year: "Oct 25 at 10:15 AM" / "အောက်တိုဘာ ၂၅ ရက်၊ 10:15 AM"
 * - Older past year: "Oct 25, 2025 at 10:15 AM" / "အောက်တိုဘာ ၂၅ ရက်၊ ၂၀၂၅၊ 10:15 AM"
 */

export function formatTime12h(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 is 12 AM
  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${minutesStr} ${ampm}`;
}

export function getDateDayStatus(dateInput: string | number | Date | null | undefined): {
  isToday: boolean;
  isYesterday: boolean;
  isSameYear: boolean;
  postDate: Date | null;
} {
  if (!dateInput) {
    return { isToday: false, isYesterday: false, isSameYear: false, postDate: null };
  }

  const postDate = new Date(dateInput);
  if (isNaN(postDate.getTime())) {
    return { isToday: false, isYesterday: false, isSameYear: false, postDate: null };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const isToday = postDate >= startOfToday && postDate < startOfTomorrow;
  const isYesterday = postDate >= startOfYesterday && postDate < startOfToday;
  const isSameYear = postDate.getFullYear() === now.getFullYear();

  return { isToday, isYesterday, isSameYear, postDate };
}

export function formatFacebookDate(
  dateInput: string | number | Date | null | undefined,
  language: 'en' | 'my' = 'en'
): string {
  const { isToday, isYesterday, isSameYear, postDate } = getDateDayStatus(dateInput);
  if (!postDate) {
    return typeof dateInput === 'string' ? dateInput : '';
  }

  const now = new Date();
  const timeStr = formatTime12h(postDate);

  // If created today
  if (isToday) {
    const diffSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
    if (diffSeconds >= 0 && diffSeconds < 60) {
      return language === 'my' ? `ယနေ့ ${timeStr} (ယခုလေးတင်)` : `Today at ${timeStr} (Just now)`;
    }
    return language === 'my' ? `ယနေ့ ${timeStr}` : `Today at ${timeStr}`;
  }

  // If created yesterday
  if (isYesterday) {
    return language === 'my' ? `မနေ့က ${timeStr}` : `Yesterday at ${timeStr}`;
  }

  // Months lists
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsMy = [
    'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
    'ဇူလိုင်', 'ဩဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'
  ];

  const monthIdx = postDate.getMonth();
  const day = postDate.getDate();

  // If created earlier this year
  if (isSameYear) {
    return language === 'my'
      ? `${monthsMy[monthIdx]} ${day} ရက်၊ ${timeStr}`
      : `${monthsEn[monthIdx]} ${day} at ${timeStr}`;
  }

  // If created in previous years
  const year = postDate.getFullYear();
  return language === 'my'
    ? `${monthsMy[monthIdx]} ${day} ရက်၊ ${year}၊ ${timeStr}`
    : `${monthsEn[monthIdx]} ${day}, ${year} at ${timeStr}`;
}
