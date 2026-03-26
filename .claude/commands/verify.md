# /verify

Run the full SmartATS verification suite and report the result.

```bash
npm run verify:full
```

After the command completes, report:

- Whether lint, type-check, tests, and build all passed
- Any test failures with the test name and error message
- Any lint errors with file and line number
- Exit code

If anything fails, list the exact commands the user should run to reproduce and fix each issue.
