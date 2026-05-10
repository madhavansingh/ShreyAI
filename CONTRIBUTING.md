# Contributing to Shery AI

First off, thank you for considering contributing to Shery AI! It's people like you that make this platform better for everyone.

## Where do I go from here?

If you've noticed a bug or have a feature request, please [open an issue](../../issues/new). It's best if you check if the issue already exists before opening a new one.

## Branching Strategy
- `main` — Production branch (auto-deploys to Vercel). Do not commit here directly.
- `develop` — Integration branch for the next release.
- `feat/*` — Feature branches (e.g., `feat/add-new-ai-model`).
- `fix/*` — Bug fix branches (e.g., `fix/subtitle-sync-issue`).

## How to Contribute

1. **Fork the repository** to your own GitHub account.
2. **Clone the project** to your machine.
3. **Create a branch** locally with a succinct but descriptive name (`git checkout -b feat/your-new-feature`).
4. **Commit your changes**. Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for your commit messages:
   - `feat(chat): add streaming fallback`
   - `fix(upload): resolve 500MB upload limit timeout`
   - `docs: update setup guide`
5. **Push your branch** to your fork (`git push origin feat/your-new-feature`).
6. **Open a Pull Request** in our repository from your fork. Provide a clear description of the problem you're solving and how you solved it.

## Code Style & Linting
- For the frontend, we use ESLint. Ensure your code passes `npm run lint` before committing.
- Prettier is used for code formatting. Please ensure your editor runs Prettier on save.
- Avoid committing `console.log` statements in production code.

Thank you for contributing!
