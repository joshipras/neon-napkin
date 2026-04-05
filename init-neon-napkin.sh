#!/usr/bin/env bash

set -euo pipefail

GITHUB_USERNAME="${1:-}"
REPO_NAME="${2:-neon-napkin}"
DEFAULT_BRANCH="${3:-main}"
VISIBILITY="${VISIBILITY:-public}"

if [[ -z "${GITHUB_USERNAME}" ]]; then
  echo "Usage: $0 <github-username> [repo-name] [default-branch]"
  echo "Example: $0 octocat neon-napkin main"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required but was not found in PATH."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "No git repository detected. Initializing one now..."
  git init
fi

git checkout -B "${DEFAULT_BRANCH}" >/dev/null 2>&1 || git switch -C "${DEFAULT_BRANCH}"

git add -A

if ! git diff --cached --quiet; then
  if git rev-parse --verify HEAD >/dev/null 2>&1; then
    git commit -m "Prepare Neon Napkin repository"
  else
    git commit -m "Initial commit"
  fi
else
  echo "No staged changes to commit."
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "Remote 'origin' already exists: $(git remote get-url origin)"
  echo "Pushing ${DEFAULT_BRANCH} to origin..."
  git push -u origin "${DEFAULT_BRANCH}"
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI ('gh') is required to create the remote automatically."
  echo "Install it, run 'gh auth login', then rerun this script."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is installed but not authenticated."
  echo "Run 'gh auth login' and rerun this script."
  exit 1
fi

echo "Creating ${VISIBILITY} GitHub repository ${GITHUB_USERNAME}/${REPO_NAME}..."
gh repo create "${GITHUB_USERNAME}/${REPO_NAME}" \
  "--${VISIBILITY}" \
  --source=. \
  --remote=origin \
  --push

echo "Repository is live: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
