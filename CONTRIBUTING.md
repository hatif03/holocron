# Contributing to Holocron

Thank you for your interest in Holocron. This guide covers how to set up a development environment, submit changes, and what to expect regarding licensing.

## License

Holocron is distributed under the [PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/). By contributing, you agree that your contributions will be licensed under the same terms.

- **Permitted:** personal use, research, education, hobby projects, and use by noncommercial organizations
- **Not permitted without separate permission:** commercial use, selling hosted services based on Holocron, or using Holocron as part of a commercial product

If you need a commercial license, open an issue or contact the maintainers before contributing commercially derived work.

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine on Linux)
- Python 3.12+ (optional — only if running agents outside Docker)
- Git

## Development setup

```bash
git clone https://github.com/hatif03/holocron.git
cd holocron
npm install
cp .env.example .env
npm run start:local
```

Open [http://localhost:3000](http://localhost:3000) once services are healthy.

Optional demo data:

```bash
npm run seed:showcase
npm run seed:showcase:renewables
npm run seed:recall:demo
```

## Making changes

1. Fork the repository and create a branch from `main`
2. Keep changes focused — one logical change per pull request
3. Match existing code style, naming, and patterns in the files you touch
4. Run checks before opening a PR:

```bash
npm run lint
npm run test
```

5. Open a pull request with a clear description of what changed and why

## Pull request guidelines

- Explain the problem and how your change addresses it
- Include screenshots for UI changes when relevant
- Update documentation if behavior, configuration, or install steps change
- Do not commit secrets (`.env`, API keys, tokens)

## Reporting issues

When filing a bug report, include:

- Holocron version (`npx holocron-research@latest doctor` output helps)
- Operating system and Docker version
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs from the web UI, agents service, or CLI

Feature requests are welcome. Describe the use case and why it fits Holocron's local-first research workflow.

## Project structure

| Path | Purpose |
|------|---------|
| `apps/web/` | Next.js frontend and API routes |
| `apps/agents/` | Python FastAPI multi-agent service |
| `apps/marketing/` | Public marketing site |
| `packages/cli/` | `holocron-research` npm CLI |
| `packages/shared/` | Shared schemas and types |
| `docs/` | Architecture, configuration, and integration guides |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design and [docs/TESTING.md](docs/TESTING.md) for the test strategy.

## Resources

- [README](README.md) — quick start and feature overview
- [Demo video](https://youtu.be/5Vnh6s4N_Z4)
- [Supermemory integration](docs/SUPERMEMORY.md)
- [Configuration reference](docs/CONFIGURATION.md)
