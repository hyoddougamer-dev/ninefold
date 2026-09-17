# sim — the measuring instrument

Pure Python. No engine, no art, no UI, no clock. Progress is a function of elapsed
seconds, because the app is closed twenty-three hours in twenty-four (GDD §1), and the
model steps to each event rather than ticking, so no fixed-step error accumulates.

```
python3 -m sim.report            every number the bible claims, recomputed
python3 -m sim.tests.test_rules  pins them; fails if the doc and the model drift
```

| file | what it holds |
|---|---|
| `rules.py` | every constant, each carrying its GDD section |
| `economy.py` | realms, layers, the qi curve, the cost table |
| `hunting.py` | `h(n)`, the hunt price, a day's haul |
| `player.py` | the two roads as policies |
| `tune.py` | calibration and the searches that produced the curve |
| `report.py` | the printout |

It is written to port to GDScript unchanged: no comprehension does anything a `for` loop
could not, and nothing imports anything outside the standard library.
