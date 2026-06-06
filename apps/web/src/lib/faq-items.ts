export const FAQ_ITEMS = [
  {
    id: 'cpu',
    question: 'Is it safe for my CPU performance?',
    answer:
      'Absolutely. Sound packs load short local audio buffers (under 25kb per sound) managed directly by node-speaker at low priority. There are no external network calls that slow down your build or interrupt flow while coding in Cursor or Claude Code.',
  },
  {
    id: 'install',
    question: 'How do I install a sound pack?',
    answer:
      'Browse packs on AI Sounds, pick one you like, and run the install command shown on the pack page with the aisounds CLI. It maps AISE events to your sounds in Cursor, VS Code, Claude Code, Windsurf, or Aider.',
  },
  {
    id: 'create',
    question: 'Can I create my own pack?',
    answer:
      'Yes. Sign in with GitHub, go to Upload, and follow the three-step wizard: set metadata, upload sounds for each AISE event, then publish. Your pack appears in the community catalog once published.',
  },
  {
    id: 'tools',
    question: 'Which tools are compatible?',
    answer:
      'Cursor, VS Code, Claude Code, Windsurf, and Aider are supported today. Each pack lists which tools it targets. The CLI installs event mappings into the right config for your editor.',
  },
  {
    id: 'cost',
    question: 'How much do packs cost?',
    answer:
      'All community packs on AI Sounds are free to browse, download, and install. Licenses vary per pack (CC0, CC-BY, MIT, etc.) — check the pack detail page before remixing or redistributing.',
  },
] as const
