# Holocron Demo Narration

Voiceover script for recording (~2–3 minutes). Pair with the technical checklist in [DEMO.md](./DEMO.md).

---

This is **Holocron**. It starts not with a blank page, but with a clear structure. Here, the researcher begins by defining the title and scope of their new project — creating a dedicated space for their work on the **research graph**.

Welcome to the research canvas. Instead of writing prose first, the user maps their entire research logic visually. They add nodes for each component: the initial hypothesis, the literature they will cite, the data files and figures, and the specific methods they plan to run. Each node is a structured data object, connecting to form a comprehensive graph that represents the intellectual backbone of the paper. This is our core principle: **structure first**.

Before generation, Holocron’s **Supermemory** layer remembers context across sessions. Open the sidebar **Memory** tab on a showcase work — for example, our renewables energy transition graph — and search for prior drafts, graph summaries, or discovered papers. These memories were seeded locally at `localhost:6767`, scoped to this work, and are ready to be recalled when agents write.

Once the research graph is complete, the magic happens. With a single click on the **end** node, the user initiates paper generation. They select a style guide — Nature or IEEE — and enable AI-powered **planning** and **review** loops. This tells our system not just *what* to write, but *how* to structure, format, and verify the output.

The system now takes over. On the **paper generation** dashboard, you can see our AI agents at work. First, the **Planner** agent queries academic databases like **Semantic Scholar** to discover relevant papers, building a foundational knowledge base. Supermemory **profiles** work and user context before planning — and **recalls** seeded memories during each section.

This is not just text generation. It is an active research and reasoning process. Next, our **Commander** orchestrates a team of specialized workers. The **Writer** drafts each section while the **Reviewer** checks logical consistency and word count. Expand the **Memory trace** to see profile, recall, and store events in real time — including search hits that pull prior drafts back into the prompt. The **Process Log** shows a transparent timeline of every action, from reference discovery to completing a full nine-hundred-word section.

When the process completes, Holocron delivers a fully structured project. In the **Explorer**, you can browse individual LaTeX files for Abstract, Introduction, Methods, Results, and Discussion — along with generated figures and a compiled, publication-ready **PDF** in the detail panel. Each column scrolls independently so you can follow the log, browse files, and read the PDF at the same time.

But Holocron goes beyond writing. In **References**, add a new paper by DOI or upload a PDF. The system searches for the paper, downloads it when available, and performs deep analysis — extracting a summary, core research questions, methods, and key findings in seconds. That analysis is stored in Supermemory so agents can cite it intelligently during the next generation.

Under the hood, a suite of dedicated local agents — Parser, Commander, Planner, Writer, Reviewer, and Typesetter — work in concert with **Supermemory Local** and your chosen LLM. Check **Settings** for green dependency health, then run `holocron status` from the CLI to confirm the full stack.

This is the new operating system for research. This is **Holocron**.

---

## Suggested screen flow

1. Research graph list → create or open renewables showcase  
2. Canvas: pan nodes (hypothesis → data → end)  
3. Memory tab: search “energy transition” → show hits  
4. Generate paper → open running/completed detail  
5. Memory trace expanded → point at Recall events with hit counts  
6. Process Log + Explorer + PDF (three-panel scroll)  
7. References: add/analyze a paper  
8. Settings: dependencies green  
9. Terminal: `npx holocron-research@1.0.5 status`

**Demo generation URL (renewables, with search recalls):**  
http://localhost:3000/paper-generation/4d9df851-1f58-4f46-820b-ab6da3d5e28b
