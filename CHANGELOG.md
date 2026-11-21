# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use
[semantic versioning](https://semver.org/spec/v2.0.0.html). While the major version is 0, a minor
release may add a subsystem and may change interfaces; a patch release only fixes defects and
documentation.

## [Unreleased]

### Fixed

- The local gate passes again under Claude Code 2.1.323 and later. `claude plugin validate` now
  type-checks the hooks with its own compiler options, which reject a relative import ending in
  `.ts`, so the plugin imports its local modules without an extension. The declared-list gate
  reads the `(default matcher key: ...)` mark validate now adds to a hook, and runs the safety
  floor even when validate fails, so a type error cannot hide a breach of the floor.

## [0.1.0]

### Added

- First tagged release: a doc viewer and editor inside the Claude Code TUI, built as a Claude
  Code mod.
