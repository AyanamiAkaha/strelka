# Contributing

Read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) first. Read [DEVELOPER.md](DEVELOPER.md) for architecture and conventions.

## Bug Reports

Open an issue with:

- **Environment**: Browser, OS, GPU (if relevant)
- **Steps to reproduce**: Minimal sequence to trigger the bug
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Console output**: Any errors from the browser console (F12)
- **Screenshots/recordings**: If the bug is visual

## Feature Requests

Open an issue with:

- **Description**: What you want
- **Use case**: Why you want it — what problem does it solve?
- **Proposed implementation**: How you think it could work (optional)
- **Alternatives considered**: Other approaches you thought of (optional)

No guarantees that feature requests will be implemented. The project has specific goals and not every feature fits.

## Pull Requests

### Workflow

1. Fork the repository
2. Create a feature branch from `master`
3. Make your changes following the conventions in [DEVELOPER.md](DEVELOPER.md)
4. Verify: `yarn type-check` passes with no errors
5. Verify: `yarn dev` — app loads, your changes work, nothing else broke
6. Submit a pull request against `master`

### PR Checklist

- [ ] `yarn type-check` passes
- [ ] App loads and renders correctly
- [ ] Existing functionality is not broken
- [ ] Code follows project conventions (naming, imports, style)
- [ ] No new dependencies added without discussion
- [ ] Commit messages are clear and concise

### Review Process

- The project author reviews all PRs
- There is no guaranteed review timeline
- PRs may be accepted, rejected, or requested to change
- Rejection is final — see CODE_OF_CONDUCT.md
- Small, focused PRs are preferred over large, sweeping changes
