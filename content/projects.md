---
title: "Projects"
description: "Here are some of my projects — full-stack web apps, open-source tools, and developer infrastructure built with Next.js, TypeScript, AWS, and more."
keywords: [Projects, Portfolio, SehatScan, HyprFlux, MindOasis, HisaabScore, UAM Tracker, Next.js, React, TypeScript, AWS]
showtoc: false
searchHidden: true
ShowRssButtonInSectionTermList: false
ShowShareButtons: false
hideMeta: true
---

<style>
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}
.project-card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  background: var(--entry);
  padding: 0;
  display: flex;
  flex-direction: column;
}
.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}
.project-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  object-position: center;
  display: block;
  margin: 0;
  padding: 0;
}
.project-card-info {
  padding: 1.25rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.project-card-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.15rem;
}
.project-card-info p {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  color: var(--secondary);
  line-height: 1.5;
}
.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
}
.project-tags span {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: var(--tertiary);
  color: var(--secondary);
  border-radius: 4px;
}
.project-links {
  display: flex;
  gap: 0.75rem;
  margin-top: auto;
}
.project-links a {
  font-size: 0.85rem;
  color: var(--primary);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 500;
}
.project-links a:hover {
  text-decoration: underline;
}
</style>

<div class="project-grid">

<div class="project-card">
<img src="/assets/projects/hyprflux.webp" alt="HyprFlux">
<div class="project-card-info">
<h3>HyprFlux</h3>
<p>Dotfiles and configs for a beautiful, efficient Hyprland desktop on Arch Linux. Minimal, productive, and fast.</p>
<div class="project-tags">
<span>Linux</span>
<span>Arch Linux</span>
<span>Hyprland</span>
<span>Waybar</span>
<span>Shell</span>
<span>CSS</span>
<span>Dotfiles</span>
</div>
<div class="project-links">
<a href="https://github.com/ahmad9059/HyprFlux" target="_blank" rel="noopener noreferrer">GitHub</a>
<a href="https://www.hyprflux.dev" target="_blank" rel="noopener noreferrer">Live Demo</a>
</div>
</div>
</div>

<div class="project-card">
<img src="/assets/projects/sehatscan.webp" alt="SehatScan">
<div class="project-card-info">
<h3>SehatScan</h3>
<p>AI-powered health assessment platform that analyzes medical documents and facial images to generate personalized health insights.</p>
<div class="project-tags">
<span>Python</span>
<span>Next.js</span>
<span>TypeScript</span>
<span>AWS</span>
<span>Redis</span>
<span>PostgreSQL</span>
<span>Prisma</span>
<span>Google Gemini</span>
</div>
<div class="project-links">
<a href="https://github.com/ahmad9059/SehatScan" target="_blank" rel="noopener noreferrer">GitHub</a>
<a href="https://sehatscan.vercel.app" target="_blank" rel="noopener noreferrer">Live Demo</a>
</div>
</div>
</div>

<div class="project-card">
<img src="/assets/projects/hisaabscore.webp" alt="HisaabScore">
<div class="project-card-info">
<h3>HisaabScore</h3>
<p>AI-powered alternative credit scoring for gig workers and informal economy workers lacking traditional credit history.</p>
<div class="project-tags">
<span>TypeScript</span>
<span>Next.js</span>
<span>Tailwind CSS</span>
<span>Firebase</span>
<span>Google Genkit</span>
<span>Gemini 2.0</span>
<span>Prisma</span>
</div>
<div class="project-links">
<a href="https://github.com/ahmad9059/HisaabScore" target="_blank" rel="noopener noreferrer">GitHub</a>
<a href="https://hisaabscore.vercel.app" target="_blank" rel="noopener noreferrer">Live Demo</a>
</div>
</div>
</div>

<div class="project-card">
<img src="/assets/projects/raf-sp.webp" alt="RAF-SP">
<div class="project-card-info">
<h3>RAF-SP</h3>
<p>Agricultural data management platform with department management, equipment tracking, and maintenance logs.</p>
<div class="project-tags">
<span>TypeScript</span>
<span>Next.js</span>
<span>Tailwind CSS</span>
<span>Prisma</span>
<span>Supabase</span>
<span>shadcn/ui</span>
<span>Framer Motion</span>
</div>
<div class="project-links">
<a href="https://raf-sp.vercel.app" target="_blank" rel="noopener noreferrer">Live Demo</a>
</div>
</div>
</div>

<div class="project-card">
<img src="/assets/projects/uam-tracker.webp" alt="UAM Tracker">
<div class="project-card-info">
<h3>UAM Tracker</h3>
<p>Full-stack GPA/CGPA tracker for UAM University students with authenticated dashboards and interactive progress charts.</p>
<div class="project-tags">
<span>TypeScript</span>
<span>Next.js</span>
<span>Tailwind CSS</span>
<span>Prisma</span>
<span>PostgreSQL</span>
<span>Better Auth</span>
<span>Recharts</span>
</div>
<div class="project-links">
<a href="https://github.com/ahmad9059/UamTracker" target="_blank" rel="noopener noreferrer">GitHub</a>
<a href="https://uam-tracker.vercel.app/" target="_blank" rel="noopener noreferrer">Live Demo</a>
</div>
</div>
</div>

<div class="project-card">
<img src="/assets/projects/mindosis.webp" alt="MindOasis">
<div class="project-card-info">
<h3>MindOasis</h3>
<p>Hackathon project helping users in Pakistan find mental health professionals with AI-powered profile summaries.</p>
<div class="project-tags">
<span>TypeScript</span>
<span>Next.js</span>
<span>Tailwind CSS</span>
<span>shadcn/ui</span>
<span>Firebase Genkit</span>
<span>Google Gemini</span>
</div>
<div class="project-links">
<a href="https://github.com/ahmad9059/MindOasis" target="_blank" rel="noopener noreferrer">GitHub</a>
<a href="https://mindoasis.vercel.app" target="_blank" rel="noopener noreferrer">Live Demo</a>
</div>
</div>
</div>

<div class="project-card">
<img src="/assets/projects/codinghawks.webp" alt="CodingHawks">
<div class="project-card-info">
<h3>CodingHawks</h3>
<p>Official website for Coding Hawks Society at MNS-UoA, empowering coders through projects, learning, and competitions.</p>
<div class="project-tags">
<span>TypeScript</span>
<span>Next.js</span>
<span>Tailwind CSS</span>
<span>Prisma</span>
<span>Supabase</span>
<span>shadcn/ui</span>
</div>
<div class="project-links">
<a href="https://github.com/ahmad9059/codinghawks" target="_blank" rel="noopener noreferrer">GitHub</a>
<a href="https://codinghawks.vercel.app" target="_blank" rel="noopener noreferrer">Live Demo</a>
</div>
</div>
</div>

</div>
