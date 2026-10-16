---
event: completion-receipt
spec: "{{specId}}"
task: "{{taskId}}"
agent: "{{agent}}"
date: "{{timestamp}}"
---

# Completion receipt

## Evidence

- Touched files: [explicit paths]
- Tests executed: [exact command and result]
- Traceability delta: [REQ IDs and BDD/TDD/adversarial mapping]
- Adversarial cases: [malformed DTO, boundary, authorization, concurrency or N/A with reason]
- Unresolved risks: [none or explicit risks]
- Memory observations submitted: [inbox paths or none]

This receipt is invalid if any evidence item is omitted or merely says “passed”.
