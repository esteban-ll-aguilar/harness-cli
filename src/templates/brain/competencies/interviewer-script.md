# Interviewer Agent Script

> This script guides the Interviewer agent through structured requirement gathering.
> Compatible with ALL AI tools.

---

## Phase 1: VISION DEL PRODUCTO

1. **What problem does this software solve?**
   - Probe: Is this a pain point or a nice-to-have?
   - Probe: What happens if this problem is NOT solved?

2. **Who is the end user?**
   - Probe: Technical level? Frequency of use? Primary device?
   - Probe: Are there multiple user types (admin, end-user, guest)?

3. **What is the measurable success outcome?**
   - Probe: KPIs? Metrics? Time saved? Revenue impact?

---

## Phase 2: REQUERIMIENTOS FUNCIONALES

4. **List the 3-5 CRITICAL features (must-have for MVP).**
   - Probe: What is the ONE feature that MUST work perfectly?
   - Probe: Can any feature be deferred to v2?

5. **External system integrations?**
   - Probe: APIs? Databases? Third-party services?
   - Probe: Do they have documentation? SLAs?

6. **Main user flows?**
   - Probe: Walk me through a typical session
   - Probe: Entry points? Exit points?

---

## Phase 3: CASOS DE USO

7. **Describe the MOST IMPORTANT use case step-by-step.**
   - Probe: Trigger? Preconditions? Postconditions?
   - Probe: Alternative paths at each step?

8. **What happens if something fails at each step?**
   - Probe: Error messages? Recovery actions? Notifications?

9. **Alternative or exception paths?**
   - Probe: Edge cases? Boundary conditions?

---

## Phase 4: FLUJO DE DATOS

10. **Describe the main data flow.**
    - Probe: Input sources? Processing steps? Output destinations?

11. **What decisions does the system make automatically?**
    - Probe: Business rules? Algorithms? ML models?

12. **Where does a human need to intervene?**
    - Probe: Approvals? Overrides? Manual data entry?

---

## Phase 5: RESTRICCIONES Y REGLAS

13. **Compliance regulations?**
    - Probe: GDPR? HIPAA? SOX? PCI-DSS?

14. **Performance limits?**
    - Probe: Concurrent users? Response time? Throughput?

15. **Technology constraints?**
    - Probe: Mandatory stack? Forbidden libraries? Cloud provider?

---

## Phase 6: DEFINICION DE "HECHO"

16. **What does "done" mean for a feature?**
    - Probe: Tested? Documented? Reviewed? Deployed?

17. **Who approves the work?**
    - Probe: Role, not name. Technical lead? Product owner?

18. **Minimum test coverage required?**
    - Probe: Unit? Integration? E2E? Performance?

---

## Phase 7: FUERA DE ALCANCE

19. **What should this system NOT do?**
    - Probe: Explicit exclusions prevent scope creep

20. **What features are deferred to future versions?**
    - Probe: Roadmap alignment

21. **What assumptions are we making?**
    - Probe: Document assumptions to validate later

---

## Post-Interview: /clarify

After gathering responses, the Interviewer MUST:

1. Identify ambiguities (missing performance, security, scale info)
2. Ask clarifying questions using `/clarify`
3. Generate structured report in `memory/session-logs/`
4. Hand off to Architect agent with:
   - Summary of requirements
   - Identified ambiguities (if any)
   - Recommended priority order

---

*This script is loaded by the Interviewer agent at session start.*
*Modify in `brain/competencies/interviewer-script.md`.*
