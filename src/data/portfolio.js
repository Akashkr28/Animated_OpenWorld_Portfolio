// All site content lives here. Edit this file and both the island and the classic view update.

export const profile = {
  name: 'Akash Kumar Singh',
  title: 'Full-stack developer',
  tagline: 'React, Node.js and Python, with an MCA specialising in AI/ML.',
  bio: [
    "I'm a full-stack developer working with React, Node.js and TypeScript, and adding AI features to web apps.",
    'I worked in accounting before software, so I enjoy building tools for finance and operations teams: billing, reconciliation, reporting, the boring stuff that eats people\'s afternoons.',
    'I take on freelance projects alongside my MCA.',
  ],
}

// What the character says on arrival, chosen from the visitor's own clock.
export const greetings = {
  morning: 'Good morning!',
  afternoon: 'Good afternoon!',
  evening: 'Good evening!',
  night: 'Hello, night owl!',
  intro: "I'm Akash. Welcome to my island.",
}

export const education = [
  { degree: 'Master of Computer Applications (AI/ML)', school: 'Amity University Online', when: 'In progress' },
]

export const skills = [
  { group: 'Frontend', items: ['React', 'TypeScript', 'JavaScript', 'Tailwind', 'Redux', 'Zustand', 'React Query'] },
  { group: 'Backend', items: ['Node.js', 'Express', 'Prisma', 'Mongoose', 'Socket.io', 'REST', 'OAuth 2.0'] },
  { group: 'Data', items: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite'] },
  { group: 'AI', items: ['Python', 'LLM APIs', 'Prompt engineering', 'LLM-as-judge evaluation'] },
  { group: 'Tools', items: ['Git', 'Jest', 'Postman', 'Swagger', 'Firebase', 'Cloudinary', 'Figma'] },
]

// One pedestal is created per project. Set github or demo to null to hide that link.
export const projects = [
  {
    id: 'checkgrid',
    title: 'CheckGrid',
    summary: 'Real-time grid of 1 million checkboxes',
    description: 'A real-time grid of 1 million checkboxes that many users can toggle at once. State lives in a Redis bitfield, so the whole grid fits in about 125 KB, and updates go out over WebSockets with Redis Pub/Sub.',
    tech: ['Node', 'Express', 'WebSockets', 'Redis', 'OAuth 2.0'],
    image: '/projects/checkgrid.svg',
    imageAlt: 'Illustration of a dense checkbox grid with some boxes ticked',
    github: 'https://github.com/Akashkr28/1-million-checkboxes',
    demo: 'https://million-checkboxes-xtg8.onrender.com/',
    color: '#ff7a59',
  },
  {
    id: 'diksha',
    title: 'D.I.K.S.H.A',
    summary: 'Voice AI assistant',
    description: 'A voice AI assistant built with Next.js and TypeScript.',
    tech: ['Next.js', 'TypeScript', 'Voice AI'],
    image: '/projects/diksha.svg',
    imageAlt: 'Illustration of a voice waveform',
    github: 'https://github.com/Akashkr28/D.I.K.S.H.A',
    demo: 'https://akash-portfolio-eta-snowy.vercel.app',
    color: '#2fb7a8',
  },
  {
    id: 'tour-billing',
    title: 'Tour & Travel Billing',
    summary: 'Billing app for a travel business',
    description: 'A billing app for a tour and travel business.',
    tech: ['Billing', 'Web app'],
    image: '/projects/tour-billing.svg',
    imageAlt: 'Illustration of an invoice beside a route line',
    github: null,
    demo: null,
    color: '#ffc27a',
  },
  {
    id: 'processiq',
    title: 'ProcessIQ',
    summary: 'Scores where AI can help a business',
    description: 'Research engine that analyses 100 business processes and scores where AI could help, built end to end in two days for an engineering challenge.',
    tech: ['React', 'Node', 'SQLite', 'Groq'],
    image: '/projects/processiq.svg',
    imageAlt: 'Illustration of a process flow with scored nodes',
    github: 'https://github.com/Akashkr28/ProcessIQ',
    demo: null,
    color: '#9c8cff',
  },
  {
    id: 'sentinel',
    title: 'SENTINEL',
    summary: 'Prompt injection attack and defence playground',
    description: 'Prompt injection attack and defence playground. You try to break the model; it shows which defence caught you and why.',
    tech: ['React', 'Node', 'Claude API'],
    image: '/projects/sentinel.svg',
    imageAlt: 'Illustration of a shield deflecting incoming lines',
    github: 'https://github.com/Akashkr28/Sentinel_Prompt_Injection_Attack_and_Defense',
    demo: null,
    color: '#ff5c8a',
  },
  {
    id: 'promptforge',
    title: 'PromptForge',
    summary: 'Automated prompt optimiser',
    description: 'A self-improving prompt engine that uses meta-prompting and LLM-as-judge evaluation to rewrite a task prompt, then shows how and by how much it improved with score curves and word-level diffs.',
    tech: ['TypeScript', 'LLM APIs', 'LLM-as-judge'],
    image: '/projects/promptforge.svg',
    imageAlt: 'Illustration of a score curve rising over iterations',
    github: 'https://github.com/Akashkr28/Prompt_Forge_A_Prompt_Optimizer_Tool',
    demo: 'https://prompt-forge-a-prompt-optimizer-too.vercel.app',
    color: '#7ad7f0',
  },
]

// One stone per milestone, placed along the road in this order.
export const milestones = [
  { when: 'Education', title: 'MCA in AI/ML', text: 'Studying for a Master of Computer Applications at Amity University Online, specialising in AI and machine learning.' },
  { when: '2022 onward', title: 'Accounting at Phoenix Engineers', text: 'Working in accounting at Phoenix Engineers, which is where my interest in tools for finance and operations teams comes from.' },
  { when: 'Freelance', title: 'Freelance projects', text: 'Taking on freelance builds alongside work and study, with a soft spot for billing and operations tools.' },
  { when: 'Hackathons', title: 'Hackathons and challenges', text: 'Building against the clock, from Book My Ticket to ProcessIQ, a full research engine shipped in two days.' },
  { when: 'Now', title: 'What I\'m working toward', text: 'Building a RAG project and an AI-assisted bank reconciliation tool, and writing about what I learn on Hashnode.' },
]

export const contact = {
  email: 'akashkumarsingh816@gmail.com',
  linkedin: 'https://www.linkedin.com/in/akash-kumar-singh-2a3503364/',
  github: 'https://github.com/Akashkr28',
}

// Hidden places in the wider world. Found by walking there.
export const discoveries = {
  summit: { title: 'Cloudtop Summit', text: 'The whole island from one spot. Worth the climb.' },
  falls: { title: 'Silver Falls', text: 'Where the river starts its run to the sea.' },
  windmill: { title: 'Meadow Windmill', text: 'It only works as hard as the wind does.' },
  grove: { title: 'Whispering Grove', text: 'Old stones and a light that wakes at night.' },
  ruins: { title: 'Forgotten Ruins', text: 'Legacy code, in stone form. Nobody dares refactor it.' },
  cove: { title: 'Campfire Cove', text: 'A quiet place to sit and think about side projects.' },
  pier: { title: 'Sunset Pier', text: 'Best seat on the island when the sun goes down.' },
  isle: { title: 'Lantern Isle', text: 'You found the far edge of the map. Nicely done.' },
}

export const zoneText = {
  spawn: { label: 'Welcome Plaza', short: 'Plaza' },
  about: { label: 'About Me', short: 'About' },
  projects: { label: 'Projects Gallery', short: 'Projects' },
  journey: { label: 'Journey Path', short: 'Journey' },
  contact: { label: 'Contact Tower', short: 'Contact' },
}
