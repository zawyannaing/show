/**
 * Helper to dynamically generate topic-relevant follow-up prompt suggestions
 * based STRICTLY on what the user asked (queryText).
 * 
 * RULE: Only suggest follow-up questions directly relevant to what the user asked.
 * NEVER suggest unrelated medical topics (e.g. do NOT suggest diabetes or high BP
 * if the user asked about cough, stomach, toothache, or a specific medicine).
 */

export function getTopicSuggestions(
  queryText: string = '',
  responseText: string = '',
  isBurmese: boolean = true
): string[] {
  // Normalize user query - STRICTLY inspect what the user asked
  const rawQ = (queryText || '').trim();
  const q = rawQ.toLowerCase();

  // Helper matching function that ONLY evaluates queryText (never responseText)
  const has = (...keywords: string[]): boolean => {
    return keywords.some((kw) => {
      const lowerKw = kw.toLowerCase();
      return q.includes(lowerKw) || rawQ.includes(kw);
    });
  };

  // 0. Greetings & Casual Pleasantries (မင်္ဂလာပါ / Hello / Hi)
  // When the user just says hello, guide them to describe their symptoms or ask about medicine.
  // NEVER output random disease suggestions like High BP or Diabetes!
  if (has('မင်္ဂလာပါ', 'မင်္ဂလာ', 'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'နေကောင်းလား', 'how are you')) {
    // Only treat as greeting if query is short
    if (rawQ.length <= 25) {
      return isBurmese ? [
        'ခံစားနေရသော ဝေဒနာ သို့မဟုတ် လက္ခဏာကို အသေးစိတ် မေးမြန်းပါ',
        'သောက်သုံးနေသော ဆေးဝါးများ၏ သောက်သုံးပုံနှင့် ဆေးညွှန်းကို မေးမြန်းပါ',
        'အိမ်တွင်း ရှေးဦးသူနာပြုစုနည်းများ ဆွေးနွေးမေးမြန်းပါ'
      ] : [
        'Please describe the specific symptoms or health concern you have',
        'Ask about proper dosage, timing, or safety of a specific medicine',
        'Ask about immediate first aid protocols or natural herbal remedies'
      ];
    }
  }

  // 1. Stomach Pain, Gastritis, Acid Reflux & Indigestion (ဗိုက်အောင့် / အစာအိမ် / ရင်ပြည့် / လေထိုး / လေအောင့် / ရင်ပူ)
  if (has(
    'ဗိုက်အောင့်', 'ဗိုက်နာ', 'အစာအိမ်', 'ရင်ပြည့်', 'ရင်ကယ်', 'လေထိုး', 'လေအောင့်', 
    'ရင်ပူ', 'အစာမကြေ', 'အက်ဆစ်တက်', 'stomach', 'gastric', 'gastritis', 'heartburn', 
    'acid reflux', 'indigestion', 'bloat', 'abdominal pain', 'belly'
  )) {
    return isBurmese ? [
      'အစာအိမ်နှင့် ရင်ပြည့်လေအောင့် သက်သာစေမည့် ဆေးနည်းများ',
      'အစာအိမ် အက်ဆစ်တက်ခြင်း ရှောင်ရမည့် အစားအစာများ',
      'လေထိုး လေအောင့်အတွက် ချင်းရေနွေးကြမ်း သောက်သုံးနည်း',
      'အစာအိမ်ဝေဒနာ ဆရာဝန် ပြသရမည့် စိုးရိမ်ရ လက္ခဏာများ'
    ] : [
      'Home remedies for stomach ache and indigestion',
      'Foods to avoid during acid reflux & gastritis',
      'Ginger tea preparation for bloating & gas relief',
      'Red flag symptoms for severe stomach pain'
    ];
  }

  // 2. Diarrhea, Watery Stools & Dehydration (ဝမ်းလျှော / ဝမ်းပျက် / ဝမ်းသွား / ဓာတ်ဆား)
  if (has(
    'ဝမ်းလျှော', 'ဝမ်းပျက်', 'ဝမ်းသွား', 'ဓာတ်ဆား', 'ဝမ်းမည်း', 'ဝမ်းထဲသွေး', 
    'diarrhea', 'loose motion', 'watery stool', 'dehydration', 'ors'
  )) {
    return isBurmese ? [
      'ဓာတ်ဆားရည် (ORS) မှန်ကန်စွာ ဖျော်စပ်သောက်သုံးနည်း',
      'ဝမ်းလျှောနေစဉ် စားသင့်သော အစားအစာများနှင့် သဘာဝအုန်းရည်',
      'ဝမ်းလျှောခြင်းတွင် ရှောင်ကြဉ်ရမည့် အစားအသောက်များ',
      'ဝမ်းထဲ သွေးပါခြင်း စသည့် ဆေးရုံအရေးပေါ် ပြသရမည့် လက္ခဏာများ'
    ] : [
      'How to prepare and drink WHO-standard ORS electrolyte',
      'Safe foods and natural coconut water for diarrhea',
      'Foods and beverages to strictly avoid during diarrhea',
      'Warning signs requiring urgent hospital evaluation'
    ];
  }

  // 3. Constipation (ဝမ်းချုပ် / ဝမ်းမသွား)
  if (has('ဝမ်းချုပ်', 'ဝမ်းမသွား', 'constipat', 'hard stool')) {
    return isBurmese ? [
      'ဝမ်းချုပ်ခြင်း သက်သာစေမည့် သဘာဝ အသီးအနှံနှင့် အမျှင်ဓာတ်များ',
      'ဝမ်းမှန်စေရန် နေ့စဉ် ရေနှင့် အစားအသောက် စားသုံးပုံ',
      'ဝမ်းနုတ်ဆေး မလိုဘဲ ဝမ်းမှန်စေသော အိမ်တွင်း ဆေးနည်းများ',
      'နာတာရှည် ဝမ်းချုပ်ခြင်းအတွက် ဆရာဝန် ပြသရန် အချက်များ'
    ] : [
      'High-fiber fruits and natural foods for constipation',
      'Daily water intake and dietary habits for regular bowel movement',
      'Natural home remedies without reliance on laxatives',
      'When chronic constipation requires medical consultation'
    ];
  }

  // 4. Nausea & Vomiting (ပျို့ / အန် / မအီမသာ)
  if (has('ပျို့', 'အန်', 'မအီမသာ', 'nausea', 'vomit', 'morning sickness')) {
    return isBurmese ? [
      'ပျို့အန်ခြင်း သက်သာစေမည့် ချင်း (Ginger) ပြင်ဆင်ပုံ',
      'ပျို့အန်နေစဉ် ရေဓာတ်မခမ်းခြောက်အောင် နေထိုင်နည်း',
      'ပျို့အန်ခြင်း သက်သာစေရန် ရှောင်ရမည့် အနံ့နှင့် အစားအစာများ',
      'ဆက်တိုက် အန်နေပါက ဆရာဝန် အမြန်ပြသရမည့် အခြေအနေ'
    ] : [
      'Fresh ginger preparation to calm nausea and vomiting',
      'How to stay hydrated during episodes of nausea',
      'Triggers and strong smells to avoid when nauseous',
      'When persistent vomiting requires urgent medical care'
    ];
  }

  // 5. Burns & Scalds (မီးလောင် / အပူလောင် / ရေနွေးပူလောင်)
  if (has('မီးလောင်', 'အပူလောင်', 'ရေနွေးပူ', 'burn', 'scald', 'thermal burn')) {
    return isBurmese ? [
      'မီးလောင်ဒဏ်ရာ ရေအေးဖြင့် မိနစ် ၂၀ လောင်းချနည်း (ရေခဲမကပ်ရ)',
      'သွားတိုက်ဆေးနှင့် ပဲငံပြာရည် လုံးဝမလိမ်းရသည့် အကြောင်းရင်း',
      'မီးလောင်ဒဏ်ရာ ပိုးမဝင်အောင် အဝတ်သန့် အုပ်နည်း',
      'ဆေးရုံအရေးပေါ် ၁၉၂ သို့ ချက်ချင်း ပို့ဆောင်ရမည့် အခြေအနေ'
    ] : [
      'How to cool burns with clean running water (never ice)',
      'Why toothpaste, soy sauce and folk pastes cause infection',
      'How to cover burn wounds with sterile non-stick dressing',
      'When to call Emergency Ambulance 192 for severe burns'
    ];
  }

  // 6. Snakebites (မြွေကိုက် / မြွေ)
  if (has('မြွေကိုက်', 'မြွေ', 'snake', 'venom', 'antivenom')) {
    return isBurmese ? [
      'မြွေကိုက်ခံရပါက လူနာအား ငြိမ်သက်စွာထားပြီး ကျောက်ပတ်တီးစည်းနည်း',
      'ဓားဖြင့်မခွဲရ၊ ပါးစပ်ဖြင့် မစုပ်ရ၊ ကြိုးတင်းတင်းမချည်ရ သတိပေးချက်',
      'မြွေဆိပ်ဖြေဆေး (Antivenom) ရှိသော အနီးဆုံး ဆေးရုံသို့ ၁၉၂ ခေါ်ဆိုပို့ဆောင်ရန်',
      'ကိုက်ခံရသော ခြေလက်ကို နှလုံးထက် နိမ့်အောင်ထားနည်း'
    ] : [
      'Step-by-step limb splinting and immobilization for snakebite',
      'Actions to strictly avoid: never cut, suck, or tourniquet',
      'Direct dispatch to hospital with antivenom stock (Dial 192)',
      'Why keeping the bitten limb below heart level is critical'
    ];
  }

  // 7. Animal & Dog Bites (ခွေးကိုက် / ကြောင်ကိုက် / တိရစ္ဆာန်ကိုက် / ခွေးရူး)
  if (has('ခွေးကိုက်', 'ကြောင်ကိုက်', 'တိရစ္ဆာန်ကိုက်', 'ခွေးရူး', 'dog bite', 'rabies', 'animal bite', 'cat bite')) {
    return isBurmese ? [
      'ခွေးကိုက်ဒဏ်ရာကို ဆပ်ပြာနှင့် ရေဖြင့် ၁၅ မိနစ် ဆေးကြောနည်း',
      'ခွေးရူးပြန် ကာကွယ်ဆေး (Rabies Vaccine) ချက်ချင်း ထိုးရန် လိုအပ်ပုံ',
      'မေးခိုင်ကာကွယ်ဆေး (Tetanus) ထိုးရန် လို/မလို',
      'ခွေးကိုက်ဒဏ်ရာအတွက် နီးစပ်ရာ ဆေးရုံ/ဆေးခန်း ပြသရန်'
    ] : [
      'Washing bite wounds with soap and running water for 15 minutes',
      'Urgent need for Post-Exposure Rabies vaccination',
      'Tetanus toxoid booster assessment for bite wounds',
      'When to proceed directly to hospital emergency department'
    ];
  }

  // 8. Headache & Migraine (ခေါင်းကိုက် / ခေါင်းခဲ / ဇာတ်ကြော / နားထင်)
  if (has('ခေါင်းကိုက်', 'ခေါင်းခဲ', 'ဇာတ်ကြော', 'နားထင်', 'headache', 'migraine', 'tension headache')) {
    return isBurmese ? [
      'ချင်းရေနွေးကြမ်းဖြင့် ခေါင်းကိုက် သက်သာစေပုံ',
      'ဇာတ်ကြောတက် ခေါင်းကိုက်ခြင်း ရေနွေးဝတ် ကပ်နည်း',
      'ခေါင်းကိုက် သက်သာစေမည့် အနားယူနည်းနှင့် ရေဓာတ်ဖြည့်တင်းပုံ',
      'အရေးပေါ် ခေါင်းကိုက်ခြင်း (Thunderclap) သတိပြုရန် လက္ခဏာများ'
    ] : [
      'Ginger tea preparation for relieving vascular headache',
      'Warm towel compress technique for neck tension headache',
      'Hydration and quiet rest in a dimmed room',
      'Emergency red flags: thunderclap sudden severe headache'
    ];
  }

  // 9. Dizziness, Vertigo & Lightheadedness (ခေါင်းမူး / မူးဝေ / မျက်စိပြာ)
  if (has('ခေါင်းမူး', 'မူးဝေ', 'မျက်စိပြာ', 'မူး', 'dizz', 'vertigo', 'lightheaded', 'faint')) {
    return isBurmese ? [
      'ခေါင်းမူးခြင်း ဖြစ်ပေါ်ပါက ချက်ချင်း ထိုင်/လှဲနေရမည့် ဘေးကင်းရေး နည်းလမ်း',
      'ချင်းရေနွေးကြမ်းဖြင့် ခေါင်းမူး မူးဝေ သက်သာစေပုံ',
      'ရုတ်တရက် မတ်တပ်ရပ်လျှင် ခေါင်းမူးခြင်း အကြောင်းရင်း',
      'ခေါင်းမူးခြင်းနှင့်အတူ လေဖြတ်လက္ခဏာ (FAST) စစ်ဆေးနည်း'
    ] : [
      'Immediate safety action: sitting down to prevent fall injury',
      'Fresh ginger infusion for vestibular blood flow & dizziness',
      'Orthostatic hypotension: dizziness when standing up quickly',
      'Emergency stroke warning signs accompanying dizziness'
    ];
  }

  // 10. High Blood Pressure & Hypertension (သွေးတိုး / သွေးပေါင်တက်)
  if (has('သွေးတိုး', 'သွေးပေါင်တက်', 'သွေးပေါင်ချိန်', 'hypertension', 'high blood pressure', 'high bp')) {
    return isBurmese ? [
      'သွေးပေါင်ချိန် မှန်ကန်စွာ တိုင်းတာနည်းနှင့် ပုံမှန်ပမာဏ',
      'သွေးတိုး ထိန်းသိမ်းရန် ဆား စားသုံးမှု လျှော့ချနည်း',
      'သွေးတိုးကျစေမည့် ကြက်သွန်ဖြူနှင့် သဘာဝ ဆေးနည်းများ',
      'သွေးပေါင် ရုတ်တရက် အလွန်တက်လာပါက အရေးပေါ် လုပ်ဆောင်ချက်'
    ] : [
      'How to measure blood pressure accurately at home',
      'Practical ways to reduce daily dietary salt intake',
      'Raw crushed garlic and evidence-based natural measures',
      'First aid steps if blood pressure spikes dangerously high'
    ];
  }

  // 11. Low Blood Pressure / Hypotension (သွေးပေါင်ကျ / သွေးကျ)
  if (has('သွေးပေါင်ကျ', 'သွေးကျ', 'hypotension', 'low blood pressure', 'low bp')) {
    return isBurmese ? [
      'သွေးပေါင်ကျပါက ချက်ချင်း လှဲနေပြီး ခြေထောက် မြှောက်ထားနည်း',
      'သွေးပေါင်ကျခြင်း သက်သာစေရန် ဓာတ်ဆားနှင့် ရေ သောက်သုံးပုံ',
      'သွေးပေါင်ကျစေသော အကြောင်းရင်းများနှင့် ဆေးဝါးများ',
      'သတိလစ် မူးလဲပါက ရှေးဦးပြုစုနည်း'
    ] : [
      'Immediate position: lying down with legs elevated',
      'Hydration and electrolyte support for low blood pressure',
      'Common causes and medications that lower blood pressure',
      'First aid protocol for fainting and loss of consciousness'
    ];
  }

  // 12. Diabetes & Blood Sugar (ဆီးချို / သွေးချို)
  if (has('ဆီးချို', 'သွေးချို', 'diabet', 'blood sugar', 'glucose', 'insulin')) {
    return isBurmese ? [
      'ဆီးချို မတက်စေရန် ရှောင်ကြဉ်ရမည့် အစားအစာများ',
      'ကြက်ဟင်းခါးသီးနှင့် သစ်ကြံပိုးခေါက် သဘာဝ ဆေးနည်းများ',
      'ဆီးချိုဝေဒနာရှင်များ ခြေထောက် အနာမဖြစ်အောင် ဂရုစိုက်နည်း',
      'အစာမစားမီနှင့် စားပြီး သွေးချို ပုံမှန် ပမာဏများ'
    ] : [
      'Refined carbohydrates and high glycemic foods to avoid',
      'Bitter melon tea and cinnamon for glucose management',
      'Daily diabetic foot inspection to prevent ulcers and infection',
      'Target fasting and post-meal blood glucose benchmarks'
    ];
  }

  // 13. Cough, Phlegm & Chest Congestion (ချောင်းဆိုး / ချွဲ / သလိပ်)
  if (has('ချောင်းဆိုး', 'ချွဲ', 'သလိပ်', 'cough', 'phlegm', 'sputum', 'bronch')) {
    return isBurmese ? [
      'ပင်စိမ်းရွက်နှင့် ပျားရည် ချောင်းဆိုးပျောက်ဆေး ဖော်စပ်နည်း',
      'ချင်းပြုတ်ရည်ဖြင့် ချွဲသလိပ် ကင်းစင်စေပုံ',
      'သံပရာရည်နှင့် ပျားရည် သောက်သုံးနည်း',
      'ချောင်းဆိုး သွေးပါခြင်း စသည့် ဆရာဝန် ပြသရမည့် လက္ခဏာများ'
    ] : [
      'Holy basil leaf and honey formulation for dry cough',
      'Fresh ginger decoction to loosen respiratory phlegm',
      'Honey and warm lime syrup for bronchial irritation',
      'When persistent cough or hemoptysis requires hospital care'
    ];
  }

  // 14. Sore Throat & Voice Loss (လည်ချောင်းနာ / အသံဝင် / အာသီးရောင်)
  if (has('လည်ချောင်း', 'အသံဝင်', 'အာသီး', 'sore throat', 'throat irritation', 'pharyngitis', 'tonsil')) {
    return isBurmese ? [
      'ဆားနွေးရေဖြင့် လည်ချောင်း ပလုတ်ကျင်းပေးနည်း',
      'လည်ချောင်းနာ သက်သာစေမည့် ရေနွေးကြမ်းနှင့် ပျားရည်',
      'လည်ချောင်းနာနေစဉ် ရှောင်ကြဉ်ရမည့် အအေးနှင့် အစပ်များ',
      'အာသီးရောင်ခြင်းအတွက် ဆရာဝန် ပြသရမည့် လက္ခဏာများ'
    ] : [
      'Warm saltwater gargle procedure for pharyngeal inflammation',
      'Warm herbal infusions and pure honey for throat coating',
      'Cold, spicy, and deep-fried irritants to avoid',
      'Warning signs of bacterial tonsillitis needing antibiotics'
    ];
  }

  // 15. Fever & High Temperature (ဖျား / အဖျား / ကိုယ်ပူ)
  if (has('ဖျား', 'အဖျား', 'ကိုယ်ပူ', 'ချမ်းစိမ့်', 'fever', 'febrile', 'high temp', 'chills')) {
    return isBurmese ? [
      'ပါရာစီတမော သောက်သုံးရန် မှန်ကန်သော ပမာဏနှင့် အချိန်',
      'အဖျားကျစေရန် ရေပတ်တိုက်နည်း (ရေခဲလုံးဝမသုံးရ)',
      'ဖျားနာနေစဉ် ရေဓာတ်နှင့် အာဟာရ ဖြည့်တင်းပုံ',
      'အဖျား ၃ ရက်ထက် ကျော်ပါက သတိပြုရမည့် အချက်များ'
    ] : [
      'Proper Paracetamol dosage and safe interval timing',
      'Lukewarm water sponging technique (never apply ice)',
      'Fluids, broths and rest needed during acute fevers',
      'Red flag criteria when fever exceeds 3 days duration'
    ];
  }

  // 16. Cold, Runny Nose & Sneezing (နှာစေး / နှာပိတ် / အအေးမိ / နှာချေ)
  if (has('နှာစေး', 'နှာပိတ်', 'အအေးမိ', 'နှာချေ', 'နှာရည်', 'cold', 'runny nose', 'congestion', 'flu', 'rhinitis')) {
    return isBurmese ? [
      'ပင်စိမ်းရွက် ရေနွေးငွေ့ ရှူပေးခြင်းဖြင့် နှာပိတ် သက်သာစေပုံ',
      'ချင်း-ပျားရည် ရေနွေးကြမ်းဖြင့် အအေးမိ သက်သာစေနည်း',
      'နှာစေး နှာပိတ် သက်သာစေမည့် ရေနွေးနွေး များများသောက်ပုံ',
      'ဗိုင်းရပ်စ် အအေးမိခြင်းတွင် ပဋိဇီဝဆေး မသောက်သင့်သည့် အကြောင်းရင်း'
    ] : [
      'Holy basil steam inhalation for unblocking nasal airways',
      'Ginger and honey warm tea for seasonal cold relief',
      'Hydration and rest measures to accelerate recovery',
      'Why antibiotics are ineffective against viral common colds'
    ];
  }

  // 17. Joint Pain, Knee, Back Pain & Arthritis (အဆစ် / ဒူး / ခါး / အကိုက်အခဲ / လေးဖက်နာ / ဂေါက်)
  if (has('အဆစ်', 'ဒူး', 'ခါး', 'အကိုက်အခဲ', 'လေးဖက်နာ', 'ဂေါက်', 'joint', 'knee', 'back pain', 'arthritis', 'gout', 'osteoarthritis')) {
    return isBurmese ? [
      'ဒူးနာ ခါးနာ သက်သာစေရန် ရေနွေးအိတ်နှင့် ကြပ်ထုပ် ထိုးနည်း',
      'နနွင်းနှင့် ငရုတ်ကောင်းစေ့ တွဲဖက်သောက်သုံးနည်း',
      'အဆစ်အမြစ်အတွက် ရှောင်ကြဉ်ရမည့် အစားအစာများ',
      'အကိုက်အခဲပျောက်ဆေး သောက်သုံးရာတွင် သတိပြုရန်များ'
    ] : [
      'Warm compress application for chronic knee and lower back pain',
      'Turmeric with black pepper for enhanced anti-inflammatory absorption',
      'High-purine foods to avoid for gout and joint inflammation',
      'Precautions when taking oral pain medications'
    ];
  }

  // 18. Swelling, Edema & Swollen Feet (ဖောရောင် / ခြေထောက်ရောင် / ဖောခြင်း / ခြေဖော)
  if (has('ခြေထောက်ရောင်', 'ဖောရောင်', 'ရောင်ရမ်း', 'ခြေဖော', 'ဖော', 'edema', 'swelling', 'swollen feet', 'swollen leg')) {
    return isBurmese ? [
      'ခြေထောက်ရောင်ခြင်း သက်သာစေရန် ခြေထောက် မြှောက်ထားနည်း',
      'ဆားနှင့် အငန် လျှော့စားခြင်းဖြင့် ဖောရောင်ခြင်း ကာကွယ်နည်း',
      'သွေးတိုးကျဆေး သို့မဟုတ် ကျောက်ကပ်ကြောင့် ဖောရောင်ခြင်း ဟုတ်/မဟုတ်',
      'ဖောရောင်ခြင်း ဆရာဝန်နှင့် ပြသတိုင်ပင်ရမည့် လက္ခဏာများ'
    ] : [
      'Elevating legs and simple exercises for swelling relief',
      'Low-sodium dietary tips to reduce water retention and edema',
      'Checking if medication (calcium blockers) or kidney causes edema',
      'When swollen feet or ankles require doctor evaluation'
    ];
  }

  // 19. Skin Issues, Rashes, Itching & Allergy (အရေပြား / ယား / အဖု / အယား / ပွေး / ညှင်း / ဓာတ်မတည့်)
  if (has('အရေပြား', 'ယား', 'အဖု', 'အယား', 'ပွေး', 'ညှင်း', 'ဓာတ်မတည့်', 'မိတ်', 'skin', 'rash', 'itch', 'allergy', 'eczema', 'hives', 'dermatitis')) {
    return isBurmese ? [
      'ရှားစောင်းလက်ပပ် ဂျယ်လ်ဖြင့် အရေပြား အေးမြစေပုံ',
      'အရေပြား ယားယံခြင်းအတွက် တမာရွက် ရေချိုးနည်း',
      'ဓာတ်မတည့် အဖုအပိမ့်များ မကုတ်ဖဲ့ဘဲ သက်သာအောင် နေထိုင်နည်း',
      'ပိုးဝင်ခြင်းနှင့် အရေပြား ဆရာဝန် ပြသရမည့် လက္ခဏာများ'
    ] : [
      'Fresh pure aloe vera gel application for soothing inflamed skin',
      'Neem leaf antiseptic bath procedure for chronic skin itching',
      'How to soothe allergic hives without damaging scratches',
      'Warning signs of secondary bacterial infection requiring care'
    ];
  }

  // 20. Toothache & Gum Health (သွားကိုက် / သွားဖုံး / သွားနာ / သွားပိုး)
  if (has('သွားကိုက်', 'သွားဖုံး', 'သွားနာ', 'သွားပိုး', 'tooth', 'dental', 'gum', 'toothache')) {
    return isBurmese ? [
      'လေးညှင်းဆီဖြင့် သွားကိုက် နာကျင်မှု သက်သာစေပုံ',
      'ဆားနွေးရေဖြင့် ပလုတ်ကျင်းပေးခြင်း၏ အကျိုးကျေးဇူး',
      'သွားဖုံးရောင်ခြင်းနှင့် သွားကိုက်စဉ် ရှောင်ရမည့် အစားအစာများ',
      'သွားဆရာဝန်ထံ ချက်ချင်း သွားရောက်ပြသရမည့် လက္ခဏာများ'
    ] : [
      'How to apply clove oil on a cotton swab for natural numbing',
      'Warm saltwater mouth rinse benefit for bacterial reduction',
      'Foods and extreme temperatures to avoid with inflamed gums',
      'Critical indicators requiring immediate dental consultation'
    ];
  }

  // 21. Eye Health & Infections (မျက်စိ / မျက်လုံး / မျက်ဝတ် / မျက်စဉ်း)
  if (has('မျက်စိ', 'မျက်လုံး', 'မျက်ဝတ်', 'မျက်စဉ်း', 'eye', 'vision', 'conjunctivit', 'cornea')) {
    return isBurmese ? [
      'မျက်စိ ယားယံ နီမြန်းခြင်း သက်သာစေရန် သန့်ရှင်းစွာ ဆေးကြောနည်း',
      'မျက်စိနာခြင်း ပိုးမကူးစက်အောင် ကာကွယ်နည်း',
      'မျက်စဉ်းခတ်ရာတွင် အထူးသတိပြုရမည့် အချက်များ',
      'မျက်စိအထူးကု ဆရာဝန်နှင့် ချက်ချင်း ပြသရမည့် လက္ခဏာများ'
    ] : [
      'Sterile water eye rinse technique for conjunctival irritation',
      'Hygiene precautions to stop eye infection cross-contamination',
      'Safe administration guidelines for topical eye drops',
      'Urgent red flags requiring ophthalmologist evaluation'
    ];
  }

  // 22. Ear Problems (နားကိုက် / နားပြည် / နားအူ / နားနာ)
  if (has('နားကိုက်', 'နားပြည်', 'နားအူ', 'နားနာ', 'နား', 'ear', 'tinnitus', 'otitis')) {
    return isBurmese ? [
      'နားကိုက် နားအောင့် သက်သာစေမည့် ရေနွေးဝတ် ကပ်နည်း',
      'နားထဲသို့ အရည်နှင့် ပစ္စည်းများ ထည့်သွင်းခြင်း ရှောင်ရန် သတိပေးချက်',
      'နားပြည်ယိုခြင်းနှင့် နားပိုးဝင်ခြင်းအတွက် ရှေးဦးလုပ်ဆောင်ချက်',
      'နား၊ နှာခေါင်း၊ လည်ချောင်း အထူးကုဆရာဝန် ပြသရမည့် အခြေအနေ'
    ] : [
      'Warm external compress technique for relieving middle ear pain',
      'Critical warning against inserting cotton swabs or liquids',
      'First steps when observing ear discharge or persistent ringing',
      'When earache warrants immediate ENT specialist consultation'
    ];
  }

  // 23. Sleep & Insomnia (အိပ်မပျော် / အိပ်ရေးပျက် / အိပ်ရခက်)
  if (has('အိပ်မပျော်', 'အိပ်ရေးပျက်', 'အိပ်ရခက်', 'insomnia', 'sleep', 'sleepless', 'restless')) {
    return isBurmese ? [
      'ညဘက် နှစ်ခြိုက်စွာ အိပ်ပျော်စေမည့် သဘာဝ နည်းလမ်းများ',
      'အိပ်ရာမဝင်မီ ၁၅ မိနစ် ရေနွေးဖြင့် ခြေထောက်စိမ်နည်း',
      'အိပ်မပျော်ခြင်းအတွက် ရှောင်ရမည့် ကဖိန်းဓာတ်နှင့် အလေ့အထများ',
      'စိတ်ဖိစီးမှု လျှော့ချပြီး အိပ်ပျော်စေသော အသက်ရှူ လေ့ကျင့်ခန်း'
    ] : [
      'Natural sleep hygiene practices for deep restorative sleep',
      'Warm foot bath before bed to promote calming blood circulation',
      'Late night stimulants, screens and dietary habits to avoid',
      'Relaxation and rhythmic breathing exercises for sleep onset'
    ];
  }

  // 24. Heart & Chest Pain (ရင်ဘတ် / နှလုံး / ရင်တုန် / မော)
  if (has('ရင်ဘတ်', 'နှလုံး', 'ရင်တုန်', 'heart', 'chest pain', 'palpitation', 'angina', 'cardiac')) {
    return isBurmese ? [
      'ရင်ဘတ်အောင့်ခြင်း ချက်ချင်း လူနာတင်ယာဉ် ၁၉၂ ခေါ်ဆိုရမည့် လက္ခဏာများ',
      'နှလုံးသွေးကြောကျဉ်းခြင်းနှင့် ရင်ဘတ်တင်းကျပ်ခြင်း သတိပြုရန်',
      'ရင်တုန်ခြင်း ဖြစ်ပေါ်ပါက သက်တောင့်သက်သာ အနားယူနည်း',
      'နှလုံးကျန်းမာရေးအတွက် ဆောင်ရန်နှင့် ရှောင်ရန် အချက်များ'
    ] : [
      'Emergency 192 alert criteria for crushing central chest pain',
      'Differentiating cardiac angina symptoms from muscle strain',
      'Rest and slow breathing protocols during heart palpitations',
      'Cardiovascular lifestyle guidelines and sodium precautions'
    ];
  }

  // 25. Urine, UTI & Kidney Health (ဆီးအောင့် / ဆီးပူ / ဆီးကျောက် / ကျောက်ကပ် / ဆီးခဏခဏ)
  if (has('ဆီးအောင့်', 'ဆီးပူ', 'ဆီးကျောက်', 'ကျောက်ကပ်', 'ဆီးခဏခဏ', 'ဆီး', 'urine', 'kidney', 'uti', 'bladder')) {
    return isBurmese ? [
      'ဆီးပူ ဆီးအောင့် သက်သာစေရန် သန့်ရှင်းသော ရေများများ သောက်နည်း',
      'ဆီးလမ်းကြောင်း ပိုးဝင်ခြင်းအတွက် သတိပြုရန် အချက်များ',
      'ကျောက်ကပ်ကျန်းမာရေးအတွက် ဆားနှင့် အငန် လျှော့စားနည်း',
      'ဆီးထဲ သွေးပါခြင်း စသည့် ဆရာဝန် ချက်ချင်း ပြသရမည့် လက္ခဏာများ'
    ] : [
      'Increased clean hydration intake to flush urinary tract bacteria',
      'Essential hygiene habits to prevent recurrent urinary tract infections',
      'Dietary sodium and oxalate precautions for kidney preservation',
      'When hematuria (blood in urine) mandates immediate medical care'
    ];
  }

  // 26. Stroke & Brain Ischemia (လေဖြတ် / လေဖြန်း / ပါးစပ်ရွဲ့ / စကားဗလုံးဗထွေး)
  if (has('လေဖြတ်', 'လေဖြန်း', 'ပါးစပ်ရွဲ့', 'မျက်နှာရွဲ့', 'stroke', 'fast', 'ischemi')) {
    return isBurmese ? [
      'ရုတ်တရက် လေဖြတ်ခြင်း F.A.S.T လက္ခဏာများ အမြန်စစ်ဆေးနည်း',
      'အချိန်တိုင်းသည် အသက်ကယ် ဦးနှောက်ဆဲလ်များ ဖြစ်ပုံ (လူနာတင်ယာဉ် ၁၉၂)',
      'လေဖြတ်လူနာအား အစာ သို့မဟုတ် အရည် လုံးဝ မတိုက်ကျွေးရသည့် အကြောင်းရင်း',
      'လေဖြတ်ခြင်းမှ ကာကွယ်ရန် နေ့စဉ် သွေးပေါင်ချိန် ထိန်းသိမ်းနည်း'
    ] : [
      'Immediate FAST assessment: Face drooping, Arm weakness, Speech difficulty',
      'Why emergency transport (192) within the golden hour preserves brain tissue',
      'Crucial warning: never force food or fluids into a suspected stroke patient',
      'Long-term blood pressure control for stroke prevention'
    ];
  }

  // 27. Specific Pills, Medicine Photo Scans or Medications
  if (has(
    'ဆေးပြား', 'ဆေးဘူး', 'ဆေးသောက်', 'ဆေးညွှန်း', 'ဆေး', 'သောက်ဆေး', 
    'pill', 'tablet', 'medicine', 'medication', 'capsule', 'syrup', 'antibiotic', 
    'paracetamol', 'panadol', 'biogesic', 'amlodipine', 'metformin', 'omeprazole', 
    'aspirin', 'atorvastatin', 'losartan', 'vitamin', 'supplement'
  )) {
    // If specific medicine name was passed in queryText, personalize the suggestions with it
    const cleanMedName = rawQ
      .replace(/(သောက်လို့ရလား|သောက်ရမလား|ဘယ်လိုသောက်ရမလဲ|သောက်နည်း|သောက်ပုံ|ဆေးညွှန်း|ညွှန်ကြားချက်|ဆေးပြား|ဆေးဘူး|ဆေး|အကြောင်း|အိမ်တွင်း|ဘာဆေးလဲ|what is|how to take|dosage|can i take|\?|\!|\.|\,)/gi, '')
      .trim();
    const medLabel = (cleanMedName.length >= 3 && cleanMedName.length <= 30) ? cleanMedName : (isBurmese ? 'ဤဆေး' : 'this medication');

    return isBurmese ? [
      `${medLabel} ၏ ဘေးထွက်ဆိုးကျိုးများနှင့် အထူးသတိပြုရန်များ`,
      `${medLabel} ကို အစာမစားမီ သို့မဟုတ် စားပြီးမှ သောက်ရမလဲ`,
      `${medLabel} ကို အခြား ဆေးဝါးများနှင့် တွဲဖက်သောက်သုံးနိုင်ပါသလား`,
      `${medLabel} သောက်ရန် မေ့သွားပါက မည်သို့ လုပ်ဆောင်ရမလဲ`
    ] : [
      `What are the side effects and precautions for ${medLabel}?`,
      `Should ${medLabel} be taken before or after meals?`,
      `Does ${medLabel} interact with other medications or supplements?`,
      `What should I do if I miss a scheduled dose of ${medLabel}?`
    ];
  }

  // 28. Dynamic Topic Extractor: Extracts the user's specific subject/symptom from custom queries
  const stopWordsPattern = /(ပါသလား|ရမလား|မလား|လား|သလဲ|လဲ|ဘာလုပ်ရမလဲ|ဘယ်လိုလုပ်ရမလဲ|ဘယ်လိုသောက်ရမလဲ|ဘယ်လိုစားရမလဲ|ဘယ်လို|သက်သာအောင်|ပျောက်အောင်|ကူညီပါ|ကူညီပေးပါ|ပြောပြပါ|သိချင်လို့|သိပါရစေ|မေးချင်လို့|ညွှန်ပေးပါ|ဖြစ်နေတယ်|ဖြစ်နေလို့|နေတယ်|နေလို့|နေတာ|တာလဲ|တာပါ|တာကြောင့်|ဘာကြောင့်လဲ|ဘာလို့လဲ|ဘယ်ကြောင့်လဲ|ဘာဖြစ်လို့လဲ|ခံစားနေရတယ်|ခံစားနေရလို့|အတွက်|အကြောင်း|အိမ်တွင်းဆေးနည်း|ဆေးနည်း|ဆေးနည်းများ|သောက်လို့ရလား|လိမ်းလို့ရလား|စားလို့ရလား|အဆင်ပြေလား|ရနိုင်လား|အမေ|အဖေ|ကျွန်တော်|ကျွန်မ|သမီး|သား|လူနာ|ကလေး|ကျေးဇူးပြုပြီး|ကျေးဇူးပြု၍|ခင်ဗျာ|ရှင်|ရှင့်|ပါ|ရင်|what|how|to|do|i|please|tell|me|about|can|should|treat|cure|remedy|for|\?|\!|\.|\,)/gi;
  
  const extractedTopic = rawQ
    .replace(stopWordsPattern, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If a meaningful user-specific topic was extracted (2 to 24 characters), suggest follow-up strictly for THAT topic
  if (extractedTopic.length >= 2 && extractedTopic.length <= 24) {
    const isSymptom = /(နာ|ကိုက်|အောင့်|ရောင်|ယား|ဖျား|မူး|အန်|ဆိုး|စေး|ချွဲ|သလိပ်|ဝမ်း|ပိတ်|ကျပ်|ချမ်း|နုံး|ညောင်း|လောင်|အနာ|ရိုး|ကျွတ်|pain|ache|sore|fever|itch|rash|swoll|swelling|cold|cough|cramp|bleed|infect|loss|fall)/i.test(extractedTopic);

    if (isSymptom) {
      return isBurmese ? [
        `${extractedTopic} သက်သာစေမည့် အိမ်တွင်း ဆေးနည်းများနှင့် သဘာဝနည်းလမ်းများ`,
        `${extractedTopic} အတွက် ရှောင်ရန်နှင့် ဆောင်ရန် အချက်များ`,
        `${extractedTopic} ဖြစ်ရခြင်း၏ အဓိက အကြောင်းရင်းများ`,
        `${extractedTopic} အတွက် ဆရာဝန်နှင့် ပြသတိုင်ပင်ရမည့် လက္ခဏာများ`
      ] : [
        `Home remedies and natural self-care for ${extractedTopic}`,
        `Dos and don'ts and foods to avoid for ${extractedTopic}`,
        `Common causes and risk factors of ${extractedTopic}`,
        `When to consult a healthcare professional for ${extractedTopic}`
      ];
    } else {
      return isBurmese ? [
        `${extractedTopic} ၏ ကျန်းမာရေး အကျိုးကျေးဇူးများနှင့် ဆေးဖက်ဝင်ပုံ`,
        `${extractedTopic} ကို မှန်ကန်စွာ စားသုံး/အသုံးပြုပုံ လမ်းညွှန်`,
        `${extractedTopic} ၏ ဘေးထွက်ဆိုးကျိုးနှင့် သတိပြုရန် အချက်များ`,
        `${extractedTopic} နှင့် ပတ်သက်၍ အထူးသတိပြုရမည့် အခြေအနေများ`
      ] : [
        `Health benefits and therapeutic uses of ${extractedTopic}`,
        `How to safely consume and use ${extractedTopic}`,
        `Possible side effects and precautions for ${extractedTopic}`,
        `Important considerations regarding ${extractedTopic}`
      ];
    }
  }

  // 29. Clarifying Follow-ups for generic queries (e.g. "မင်္ဂလာပါ" / "Hello" / vague text)
  // NEVER suggest random unrelated diseases like High BP or Diabetes!
  return isBurmese ? [
    'ခံစားနေရသော ဝေဒနာ သို့မဟုတ် လက္ခဏာကို အသေးစိတ် မေးမြန်းပါ',
    'သောက်သုံးနေသော ဆေးဝါးများ၏ သောက်သုံးပုံနှင့် ဆေးညွှန်းကို မေးမြန်းပါ',
    'ဝေဒနာ စတင်ခံစားရသည့် အချိန်နှင့် အခြေအနေကို ဖော်ပြပါ'
  ] : [
    'Please describe the specific symptom or health concern in detail',
    'Ask about proper dosage, timing, or safety of a specific medicine',
    'Specify when these symptoms began and any medications you are taking'
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
