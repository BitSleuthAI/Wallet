# Contributing to BitSleuth Wallet

Thank you for your interest in contributing to BitSleuth Wallet! We welcome contributions from the community and are grateful for your help in making this project better.

This document provides guidelines for contributing to this open source project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Documentation Guidelines](#documentation-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Security](#security)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to opensource@bitsleuth.ai.

## How to Contribute

We welcome many types of contributions:

### Reporting Bugs
- Check if the bug has already been reported in [Issues](https://github.com/BitSleuthAI/Wallet/issues)
- If not, create a new issue with a clear title and description
- Include steps to reproduce, expected behavior, and actual behavior
- Add screenshots or code samples if applicable
- Specify your environment (OS, device, app version)

### Suggesting Enhancements
- Check if the enhancement has already been suggested
- Create a new issue with the `enhancement` label
- Clearly describe the feature and its benefits
- Explain why this enhancement would be useful to most users

### Contributing Code
1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our code style guidelines
3. **Test thoroughly** - ensure all existing tests pass and add new tests if needed
4. **Update documentation** - if you change functionality, update the relevant docs
5. **Submit a pull request** - follow our PR process below

### Improving Documentation
- Fix typos, clarify explanations, or add missing information
- Add examples or tutorials
- Translate documentation (if applicable)
- Follow our documentation organization guidelines below

## Pull Request Process

1. **Before You Start**
   - Check existing PRs to avoid duplicate work
   - Discuss major changes in an issue first
   - Ensure your fork is up to date with the main repository

2. **Creating Your PR**
   - Use a clear, descriptive title
   - Reference related issues (e.g., "Fixes #123")
   - Describe your changes in detail
   - Include screenshots for UI changes
   - List any breaking changes

3. **PR Requirements**
   - All tests must pass
   - Code must be linted (run `npm run lint`)
   - Documentation must be updated if needed
   - Commit messages should be clear and descriptive
   - Code must follow our style guidelines

4. **Review Process**
   - Maintainers will review your PR
   - Address any requested changes
   - Be responsive to feedback
   - Once approved, a maintainer will merge your PR

## Documentation Guidelines

### Markdown File Organization

**All markdown documentation files MUST be stored in the `docs/` folder**, with the following exceptions:

#### Root-Level Markdown Files (Allowed)
These files should remain in the root directory:
- `README.md` - Project overview and getting started guide
- `CONTRIBUTING.md` - This file; contribution guidelines
- `LICENSE` - License information (AGPL-3.0)
- `CODE_OF_CONDUCT.md` - Community guidelines
- `SECURITY.md` - Security policy and vulnerability reporting
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

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Wallet.git
   cd Wallet
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install iOS pods (for macOS users):
   ```bash
   cd ios && pod install && cd ..
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Run on a device/simulator:
   ```bash
   npm run ios      # iOS
   npm run android  # Android
   ```

### Running Tests

Before submitting a PR, make sure to:
- Run the linter: `npm run lint`
- Test on both iOS and Android if possible
- Verify all existing functionality still works

### Code Style

- **TypeScript**: All new code must use TypeScript with strict type checking
- **Functional Components**: Use function components with hooks exclusively
- **No Analytics**: Never add Google Analytics or Firebase Analytics (only Crashlytics for error reporting)
- **Security First**: All cryptographic operations must be reviewed
- **Comments**: Write self-documenting code; add comments only for complex logic
- **Formatting**: Code will be automatically formatted - ensure linting passes

### Best Practices

- **Small, Focused Changes**: Keep PRs small and focused on a single issue
- **Test Your Changes**: Always test on both iOS and Android when possible
- **Update Tests**: Add or update tests for new functionality
- **Security**: Never commit secrets, API keys, or sensitive data
- **Privacy**: Respect user privacy - no tracking or analytics
- **Dependencies**: Avoid adding new dependencies unless absolutely necessary

### Commit Guidelines

- Write clear, descriptive commit messages
- Use present tense ("Add feature" not "Added feature")
- Reference issue numbers when applicable (e.g., "Fix #123")
- Keep commits focused and atomic
- Use conventional commit format when possible:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `refactor:` for code refactoring
  - `test:` for adding tests
  - `chore:` for maintenance tasks

### Security

- **Never commit secrets**: No API keys, private keys, or sensitive data
- **Private Keys**: All key management must remain client-side
- **Review Changes**: Security-sensitive changes require thorough review
- **Vulnerability Reporting**: Report security issues via our [Security Policy](SECURITY.md), not in public issues

## Project Structure

For detailed information about the project architecture, see:
- **README.md** - Project overview and technical stack
- **AGENTS.md** - Development patterns and conventions
- **docs/** - All additional documentation

## Getting Help

- **Questions?** Open a [Discussion](https://github.com/BitSleuthAI/Wallet/discussions)
- **Found a Bug?** Open an [Issue](https://github.com/BitSleuthAI/Wallet/issues)
- **Need Clarification?** Ask in the PR or issue comments

## Recognition

Contributors will be recognized in our project. We appreciate all contributions, big or small!

## License

By contributing to BitSleuth Wallet, you agree that your contributions will be licensed under the [GNU Affero General Public License v3.0](LICENSE).

---

**Thank you for contributing to BitSleuth Wallet!** Your efforts help make Bitcoin more accessible and secure for everyone.
