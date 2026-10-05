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
      'အမာရွတ် သက်သာစေရန် သဘာဝ ကုသနည်း',
      'မီးလောင်ဒဏ်ရာအတွက် ဆရာဝန် ပြသရမည့် အခြေအနေ'
    ] : [
      'How to prevent burn wound infection',
      'Harmful habits to avoid for burns',
      'Natural remedies for scar reduction',
      'When to see a doctor for severe burns'
    ];
  }

  // 2. Snakebite (မြွေ)
  if (combined.includes('snake') || combined.includes('မြွေ')) {
    return isBurmese ? [
      'မြွေဆိပ်ဖြေဆေး (Antivenom) ရရှိနိုင်သော ဆေးရုံများ',
      'မြွေကိုက်ခံရပါက လုံးဝ မပြုလုပ်ရမည့်အရာများ',
      'အရေးပေါ် လူနာတင်ယာဉ် ၁၉၂ ခေါ်ဆိုရန်',
      'မြွေကိုက်ဒဏ်ရာ ရှေးဦးပြုစုနည်း အဆင့်များ'
    ] : [
      'Hospitals with antivenom stock',
      'Actions to strictly avoid after snakebite',
      'Call Emergency 192 for transport',
      'Step-by-step snakebite first aid protocol'
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

  // 5. Cough / Cold / Respiratory (ချောင်းဆိုး / အအေးမိ / ဖျား / ရင်ကျပ် / နှာစီး)
  if (combined.includes('cough') || combined.includes('fever') || combined.includes('cold') || combined.includes('ချောင်းဆိုး') || combined.includes('ဖျား') || combined.includes('ရင်ကျပ်') || combined.includes('ပင်စိမ်း') || combined.includes('နှာစီး')) {
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

  // 6. Digestive / Stomach / Nausea (အစာမကြေ / ရင်ပြည့် / လေအောင့် / ဝမ်းပျက် / ဗိုက်အောင့်)
  if (combined.includes('stomach') || combined.includes('digest') || combined.includes('nausea') || combined.includes('အစာမကြေ') || combined.includes('ရင်ပြည့်') || combined.includes('လေအောင့်') || combined.includes('ဝမ်း') || combined.includes('ဗိုက်')) {
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

  // 7. Joint Pain / Turmeric (အဆစ် / ဒူး / အကိုက်အခဲ / နနွင်း / ခါးနာ)
  if (combined.includes('joint') || combined.includes('pain') || combined.includes('turmeric') || combined.includes('အဆစ်') || combined.includes('ဒူး') || combined.includes('အကိုက်အခဲ') || combined.includes('နနွင်း') || combined.includes('ခါး')) {
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

  // 8. Skin Issues / Rashes (အရေပြား / ယားယံ / အဖုအပိမ့် / ရှားစောင်းလက်ပပ်)
  if (combined.includes('skin') || combined.includes('rash') || combined.includes('itch') || combined.includes('အရေပြား') || combined.includes('ယားယံ') || combined.includes('အဖုအပိမ့်') || combined.includes('ရှားစောင်းလက်ပပ်')) {
    return isBurmese ? [
      'ရှားစောင်းလက်ပပ် ဂျယ်လ် လိမ်းပေးပုံ',
      'အရေပြား ယားယံခြင်းအတွက် တမာရွက် ရေချိုးနည်း',
      'ဓာတ်မတည့်ခြင်း သတိပြုရန် အချက်များ',
      'နနွင်းနှင့် အုန်းဆီ အရေပြား ကုသနည်း'
    ] : [
      'Aloe vera gel topical application',
      'Neem leaf bath for skin itching',
      'Allergic skin reaction warning signs',
      'Turmeric and coconut oil paste formulation'
    ];
  }

  // 9. Toothache & Dental (သွားကိုက် / သွားဖုံး / လေးညှင်း)
  if (combined.includes('tooth') || combined.includes('dental') || combined.includes('gum') || combined.includes('သွား') || combined.includes('လေးညှင်း')) {
    return isBurmese ? [
      'လေးညှင်းဆီဖြင့် သွားကိုက် သက်သာစေပုံ',
      'ဆားနွေးရေ ငုံပေးခြင်း၏ အကျိုးကျေးဇူး',
      'သွားဖုံးရောင်ပါက ရှောင်ရန် အစားအစာများ',
      'သွားဆရာဝန်နှင့် အမြန် ပြသရမည့် လက္ခဏာများ'
    ] : [
      'Clove oil for toothache pain relief',
      'Warm saltwater mouthwash benefit',
      'Foods to avoid during gum inflammation',
      'When to see a dentist immediately'
    ];
  }

  // 10. Headache / Migraine (ခေါင်းကိုက် / ဇာတ်ကြော / နားထင်)
  if (combined.includes('headache') || combined.includes('migraine') || combined.includes('ခေါင်းကိုက်') || combined.includes('ဇာတ်')) {
    return isBurmese ? [
      'ချင်းရေနွေးကြမ်းဖြင့် ခေါင်းကိုက် သက်သာစေပုံ',
      'ဇာတ်ကြောတက် ခေါင်းကိုက်ခြင်း ရေနွေးဝတ် ကပ်နည်း',
      'စိတ်ဖိစီးမှု လျှော့ချနည်းများနှင့် အနားယူပုံ',
      'အရေးပေါ် ခေါင်းကိုက်ခြင်း (Thunderclap) သတိပေးချက်'
    ] : [
      'Ginger tea for headache relief',
      'Warm compress for tension headache',
      'Stress reduction and quiet rest techniques',
      'Thunderclap headache emergency warning'
    ];
  }

  // 11. Medicine / Photo Scan (ဆေး / ဆေးပြား / ဆေးဘူး)
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

  // 12. Extract Clean Medical Keyword (if present) after stripping question stop-words
  const cleanKeyword = queryText
    .toLowerCase()
    .replace(/(ပါသလား|ရမလား|ဘာလုပ်ရမလဲ|ဘယ်လို|အကြောင်း|အိမ်တွင်း|ဆေးနည်း|ကျေးဇူးပြု၍|မေးချင်လို့|ခိုင်|ပါ|ရင်|အတွက်|အကြောင်း|what|how|to|do|i|please|tell|me|about|\?|\!|\.|\,)/g, '')
    .trim();

  if (cleanKeyword.length >= 2 && cleanKeyword.length <= 15) {
    return isBurmese ? [
      `${cleanKeyword} သက်သာစေရန် တိုင်းရင်းဆေးနည်းများ`,
      `${cleanKeyword} အတွက် ရှောင်ရမည့် အစားအစာများ`,
      `${cleanKeyword} ၏ ဘေးထွက်ဆိုးကျိုးနှင့် သတိပြုရန်အချက်များ`,
      `${cleanKeyword} အတွက် ဆရာဝန် ပြသရမည့် အခြေအနေ`
    ] : [
      `Herbal remedies for ${cleanKeyword}`,
      `Foods to avoid for ${cleanKeyword}`,
      `Safety precautions regarding ${cleanKeyword}`,
      `When to consult a doctor for ${cleanKeyword}`
    ];
  }

  // 13. Fallback General Topic Suggestions
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

/**
 * Structured client-requested prompt suggestions grouped by medical categories
 * for use in quick buttons, search bars, and client recommendation widgets.
 */
export interface ClientPromptCategory {
  id: string;
  categoryNameEn: string;
  categoryNameMy: string;
  iconName: string;
  prompts: {
    labelEn: string;
    labelMy: string;
    queryEn: string;
    queryMy: string;
  }[];
}

export const CLIENT_PROMPT_SUGGESTIONS: ClientPromptCategory[] = [
  {
    id: 'chronic-senior',
    categoryNameEn: '40+ Senior & Chronic Health',
    categoryNameMy: '၄၀+ သွေးတိုး၊ ဆီးချို၊ အရိုးအဆစ်',
    iconName: 'HeartPulse',
    prompts: [
      {
        labelEn: 'High BP Garlic & Herbs',
        labelMy: 'သွေးတိုးကျဆေးနည်း (ကြက်သွန်ဖြူ)',
        queryEn: 'Evidence-based herbs and garlic dosage for high blood pressure control in seniors',
        queryMy: 'သွေးတိုးရောဂါအတွက် ကြက်သွန်ဖြူနှင့် တိုင်းရင်းဆေးပင်များ အသုံးပြုပုံ ရှင်းပြပါ'
      },
      {
        labelEn: 'Diabetes Bitter Melon Care',
        labelMy: 'ဆီးချိုထိန်းနည်း (ကြက်ဟင်းခါးသီး)',
        queryEn: 'How does bitter melon tea regulate blood sugar in diabetes?',
        queryMy: 'ဆီးချို/သွေးချို ထိန်းညှိရန် ကြက်ဟင်းခါးသီးနှင့် တိုင်းရင်းဆေးနည်းများ'
      },
      {
        labelEn: 'Knee & Joint Arthritis Poultice',
        labelMy: 'ဒူးနာ၊ အဆစ်ရောင် ကြပ်ထုပ်နည်း',
        queryEn: 'How to relieve knee osteoarthritis pain with turmeric and ginger poultice?',
        queryMy: 'ဒူးနာ၊ ခါးနာ၊ အဆစ်အမြစ်ရောင်ရမ်းခြင်း သက်သာစေမည့် တိုင်းရင်းဆေးနှင့် ကြပ်ထုပ်နည်း'
      },
      {
        labelEn: 'Senior Salt Reduction Tips',
        labelMy: 'သက်ကြီးရွယ်အို ဆားလျှော့စားနည်း',
        queryEn: 'Practical dietary tips for seniors to reduce daily sodium intake for heart safety',
        queryMy: 'သွေးတိုး ထိန်းချုပ်ရန် သက်ကြီးရွယ်အိုများ ဆား စားသုံးမှု လျှော့ချပုံ လမ်းညွှန်'
      }
    ]
  },
  {
    id: 'herbal-monographs',
    categoryNameEn: 'Myanmar Medicinal Herbs',
    categoryNameMy: 'မြန်မာ့ဆေးဖက်ဝင် အပင်များ',
    iconName: 'Pill',
    prompts: [
      {
        labelEn: 'Holy Basil & Cough Relief',
        labelMy: 'ပင်စိမ်းရွက် ချောင်းဆိုးပျောက်ဆေး',
        queryEn: 'Holy basil leaf preparation and dosage for persistent cough and phlegm',
        queryMy: 'ပင်စိမ်းရွက်ဖြင့် ချောင်းဆိုးနှင့် ချွဲသလိပ် သက်သာစေရန် ပြင်ဆင်ပုံ'
      },
      {
        labelEn: 'Turmeric Anti-Inflammatory',
        labelMy: 'နနွင်း၏ ရောင်ရမ်းကျ အာနိသင်',
        queryEn: 'Curcumin in turmeric: benefits, black pepper combination, and daily dosage',
        queryMy: 'နနွင်း၏ ရောင်ရမ်းကျ အာနိသင်နှင့် ငရုတ်ကောင်း တွဲဖက်သုံးဆောင်ပုံ'
      },
      {
        labelEn: 'Neem Leaf Internal Heat Soup',
        labelMy: 'တမာရွက် အပူငြိမ်း ဟင်းခါး',
        queryEn: 'Neem leaf soup benefits for skin purifying and body heat relief',
        queryMy: 'တမာရွက် ဟင်းခါး၏ အပူငြိမ်းစေသော အာနိသင်နှင့် အရေပြား ကောင်းမွန်စေပုံ'
      },
      {
        labelEn: 'Ginger Tea Digestion Relief',
        labelMy: 'ချင်းရေနွေးကြမ်း အစာမကြေ သက်သာ',
        queryEn: 'Fresh ginger root tea for indigestion, bloating, and nausea relief',
        queryMy: 'ချင်းအစို ရေနွေးကြမ်းဖြင့် လေထိုးလေအောင့်နှင့် အစာမကြေခြင်း သက်သာစေပုံ'
      }
    ]
  },
  {
    id: 'emergency-firstaid',
    categoryNameEn: 'Emergency & First Aid',
    categoryNameMy: 'အရေးပေါ် ရှေးဦးပြုစုနည်းများ',
    iconName: 'ShieldAlert',
    prompts: [
      {
        labelEn: 'Thermal Burn First Aid',
        labelMy: 'မီးလောင်ဒဏ်ရာ ရှေးဦးပြုစုနည်း',
        queryEn: 'What are the emergency first aid steps for thermal burns?',
        queryMy: 'မီးလောင်ဒဏ်ရာ အရေးပေါ် ရှေးဦးပြုစုနည်း ရှင်းပြပါ'
      },
      {
        labelEn: 'Snakebite Protocol (192)',
        labelMy: 'မြွေကိုက်ခံရပါက အသက်ကယ်နည်း',
        queryEn: 'Standardized emergency protocol for a venomous snakebite and antivenom stock',
        queryMy: 'မြွေကိုက်ခံရပါက ချက်ချင်း လုပ်ဆောင်ရမည့် အသက်ကယ်နည်း'
      },
      {
        labelEn: 'Acute Stroke FAST Assessment',
        labelMy: 'ရုတ်တရက် လေဖြတ်ခြင်း (FAST)',
        queryEn: 'How to recognize acute stroke symptoms using the FAST acronym?',
        queryMy: 'ရုတ်တရက် လေဖြတ်ခြင်း FAST လက္ခဏာများ စစ်ဆေးနည်း'
      },
      {
        labelEn: 'CPR & Choking Response',
        labelMy: 'အသက်ရှူရပ်/အစာနင် အရေးပေါ်ပြုစု',
        queryEn: 'Basic life support CPR steps and Heimlich maneuver for choking emergency',
        queryMy: 'အစာနင်ခြင်းနှင့် အသက်ရှူရပ်သွားပါက ရှေးဦးပြုစု CPR လုပ်ဆောင်ပုံ'
      }
    ]
  },
  {
    id: 'symptoms-remedies',
    categoryNameEn: 'Common Family Symptoms',
    categoryNameMy: 'အိမ်တွင်း ရောဂါလက္ခဏာများ',
    iconName: 'Thermometer',
    prompts: [
      {
        labelEn: 'Runny Nose & Cold Care',
        labelMy: 'နှာစီး အအေးမိ အိမ်တွင်းကုသနည်း',
        queryEn: 'Home remedies for runny nose, nasal congestion, and common cold',
        queryMy: 'နှာစီးခြင်း၊ နှာပိတ်ခြင်းနှင့် အအေးမိခြင်း သက်သာစေမည့် အိမ်တွင်း ဆေးနည်းများ'
      },
      {
        labelEn: 'Skin Rash & Itching Aloe Gel',
        labelMy: 'ယားယံ အရေပြား အဖုအပိမ့်',
        queryEn: 'Aloe vera and turmeric home treatment for itching skin rashes',
        queryMy: 'အရေပြား ယားယံခြင်းနှင့် အဖုအပိမ့်များ သက်သာစေမည့် သဘာဝ နည်းလမ်းများ'
      },
      {
        labelEn: 'Toothache & Clove Relief',
        labelMy: 'သွားကိုက် လေးညှင်းဆီ ကုသနည်း',
        queryEn: 'Clove oil and warm saltwater rinse for immediate toothache relief',
        queryMy: 'သွားကိုက်ခြင်းနှင့် သွားဖုံးနာခြင်း သက်သာစေရန် လေးညှင်းဆီ သုံးစွဲပုံ'
      },
      {
        labelEn: 'Tension Headache Compress',
        labelMy: 'ခေါင်းကိုက် ဇာတ်ကြောတက်',
        queryEn: 'Natural compress and ginger remedies for tension headache and neck stiffness',
        queryMy: 'ခေါင်းကိုက်ခြင်း၊ ဇာတ်ကြောတက်ခြင်း သက်သာစေမည့် ရေနွေးဝတ်နှင့် တိုင်းရင်းဆေးနည်း'
      }
    ]
  }
];

