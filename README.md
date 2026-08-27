# ⚡ POWERS

**POWERS is an evidence-first superpower continuity, interpretation, readiness and character-psychology engine for AI Dungeon.**

It is built for superhero, fantasy, sci-fi, urban fantasy, horror, cultivation, psychic, magical, cybernetic, cosmic and completely original power systems. It does not exist to hand out random abilities or turn the story into a stat sheet. Its job is to make powers keep meaning the same thing hundreds of actions later.

## Why use POWERS?

POWERS deliberately keeps apart concepts language models often blur:

- **claim ≠ fact**
- **attempt ≠ successful feat**
- **mentioning a power ≠ owning it**
- **ownership ≠ availability ≠ operational readiness**
- **manipulation ≠ generation**
- **resistance ≠ immunity**
- **suppression ≠ permanent loss**
- **observed scale ≠ absolute maximum**
- **technique ≠ separate power**
- **Echo/alternate manifestation ≠ automatically a second ability**
- **belief, fear and theory ≠ objective world truth**

## 🧬 Power Genome + Extended Power Atlas

A large low-ambiguity atlas gives exact canonical recognition to common and unusual families, while Power Genome handles compositional names and original abilities dynamically. It can reason about domain, mechanic, source, access, activation, traits, applications and scale without rewriting the ability you authored.

Original `-kinesis`, `-mancy`, `-pathy`, `-portation`, `-morphism`, manipulation/generation/creation families and completely invented names can all be tracked.

## 🔬 Evidence-first continuity

POWERS separates authored canon, statements, claims, attempts and demonstrated feats. Confidence develops through **rumored → probable → confirmed** instead of making every power-shaped sentence true.

It also protects against reference pollution. Reading a report about Telepathy, warning someone about Time Stop, investigating Regeneration or buying a book called Mind Control does not grant those powers to the speaker.

## 👥 Subject and actor attribution

Multi-character prose is routed to the person actually using or possessing the ability.

```text
Mara watches Kade teleport.
→ Kade: Teleportation

Kade says Mara can teleport.
→ Mara: claim-level Teleportation evidence

Mara ducks as Kade generates lightning.
→ Kade: Lightning Generation
```

Reported capability, observer action, belief and nested psychology are treated separately.

## 🧩 Strict mechanics

POWERS actively prevents silent capability creep:

```text
Fire Manipulation ≠ Fire Generation
Ice Manipulation ≠ Ice Generation
Resistance ≠ Immunity
Teleportation ≠ Portal Creation
Time Manipulation ≠ Time Stop
Time Stop ≠ Time Travel
Spirit Manipulation ≠ Astral Projection
Animal Control ≠ Animal Communication
```

The story may establish those links. POWERS simply refuses to assume them.

## ⚙️ Ownership, access and readiness

A character can own an ability without being able to use it right now.

**Access** can be innate, inherited, learned, granted, copied, stolen, borrowed or artifact-dependent.

**Availability** can be available, restricted, suppressed, lost or unknown.

**Operational readiness** can be ready, strained, cooldown, depleted, charging, overcharged, unstable, recovering or unknown.

That means a depleted Null Field is not the same state as a suppressed Null Field, and neither erases ownership.

## 🌦️ Environmental rules

Explicit environmental mechanics are structured as requirements, blockers, boosts, weaknesses or triggers. `assessPower()` and `assessAttempt()` can evaluate them rather than merely storing them as flavor text.

Incidental scenery does not become a rule. Standing in rain is not enough to prove that rain empowers an ability.

## 🌀 Variants and Echo States

Altered, inverted, corrupted, mutated or Echo manifestations remain attached to the established parent power. POWERS tracks which variant is currently active and can return the ability to baseline without erasing historical variant evidence.

## 🎯 Deep power continuity

POWERS can retain:

- named techniques and applications;
- range, duration, area, target count and magnitude;
- activation/control requirements;
- limitations, costs and conditions;
- reliability and precision;
- resources, charges and recharge rules;
- visual/sensory signatures;
- training and breakthroughs;
- synergies and power-vs-power interactions;
- collateral/control failures;
- forms and form-bound abilities;
- defenses, weaknesses and vulnerabilities;
- sources and origins, while keeping theories separate from facts.

