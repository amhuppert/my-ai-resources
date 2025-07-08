# CLAUDE.md

## Auto-Checkpointing

<critical>
  BEFORE making any edits, create a checkpoint commit using:
  `git commit -am "[AUTO] Before {brief summary of intended changes}"`
</critical>

<critical>
  Do not commit to the `main` branch. If the current branch is `main`, first create a new branch named 'feat/{some-branch-name}' then make the auto-checkpoint commit.
</critical>

This ensures you can always revert changes if needed.
