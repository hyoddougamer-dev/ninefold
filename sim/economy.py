"""靜 The gathering side: realms, layers, and the qi curve.

Pure and event-driven. The simulator never ticks: it advances to the next moment something
actually happens (a layer opens, a day turns, a hunt is taken) and integrates the qi in
between in closed form. A fixed tick would accumulate error and, worse, would model a game
that counts frames — which §1 forbids outright.

The realm cost table is NOT in rules.py, because the bible does not contain one. Finding
that table is the first job this simulator exists to do, so a curve is passed in and
measured rather than assumed.
"""
from . import rules as R
from .channels import Channels


def layer_multiplier(realm, layer):
    """Total gathering multiplier from every layer opened so far, compounding at +2%."""
    return R.LAYER_STEP ** ((realm - 1) * R.LAYERS_PER_REALM + layer)


def ninth_realm_multiplier():
    """The bible publishes 4.97x, which is 1.02^81 — all NINE realms times nine layers.
    Reaching realm 9 only opens 72 of them (1.02^72 = 4.16x), so the published figure is
    only true if realm 9's own nine layers can be opened. They can: §2 says realm 9's bar
    "never completes and the tribulation is a state rather than a gate" — a bar that never
    completes can still fill. So realm 9 carries a finite cost like any other realm; what
    it lacks is a realm 10 on the far side. That also hands the end-game player the one
    thing the old build never had at the ceiling: something still moving."""
    return layer_multiplier(R.MAX_REALM, R.LAYERS_PER_REALM)


def geometric_costs(first, growth):
    """cost[realm] = qi to fill that realm's nine layers. Realm 9 is included: it has no
    EXIT, which is not the same as having no cost."""
    return {r: first * growth ** (r - 1) for r in range(1, R.MAX_REALM + 1)}


def flattened_costs(first, growth, tail_from, tail_growth):
    """The same curve with a gentler tail. Finding 1 was that the LAST steps swallowed the
    run; subdividing a curve never fixed a curve whose final step is the problem, so the
    honest lever is the final step itself."""
    out, c = {}, first
    for r in range(1, R.MAX_REALM + 1):
        out[r] = c
        c *= tail_growth if r >= tail_from else growth
    return out


class Cultivator:
    """One player's gathering state. Knows nothing about hunting; hunting spends from it."""

    def __init__(self, costs, base_rate=1.0):
        self.costs = costs
        self.base_rate = base_rate
        self.channels = Channels()
        self.realm = 1
        self.layer = 0          # layers opened INSIDE the current realm, 0..9
        self.qi = 0.0
        self.log = []           # (seconds, kind, detail) — every first-time event

    # ── rates and thresholds ────────────────────────────────────────────────
    @property
    def rate(self):
        """Qi per second, right now. Layers compound, and so do 經脈 channels — which is
        the only way an active player ends up gathering FASTER than an idle one rather
        than merely richer. §3's promise is unharmed: the idle player still walks the base
        curve to realm 9; the active player simply arrives sooner."""
        return (self.base_rate * layer_multiplier(self.realm, self.layer)
                * self.channels.multiplier)

    @property
    def layer_cost(self):
        """§2: a layer is the qi a realm needs, divided by nine."""
        if self.capped:
            return float("inf")
        return self.costs[self.realm] / R.LAYERS_PER_REALM

    @property
    def capped(self):
        """Realm 9, ninth layer: the ceiling, and the end of the v1 curve."""
        return self.realm >= R.MAX_REALM and self.layer >= R.LAYERS_PER_REALM

    @property
    def reached9(self):
        return self.realm >= R.MAX_REALM

    @property
    def done(self):
        return self.capped

    def seconds_to_next_layer(self):
        if self.done:
            return float("inf")
        need = self.layer_cost - self.qi
        return 0.0 if need <= 0 else need / self.rate

    # ── advancing ───────────────────────────────────────────────────────────
    def gather(self, seconds):
        self.qi += self.rate * seconds

    def open_layers(self, t):
        """Spend qi into as many layers as it covers. Returns the events it produced."""
        events = []
        while not self.capped and self.qi >= self.layer_cost:
            self.qi -= self.layer_cost
            self.layer += 1
            if self.layer >= R.LAYERS_PER_REALM and self.realm < R.MAX_REALM:
                self.realm += 1
                self.layer = 0
                events.append((t, "realm", self.realm))
                self.log.append((t, "realm", self.realm))
            else:
                events.append((t, "layer", (self.realm, self.layer)))
                self.log.append((t, "layer", (self.realm, self.layer)))
        return events

    def hunt_cost(self):
        """§4: a hunt costs half an hour of your OWN current rate — so the trade feels
        identical at realm 1 and realm 8."""
        return R.HUNT_COST_SECONDS * self.rate
