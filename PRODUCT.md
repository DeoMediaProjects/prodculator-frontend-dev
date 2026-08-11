# PRODUCT.md — Prodculator

## Register

**Brand** for `/` (landing), `/pricing`, `/faq`, `/contact`, and the legal pages: design is the product there, and a visitor's impression is the deliverable.

**Product** for everything behind `/dashboard`, the analysis wizard, the report viewer and the admin portal: design serves the work.

This file's design direction covers the brand surfaces. The product surfaces follow the existing token system and `adminSurfaces.ts` conventions.

## What it is

Prodculator turns a screenplay into a production-financing decision: which territory to shoot in, what a tax incentive is actually worth to *this* project, and what the net cost looks like once the incentive is honest about itself.

The category is unfamiliar to most visitors. Script *coverage* is a known product — story, structure, character. Prodculator answers a different question about the same document: **not "is the script good" but "how would we produce it, and where"**. The homepage's first job is to establish that this is a different question, because a visitor who thinks it is coverage will bounce.

## Who it is for

Independent producers and small production companies, arriving cold from paid media. They have a script and a budget number and are deciding between territories with real money at stake. They are sceptical by profession — they have been sold optimistic numbers before — and whatever the report says will be repeated to a financier, so it has to survive being checked.

Secondary: studio and agency users on the Business Intelligence side, who arrive through other routes.

## Brand personality

Three words, chosen as physical objects rather than adjectives: **audited, plain-spoken, unhurried**.

The brand's defining trait is what it *refuses* to say. The whole product is built so an unverified tax incentive cannot present itself as money in the bank: it shows £0 confirmed, states the illustrative figure separately, and names which requirement is unresolved. Competitors in adjacent categories sell certainty. Prodculator sells a number you can defend in a financing meeting, which sometimes means a number that is smaller and always means a number that is checkable.

That is the marketing. The honesty is not a caveat bolted onto the pitch; it *is* the pitch.

## Anti-references

Confirmed by the owner. All four are hard rejections:

1. **Generic AI SaaS landing page.** Eyebrow labels above every section, `01 / 02 / 03` numbered steps, three identical feature cards, a big-number stat row, a glowing gradient CTA. The supplied mockup does all five; it is the thing to move away from, not toward.
2. **Crypto / fintech dark-and-gold.** The sharpest constraint, because gold on near-black already *is* the identity. Gold must therefore stop behaving like luxury signalling — no glows, no gradients, no sheen — and start behaving like **data-ink**: it marks what has been verified, and nothing else. A visitor should be able to work out the rule without being told it.
3. **Hollywood glamour.** No film reels, clapperboards, spotlights, red carpet, dramatic serif. The customer works in film; they do not need the industry performed back at them.
4. **Enterprise consultancy.** No stock photography, no abstract corporate gradients, no synergy language.

## Aesthetic lane

Named reference: **a financial prospectus or an audit statement** — ruled, figure-led, comfortable with blank space where a figure is not available. Not a terminal, not a magazine.

Deliberately avoiding the *second-order* reflex too. Having rejected AI-SaaS, the next-most-likely landing spot is editorial-typographic (display italic serif, small tracked mono labels, ruled three-column restraint), which the brand register lists as saturated. This is not that: no display serif, no decorative rules, no magazine affectation. The document feeling comes from figure alignment, honest hierarchy and restraint with colour, not from typographic costume.

## Proof policy

Confirmed by the owner: **only verifiably true numbers**. Real dataset counts (49 incentive programmes, 28 territories, 177 festivals) are permitted because they can be checked against the database. No invented user counts, no fabricated testimonials, no "trusted by" logo wall, no review scores, until those things exist.

This is not modesty. A product whose entire pitch is "we do not assert what we cannot verify" cannot open with an unverifiable claim; the first invented number would undo the argument the rest of the page is making.

## Strategic design principles

1. **Show the artifact, do not describe it.** The strongest asset is a real fragment of a real report. A fabricated dashboard with invented scores (as in the mockup: "Top match 86") is both slop and, here, self-contradictory.
2. **Gold means verified.** One semantic job. Anything unconfirmed is rendered in muted ink with a dashed edge, exactly as the report renders it. The page teaches the product's own visual grammar before the visitor reaches the product.
3. **Sequence beats sections.** A cold visitor needs: what is this → why is coverage not enough → what do I get → can I trust it → what does it cost. Structure follows that argument rather than a template of interchangeable blocks.
4. **No scaffolding by reflex.** No eyebrow above every section. Numbers appear only where something genuinely is a sequence.
5. **Motion carries meaning or is absent.** The one animation worth having demonstrates the confirmed-versus-potential distinction. Decorative entrance animations on every block are the reflex to avoid.

## Accessibility

Body text ≥ 4.5:1 against its surface, in both themes. The existing tokens were already corrected for this (`textSecondary` and `textFaint` were brightened for exactly this reason). Both themes ship; the page must be built with tokens, never literal hex. Full `prefers-reduced-motion` alternative for any motion.
