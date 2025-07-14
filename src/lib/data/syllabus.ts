export interface SyllabusChapter {
    id: string;
    name: string;
}

export interface SyllabusSection {
    title: string;
    chapters: SyllabusChapter[];
}

export interface SyllabusPaper {
    name: string;
    sections?: SyllabusSection[];
    chapters?: SyllabusChapter[];
    other?: SyllabusChapter[];
}

export interface SyllabusSubject {
    subject: string;
    papers: SyllabusPaper[];
}

export const syllabus: SyllabusSubject[] = [
    {
        subject: "বাংলা",
        papers: [
            {
                name: "বাংলা ১ম পত্র",
                sections: [
                    {
                        title: "গদ্য",
                        chapters: [
                            { id: "b1_prose_1", name: "বাঙ্‌গালার নব্য লেখকদিগের প্রতি নিবেদন" },
                            { id: "b1_prose_2", name: "অপরিচিতা" },
                            { id: "b1_prose_3", name: "সাহিত্যে খেলা" },
                            { id: "b1_prose_4", name: "বিলাসী" },
                            { id: "b1_prose_5", name: "অর্ধাঙ্গী" },
                            { id: "b1_prose_6", name: "যৌবনের গান" },
                            { id: "b1_prose_7", name: "জীবন ও বৃক্ষ" },
                            { id: "b1_prose_8", name: "গন্তব্য কাবুল" },
                            { id: "b1_prose_9", name: "মাসি-পিসি" },
                            { id: "b1_prose_10", name: "কপিলদাস মুর্মুর শেষ কাজ" },
                            { id: "b1_prose_11", name: "রেইনকোট" },
                            { id: "b1_prose_12", name: "নেকলেস" },
                        ],
                    },
                    {
                        title: "পদ্য",
                        chapters: [
                            { id: "b1_poetry_1", name: "ঋতু বর্ণন" },
                            { id: "b1_poetry_2", name: "বিভীষণের প্রতি মেঘনাদ" },
                            { id: "b1_poetry_3", name: "সোনার তরী" },
                            { id: "b1_poetry_4", name: "বিদ্রোহী" },
                            { id: "b1_poetry_5", name: "সূচনা" },
                            { id: "b1_poetry_6", name: "প্রতিদান" },
                            { id: "b1_poetry_7", name: "আঠার বছর বয়স" },
                            { id: "b1_poetry_8", name: "পদ্মা" },
                            { id: "b1_poetry_9", name: "ফেব্রুয়ারী ১৯৬৯" },
                            { id: "b1_poetry_10", name: "আঠারো বছর বয়স" },
                            { id: "b1_poetry_11", name: "আমি কিংবদন্তীর কথা বলছি" },
                            { id: "b1_poetry_12", name: "প্রত্যাবর্তন" },
                        ],
                    },
                ],
                other: [
                    { id: "b1_other_1", name: "নাটকঃ সিরাজউদ্‌দৌলা" },
                    { id: "b1_other_2", name: "উপন্যাসঃ লালসালু" },
                ],
            },
            {
                name: "বাংলা ২য় পত্র",
                chapters: [
                    { id: "b2_1", name: "বাংলা উচ্চারণের নিয়ম" },
                    { id: "b2_2", name: "বাংলা বানানের নিয়ম" },
                    { id: "b2_3", name: "ব্যাকরণিক শব্দশ্রেণি" },
                    { id: "b2_4", name: "বাংলা শব্দ গঠন" },
                    { id: "b2_5", name: "বাক্যতত্ত্ব" },
                    { id: "b2_6", name: "পারিভাষিক শব্দ" },
                    { id: "b2_7", name: "উপসর্গ" },
                    { id: "b2_8", name: "প্রকৃতি ও প্রত্যয়" },
                    { id: "b2_9", name: "সমাস" },
                    { id: "b2_10", name: "অনুবাদ" },
                    { id: "b2_11", name: "দিনলিপি" },
                    { id: "b2_12", name: "অভিজ্ঞতা বর্নন" },
                    { id: "b2_13", name: "ভাষণ" },
                    { id: "b2_14", name: "প্রতিবেদন" },
                    { id: "b2_15", name: "ইমেইল ও মেসেজ" },
                    { id: "b2_16", name: "খুদে বার্তা" },
                    { id: "b2_17", name: "পত্র লিখন" },
                    { id: "b2_18", name: "আবেদন পত্র" },
                    { id: "b2_19", name: "সারাংশ" },
                    { id: "b2_20", name: "সারমর্ম" },
                    { id: "b2_21", name: "ভাবসম্প্রসারণ" },
                    { id: "b2_22", name: "খুদে গল্প" },
                    { id: "b2_23", name: "প্রবন্ধ" },
                ],
            },
        ],
    },
    {
        subject: "English",
        papers: [
            {
                name: "English 1st Paper",
                chapters: [
                    { id: "e1_u1", name: "Unit 1 – Education and Life" },
                    { id: "e1_u2", name: "Unit 2 – Art and Craft" },
                    { id: "e1_u3", name: "Unit 3 – Myths and Literature" },
                    { id: "e1_u4", name: "Unit 4 – History" },
                    { id: "e1_u5", name: "Unit 5 – Human Rights" },
                    { id: "e1_u6", name: "Unit 6 – Dreams" },
                    { id: "e1_u7", name: "Unit 7 – Youthful Achievers" },
                    { id: "e1_u8", name: "Unit 8 – Relationships" },
                    { id: "e1_u9", name: "Unit 9 – Adolescence" },
                    { id: "e1_u10", name: "Unit 10 – Lifestyle" },
                    { id: "e1_u11", name: "Unit 11 – Peace and Conflict" },
                    { id: "e1_u12", name: "Unit 12 – Environment and Nature" },
                ],
            },
            {
                name: "English 2nd Paper",
                chapters: [
                    { id: "e2_1", name: "Article" },
                    { id: "e2_2", name: "Preposition" },
                    { id: "e2_3", name: "Phrase/Words" },
                    { id: "e2_4", name: "Complete the sentence with clause" },
                    { id: "e2_5", name: "Fill in the gaps with correct form of verbs" },
                    { id: "e2_6", name: "Change the sentences as directed" },
                    { id: "e2_7", name: "Narration" },
                    { id: "e2_8", name: "Identify the unclear pronoun. Re-write the sentence where necessary" },
                    { id: "e2_9", name: "Use the modifiers in the blank line" },
                    { id: "e2_10", name: "Use appropriate sentence connectors in the blank space" },
                    { id: "e2_11", name: "Synonym or Antonym" },
                    { id: "e2_12", name: "Use the punctuation marks" },
                    { id: "e2_13", name: "Write an application" },
                    { id: "e2_14", name: "Write a report" },
                    { id: "e2_15", name: "Write a paragraph (about 150 words)" },
                    { id: "e2_16", name: "Short essay (above 200 words)" },
                ],
            },
        ],
    },
    {
        subject: "রসায়ন",
        papers: [
            {
                name: "রসায়ন প্রথম পত্র",
                chapters: [
                    { id: "ch1_1", name: "ল্যাবরেটরীর নিরাপদ ব্যবহার" },
                    { id: "ch1_2", name: "গুণগত রসায়ন" },
                    { id: "ch1_3", name: "মৌলের পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন" },
                    { id: "ch1_4", name: "রাসায়নিক পরিবর্তন" },
                    { id: "ch1_5", name: "কর্মমুখী রসায়ন" },
                ],
            },
            {
                name: "রসায়ন দ্বিতীয় পত্র",
                chapters: [
                    { id: "ch2_1", name: "পরিবেশ রসায়ন" },
                    { id: "ch2_2", name: "জৈব রসায়ন" },
                    { id: "ch2_3", name: "পরিমাণগত রসায়ন" },
                    { id: "ch2_4", name: "তড়িৎ রসায়ন" },
                    { id: "ch2_5", name: "অর্থনৈতিক রসায়ন" },
                ],
            },
        ],
    },
    {
        subject: "উচ্চতর গণিত",
        papers: [
            {
                name: "উচ্চতর গণিত প্রথম পত্র",
                chapters: [
                    { id: "hm1_1", name: "ম্যাট্রিক্স ও নির্ণায়ক" },
                    { id: "hm1_2", name: "ভেক্টর" },
                    { id: "hm1_3", name: "সরলরেখা" },
                    { id: "hm1_4", name: "বৃত্ত" },
                    { id: "hm1_5", name: "বিন্যাস ও সমাবেশ" },
                    { id: "hm1_6", name: "ত্রিকোণমিতিক অনুপাত" },
                    { id: "hm1_7", name: "সংযুক্ত কোণের ত্রিকোণমিতিক অনুপাত" },
                    { id: "hm1_8", name: "ফাংশন ও ফাংশনের লেখচিত্র" },
                    { id: "hm1_9", name: "অন্তরীকরণ" },
                    { id: "hm1_10", name: "যোগজীকরণ" },
                ],
            },
            {
                name: "উচ্চতর গণিত দ্বিতীয় পত্র",
                chapters: [
                    { id: "hm2_1", name: "বাস্তব সংখ্যা ও অসমতা" },
                    { id: "hm2_2", name: "জটিল সংখ্যা" },
                    { id: "hm2_3", name: "বহুপদী ও বহুপদী সমীকরণ" },
                    { id: "hm2_4", name: "দ্বিপদী বিস্তৃতি" },
                    { id: "hm2_5", name: "কনিক" },
                    { id: "hm2_6", name: "বিপরীত ত্রিকোণমিতিক ফাংশন ও ত্রিকোণমিতিক সমীকরণ" },
                    { id: "hm2_7", name: "স্থিতিবিদ্যা" },
                    { id: "hm2_8", name: "সমতলে বস্তুকণার গতি" },
                    { id: "hm2_9", name: "বিস্তার পরিমাপ ও সম্ভাবনা" },
                ],
            },
        ],
    },
    {
        subject: "পদার্থবিজ্ঞান",
        papers: [
            {
                name: "পদার্থবিজ্ঞান প্রথম পত্র",
                chapters: [
                    { id: "ph1_1", name: "ভৌত জগৎ, পরিমাপ ও উপাত্ত" },
                    { id: "ph1_2", name: "ভৌত আলোকবিজ্ঞান" },
                    { id: "ph1_3", name: "নিউটনীয়ান বলবিদ্যা" },
                    { id: "ph1_4", name: "কাজ, শক্তি ও ক্ষমতা" },
                    { id: "ph1_5", name: "মহাকর্ষ ও অভিকর্ষ" },
                    { id: "ph1_6", name: "পদার্থের গাঠনিক ধর্ম" },
                    { id: "ph1_7", name: "পর্যায়বৃত্ত গতি" },
                    { id: "ph1_8", name: "তরঙ্গ" },
                    { id: "ph1_9", name: "আদর্শ গ্যাস ও গ্যাসের গতিতত্ত্ব" },
                ],
            },
            {
                name: "পদার্থবিজ্ঞান দ্বিতীয় পত্র",
                chapters: [
                    { id: "ph2_1", name: "তাপগতিবিদ্যা" },
                    { id: "ph2_2", name: "স্থির তড়িৎ" },
                    { id: "ph2_3", name: "চল তড়িৎ" },
                    { id: "ph2_4", name: "তড়িৎ প্রবাহের চৌম্বক ক্রিয়া ও চুম্বকত্ব" },
                    { id: "ph2_5", name: "তাড়িতচৌম্বকীয় আবেশ ও পরিবর্তী প্রবাহ" },
                    { id: "ph2_6", name: "জ্যামিতিক আলোকবিজ্ঞান" },
                    { id: "ph2_7", name: "ভৌত আলোকবিজ্ঞান" },
                    { id: "ph2_8", name: "আধুনিক পদার্থবিজ্ঞানের সূচনা" },
                    { id: "ph2_9", name: "পরমাণু মডেল এবং নিউক্লিয়ার পদার্থবিজ্ঞান" },
                    { id: "ph2_10", name: "সেমিকন্ডাক্টর ও ইলেক্ট্রনিক্স" },
                    { id: "ph2_11", name: "জ্যোতির্বিজ্ঞান" },
                    { id: "ph2_12", name: "গোলীয় দর্শনে প্রতিবিম্বের প্রকৃতি ও অবস্থানের সূত্র" },
                    { id: "ph2_13", name: "লেন্সে প্রতিবিম্বের প্রকৃতি ও অবস্থানের সূত্র" },
                ],
            },
        ],
    },
    {
        subject: "তথ্য ও যোগাযোগ প্রযুক্তি",
        papers: [
            {
                name: "ICT",
                chapters: [
                    { id: "ict_1", name: "তথ্য ও যোগাযোগ প্রযুক্তি: বিশ্ব ও বাংলাদেশ প্রেক্ষিত" },
                    { id: "ict_2", name: "কমিউনিকেশন সিস্টেম ও নেটওয়ার্কিং" },
                    { id: "ict_3", name: "সংখ্যা পদ্ধতি ও ডিজিটাল ডিভাইস" },
                    { id: "ict_4", name: "ওয়েব ডিজাইন পরিচিতি এবং এইচটিএমএল" },
                    { id: "ict_5", name: "প্রোগ্রামিং ভাষা" },
                    { id: "ict_6", name: "ডেটাবেজ ম্যানেজমেন্ট সিস্টেম" },
                ],
            },
        ],
    },
    {
        subject: "জীববিজ্ঞান",
        papers: [
            {
                name: "জীববিজ্ঞান প্রথম পত্র",
                chapters: [
                    { id: "bio1_1", name: "কোষ ও এর গঠন" },
                    { id: "bio1_2", name: "কোষ বিভাজন" },
                    { id: "bio1_3", name: "কোষ রসায়ন" },
                    { id: "bio1_4", name: "অণুজীব" },
                    { id: "bio1_5", name: "শৈবাল ও ছত্রাক" },
                    { id: "bio1_6", name: "ব্রায়োফাইটা ও টেরিডোফাইটা" },
                    { id: "bio1_7", name: "নগ্নবীজী ও আবৃতবীজী উদ্ভিদ" },
                    { id: "bio1_8", name: "টিস্যু ও টিস্যুতন্ত্র" },
                    { id: "bio1_9", name: "উদ্ভিদ শারীরতত্ত্ব" },
                    { id: "bio1_10", name: "উদ্ভিদের প্রজনন" },
                    { id: "bio1_11", name: "জীবপ্রযুক্তি" },
                    { id: "bio1_12", name: "জীবের পরিবেশ, বিস্তার ও সংরক্ষণ" },
                ],
            },
            {
                name: "জীববিজ্ঞান দ্বিতীয় পত্র",
                chapters: [
                    { id: "bio2_1", name: "প্রাণীর বিভিন্নতা ও শ্রেণিবিন্যাস" },
                    { id: "bio2_2", name: "প্রাণীর পরিচিতি" },
                    { id: "bio2_3", name: "মানব শারীরতত্ত্ব: পরিপাক ও শোষণ" },
                    { id: "bio2_4", name: "মানব শারীরতত্ত্ব: রক্ত ও সংবহন" },
                    { id: "bio2_5", name: "মানব শারীরতত্ত্ব: শ্বাসক্রিয়া ও শ্বসন" },
                    { id: "bio2_6", name: "মানব শারীরতত্ত্ব: বর্জ্য ও নিষ্কাশন" },
                    { id: "bio2_7", name: "মানব শারীরতত্ত্ব: চলন ও অঙ্গচালনা" },
                    { id: "bio2_8", name: "মানব শারীরতত্ত্ব: সমন্বয় ও নিয়ন্ত্রণ" },
                    { id: "bio2_9", name: "মানব জীবনের ধারাবাহিকতা" },
                    { id: "bio2_10", name: "মানবদেহের প্রতিরক্ষা (ইমিউনিটি)" },
                    { id: "bio2_11", name: "জিনতত্ত্ব ও বিবর্তন" },
                    { id: "bio2_12", name: "প্রাণীর আচরণ" },
                ],
            },
        ],
    },
];
