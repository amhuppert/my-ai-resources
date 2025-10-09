#!/usr/bin/env bash

# This script merges the current branch into main and pushes it to the remote repository,
# then switches back to the original branch. It's a convenient way to deploy changes
# from a feature branch to main without staying on the main branch.

BRANCH=$(git branch --show-current)

git switch main
git merge "$BRANCH"
git push

# Switch back to the original branch after merging and pushing to main.
git switch "$BRANCH"