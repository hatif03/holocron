export const DEMO_VIDEO_ID = "5Vnh6s4N_Z4";
export const DEMO_VIDEO_URL = `https://youtu.be/${DEMO_VIDEO_ID}`;
export const DEMO_VIDEO_EMBED = `https://www.youtube.com/embed/${DEMO_VIDEO_ID}`;

export const INSTALL_CMD = "npx holocron-research@latest start";
export const DOCTOR_CMD = "npx holocron-research@latest doctor";

export const GITHUB_URL = "https://github.com/hatif03/holocron";
export const DOCS_URL = "https://github.com/hatif03/holocron/tree/main/docs";

export const screenshots = [
  {
    id: "works",
    src: "/screenshots/research-graph-works.png",
    title: "Research works",
    caption: "Organize multiple research projects from one dashboard.",
  },
  {
    id: "canvas",
    src: "/screenshots/research-graph-canvas.png",
    title: "Graph canvas",
    caption: "Map hypotheses, literature, methods, and results as a living graph.",
  },
  {
    id: "paper",
    src: "/screenshots/paper-generation-detail.png",
    title: "Paper generation",
    caption: "Process log, file explorer, memory trace, and PDF output in one view.",
  },
  {
    id: "agents",
    src: "/screenshots/agents-dashboard.png",
    title: "Agent pipeline",
    caption: "Nine specialized agents orchestrated locally with live health status.",
  },
  {
    id: "references",
    src: "/screenshots/references-discover.png",
    title: "References",
    caption: "Search arXiv and Semantic Scholar, import BibTeX, analyze papers with AI.",
  },
] as const;

export const features = [
  {
    title: "Research Graph",
    description:
      "16 node types across ideation, knowledge, execution, and evidence. Connect ideas and generate papers from any end node.",
    stat: "16",
    statLabel: "node types",
  },
  {
    title: "Discover & Ask",
    description:
      "Rank related papers via Semantic Scholar. Ask memory-grounded citation questions scoped to each research work.",
    stat: "work",
    statLabel: "scoped memory",
  },
  {
    title: "Paper Generation",
    description:
      "Graph mode or metadata wizard. IMRaD LaTeX with Nature, IEEE, and ICML venue templates.",
    stat: "3",
    statLabel: "venue templates",
  },
  {
    title: "Supermemory Local",
    description:
      "Agents recall prior plans, drafts, and references across generations — all on localhost:6767.",
    stat: "6767",
    statLabel: "local port",
  },
  {
    title: "Bring Your Own Key",
    description:
      "K2 Think, OpenAI, Anthropic, Google, Groq, OpenRouter, or any OpenAI-compatible endpoint.",
    stat: "7+",
    statLabel: "LLM providers",
  },
  {
    title: "Fully Local Stack",
    description:
      "Postgres, Python agents, Next.js UI, LaTeX service, and Supermemory in Docker on your machine.",
    stat: "0",
    statLabel: "cloud required",
  },
] as const;

export const agents = [
  { name: "Planner", role: "Outline + Semantic Scholar / arXiv discovery" },
  { name: "Writer", role: "Graph-grounded IMRaD LaTeX section generation" },
  { name: "Reviewer", role: "Logic, style, length, and citation coverage loop" },
  { name: "Citation Verifier", role: "Ensures all bib keys and literature nodes are cited" },
  { name: "Typesetter", role: "Self-healing LaTeX compilation to PDF" },
  { name: "VLM Review", role: "Visual PDF layout detection" },
  { name: "Commander", role: "Pipeline orchestrator across all phases" },
  { name: "Metadata", role: "Simple-mode paper from metadata fields" },
  { name: "Paper Parser", role: "PDF understanding and structured extraction" },
] as const;

export const providers = [
  { name: "K2 Think", model: "MBZUAI-IFM/K2-Think-v2", note: "Recommended for demos" },
  { name: "Groq", model: "llama-3.3-70b-versatile", note: "Fast inference" },
  { name: "OpenAI", model: "gpt-4o", note: "Official API" },
  { name: "Anthropic", model: "claude-sonnet-4-20250514", note: "Messages API" },
  { name: "Google", model: "gemini-2.0-flash", note: "OpenAI-compatible" },
  { name: "OpenRouter", model: "openai/gpt-4o", note: "Many models, one key" },
] as const;

export const faqs = [
  {
    q: "What do I need to install?",
    a: "Node.js 20+ and Docker Desktop. Run npx holocron-research@latest doctor to verify prerequisites before starting.",
  },
  {
    q: "Does Holocron require a cloud account?",
    a: "No. The full stack runs locally in Docker. You only need an LLM API key if you want real paper content instead of mock mode.",
  },
  {
    q: "What is mock mode?",
    a: "Leave the API key empty during setup to run placeholder content — useful for exploring the UI without spending on inference.",
  },
  {
    q: "Where is my data stored?",
    a: "Research works, references, and generations live in local Postgres. Config and API keys are in ~/.holocron/.env. Supermemory runs at localhost:6767.",
  },
  {
    q: "Can I use Holocron commercially?",
    a: "Holocron is licensed under PolyForm Noncommercial 1.0.0. Personal, research, and educational use is permitted. Commercial use requires separate permission.",
  },
  {
    q: "How do I contribute?",
    a: "See CONTRIBUTING.md on GitHub. Fork, branch, run npm run lint and npm run test, then open a focused pull request.",
  },
] as const;

export const installSteps = [
  { step: "01", title: "Install Node.js 20 LTS", body: "Required for the holocron CLI via npx." },
  { step: "02", title: "Install Docker Desktop", body: "Holocron ships Postgres, agents, web UI, LaTeX, and Supermemory in Docker." },
  { step: "03", title: "Verify prerequisites", body: "Run holocron doctor — all checks should pass." },
  { step: "04", title: "Start Holocron", body: "First run pulls images, runs migrations, and opens localhost:3000." },
] as const;
