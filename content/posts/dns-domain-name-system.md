---
title: DNS (Domain Name System)
draft: false
date: 2026-10-26
description: How a domain name becomes an IP address, and why DNS is really a hierarchy of delegations and caches with a TTL attached.
categories:
  - tech
  - system-design
tags:
  - tech
  - system-design
  - architecture
Author: Ahmad Hassan
---
![Hand-drawn DNS resolution path from browser through recursive resolver, root, TLD and authoritative servers, with record types and a TTL timeline](/posts/assets/system-design/dns.webp)

Let's talk about DNS.

Most people learn it as the phone book of the internet. You look up a name, you get a number. That metaphor is true and useless. A phone book is one book, owned by one company, updated on a schedule. DNS is a few million servers that have never met. They agree on who answers for which name.

So start where the user starts. You type ahmadx.dev and press enter. Your browser has no idea where that is. It has a name. The network only understands addresses.

Ask the uncomfortable question. Who tells the browser where to go? And who decided that server has the right to answer?

Now look at the image. Top panel, left to right.

Step one is your browser. More precisely, its stub resolver: the thin client on your machine. It knows almost nothing. Its only job is to hand the question to someone who does.

Step two is that someone. The recursive resolver. Your ISP runs one. So does Google at 8.8.8.8, and Cloudflare at 1.1.1.1. This is the only component in the picture doing real work, and it is the one you never see.

Step three is a root server. The root zone is tiny. It does not know where ahmadx.dev lives. It knows which servers are responsible for .dev, and it says so.

Step four is a TLD server. Run by the registry that owns .dev. It also does not know your address. It knows which nameservers are authoritative for ahmadx.dev.

Step five is the authoritative nameserver. Yours might be your registrar, your DNS host, or a cloud provider. This is the only server that can actually answer. It returns the record. In my case, an A record pointing at 216.198.79.1, with a TTL of 1800 seconds.

Now notice what steps three and four did. They did not answer. They referred. Each handed back a smaller question, not a result, and the resolver followed the chain.

That is the whole architecture: a hierarchy of delegation, with one willing worker at the top of the tree doing the walking.

Bottom left panel. Recursive versus iterative.

Recursive is the contract between you and the resolver: ask once, get a final answer or an error. Iterative is the contract between the resolver and everyone else: each authority hands back a referral, and the resolver keeps asking.

Get these two backwards and half of DNS stops making sense.

Bottom middle panel. Record types.

An A record is an IPv4 address. AAAA is IPv6. CNAME says this name is an alias for that name, so the resolver chases it again. MX says where mail goes, and carries a priority. TXT carries arbitrary text, which is why SPF, DKIM and domain verification all live there. NS says who is authoritative for a zone, and the whole delegation chain hangs from it.

One name, many records. The type decides the meaning.

There is one trap at the apex: you cannot put a CNAME there. ahmadx.dev cannot be an alias, only www.ahmadx.dev can. The apex needs NS and SOA records, and a CNAME would collide with them.

Bottom right panel. TTL.

An answer is a lease, not a fact. When the authoritative server replies, it attaches a number of seconds. Every resolver in the chain may keep that answer for exactly that long, then must ask again.

This is why "DNS propagation" is a misleading phrase. Nothing propagates. Old answers simply expire at different times on different caches. Your record changed in one second. The world catches up over one TTL.

Which gives you a practical rule: lower the TTL before a migration, and do it a full old-TTL ahead of the change. Otherwise you sit there for a day waiting on a cache you cannot reach, arguing with a customer who can.

But do not romanticize DNS either. It is not a load balancer. Round robin A records look like balancing until a client caches one address and never moves. It is not a failover mechanism either: health checks at the authoritative server only help clients that ask again. And every shortcut you take with TTL, you pay for in query volume at the exact moment your servers are least able to take it.

There is also a layer most people skip. DNSSEC signs records so a resolver can check the answer came from the zone that owns it. It does not encrypt anything. Anyone on the path still sees which names you ask for.

So here is the mental model: DNS is a distributed cache with a slow, hierarchical way of filling itself. Delegation decides who may answer. TTL decides how long anyone believes it.

Let me leave you with one question. The next time a record change "takes time to propagate" in your team, do you know which cache is still holding the old answer? If not, you are debugging by waiting.

Happy designing 🖤
