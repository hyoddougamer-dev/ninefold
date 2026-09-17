"""經脈 Channels — the loop that makes an active player permanently stronger.

This was in the bible from the start (§6, §9) and missing from the model, which is why
the first road comparison made hunting look like pure loss: it priced the qi a hunt costs
and never priced the 悟 insight a kill returns.

The shape of it: kills give insight, insight opens channels, a channel is a permanent
multiplier on gathering. So the 動 Motion player pays qi today and buys gathering rate
forever. That is the vertical progression — an active player does not merely hold more
stuff than an idle one, they eventually GATHER FASTER, which compounds into realms.

§3's promise survives because the idle player still reaches realm 9 on the base curve.
The active player gets there sooner. Nobody is blocked; the diligent are simply ahead.
"""
import math
from . import rules as R

COUNT = 12                 # §6: twelve of them
GAIN = 1.08                # each is +8% gathering, compounding — 1.08^12 = x2.52
FIRST_COST = 40.0          # insight for the first channel
COST_GROWTH = 1.55         # and each one costs more


def cost(n):
    """Insight to open the n-th channel, 1-based."""
    return FIRST_COST * COST_GROWTH ** (n - 1)


def total_cost(n):
    return sum(cost(i) for i in range(1, n + 1))


def multiplier(opened):
    return GAIN ** opened


class Channels:
    def __init__(self):
        self.opened = 0
        self.insight = 0.0

    def earn(self, amount):
        self.insight += amount

    def spend(self):
        """Open every channel the banked insight covers. Returns how many opened."""
        n = 0
        while self.opened < COUNT and self.insight >= cost(self.opened + 1):
            self.insight -= cost(self.opened + 1)
            self.opened += 1
            n += 1
        return n

    @property
    def multiplier(self):
        return GAIN ** self.opened
