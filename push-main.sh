#!/usr/bin/env bash

BRANCH=$(git branch --show-current)

git switch main
git merge "$BRANCH"
git push
git switch "$BRANCH"