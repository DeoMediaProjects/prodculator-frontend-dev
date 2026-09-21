/**
 * The languages a production can declare at intake.
 *
 * This replaced a free-text box that asked for comma-separated names. That box
 * accepted anything: "Eng", "english", "ASL", a typo, a sentence. Downstream,
 * language is matched against programme cultural tests and grant eligibility by
 * name, so a spelling nobody anticipated matched nothing and failed silently —
 * the producer saw their answer accepted and no rule act on it.
 *
 * `code` is ISO 639-1 where one exists, and ISO 639-3 for the sign languages,
 * which 639-1 does not cover at all. It is carried so the list can be checked
 * against the standard and so a later payload can move to codes without
 * re-deriving them from display names. What is sent today is `label`, because
 * that is what the report and the eligibility rules already read.
 *
 * Sign languages are here deliberately rather than as an afterthought. They are
 * distinct languages, not renderings of the spoken language of the same
 * country — a production shooting in American Sign Language is not shooting in
 * English — and the catalogue below covers the national sign languages most
 * likely to appear in a co-production. It is not exhaustive; add to it rather
 * than asking a producer to approximate.
 */

export interface LanguageOption {
  label: string;
  code: string;
  /** Sign languages are grouped apart so they are findable as a set. */
  group: 'Spoken' | 'Sign';
}

/** ISO 639-1, all 184 two-letter codes less one.
 *
 *  `bh` is omitted. It is a collective code standing for the Bihari languages
 *  as a group rather than a language anyone shoots in, so offering it would
 *  put an unanswerable choice in the list and send a name no cultural test
 *  matches. Bhojpuri, Magahi and Maithili are the languages behind it, and
 *  none has a 639-1 code of its own; add them as 639-3 entries if a production
 *  needs them, the way the sign languages are handled below.
 */
const SPOKEN: ReadonlyArray<readonly [string, string]> = [
  ['aa', 'Afar'], ['ab', 'Abkhazian'], ['ae', 'Avestan'], ['af', 'Afrikaans'],
  ['ak', 'Akan'], ['am', 'Amharic'], ['an', 'Aragonese'], ['ar', 'Arabic'],
  ['as', 'Assamese'], ['av', 'Avaric'], ['ay', 'Aymara'], ['az', 'Azerbaijani'],
  ['ba', 'Bashkir'], ['be', 'Belarusian'], ['bg', 'Bulgarian'], ['bi', 'Bislama'],
  ['bm', 'Bambara'], ['bn', 'Bengali'], ['bo', 'Tibetan'], ['br', 'Breton'],
  ['bs', 'Bosnian'], ['ca', 'Catalan'], ['ce', 'Chechen'], ['ch', 'Chamorro'],
  ['co', 'Corsican'], ['cr', 'Cree'], ['cs', 'Czech'], ['cu', 'Church Slavonic'],
  ['cv', 'Chuvash'], ['cy', 'Welsh'], ['da', 'Danish'], ['de', 'German'],
  ['dv', 'Divehi'], ['dz', 'Dzongkha'], ['ee', 'Ewe'], ['el', 'Greek'],
  ['en', 'English'], ['eo', 'Esperanto'], ['es', 'Spanish'], ['et', 'Estonian'],
  ['eu', 'Basque'], ['fa', 'Persian'], ['ff', 'Fulah'], ['fi', 'Finnish'],
  ['fj', 'Fijian'], ['fo', 'Faroese'], ['fr', 'French'], ['fy', 'Western Frisian'],
  ['ga', 'Irish'], ['gd', 'Scottish Gaelic'], ['gl', 'Galician'], ['gn', 'Guarani'],
  ['gu', 'Gujarati'], ['gv', 'Manx'], ['ha', 'Hausa'], ['he', 'Hebrew'],
  ['hi', 'Hindi'], ['ho', 'Hiri Motu'], ['hr', 'Croatian'], ['ht', 'Haitian Creole'],
  ['hu', 'Hungarian'], ['hy', 'Armenian'], ['hz', 'Herero'], ['ia', 'Interlingua'],
  ['id', 'Indonesian'], ['ie', 'Interlingue'], ['ig', 'Igbo'], ['ii', 'Sichuan Yi'],
  ['ik', 'Inupiaq'], ['io', 'Ido'], ['is', 'Icelandic'], ['it', 'Italian'],
  ['iu', 'Inuktitut'], ['ja', 'Japanese'], ['jv', 'Javanese'], ['ka', 'Georgian'],
  ['kg', 'Kongo'], ['ki', 'Kikuyu'], ['kj', 'Kuanyama'], ['kk', 'Kazakh'],
  ['kl', 'Kalaallisut'], ['km', 'Khmer'], ['kn', 'Kannada'], ['ko', 'Korean'],
  ['kr', 'Kanuri'], ['ks', 'Kashmiri'], ['ku', 'Kurdish'], ['kv', 'Komi'],
  ['kw', 'Cornish'], ['ky', 'Kyrgyz'], ['la', 'Latin'], ['lb', 'Luxembourgish'],
  ['lg', 'Ganda'], ['li', 'Limburgish'], ['ln', 'Lingala'], ['lo', 'Lao'],
  ['lt', 'Lithuanian'], ['lu', 'Luba-Katanga'], ['lv', 'Latvian'], ['mg', 'Malagasy'],
  ['mh', 'Marshallese'], ['mi', 'Maori'], ['mk', 'Macedonian'], ['ml', 'Malayalam'],
  ['mn', 'Mongolian'], ['mr', 'Marathi'], ['ms', 'Malay'], ['mt', 'Maltese'],
  ['my', 'Burmese'], ['na', 'Nauru'], ['nb', 'Norwegian Bokmål'], ['nd', 'North Ndebele'],
  ['ne', 'Nepali'], ['ng', 'Ndonga'], ['nl', 'Dutch'], ['nn', 'Norwegian Nynorsk'],
  ['no', 'Norwegian'], ['nr', 'South Ndebele'], ['nv', 'Navajo'], ['ny', 'Nyanja'],
  ['oc', 'Occitan'], ['oj', 'Ojibwa'], ['om', 'Oromo'], ['or', 'Odia'],
  ['os', 'Ossetian'], ['pa', 'Punjabi'], ['pi', 'Pali'], ['pl', 'Polish'],
  ['ps', 'Pashto'], ['pt', 'Portuguese'], ['qu', 'Quechua'], ['rm', 'Romansh'],
  ['rn', 'Rundi'], ['ro', 'Romanian'], ['ru', 'Russian'], ['rw', 'Kinyarwanda'],
  ['sa', 'Sanskrit'], ['sc', 'Sardinian'], ['sd', 'Sindhi'], ['se', 'Northern Sami'],
  ['sg', 'Sango'], ['si', 'Sinhala'], ['sk', 'Slovak'], ['sl', 'Slovenian'],
  ['sm', 'Samoan'], ['sn', 'Shona'], ['so', 'Somali'], ['sq', 'Albanian'],
  ['sr', 'Serbian'], ['ss', 'Swati'], ['st', 'Southern Sotho'], ['su', 'Sundanese'],
  ['sv', 'Swedish'], ['sw', 'Swahili'], ['ta', 'Tamil'], ['te', 'Telugu'],
  ['tg', 'Tajik'], ['th', 'Thai'], ['ti', 'Tigrinya'], ['tk', 'Turkmen'],
  ['tl', 'Tagalog'], ['tn', 'Tswana'], ['to', 'Tongan'], ['tr', 'Turkish'],
  ['ts', 'Tsonga'], ['tt', 'Tatar'], ['tw', 'Twi'], ['ty', 'Tahitian'],
  ['ug', 'Uyghur'], ['uk', 'Ukrainian'], ['ur', 'Urdu'], ['uz', 'Uzbek'],
  ['ve', 'Venda'], ['vi', 'Vietnamese'], ['vo', 'Volapük'], ['wa', 'Walloon'],
  ['wo', 'Wolof'], ['xh', 'Xhosa'], ['yi', 'Yiddish'], ['yo', 'Yoruba'],
  ['za', 'Zhuang'], ['zh', 'Chinese'], ['zu', 'Zulu'],
];

