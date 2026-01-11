# First-Time Contributors Guide

Welcome to BitSleuth Wallet! 👋

This guide is specifically for developers who are new to contributing to open source or new to this project.

## Quick Start

### 1. Find Your First Issue

We label issues to help you find good starting points:

- 🟢 **`good first issue`**: Perfect for newcomers
- 🟡 **`help wanted`**: We'd love community input on these
- 🔵 **`documentation`**: Improve our docs
- 🟣 **`bug`**: Fix a bug

Browse issues: [Good First Issues](https://github.com/BitSleuthAI/Wallet/labels/good%20first%20issue)

### 2. Set Up Your Development Environment

Follow our comprehensive [Build Guide](BUILD_GUIDE.md) which includes:
- Installing prerequisites (Node.js, Xcode/Android Studio)
- Cloning the repository
- Setting up Firebase (required for development)
- Running the app on iOS/Android

### 3. Make Your First Contribution

#### Step-by-Step Process

1. **Fork the repository**
   - Click the "Fork" button at the top of the GitHub page
   - This creates your own copy of the repository

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Wallet.git
   cd Wallet
   ```

3. **Create a new branch**
   ```bash
   git checkout -b fix/my-awesome-fix
   # or
   git checkout -b feature/my-cool-feature
   ```
   
   Branch naming conventions:
   - `fix/description` for bug fixes
   - `feature/description` for new features
   - `docs/description` for documentation
   - `refactor/description` for code refactoring

4. **Make your changes**
   - Edit the relevant files
   - Follow our code style (see [CONTRIBUTING.md](../CONTRIBUTING.md))
   - Test your changes thoroughly

5. **Test your changes**
   ```bash
   # Run linter
   npm run lint
   
   # Test on iOS
   npm run ios
   
   # Test on Android
   npm run android
   ```

6. **Commit your changes**
   ```bash
   git add .
   git commit -m "Fix: description of what you fixed"
   ```
   
   Commit message format:
   - `Fix: description` for bug fixes
   - `Feat: description` for new features
   - `Docs: description` for documentation
   - `Refactor: description` for refactoring
   - `Test: description` for tests

7. **Push to your fork**
   ```bash
   git push origin fix/my-awesome-fix
   ```

8. **Open a Pull Request**
   - Go to your fork on GitHub
   - Click "Pull Request"
   - Fill in the PR template with details about your changes
   - Submit the PR

## Common First Contributions

### Documentation Improvements

One of the easiest ways to contribute is improving documentation:

- Fix typos or unclear explanations
- Add examples to existing docs
- Improve code comments
- Create new guides

**Important**: All markdown documentation files must be stored in the `docs/` folder (except README.md, CONTRIBUTING.md, LICENSE, CODE_OF_CONDUCT.md, SECURITY.md, CHANGELOG.md, and AGENTS.md).

### Bug Fixes

Found a bug? Great! Here's how to fix it:

1. Check if an issue already exists
2. If not, create a new issue describing the bug
3. Fork and clone the repository
4. Reproduce the bug locally
5. Fix the bug
6. Test thoroughly
7. Submit a PR referencing the issue

### UI/UX Improvements

We welcome improvements to the user interface:

- Better layout or spacing
- Improved color schemes
- Better icons or graphics
- Enhanced animations
- Accessibility improvements

For UI changes, always include before/after screenshots in your PR.

## Understanding the Codebase

### Key Directories

```
Wallet/
├── app/              # Screens (what users see)
├── components/       # Reusable UI elements
├── services/         # Business logic (Bitcoin, wallet operations)
├── hooks/            # State management
├── docs/             # Documentation (you are here!)
└── assets/           # Images, fonts, etc.
```

### Where to Make Changes

| What you want to do | Where to look |
|---------------------|---------------|
| Fix a button or UI element | `components/` |
| Change a screen layout | `app/` |
| Fix wallet logic | `services/wallet-service.ts` |
| Fix transaction logic | `services/bitcoin-service.ts` |
| Add documentation | `docs/` |
| Fix styling | Look for `.tsx` files with NativeWind classes |

### Code Style Tips

✅ **DO:**
- Use TypeScript for all new code
- Use functional components with hooks
- Follow existing naming conventions
- Write self-documenting code
- Add comments for complex logic
- Test on both iOS and Android

❌ **DON'T:**
- Add Google Analytics or tracking (privacy violation)
- Commit secrets or API keys
- Use class components
- Ignore linting errors
- Skip testing your changes

## Getting Help

Stuck? Don't worry! Here's how to get help:

1. **Read the documentation**
   - [Build Guide](BUILD_GUIDE.md)
   - [Architecture Overview](ARCHITECTURE.md)
   - [Contributing Guidelines](../CONTRIBUTING.md)

2. **Search existing issues**
   - Your question might already be answered

3. **Ask in GitHub Discussions**
   - [Start a discussion](https://github.com/BitSleuthAI/Wallet/discussions)
   - The community is friendly and helpful!

4. **Comment on the issue**
   - If you're working on an issue, feel free to ask questions there

5. **Join our community**
   - Check README.md for community links

## Common Pitfalls (and How to Avoid Them)

### Pitfall #1: Firebase Not Configured
**Problem**: App crashes on startup with Firebase errors

**Solution**: You need to set up your own Firebase project. See [BUILD_GUIDE.md](BUILD_GUIDE.md) for detailed instructions.

### Pitfall #2: Linting Errors
**Problem**: CI fails with "Linting failed"

**Solution**: Run `npm run lint` locally before pushing. Fix all errors.

### Pitfall #3: Large PR
**Problem**: Your PR changes too many things at once

**Solution**: Keep PRs small and focused. One bug fix or one feature per PR.

### Pitfall #4: No Testing
**Problem**: Your changes break something else

**Solution**: Always test on both iOS and Android before submitting.

### Pitfall #5: Wrong File Location
**Problem**: You added a `.md` file in the root directory

**Solution**: All documentation files (except the standard ones) go in `docs/`.

## Your First PR Checklist

Before submitting your first PR, make sure:

- [ ] I've read the [Contributing Guidelines](../CONTRIBUTING.md)
- [ ] I've created a new branch for my changes
- [ ] My code follows the project's code style
- [ ] I've tested my changes on iOS and/or Android
- [ ] I've run `npm run lint` and fixed all errors
- [ ] I've added/updated documentation if needed
- [ ] My commit messages are clear and descriptive
- [ ] I've filled out the PR template
- [ ] I've added screenshots for UI changes
- [ ] I've referenced the issue number in my PR

## After Your PR is Submitted

1. **Be patient**: Maintainers review PRs as time permits
2. **Respond to feedback**: Address review comments promptly
3. **Don't take it personally**: Code reviews are about the code, not you
4. **Learn from feedback**: Each review makes you a better developer
5. **Celebrate**: Your contribution helps make Bitcoin more accessible! 🎉

## Code of Conduct

Please read and follow our [Code of Conduct](../CODE_OF_CONDUCT.md). We're building a welcoming, inclusive community.

## Recognition

All contributors are valued! Your contributions will be:
- Listed in git history
- Mentioned in release notes (for significant contributions)
- Appreciated by the Bitcoin community

## Beyond Code

Not a developer? You can still contribute!

- **Report bugs**: Help us find issues
- **Suggest features**: Share your ideas
- **Improve documentation**: Make things clearer
- **Answer questions**: Help others in Discussions
- **Spread the word**: Tell people about BitSleuth Wallet
- **Test releases**: Try new features and report issues

## Resources for Learning

New to React Native or Bitcoin development? Here are some helpful resources:

### React Native / Expo
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Docs](https://docs.expo.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

### Bitcoin Development
- [Bitcoin Developer Guide](https://developer.bitcoin.org/devguide/)
- [BIP Standards](https://github.com/bitcoin/bips)
- [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib)
- [Mastering Bitcoin](https://github.com/bitcoinbook/bitcoinbook) (free book)

### Open Source
- [First Timers Only](https://www.firsttimersonly.com/)
- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

---

## Questions?

Have questions about contributing? Feel free to:
- Open a [Discussion](https://github.com/BitSleuthAI/Wallet/discussions)
- Comment on an issue
- Reach out at opensource@bitsleuth.ai

**Welcome to the BitSleuth Wallet community! We're excited to have you here.** 🚀

---

*Building the future of Bitcoin self-custody, one contribution at a time.* ❤️
