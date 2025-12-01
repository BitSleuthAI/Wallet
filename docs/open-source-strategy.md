# Open-Source Strategy for BitSleuth

This document outlines how to release a community-driven open-source codebase ("BitSleuth Core") while retaining proprietary value in a commercial product ("BitSleuth Wallet").

## Goals
- Encourage community contributions without exposing proprietary IP.
- Preserve branding assets, paid features, and partner integrations for the commercial app.
- Maintain a clean separation to simplify compliance, licensing, and monetization.

## Recommended License
- Use **Apache License 2.0** for BitSleuth Core.
  - Includes an explicit patent license and contribution terms suitable for companies.
  - Permissive enough to encourage adoption and contributions.
- Add a short **TRADEMARKS** notice clarifying that names, logos, and brand assets are not granted under the open-source license.

## Repository Structure
- **BitSleuth Core (public)**
  - Contents: protocol logic, wallet engine, Bitcoin libraries, non-branded UI components, and any tooling needed to build/run.
  - License: Apache-2.0.
  - Governance: public issues/PRs, code of conduct, contributing guide, security policy.
- **BitSleuth Wallet (private)**
  - Contents: branding, premium features, proprietary integrations (e.g., partners, analytics dashboards, payment rails), A/B experiments, paid support hooks.
  - License: proprietary; reference shared core as a Git submodule or npm/package dependency.

## Migration Plan
1. **Audit & Split Content**
   - Remove secrets (API keys, service accounts) and proprietary assets (logos, partner configs) from history before publishing.
   - Relocate shared, non-proprietary code into a new `bitsleuth-core` directory in this repo, then move it to a public repo.
   - Keep private-only code (branding, premium flows) in `BitSleuth Wallet`.
2. **Create Public Repository**
   - Initialize `BitSleuth Core` with cleaned history (use `git filter-repo` to drop sensitive files) and add `LICENSE`, `README`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, and `SECURITY.md`.
   - Document build/run steps and public API surfaces (e.g., wallet engine interfaces).
3. **Rewire Private App**
   - Consume `BitSleuth Core` as a dependency: add as a Git submodule, npm package, or monorepo package.
   - Keep branding and premium modules in the private repo; gate them behind feature flags or dependency injection so the core stays unbranded.
4. **Set Contribution & Release Process**
   - Require Developer Certificate of Origin (DCO) or CLA for contributors (clarifies rights and patent grants).
   - Use semantic versioning for BitSleuth Core; tag releases and update the private repo dependency regularly.
   - Publish a security policy with a private disclosure channel; avoid filing vulnerabilities in public issues until patched.
5. **Monetization Options**
   - Offer premium modules (e.g., partner integrations, advanced analytics dashboards, concierge support) only in the private repo.
   - Provide hosted services or support contracts that complement the open-source core.

## Practical Checklist
- [ ] Identify and remove secrets and proprietary assets from Git history.
- [ ] Extract shared code into a `bitsleuth-core` package with Apache-2.0 license.
- [ ] Add governance docs (README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY.md) to the public repo.
- [ ] Add trademark notice and branding guidelines to the private repo.
- [ ] Configure the private app to depend on the public core (submodule or package).
- [ ] Establish release cadence and contributor process (DCO/CLA, code review, CI checks).
