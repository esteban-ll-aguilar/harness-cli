# Pattern: Distinctive Frontend Design

> Adapted from Anthropic's `frontend-design` Claude Code skill
> (github.com/anthropics/claude-plugins-public), licensed under the
> Apache License 2.0 — see `frontend-design.LICENSE.txt` in this same
> folder. Reworded here to be agent-agnostic (no assumption of any
> specific AI tool) and reframed as a harness pattern instead of a
> Claude-only skill, per the license's "state that you changed the
> files" requirement. Compatible with ALL AI tools.

> Reference pattern for any spec that touches new or existing UI. Load
> this before designing a page, component library, or visual refresh —
> not just before writing code, but before making palette/type/layout
> decisions.

## Stance

Approach UI work as the design lead at a small studio known for giving
every client a visual identity that could not be mistaken for anyone
else's. Assume the client has already rejected proposals that felt
templated and is paying for a distinctive point of view: make
deliberate, opinionated choices about palette, typography, and layout
specific to this brief, and take one real aesthetic risk you can
justify.

## Ground it in the subject

If the spec doesn't pin down what the product or subject is, pin it
yourself before designing: name one concrete subject, its audience,
and the page's single job, and record that choice in the spec or a
decision note. Check `brain/people/` and `brain/decisions/` for
anything already known about this product's audience or prior visual
direction — use it. The subject's own world — its materials,
instruments, artifacts, vernacular — is where distinctive choices come
from. Design with the brief's real content and subject matter
throughout, not placeholder copy.

## Design principles

For web designs, the hero is a thesis. Open with the most
characteristic thing in the subject's world, in whatever form fits: a
headline, an image, an animation, a live demo, an interactive moment.
A big number with a small label, supporting stats, and a gradient
accent is the template answer — only use it if it's truly the best
option for this brief.

Typography carries the personality of the page. Pair a display and a
body face deliberately, not the same families reached for on any other
project, with a clear type scale and intentional weights, widths, and
spacing.

Structure is information. Numbering, eyebrows, dividers, labels should
encode something true about the content, not decorate it. Numbered
markers (01/02/03) are only appropriate when the content actually is a
sequence — a real process, a timeline — not as default decoration.
Question every structural device before adding it.

Leverage motion deliberately. Consider where animation actually serves
the subject: a page-load sequence, a scroll-triggered reveal, a hover
micro-interaction, ambient atmosphere. One orchestrated moment usually
lands harder than scattered effects. Sometimes the right amount of
motion is close to none — uniform "fade everything up on scroll"
applied indiscriminately to every section is one of the clearest
tells that a design is AI-generated, precisely because it's applied
without regard to what any particular section needs.

Match complexity to the vision. Maximalist directions need elaborate
execution; minimal directions need precision in spacing, type, and
detail. Elegance is executing the chosen vision well, not adding more.

Treat copy as design material. A design brief often has no real
content, and it falls to whoever builds it to write copy that doesn't
read as templated as a bad layout would. See "Writing in design"
below.

## Calibration: known AI-generated defaults

AI-generated design currently clusters around a small number of
defaults, applied regardless of subject:

1. Warm cream background (~#F4F1EA) + high-contrast serif display +
   terracotta accent.
2. Near-black background + a single bright acid-green or vermilion
   accent.
3. Broadsheet layout: hairline rules, zero border-radius, dense
   newspaper-like columns.
4. Blue/indigo gradient hero with blurred decorative "orb" shapes and
   a dot-grid mesh background, rounded-2xl white cards, generic
   "SaaS starter kit" chrome.

All four are legitimate for some briefs, but they are defaults rather
than choices, and they show up regardless of subject. Where the brief
pins a direction down, follow it exactly — the brief's own words
always win, including when it asks for one of these looks. Where an
axis is left free, don't spend that freedom on one of these defaults.

## Process: brainstorm, plan, critique, build, critique again

Work in two passes.

**Pass 1 — brainstorm a compact design plan:**
- **Color** — 4–6 named hex values.
- **Type** — typefaces for 2+ roles: a characterful display face used
  with restraint, a complementary body face, and a utility face for
  captions/data if needed.
- **Layout** — a layout concept as one-sentence prose plus an ASCII
  wireframe, to compare options before committing.
- **Signature** — the one unique element this page will be remembered
  by, that embodies the brief.

**Review the plan against the brief before building.** For each part,
ask: is this the generic default an agent would produce for any
similar brief, or a choice made specifically for this one? Revise
anything that reads generic, and note what changed and why (a decision
note under `brain/decisions/` is a natural place for this on a
non-trivial visual direction). Only after confirming the plan's
relative uniqueness should code-writing start, following the revised
plan and deriving every color/type decision from it.

**While writing CSS**, watch for selector specificity fights —
type-based selectors (`.section`) and element-based selectors
(`.cta`) can cancel each other out, especially around
padding/margin between sections.

Do most of this planning and iteration before touching code. Only
surface ideas once there's real confidence they'll land.

## Restraint and self-critique

Spend boldness in one place. Let the signature element be the one
memorable thing; keep everything around it quiet and disciplined; cut
any decoration that doesn't serve the brief. Not taking a risk can be
a risk itself — but a design with five loud elements reads as noise,
not confidence.

Build to a quality floor without announcing it:
- Responsive down to mobile.
- Visible keyboard focus states.
- `prefers-reduced-motion` respected.
- Screenshot the actual rendered result and self-critique against the
  plan before calling it done, if the environment supports it — a
  picture surfaces problems a diff never will (overlapping elements,
  clipped text, motion that never settles). Re-check after any
  positioning change: an element anchored to the wrong container can
  silently overlap sibling content that isn't visible in a quick
  glance.

## Writing in design

Words appear in a design for one reason: to make it easier to
understand and use. Treat copy as design material, not decoration —
bring it the same intentionality as spacing and color.

- Write from the end user's side of the screen. Name things by what
  people control and recognize, never by how the system is built — "a
  person manages notifications," not "webhook config."
- Default to active voice. A control says exactly what happens when
  used: "Save changes," not "Submit." Keep vocabulary consistent
  through a whole flow — the button that says "Publish" produces a
  toast that says "Published."
- Treat failure and emptiness as moments for direction, not mood.
  Explain what went wrong and how to fix it, in the interface's voice.
  An empty screen is an invitation to act, not just an absence.
- Keep the register conversational and tuned to the audience: plain
  verbs, sentence case, no filler. Let each element do exactly one
  job — a label labels, an example demonstrates, nothing quietly does
  double duty.
