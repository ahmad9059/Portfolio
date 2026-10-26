# Mode: AWS certification notes

Modelled on the 18 `aws-ccp-*` posts. The densest mode on the site.

**Target: 1,500–6,500 words. Heading-heavy. Very bold-heavy. Bullets over prose.**

These are study notes cleaned up for publishing, not essays. The reader is revising for an exam and scanning for facts. Optimise for scanability and completeness, not flow.

## Structure

Open with one `##` heading that names the topic, not with an introduction. There is no intro paragraph, no "in this article we will", no thesis. The first thing after the front matter is a heading.

```
## AWS Organizations
...
## Amazon S3
...
```

Then every sub-topic gets its own heading. The measured density is extreme and it is intentional:

| Post | Words | `##` | `###` | Bold runs | Bullets |
|---|---|---|---|---|---|
| `aws-ccp-vpc-networking` | 3,356 | 11 | 63 | 884 | 161 |
| `aws-ccp-security-compliance` | 6,567 | 18 | 132 | 1,606 | 251 |
| `aws-ccp-iam-identity-and-access-management` | 2,544 | 13 | 52 | 350 | 141 |

Roughly one heading per 40 words and one bold run per 4 words. That ratio is the format. A paragraph of clean flowing prose with no bold is off-format here.

## Bullet and emphasis conventions

- `-` for unordered bullets. `1.` for sequences and counts.
- Bold the **term**, not the sentence: `- **S3 Standard**: frequently accessed data`. Bold covers the noun and its expansion, never a full clause.
- Bold also marks exam-critical factoids inside otherwise plain bullets.
- Tables for anything with two or more compared dimensions. The corpus uses pipe tables with bold header cells: `|**Feature**|**Description**|`.
- `---` horizontal rules between major blocks. 13–19 per post is normal.
- Emoji used as semantic markers, sparingly and consistently: ✅ for supported/good, ❌ for not supported/bad, ⚠️ for caveats, 👉 for emphasis, 🔑 for key facts. Do not invent new ones.
- Code fences only for genuine CLI or config (`aws s3 ls`, IAM policy JSON). Not for pseudo-code.

## Heading style

Headings are short noun phrases, sometimes with the expansion in parentheses:

```
### Amazon WorkSpaces (Managed Desktop as a Service – DaaS)
## EC2 Storage – EBS Volumes
### IAM (Identity and Access Management)
```

Occasional `---` immediately after a heading (`## VPC & Networking (Overview)` then `---`) — that is a quirk of the source notes. It is harmless; do not add it unless you are matching an existing post's local style.

## Facts first

Every bullet should carry a fact, a number, a limit, or a distinction. The exam-relevant details are the whole value:

- Hard limits (`S3 object max 5 TB`)
- Scope (`IAM is global`, `EC2 is regional`)
- Defaults and their exceptions
- The distinction the exam loves (`Security Group is stateful, NACL is stateless`)

Where the source notes use a memory hook, keep that instinct. `Think **npm registry** but inside AWS.` `Think of it as a central nervous system.` Analogies are how this mode stays readable at 6,000 words.

## Closing

No sign-off line. AWS posts end on their last substantive section. Several simply end with the final diagram image.

## Anti-patterns

- ❌ Long undifferentiated paragraphs
- ❌ An introduction or conclusion section
- ❌ Bold spanning a whole sentence
- ❌ `Happy designing 🖤` — that belongs to system design only
- ❌ Explaining a concept without also giving the limit, default, or exam distinction
- ❌ Padding to hit a word count. If the topic is thin (`aws-ccp-other-services` is 1,379 words and fine), let it be thin.
