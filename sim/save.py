"""存 The save file, and the only piece of code that may look at a clock.

The rule the whole design rests on (§1): *progress is computed from timestamps and never
from frames.* The consequence, and it is the good kind: **there is no "offline mode".**
There is one operation — *advance the simulation by N seconds* — and closing the app for
fourteen hours is the same call as leaving it open for fourteen hours. Online and offline
cannot drift apart because they are not two code paths.

That property is worth more than it looks. Every idle game that ever shipped a bug where
closing the app paid differently from leaving it open had two code paths.

What this file does NOT do is stop a determined cheat. Without a server there is no
trustworthy clock, and pretending otherwise would be the worst kind of security: the kind
that looks like it works. What it does instead is (a) never *reward* a clock that moves
backwards, (b) record enough that a server can validate the whole history later, and
(c) keep the shape of the save stable so adding that server needs no migration.
"""
import hashlib
import json

SCHEMA = 1

# Advancing time in one step must equal advancing it in many. The simulation is
# event-driven, so this holds by construction — but it is asserted in the tests, because
# "it holds by construction" is what everyone says right before it stops holding.
MAX_STEP = 3600.0 * 24 * 400      # a sanity ceiling, not a game rule


def _canon(state):
    """Stable bytes for a state, so the digest does not change with dict ordering."""
    return json.dumps(state, sort_keys=True, separators=(",", ":")).encode()


def sign(state, secret=b"ninefold"):
    return hashlib.blake2b(_canon(state) + secret, digest_size=16).hexdigest()


def encode(c, *, now, elapsed, day_no, hunts_today, best_depth=0, secret=b"ninefold"):
    """`c` is a Cultivator. Keys are short because this is written on every app pause."""
    body = {
        "v": SCHEMA,
        "t": int(now),              # wall clock at save — advisory, never trusted alone
        "e": round(elapsed, 3),     # total seconds ever CREDITED. Only ever grows.
        "r": c.realm, "l": c.layer,
        "q": round(c.qi, 6),
        "ch": {"o": c.channels.opened, "i": round(c.channels.insight, 4)},
        "d": {"n": day_no, "h": hunts_today, "best": best_depth},
    }
    body["sig"] = sign(body, secret)
    return body


def verify(body, secret=b"ninefold"):
    """True if the blob has not been hand-edited. Best effort on a device we do not own."""
    if not isinstance(body, dict) or "sig" not in body:
        return False
    claimed = body["sig"]
    rest = {k: v for k, v in body.items() if k != "sig"}
    return sign(rest, secret) == claimed


class Clock:
    """What a save is allowed to conclude from the device clock.

    Three cases, and each is a deliberate choice rather than an accident:

      forwards, plausibly   credit it. This is the normal case and the design WANTS it
                            uncapped: §3 promises gathering runs while the app is closed,
                            and a cap would punish exactly the player the game is balanced
                            around. Come back after a month and a month is what you get.

      backwards             credit NOTHING and move the reference forward. Never punish —
                            a phone that crossed a timezone or fixed its NTP drift is not
                            a cheat — but never pay for it either.

      forwards, absurdly    credit it, and FLAG it. The flag is what a server checks later.
                            Refusing it locally would break honest players whose clock was
                            wrong, and would not stop a dishonest one anyway.
    """

    ABSURD = 3600.0 * 24 * 90      # ninety days between opens is worth a second look

    def __init__(self, last_seen, elapsed=0.0):
        self.last_seen = float(last_seen)
        self.elapsed = float(elapsed)
        self.flags = []

    def tick(self, now):
        """Returns the seconds the game may credit for the span ending at `now`."""
        dt = float(now) - self.last_seen
        if dt < 0:
            self.flags.append(("backwards", -dt))
            self.last_seen = float(now)
            return 0.0
        if dt > self.ABSURD:
            self.flags.append(("absurd", dt))
        self.last_seen = float(now)
        self.elapsed += dt
        return dt
