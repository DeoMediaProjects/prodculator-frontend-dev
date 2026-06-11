export interface SupportFaqItem {
  id: string;
  category: 'account' | 'billing' | 'technical' | 'report' | 'general';
  question: string;
  answer: string;
}

export const supportFaqItems: SupportFaqItem[] = [
  {
    id: 'script-privacy',
    category: 'technical',
    question: 'Is my script safe? Do you store it?',
    answer:
      'Your script is used only to extract production metadata, then the original file is deleted. Prodculator stores extracted metadata needed for your report, not your full screenplay text.',
  },
  {
    id: 'accepted-formats',
    category: 'technical',
    question: 'What format does my script need to be in?',
    answer:
      'Prodculator accepts PDF, DOCX, and TXT files up to 10MB. Standard screenplay formatting with scene headings works best.',
  },
  {
    id: 'scripteligence-report',
    category: 'report',
    question: 'What is a Scripteligence Report?',
    answer:
      'A Scripteligence Report is the output of Prodculator analysis, covering location recommendations, territory rankings, financial assumptions, investor-facing notes, funding sources, festivals, and comparable productions depending on plan access.',
  },
  {
    id: 'incentive-figures',
    category: 'report',
    question: 'Can I trust the incentive figures in my report?',
    answer:
      'The figures are indicative estimates based on available programme data. Verify all incentive, tax, and finance assumptions with the relevant film commission and qualified professionals before making commitments.',
  },
  {
    id: 'free-plan',
    category: 'account',
    question: 'How does the free plan work?',
    answer:
      'A free account includes one Scripteligence Report with no credit card required. Locked report sections can be unlocked by upgrading.',
  },
  {
    id: 'cancel-plan',
    category: 'billing',
    question: 'Can I cancel at any time?',
    answer:
      'Monthly subscriptions can be cancelled at any time, and access remains available until the end of the current billing period.',
  },
];
