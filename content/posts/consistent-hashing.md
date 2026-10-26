---
title: Consistent Hashing
draft: false
date: 2026-10-26
description: How consistent hashing keeps a distributed cache stable when nodes join or leave.
categories:
  - tech
  - system-design
tags:
  - tech
  - system-design
  - architecture
Author: Ahmad Hassan
---
![Hand-drawn ring of nodes and keys showing the clockwise walk, the arc a fifth node takes over, and virtual nodes for balance](/posts/assets/system-design/consistent-hashing.webp)

Let's talk about consistent hashing.

Imagine you are running a cache cluster. Four nodes. Your application needs to know which node holds a given key, so it hashes the key and takes the remainder. Key hash modulo four. Node zero, node one, node two, node three. Everyone gets a home.

This works perfectly, right up until you add a fifth node.

Now every key recalculates. Modulo five instead of modulo four. Almost every key maps somewhere new. The cache goes cold in one breath, and your database takes the entire load at once. That is the problem consistent hashing exists to solve.

The naive approach asks a question that changes its own answer. Node count is an input to the hash. Change the node count and you invalidate the mapping.

Consistent hashing removes the node count from the equation entirely.

Picture a ring instead of a list. Take the hash space and wrap it into a circle, so the largest possible hash sits right next to zero. Now place each node somewhere on that circle, at its own hash position.

To find where a key belongs, hash the key and walk clockwise until you hit a node. Whatever you land on, that is the owner.

The image shows this. On the right, four nodes on a ring. Six keys scattered between them. One dashed box where a fifth node would land. Look at what that box touches: one arc, the stretch between N1 and N2. Only the keys inside that arc change hands. Add the node and k1 moves to N5. k2 through k6 do not move at all.

On the left, the numbers. Ten keys, then the same ten after the fifth node joins. With a modulo, eight of them land somewhere new. On the ring, two.

Now add a node. It lands somewhere on the ring and takes responsibility for the arc between it and the node behind it. Only the keys in that arc move. Everything else stays exactly where it was. Add a fifth node to a four node cluster and roughly one fifth of your keys relocate.

Not nearly all of them.

That is the whole idea. Moving one thing changes one thing.

But this simple ring has an uncomfortable property. Nodes are not evenly spaced. If node two lands right next to node three, node three owns a tiny sliver of the keyspace and node one owns a huge one. That is not load balancing. That is a lottery you only realize you lost after the traffic arrives.

The standard fix is virtual nodes. Instead of placing each physical node once, place it many times, at many hash positions. Node one becomes node one a hundred and fifty places around the ring. Now the arc sizes average out, and each machine ends up owning roughly its fair share.

The randomness that was a liability becomes a tool. With enough virtual nodes it follows the law of large numbers instead of the roll of a die.

Let's ground this with intuition.

Think of a taxi rank where each driver owns a stretch of road. Add a new driver and they take over a slice that used to belong to whoever was next to them. Every other driver's stretch stays the same. Now imagine a rank where every driver renegotiates with everyone the moment a new car arrives.

Same road. Very different morning.

Now think about failure. When a node dies, its arc passes to the next node clockwise. Only that arc is affected. The cluster degrades by one node's worth of capacity instead of collapsing. That matters at three in the morning far more than it matters in a design review.

So what does this cost you?

It does not give you perfect balance, only approximate balance, and the approximation depends on your virtual node count and your hash function. Adding a node is cheaper for the cache but still not free, because that one arc's worth of keys goes cold. And the rebalance happens at the moment you can least afford it.

That is why production systems often add a node and let it warm up slowly instead of rebroadcasting everything immediately.

This is also why the technique shows up where a cache miss is expensive and a rebalance is worse. Redis Cluster splits the keyspace into fixed slots rather than a ring, then moves slots between nodes. Same instinct, smaller blast radius. Cassandra uses the ring with virtual nodes more or less as described. CDNs use it to decide which edge server owns which object.

Different implementations. One question: how do we move as little as possible when the topology changes?

The real insight is not the ring. The ring is just bookkeeping. The insight is that any mapping which depends on the total number of members will break every time the membership changes. Remove that dependency and the system becomes something you can resize while it is running.

So ask yourself the next time you write a sharding function. Does this key's destination depend on how many machines we have today?

If yes, you have built the modulo problem. You will meet it the first time you scale.

Happy designing 🖤
