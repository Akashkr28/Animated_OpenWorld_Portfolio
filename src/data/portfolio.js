// All site content lives here. Edit this file and both the island and the classic view update.

export const profile = {
  name: 'Akash Kumar Singh',
  title: 'Full-stack developer',
  tagline: 'React, Node.js and Python, with an MCA specialising in AI/ML.',
  bio: [
    "I'm a full-stack developer working with React, Node.js and TypeScript, and adding AI features to web apps.",
    'I\'ve worked in accounting since 2022, so I enjoy building tools for finance and operations teams: billing, reconciliation, reporting, the boring stuff that eats people\'s afternoons.',
    'I take on freelance projects alongside my MCA.',
  ],
}

// What the character says on arrival, chosen from the visitor's own clock.
export const greetings = {
  morning: 'Good morning!',
  afternoon: 'Good afternoon!',
  evening: 'Good evening!',
  night: 'Hello, night owl!',
  intro: "I'm Akash's guide bot. Welcome to his island!",
}

export const education = [
  { degree: 'Master of Computer Applications (AI & ML)', school: 'Amity University Online', when: 'Jan 2026 – Present' },
  { degree: 'Master of Business Administration (Finance)', school: 'IGNOU', when: 'Jan 2022 – Dec 2025' },
  { degree: 'Bachelor of Commerce (Accountancy)', school: 'Karim City College', when: 'Aug 2013 – Jul 2016' },
]

export const certifications = [
  { degree: 'Full Stack Web Development', school: 'Physics Wallah', when: 'Aug 2023 – Feb 2025' },
]

export const skills = [
  { group: 'Frontend', items: ['React', 'Next.js', 'TypeScript', 'JavaScript', 'Tailwind', 'Redux', 'Zustand', 'React Query'] },
  { group: 'Backend', items: ['Node.js', 'Express', 'FastAPI', 'Prisma', 'Mongoose', 'WebSockets', 'Socket.io', 'REST', 'OAuth 2.0', 'JWT'] },
  { group: 'Data', items: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite'] },
  { group: 'AI', items: ['Python', 'LLM APIs', 'Prompt engineering', 'LLM-as-judge evaluation'] },
  { group: 'Tools', items: ['Git', 'Linux', 'Jest', 'pytest', 'Postman', 'Swagger', 'Firebase', 'Twilio', 'Vercel', 'Netlify', 'Cloudinary', 'Figma'] },
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
    summary: 'Voice AI assistant portfolio page',
    description: 'A full-fledged voice AI assistant portfolio page. D.I.K.S.H.A (Digital Intelligence for Knowledge, Speech & Human Assistance) guides visitors through my work out loud, and they can talk to it to ask about me and my projects.',
    tech: ['Next.js', 'TypeScript', 'Three.js', 'Claude API', 'ElevenLabs'],
    image: '/projects/diksha.svg',
    imageAlt: 'Illustration of a voice waveform',
    github: 'https://github.com/Akashkr28/D.I.K.S.H.A',
    demo: 'https://akash-portfolio-eta-snowy.vercel.app',
    color: '#2fb7a8',
  },
  {
    id: 'tour-billing',
    title: 'Tour & Travel Billing',
    summary: 'Staff billing app for a travel company',
    description: 'A staff-only billing and invoice web app for a tour and travel company, built solo as a freelancer from requirements through to deployment. AI-assisted features generate trip summaries, flag unusual charges and suggest line items, cutting manual checking for staff.',
    tech: ['React', 'Node.js', 'Express', 'PostgreSQL', 'Prisma', 'Redis'],
    image: '/projects/tour-billing.svg',
    imageAlt: 'Illustration of an invoice beside a route line',
    github: null,
    demo: null,
    color: '#ffc27a',
  },
  {
    id: 'shopfloor-sentinel',
    title: 'Shopfloor Sentinel',
    summary: 'Cyber health dashboard for factories',
    description: 'A traffic-light cyber health dashboard for small and medium factories. A passive gateway on a Raspberry Pi or old PC watches the plant network and machine logs, and Sentinel turns each finding into a green, amber or red alert card with a 3-step script in Hindi, Marathi, Tamil or English. It messages the owner on WhatsApp or SMS, instantly for red alerts. Built for the TCS iON Hackathon.',
    tech: ['React', 'Node.js', 'Express', 'SQLite', 'Python', 'Claude API'],
    image: '/projects/shopfloor-sentinel.svg',
    imageAlt: 'Illustration of a traffic light beside a factory network',
    github: 'https://github.com/Akashkr28/Shopfloor_Sentinel_Dashboard',
    demo: 'https://shopfloor-sentinel.fly.dev/setup-factory',
    color: '#ff5c8a',
  },
]

// One stone per milestone, placed along the road in this order.
export const milestones = [
  { when: '2013 – 2025', title: 'Commerce and finance', text: 'I earned a B.Com in Accountancy at Karim City College, then an MBA in Finance at IGNOU.' },
  { when: 'Sep 2022 – Present', title: 'Accounting at Phoenix Engineers', text: 'I work in accounting at Phoenix Engineers, where my interest in tools for finance and operations teams began.' },
  { when: 'Aug 2023 – Feb 2025', title: 'Learning full-stack development', text: 'I completed the Full Stack Web Development certification at Physics Wallah.' },
  { when: 'Freelance', title: 'Freelance projects', text: 'I take on client projects alongside my studies, including a billing and invoicing system I built solo for a travel company.' },
  { when: 'Jan 2026 – Present', title: 'MCA in AI & ML', text: 'I\'m studying for a Master of Computer Applications at Amity University Online, specialising in AI and machine learning.' },
  { when: '2026', title: 'Hackathons', text: 'I ranked 15th of 133 at the ChaiCode Chai Forms Hackathon, then built Shopfloor Sentinel for the TCS iON Hackathon.' },
  { when: 'Now', title: 'What I\'m working toward', text: 'I\'m building a RAG project and an AI-assisted bank reconciliation tool, and writing about what I learn on Hashnode.' },
]

export const contact = {
  email: 'akashkumarsingh816@gmail.com',
  linkedin: 'https://www.linkedin.com/in/akash-kumar-singh-2a3503364/',
  github: 'https://github.com/Akashkr28',
  resume: '/resume/Akash_Kumar_Singh_Full_Stack_Resume.pdf',
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
