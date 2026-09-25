/**
 * Helper to dynamically generate topic-relevant follow-up prompt suggestions
 * based on the user's query and AI response content.
 */
export function getTopicSuggestions(
  queryText: string = '',
  responseText: string = '',
  isBurmese: boolean = true
): string[] {
  const combined = `${queryText} ${responseText}`.toLowerCase();

  // 1. Burn / Fire Injuries (မီးလောင်)
  if (combined.includes('burn') || combined.includes('မီးလောင်')) {
    return isBurmese ? [
      'မီးလောင်ဒဏ်ရာ ပိုးမဝင်အောင် စောင့်ရှောက်နည်း',
      'မီးလောင်ရာတွင် ရှောင်ရမည့် အလေ့အထများ',
      'အမာရွတ် သက်သာစေရန် သဘာဝ ကုသနည်း'
    ] : [
      'How to prevent burn wound infection',
      'Harmful habits to avoid for burns',
      'Natural remedies for scar reduction'
    ];
  }

  // 2. Snakebite (မြွေ)
  if (combined.includes('snake') || combined.includes('မြွေ')) {
    return isBurmese ? [
      'မြွေဆိပ်ဖြေဆေး (Antivenom) ရရှိနိုင်သော ဆေးရုံများ',
      'မြွေကိုက်ခံရပါက လုံးဝ မပြုလုပ်ရမည့်အရာများ',
      'အရေးပေါ် လူနာတင်ယာဉ် ၁၉၂ ခေါ်ဆိုရန်'
    ] : [
      'Hospitals with antivenom stock',
      'Actions to strictly avoid after snakebite',
      'Call Emergency 192 for transport'
    ];
  }

  // 3. High Blood Pressure / Hypertension (သွေးတိုး / သွေးပေါင်)
  if (combined.includes('pressure') || combined.includes('hypertension') || combined.includes('သွေးတိုး') || combined.includes('သွေးပေါင်')) {
    return isBurmese ? [
      'သွေးပေါင်ချိန် ပုံမှန် မည်သို့ တိုင်းတာရမလဲ',
      'ဆား စားသုံးမှု လျှော့ချရန် အကြံပြုချက်',
      'သွေးတိုး ရုတ်တရက် တက်လာပါက ရှေးဦးပြုစုနည်း',
      'အသက် ၆၀ ကျော် သွေးတိုးကျ တိုင်းရင်းဆေးနည်း'
    ] : [
      'How to measure blood pressure accurately',
      'Tips to reduce daily salt intake',
      'First aid for sudden blood pressure spike',
      'Herbal remedies for senior hypertension'
    ];
  }

  // 4. Diabetes / Blood Sugar (ဆီးချို / သွေးချို)
  if (combined.includes('diabet') || combined.includes('sugar') || combined.includes('ဆီးချို') || combined.includes('သွေးချို')) {
    return isBurmese ? [
      'ဆီးချိုမတက်စေရန် ရှောင်ရမည့် အစားအစာများ',
      'ကြက်ဟင်းခါးသီး ပြင်ဆင်ပုံနှင့် တိုင်းရင်းဆေးနည်း',
      'ဆီးချိုဝေဒနာရှင်များ ခြေထောက် ဂရုစိုက်ပုံ',
      'အစာမစားမီ သွေးချို ပုံမှန်ပမာဏ'
    ] : [
      'High glycemic foods to avoid',
      'Bitter melon tea preparation',
      'Diabetic foot care instructions',
      'Normal fasting blood sugar levels'
    ];
  }

  // 5. Cough / Cold / Respiratory (ချောင်းဆိုး / အအေးမိ / ဖျား / ရင်ကျပ်)
  if (combined.includes('cough') || combined.includes('fever') || combined.includes('cold') || combined.includes('ချောင်းဆိုး') || combined.includes('ဖျား') || combined.includes('ရင်ကျပ်') || combined.includes('ပင်စိမ်း')) {
    return isBurmese ? [
      'ပင်စိမ်းရွက် ရေနွေးဖျော သောက်သုံးနည်း',
      'ချင်းပြုတ်ရည်ဖြင့် ချွဲသလိပ် သက်သာစေပုံ',
      'အဖျား ၃ ရက်ထက်ပိုပါက သတိပြုရန်',
      'သံပရာရည်နှင့် ပျားရည် ချောင်းဆိုးပျောက်ဆေး'
    ] : [
      'Holy basil tea preparation',
      'Ginger tea for expelling phlegm',
      'Fever red flags to see a doctor',
      'Honey and lime cough syrup'
    ];
  }

  // 6. Digestive / Stomach / Nausea (အစာမကြေ / ရင်ပြည့် / လေအောင့် / ဝမ်းပျက်)
  if (combined.includes('stomach') || combined.includes('digest') || combined.includes('nausea') || combined.includes('အစာမကြေ') || combined.includes('ရင်ပြည့်') || combined.includes('လေအောင့်') || combined.includes('ဝမ်း')) {
    return isBurmese ? [
      'ချင်းအစိုဖြင့် လေထိုးလေအောင့် သက်သာစေပုံ',
      'အစာအိမ် အက်ဆစ်တက်ခြင်း ရှောင်ရန် အစားအစာများ',
      'ဓာတ်ဆားရည် သောက်သုံးနည်း',
      'တမာရွက် ဟင်းခါး သောက်သုံးနည်း'
    ] : [
      'Ginger for indigestion relief',
      'Foods that trigger acid reflux',
      'Oral rehydration solution dosage',
      'Neem soup for internal heat'
    ];
  }

  // 7. Joint Pain / Turmeric (အဆစ် / ဒူး / အကိုက်အခဲ / နနွင်း)
  if (combined.includes('joint') || combined.includes('pain') || combined.includes('turmeric') || combined.includes('အဆစ်') || combined.includes('ဒူး') || combined.includes('အကိုက်အခဲ') || combined.includes('နနွင်း')) {
    return isBurmese ? [
      'နနွင်းနှင့် ငရုတ်ကောင်း တွဲဖက်သုံးဆောင်ပုံ',
      'သက်ကြီးရွယ်အို ဒူးဆစ်နာ သက်သာစေရန်',
      'ပူနွေးသော ရေနွေးအိတ် ကပ်နည်း',
      'အကိုက်အခဲပျောက်ဆေး သတိပြုရန်'
    ] : [
      'Turmeric with black pepper absorption tip',
      'Senior knee joint pain relief',
      'Warm compress application',
      'Painkiller dosage precautions'
    ];
  }

  // 8. Medicine / Photo Scan (ဆေး / ဆေးပြား / ဆေးဘူး)
  if (combined.includes('medicine') || combined.includes('pill') || combined.includes('tablet') || combined.includes('ဆေး')) {
    return isBurmese ? [
      'ဤဆေး၏ ဘေးထွက်ဆိုးကျိုးများ ဘာတွေရှိသလဲ',
      'အစာမစားမီ (သို့) စားပြီးမှ သောက်ရမလား',
      'အခြား ဆေးများနှင့် တွဲသောက်နိုင်ပါသလား',
      'ဆေးသောက်ရန် မေ့သွားပါက ဘာလုပ်ရမလဲ'
    ] : [
      'What are the common side effects?',
      'Should it be taken before or after meals?',
      'Does it interact with other medications?',
      'What to do if a dose is missed?'
    ];
  }

  // 9. Extract Clean Topic Word dynamically if specific term is present
  const rawTopic = queryText.trim().replace(/[?!.,]/g, '');
  if (rawTopic.length > 2 && rawTopic.length < 35) {
    return isBurmese ? [
      `${rawTopic} ၏ ဘေးထွက်ဆိုးကျိုးများ`,
      `${rawTopic} အတွက် ရှောင်ရမည့် အစားအစာများ`,
      `${rawTopic} သက်သာစေရန် တိုင်းရင်းဆေးနည်းများ`,
      `${rawTopic} အတွက် ဆရာဝန် ပြသရမည့် အခြေအနေ`
    ] : [
      `Side effects related to ${rawTopic}`,
      `Foods to avoid for ${rawTopic}`,
      `Herbal remedies for ${rawTopic}`,
      `When to see a doctor for ${rawTopic}`
    ];
  }

  // 10. Fallback General Topic Suggestions
  return isBurmese ? [
    'သက်ကြီး သွေးတိုးကျ တိုင်းရင်းဆေးနည်းများ',
    'ဆီးချိုမတက်စေရန် ရှောင်ရမည့် အစားအစာများ',
    'အိမ်တွင်း ရှေးဦးပြုစုနည်း ဆွေးနွေးရန်'
  ] : [
    'Herbal remedies for senior hypertension',
    'Foods to avoid for diabetes control',
    'First aid protocols and safety'
  ];
}
