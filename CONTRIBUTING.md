# Contributing to BitSleuth Wallet

Thank you for your interest in contributing to BitSleuth Wallet! This document provides guidelines for contributing to this project.

## Documentation Guidelines

### Markdown File Organization

**All markdown documentation files MUST be stored in the `docs/` folder**, with the following exceptions:

#### Root-Level Markdown Files (Allowed)
These files should remain in the root directory:
- `README.md` - Project overview and getting started guide
- `CONTRIBUTING.md` - This file; contribution guidelines
- `LICENSE.md` or `LICENSE` - License information
- `CHANGELOG.md` - Version history (for future use, if created)
- `AGENTS.md` - Agent configuration and guidelines
- `.github/copilot-instructions.md` - GitHub Copilot instructions

#### Documentation Files (Must be in `docs/`)
All other markdown files should be placed in the `docs/` folder, including but not limited to:
- Product requirements and specifications (e.g., `PRD.md`)
- Implementation summaries and technical documentation
- Testing guides and procedures
- Migration guides
- Design documents
- API documentation
- Architecture documentation
- Deployment guides
- Troubleshooting guides
- TODO lists and planning documents

### Why This Matters

Keeping documentation organized in the `docs/` folder provides several benefits:
- **Easy Navigation**: Contributors and users can find all documentation in one place
- **Clean Repository**: Keeps the root directory uncluttered
- **Scalability**: Makes it easier to manage documentation as the project grows
- **Consistency**: Follows common open-source project conventions

### Creating New Documentation

When creating new markdown documentation:

1. Create the file in the `docs/` folder
2. Use descriptive, UPPERCASE_SNAKE_CASE filenames (e.g., `WALLET_PERSISTENCE_SUMMARY.md`)
3. Add a clear title at the top of the document
4. Include a brief description or table of contents for longer documents

Example:
```bash
# Create new documentation in the docs folder
touch docs/NEW_FEATURE_GUIDE.md
```

## Code Contribution Guidelines

### Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Run linting:
   ```bash
   npm run lint
   ```

### Code Style

- **TypeScript**: All new code must use TypeScript with strict type checking
- **Functional Components**: Use function components with hooks exclusively
- **No Analytics**: Never add Google Analytics or Firebase Analytics (only Crashlytics for error reporting)
- **Security First**: All cryptographic operations must be reviewed
- **Comments**: Write self-documenting code; add comments only for complex logic

### Commit Guidelines

- Write clear, descriptive commit messages
- Reference issue numbers when applicable
- Keep commits focused and atomic

### Security

- **Never commit secrets**: No API keys, private keys, or sensitive data
- **Private Keys**: All key management must remain client-side
- **Review Changes**: Security-sensitive changes require thorough review

## Project Structure

For detailed information about the project architecture, see:
- **README.md** - Project overview and technical stack
- **AGENTS.md** - Development patterns and conventions
- **docs/** - All additional documentation

## Questions?

For unclear or missing conventions, refer to recent code changes or contact the development team.

---

**Note**: This is proprietary software owned by BitSleuth. Contributions are limited to authorized BitSleuth personnel only.
