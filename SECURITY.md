# Security policy

## Reporting a vulnerability

Report a vulnerability privately through GitHub: open the repository's **Security** tab and choose
**Report a vulnerability**. Do not open a public issue for it.

Say what is affected, how to reproduce it, and what an attacker could do with it.

## Supported versions

doc-editor is in early development and has no release yet. Fixes land on `main`.

## Scope

doc-editor is a Claude Code mod. A mod runs with the user's own permissions, so a crafted
document that makes the mod run code, write a file it was not asked to write, or reach the
network is in scope. The mod is designed to make no network request, call no model of its own,
write only through its safe-write path, and run converters as separate processes with argument
vectors and no shell.

## Secrets in this repository

This repository is public and must hold no secrets. If you find a credential in the history,
report it as above so it can be rotated.
