# Pinit UI design workflow

- Preserve existing product features and API behavior. This repository contains a UI prototype, not the production pinit-fe app.
- Make requested UI edits in the source CSS/JS files, run npm run check and npm run build, and validate affected flows in desktop and mobile layouts.
- Update CHANGELOG.md for each completed user-requested change. Commit the validated change and push it to this repository. The user explicitly requested a commit after every completed modification in this workflow. Do not create a scheduled background monitor.
- Use one coherent commit per completed change, not per keystroke. Never silently leave a completed change only in the local checkout.
- Confirm the active GitHub identity is jim2ning before remote writes. Organization: Pinit-Scheduler. Repository: pinit-ui-design.
- Do not overwrite history, force-push, or reset shared branches. Restore prior behavior with git revert or a new restoration commit.
- Never commit credentials, tokens, private browser data, or real account exports. Keep example data clearly identified.
