# AgroConnect

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

**Unit tests are required.** Every pull request must include unit tests for the
code it adds or changes, and overall test coverage must stay at or above **70%**.
CI blocks any PR that fails tests or drops below that threshold.

### Branch flow

```
feature/* ──PR──▶ development ──PR──▶ staging ──PR──▶ main
                  (integration)       (QA)            (production)
```

- `development`: open PRs here. Merge yourself once CI is green.
- `staging`: deployed to the staging server for QA. Merged by the DevOps lead.
- `main`: production. Merged by the DevOps lead, deploy requires approval.

Deployment details: [deploy/README.md](deploy/README.md).
