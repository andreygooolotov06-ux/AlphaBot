# Contributing Guide: AlphaDate Personal AI

---

## 1. Branch Strategy

We follow a structured Git Flow suited for dual-agent development:

* **`main`**: Production-ready, stable releases only. Direct commits to `main` are strictly prohibited.
* **`develop`**: Primary integration branch. All completed features are merged here.
* **`feature/<agent>-<feature-name>`**: Working branches.
  * Examples: `feature/dev1-extension-preact-hud`, `feature/dev2-sqlite-migration`.
* **`contract/<change-name>`**: Dedicated branch for proposed changes to `@alphadate/contracts`.

---

## 2. Commit Message Convention

Follow Conventional Commits:
```
<type>(<scope>): <short summary>

[optional body]
```

### Types:
- `feat`: New feature for the user or module
- `fix`: Bug fix
- `docs`: Documentation updates only
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or correcting tests
- `chore`: Build process, dependencies, tooling updates

### Scopes:
- `contracts`, `extension`, `local-app`, `ai-core`, `model-router`, `memory`

---

## 3. Pull Request Requirements

Before submitting or approving a Pull Request:
1. All packages compile cleanly (`npm run typecheck`).
2. Contracts are backward-compatible, or version increment is documented.
3. No secrets or personal data are included in the diff.
4. Entry added to `SYNC.md`.
