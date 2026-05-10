# AGENTS.md

## Project Workflow

- Do not run `npm run dev`, `npm run android:sync`, or Android Studio build/sync operations unless the user explicitly asks for execution. The user will run these commands locally.
- When these operations are relevant, provide the exact command and any needed context instead of starting the process.

## Release Commands

- For a release, the user manually updates `package.json` version, then runs `npm run version:sync`.
- After version sync, the user manually runs `npm run android:sync` before opening/building in Android Studio.
- Do not run `npm run version:sync`, `npm run android:sync`, or Android Studio release/build operations unless the user explicitly asks for execution.
