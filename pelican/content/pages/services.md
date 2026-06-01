Title: Services
Slug: services
Status: published
Summary: Independent AI advisory from Crow Intelligence — technical due diligence for venture funds, adoption audits for stalled internal AI tools, and visualisation commissions.
Og_image: /images/social-preview/due-diligence.png

We are an independent research and advisory practice working at the
intersection of language, cognition, and data. Our work is the part that
engineering alone does not cover: what to build, whether it is working,
and what the results actually mean. Three engagements make that concrete.

## AI & NLP Due Diligence {: #due-diligence }

Most venture funds in Central Europe have finance and investment people on
the team, not AI engineers. When the deal is an AI or NLP startup, that gap
matters more than it used to. The distance between *uses AI* and *has AI*
has widened sharply in the last two years. A founder can integrate an LLM
API in a weekend; building something defensible takes longer and looks
different. We help investors tell the two apart.

We work with early-stage funds in Central Europe and the partners who back
them.

### What we look for

We work through a written checklist that adapts to the target company. The
questions we keep returning to, in roughly the order they matter:

- Is the product a real system or a wrapper around someone else's API?
  What happens to the company if pricing or terms change at the upstream
  provider?
- Where does the training and evaluation data come from — is it licensed,
  scraped, user-generated, synthetic? Is the licensing defensible under
  the EU AI Act?
- How is the model evaluated? Is there a held-out test set, a real
  evaluation harness, regression tracking? Or is *"it looks good in
  demos"* the standard?
- What happens at scale — inference cost trajectory, latency under load,
  accuracy degradation on out-of-distribution input, cold-start exposure?
- Who owns the IP? Have contractor and freelancer assignments been done
  correctly? This matters more in Central Europe than in most regions,
  where distributed teams are the norm.
- How deep is the team? Is there a single person who would take the
  technology with them if they left? Are the founders complementary, or
  do they all have the same gap?
- Where does the company sit under the EU AI Act — high-risk,
  limited-risk, prohibited? Is the documentation in place?
- For LLM-based systems specifically: prompt injection exposure, RAG
  evaluation quality, hallucination rate, guardrails, observability.

The full checklist is published openly. See below.

### How we work

Three formats, depending on stage and ticket size.

**Red-flag review.** One to three days. A focused look at the most
failure-prone parts of the technology. Used for early conviction calls,
or when you have a deadline. Delivered as a short memo with red, amber,
or green flags by category, and a verbal debrief with the partner on the
deal.

**Standard AI due diligence.** Five to ten days. Includes founder and
engineering interviews, architecture review, model evaluation methodology
audit, data and IP review, team assessment. Delivered as a structured
report with an executive summary and a 100-day remediation plan.

**Deep AI due diligence.** Two to four weeks. For Series A and later,
where code review, MLOps inspection, and a full data licensing audit are
warranted. Delivered as a long-form report suitable for investment
committee presentation.

### What you get

A written report, formatted for an investment committee, with an executive
summary on page one — red, amber, or green by category — and the
underlying analysis behind it. A verbal debrief with the partner on the
deal. Written follow-up answers to any questions the IC raises. A 100-day
remediation plan if you choose to invest, structured so the founders can
act on it without further interpretation.

### Our open due-diligence checklist

The full checklist we work from is published openly on GitHub. You can use
it directly, fork it for your own process, or send it to your portfolio
companies as a self-assessment.

<p><a href="https://github.com/crow-intelligence/ai-dd-checklist">github.com/crow-intelligence/ai-dd-checklist</a> <!-- TODO: provisional URL — update once the repo exists --></p>

