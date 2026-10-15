-- 落 The closed-test copy is retired before the switch (decided 2026-10-15).
--
-- The decision on Season 0, The Founding 開山: the closed-test save does not stay. No
-- keepsake, no copy, no file, no restore (docs/SEASON0-THEME.md, 2d and 3). So the two things
-- 20261014130000_season0.sql and 20261014190000_closed_test_mine.sql added to keep it go,
-- before season_start(), because the trigger would otherwise begin copying rows into
-- saves.closed_test at 00:00 UTC on Monday 26 October:
--
--   saves_keep_closed_test   the trigger and its function. From now a season sync writes over
--                            a closed-test cloud copy like any other write, and moves nothing.
--   closed_test_mine()       the one door to that copy. No player reads it, ever.
--
-- What is said to players stays true: from the first second of the season nobody can read a
-- closed-test cultivator on the server (the sync's pullable() refuses it, and this takes the
-- only other door away), and it is deleted with Push B (docs/SEASON0-PUSHB-DRAFT.md).
--
-- The columns saves.closed_test and saves.closed_test_at stay, empty: nothing ever wrote to
-- them (the trigger only acted from the switch, and it never reached the live server), and
-- nothing reads or writes them from here on. The schema test holds that.
--
-- The evidence that someone walked the closed test is not the save: it is sync_log, which only
-- grows (20261015100100_forerunner.sql, is_forerunner()).
drop trigger if exists saves_keep_closed_test on public.saves;
drop function if exists public.saves_keep_closed_test();
drop function if exists public.closed_test_mine();
