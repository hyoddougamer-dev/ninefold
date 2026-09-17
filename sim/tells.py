"""兆 The tells — what a beast shows you before you pick a stance.

The obvious design is eighteen beasts each with one right answer, and it is wrong: that is
eighteen things to memorise, correct forever after day one, and dead as a decision.

So the tell belongs to the VOCABULARY, not to the beast. Nine tells, three per stance. A
player learns nine things once and can then read a beast they have never seen — which is
the difference between a skill and a lookup table. Each beast draws from its own handful,
so beasts still have character: a beetle braces, a tiger enrages, a hare bolts.

One tell per stance is a "signature" — the one that beast shows most often — which is what
lets a player build a read on a specific beast without the read ever being automatic.
"""

# 兆 the nine, three to a stance
TELLS = {
    # 進 press — it is committed, or spent, and cannot answer you
    "撲": ("Lunge",   "進", "it drops already committed; a committed beast cannot turn"),
    "露": ("Open",    "進", "its guard hangs wide for a beat"),
    "竭": ("Spent",   "進", "its flanks heave — it has nothing left this exchange"),
    # 守 guard — something is coming and you want to be behind it
    "蓄": ("Gather",  "守", "it draws breath and winds back"),
    "盤": ("Coil",    "守", "it draws in and tightens, all tension"),
    "鳴": ("Cry",     "守", "the call that always comes just before the blow"),
    # 遁 withdraw — you cannot take what is about to happen
    "怒": ("Rage",    "遁", "its eyes change; the next blow is not one you absorb"),
    "召": ("Call",    "遁", "it is bringing others, and others is not a fight"),
    "化": ("Shift",   "遁", "it becomes something else — whatever you prepared is wrong"),
}

STANCES = {"進": ("Press", "step into it"),
           "守": ("Guard", "take it on the plates"),
           "遁": ("Withdraw", "break off and give ground")}

# Which tells each beast draws from. The FIRST is its signature — the one it shows most.
# Signatures are held at six per stance. They started at 3 / 7 / 8 and a player meeting
# mostly 遁-signature beasts would simply learn that Withdraw is usually right, which is
# the habit the vocabulary exists to prevent.
BEAST_TELLS = {
    "shrike":  ("撲", ["撲", "露", "鳴"]),
    "hare":    ("竭", ["竭", "撲", "召"]),
    "beetle":  ("盤", ["盤", "蓄", "露"]),
    "crane":   ("鳴", ["鳴", "露", "化"]),
    "toad":    ("蓄", ["蓄", "竭", "召"]),
    "serpent": ("盤", ["盤", "撲", "怒"]),
    "fox":     ("化", ["化", "露", "召"]),
    "moth":    ("竭", ["竭", "召", "化"]),
    "ape":     ("露", ["露", "怒", "蓄"]),
    "lynx":    ("撲", ["撲", "盤", "竭"]),
    "tiger":   ("怒", ["怒", "撲", "蓄"]),
    "boar":    ("蓄", ["蓄", "撲", "竭"]),
    "roc":     ("撲", ["撲", "鳴", "怒"]),
    "drake":   ("化", ["化", "盤", "召"]),
    "turtle":  ("盤", ["盤", "蓄", "竭"]),
    "qilin":   ("怒", ["怒", "化", "鳴"]),
    "wraith":  ("化", ["化", "召", "露"]),
    "hydra":   ("召", ["召", "怒", "盤"]),
}


def answer(tell):
    return TELLS[tell][1]


def coverage():
    """Every stance must be the right answer often enough to stay live. If one stance were
    correct 60% of the time the read would collapse into a habit."""
    from collections import Counter
    c = Counter()
    for sig, pool in BEAST_TELLS.values():
        for t in pool:
            c[answer(t)] += 1
    total = sum(c.values())
    return {k: v / total for k, v in c.items()}


def signature_spread():
    from collections import Counter
    return Counter(answer(sig) for sig, _ in BEAST_TELLS.values())