/** ISO 639-3. Not in 639-1, which has no codes for sign languages. */
const SIGN: ReadonlyArray<readonly [string, string]> = [
  ['ase', 'American Sign Language'], ['asf', 'Australian Sign Language (Auslan)'],
  ['bfi', 'British Sign Language'], ['bzs', 'Brazilian Sign Language (Libras)'],
  ['csl', 'Chinese Sign Language'], ['fcs', 'Quebec Sign Language (LSQ)'],
  ['fsl', 'French Sign Language (LSF)'], ['gsg', 'German Sign Language (DGS)'],
  ['ils', 'International Sign'], ['ins', 'Indian Sign Language'],
  ['ise', 'Italian Sign Language (LIS)'], ['isg', 'Irish Sign Language'],
  ['jsl', 'Japanese Sign Language'], ['kvk', 'Korean Sign Language'],
  ['mfs', 'Mexican Sign Language'], ['nzs', 'New Zealand Sign Language'],
  ['rsl', 'Russian Sign Language'], ['sfs', 'South African Sign Language'],
  ['ssp', 'Spanish Sign Language (LSE)'], ['swl', 'Swedish Sign Language'],
];

/** Every selectable language, sign languages first so they are not buried. */
export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  ...SIGN.map(([code, label]) => ({ code, label, group: 'Sign' as const })),
  ...SPOKEN.map(([code, label]) => ({ code, label, group: 'Spoken' as const })),
];

/** The most declared languages, offered above the rest rather than alphabetically.
 *
 *  English sorts near the middle of 184 entries, which made the commonest answer
 *  on this form something you had to search for. */
export const COMMON_LANGUAGE_LABELS: readonly string[] = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Chinese', 'Japanese', 'Korean', 'Hindi', 'Arabic', 'American Sign Language',
];

/** How many languages a production may declare. */
export const MAX_LANGUAGES = 5;