*Looking at an internal AI deployment rather than an external investment?
See [The AI Adoption Audit](#ai-adoption).*

## The AI Adoption Audit {: #ai-adoption }

Most internal AI tools fail for *human* reasons — not technical ones.

We audit the AI tools that have stalled inside your organisation: we find
why your people aren't using them, and set out precisely what to change.

### You shipped the tool. The adoption never came.

It demonstrated well. The pilot was promising. Then, a few months after
launch, the usage curve flattened — and quietly fell.

The retrieval assistant your team built is technically sound, yet people
drift back to the old way of working. The internal copilot is open in
nobody's browser. The investment is spent; the behaviour never changed.

This is not a rare outcome. MIT's 2025 study of enterprise AI deployments
found that roughly **95% of pilots delivered no measurable return** to the
bottom line. And the fault lies somewhere most teams do not look: research
attributes around three-quarters of these failures to organisational and
human factors — not to the model, the data, or the engineering.

> The model usually works. It is the integration between the model and the
> people meant to use it that breaks.

### The automation trap

Most AI integration fails in a predictable way. Three patterns recur — and
each is a cognitive problem wearing a technical disguise.

- **Replacement instead of support.** Tools are built to take over a
  workflow rather than to strengthen it. People resist being automated;
  they adopt what makes them more capable.
- **The prompting tax.** Every interaction asks the user to do the work
  of phrasing, framing, and re-asking. The effort accumulates into
  fatigue — and fatigue into abandonment.
- **Trust was never designed in.** A tool that is confidently wrong once,
  with no way to see why, loses the user permanently. Trust is a property
  you engineer, not one you hope for.

### A fixed-scope engagement

Typically two to four weeks, examining your stalled tool across both
layers at once.

- **The data and retrieval layer.** Whether your search and RAG
  architecture actually surfaces the right material, at the right moment,
  in a form the user can act on.
- **The cognitive layer.** How the tool meets the way people genuinely
  think, remember, decide, and build confidence in an instrument.

Most technical reviews inspect one layer. Most design reviews inspect the
other. The failure almost always lives in the seam between them — which is
the seam we are built to examine.

### Cognitive science, translated into engineering

We draw on peer-reviewed cognitive science — how people offload memory
onto their tools, how they think *with* an instrument rather than merely
operating it, how trust in a system is formed and lost — and we translate
it into concrete product and architecture decisions.

> An AI tool that scaffolds a person's working memory and judgement gets
> used. One that asks to replace it does not.

This is a particular combination of expertise. Crow Intelligence was
founded by a team that has built and exited a regulatory-technology
company — Complytron, acquired by SEON — led enterprise search and data
teams, and holds a doctorate in cognitive linguistics.

Deep data architecture on one side; the science of human cognition on
the other. Few teams sit on both sides of that seam — and the seam is
exactly where adoption is won or lost.

### Clarity, and a plan you can sequence

- **A diagnostic report.** Where adoption is breaking, and why — set out
  in plain language, not jargon.
- **A prioritised set of changes.** Each ranked by likely impact against
  the effort to make it, so the order of work is clear before you spend
  on it.
- **A working session with your team.** To walk through the findings and
  the reasoning behind them.

We are not here to sell you a platform, or to rebuild your stack by
default. The deliverable is clarity and a sequenced plan. Some clients
take it from there themselves; others ask us to stay for the next step.
Both are good outcomes.

### Who the audit is for

- **Scale-ups losing the users they won.** Where an AI feature has
  shipped, but is not retaining the people it was meant to serve.
- **Enterprise innovation teams.** In banking, pharmaceuticals, or
  telecommunications — facing internal resistance to an AI tool they
  were asked to roll out.

It is **not** the right engagement for teams still at the open
exploration stage, or for those looking for a vendor to build a system
from scratch. The audit is for tools that already exist and are not
landing.

*Evaluating an AI startup as an investor, rather than an internal tool?
See [AI & NLP Due Diligence](#due-diligence).*

## Commission a viz/story {: #commission }

We also take on visualisation and visual-storytelling commissions. The
Aporia essays and the interactive projects on this site are built with our
own open-source tools; the same craft is available to organisations with a
dataset, a finding, or an argument that deserves to be seen rather than
summarised.

A commission might be a single interactive chart, a scrollable data essay,
or a standalone microsite. We handle the analysis, the design, and the
build — and we are candid early about what the data can and cannot
support.

If you have something in mind, or only a dataset and a question, we would
like to hear about it.

## Begin with a conversation

A short call to understand your situation, and to tell you honestly whether
we can help. No charge, and no pitch — if it is not the right fit, we will
say so.

<p><a href="https://cal.com/zoltan-varju-h4s0aq/15min" target="_blank" rel="noopener" class="btn btn-accent">Book a 15-min call</a> <a href="/contact.html" class="btn btn-secondary">Send a message</a></p>

Or write to [hello@crowintelligence.org](mailto:hello@crowintelligence.org).

<script type="application/ld+json">
[
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "AI & NLP Due Diligence",
    "serviceType": "Technical due diligence",
    "description": "Independent technical due diligence on AI and NLP startups for early-stage venture funds in Central Europe. Covers technology, data, IP, team, and EU AI Act readiness.",
    "url": "https://crowintelligence.org/services.html#due-diligence",
    "provider": {
      "@type": "Organization",
      "name": "Crow Intelligence",
      "url": "https://crowintelligence.org/",
      "email": "hello@crowintelligence.org"
    },
    "areaServed": {
      "@type": "Place",
      "name": "Central Europe"
    },
    "audience": {
      "@type": "BusinessAudience",
      "audienceType": "Early-stage venture capital funds"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "AI Due Diligence Engagement Formats",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Red-flag review",
            "description": "One to three days. Focused look at the most failure-prone parts of the technology. Short memo with red/amber/green flags by category, plus a verbal debrief with the deal partner."
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Standard AI due diligence",
            "description": "Five to ten days. Founder and engineering interviews, architecture review, model evaluation methodology audit, data and IP review, team assessment. Delivered as a structured report with executive summary and 100-day remediation plan."
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Deep AI due diligence",
            "description": "Two to four weeks. For Series A and later. Includes code review, MLOps inspection, full data licensing audit. Long-form report suitable for investment committee presentation."
          }
        }
      ]
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "The AI Adoption Audit",
    "serviceType": "AI adoption diagnostic",
    "description": "A fixed-scope diagnostic that finds why an internal AI tool has stalled — examining the data and retrieval layer alongside the cognitive layer — and sets out a prioritised plan of what to change.",
    "url": "https://crowintelligence.org/services.html#ai-adoption",
    "provider": {
      "@type": "Organization",
      "name": "Crow Intelligence",
      "url": "https://crowintelligence.org/",
      "email": "hello@crowintelligence.org"
    },
    "audience": {
      "@type": "BusinessAudience",
      "audienceType": "Scale-ups and enterprise innovation teams"
    }
  }
]
</script>