## 🧠 Inner Current

Inner Current is the integrated evidence-anchored psyche layer. It tracks supported goals, plans, fears, beliefs, secrets, current emotions, vows/restraint, self-image, internal conflict, attitudes toward powers, important relationships and explicit emotion→power rules.

Private psychology stays private. A character believing a relic caused their power does not make that origin objectively true. Ordinary emotions age out of the live summary; durable goals, beliefs, fears, vows, secrets and relationships do not.

Human-controlled characters receive private-agency protection so AI output cannot quietly establish permanent inner beliefs or intentions for them.

## 🎲 Attempt referee

When the player attempts a power use, POWERS can surface known blockers and strict-mechanic warnings before the model resolves the action.

For example, asking established **Fire Manipulation** to create fire from nothing can generate a continuity warning if Fire Generation has never been established. The referee does not decide success—it tells the model what existing continuity requires.

## ⏪ Retry, Edit and Undo safety

Action-scoped continuity can roll back when `info.actionCount` moves backward. Future-branch evidence, resolutions and metadata can be removed, while authored Story Card canon remains separate.

Repeated hooks are de-duplicated so retries do not inflate evidence, and repeated Context calls strip the previous trailing POWERS ledger before rebuilding it.

## 🗂️ Story Card integration

Compact authored canon works:

```text
Powers: Vector Redirection, Kinetic Resistance
```

Rich metadata can enrich the declared parent ability:

```text
Powers: Vector Redirection
Function: Redirect existing vectors; cannot create force.
Activation/control: Deliberate hand movement and line of sight.
Signature/tell: Pale geometric afterimages.
Established technique: Split Compass.
Known limitation: Cannot generate force from nothing.
Environmental rule: weaker inside Quiet Glass chambers.
Cost: Heavy use causes vertigo.
Established feat: Redirected a speeding van.
Post-Minute behavior: Sometimes manifests an Echo State.
```

Authored cards have provenance. Editing or deleting a card retracts facts supported only by that card while preserving independent story evidence.

POWERS can also maintain compact generated Power/Psyche memory cards and clean obsolete generated memory without deleting authored canon.

## 📐 Context discipline

The live ledger relevance-ranks characters instead of dumping the entire database into every generation. It respects AI Dungeon context limits when available and keeps the long-term state bounded.

## 🔌 Public API

Other scripts can use `POWERS.api` as a shared continuity authority. The package exports **28 API methods** covering reads, power/psyche writes, readiness, variants, environment rules, assessment, diagnostics and summaries.

See `API_REFERENCE.md` for the full reference.

## Installation

Copy the four scripts into the matching AI Dungeon script areas:

```text
1-Library.js → Library
2-Input.js   → Input
3-Context.js → Context
4-Output.js  → Output
```

POWERS works with defaults immediately. For configuration, create one `Powers Config` Story Card using the bundled files. See `POWERS_CONFIG_CARD_SETUP.md`.

## Configuration

The compact Config Entry contains **91 options** and remains below 2,000 characters. Every option is explained individually in `POWERS_CONFIG_NOTES.txt`, which belongs in the Story Card Notes field. An import-ready `POWERS_CONFIG_STORY_CARD.json` is also included.

The config parser supports creator-friendly presets (`custom`, `story`, `strict`, `lightweight`), explicit-option overrides, tolerant key formatting, inline comments, range clamping and diagnostics for invalid or unknown settings.

For most adventures, start with:

```text
mode=narrative
detection=balanced
contextDetail=medium
```

Change advanced thresholds only if you deliberately want different evidence behavior.

## Validation

The package includes portable Node regression tests covering core continuity, strict mechanics, false positives, authored provenance, Undo/Retry behavior, API safety, deep readiness/environment/variant behavior and the complete **100-card THE WHITE MINUTE** integration fixture.

## Final principle

**Your setting decides what is possible.**  
**Your story decides what is true.**  
**Your characters decide what it means to them.**  
**POWERS remembers the difference.**
