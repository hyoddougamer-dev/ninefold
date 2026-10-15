# 開山 The Founding · the trailer voice

*Updated 15 Oct 2026 for trailer v6 and Bruno's decisions of that day (docs/SEASON0-THEME.md, section 4). The season is Season 0 · The Founding 開山; 落印 the seal still falls once in the trailer, on the closed test.*

## Resumo (para o Bruno)

- **Três frases novas, as outras seis ficam.** A 4 e a 8 são substituídas e entra uma 9 (o Cliff of Names). As frases 1, 2, 3, 5, 6 e 7 mantêm as gravações que já existem: não se gravam outra vez.
- **A antiga frase 4 foi retirada** porque prometia uma cópia guardada ("原封不动，由你珍藏"), e decidiste que o save do closed test não fica.
- **A nova 4 diz a verdade:** o teste acabou, a progressão não passa, quem veio primeiro é lembrado (先行). A **9** diz que os primeiros a passar cada portão ficam gravados no penhasco para sempre. A **8** passa de 落印 para 开山.
- **Como gravar:** `tools/voice/lines.json` já tem as três frases novas. Um push para o branch de trabalho corre o `voice.yml`, que volta a ler as nove; ficamos só com a 4, a 8 e a 9 dessa corrida. O `vo.sh` do trailer precisa de uma nona janela.
- **Nos créditos** continua a linha a dizer que a voz do trailer foi feita com IA (ElevenLabs, e "elevenlabs.io" no título do vídeo).

## The lines

Nine short lines, timed to the shots of trailer v6 (about 60 s). Simplified characters are what the voice tool reads best; the traditional line is the same text in the game's own script. The English line is the subtitle that shows while it is spoken. In the trailer they are heard in the order **1, 2, 3, 4, 5, 9, 6, 7, 8**: line 9 was added last, so it keeps its number and plays between 5 and 6.

| # | Starts at | Mandarin (simplified, give this to the tool) | Traditional | Pinyin | English subtitle |
|---|---|---|---|---|---|
| 1 | 0.8 s (speech 2.9 s) | 九重境界，一场试炼。 | 九重境界，一場試煉。 | Jiǔ chóng jìngjiè, yì chǎng shìliàn. | Nine realms. One closed test. |
| 2 | 4.4 s (4.7 s) | 你亲手栽培的每一位修士，都曾在此一步步登攀。 | 你親手栽培的每一位修士，都曾在此一步步登攀。 | Nǐ qīnshǒu zāipéi de měi yí wèi xiūshì, dōu céng zài cǐ yí bù bù dēngpān. | Every cultivator you raised. |
| 3 | 9.7 s (2.6 s) | 此印，只落一次。 | 此印，只落一次。 | Cǐ yìn, zhǐ luò yí cì. | The seal falls once. |
| | 13.0 s | (no voice: the seal hits) | | | |
| **4 (new)** | 17.3 s (about 4.6 to 4.9 s) | 试炼已毕，修为不留。先行之人，永记其名。 | 試煉已畢，修為不留。先行之人，永記其名。 | Shìliàn yǐ bì, xiūwéi bù liú. Xiānxíng zhī rén, yǒng jì qí míng. | The closed test is over. Nothing carries over. Those who came first are remembered, for good. |
| ~~4 (old, replaced 15 Oct 2026)~~ | | ~~试炼就此封存。你的修士，原封不动，由你珍藏。~~ | ~~試煉就此封存。你的修士，原封不動，由你珍藏。~~ | ~~Shìliàn jiùcǐ fēngcún. Nǐ de xiūshì, yuánfēng bú dòng, yóu nǐ zhēncáng.~~ | ~~The closed test is sealed and kept. Your cultivator is kept as a copy you can save.~~ |
| 5 | 22.6 s (4.45 s) | 新卷铺开。众生平等，皆从第一境起步。 | 新卷鋪開。眾生平等，皆從第一境起步。 | Xīn juàn pūkāi. Zhòngshēng píngděng, jiē cóng dì yī jìng qǐbù. | A new scroll. Everyone starts equal, in realm 1. |
| **9 (new)** | 40.6 s (about 4.4 s) | 率先破关者，名刻山崖，永不磨灭。 | 率先破關者，名刻山崖，永不磨滅。 | Shuàixiān pò guān zhě, míng kè shānyá, yǒng bù mómiè. | The first through each gate are carved on the Cliff, for ever. |
| 6 | 45.7 s (4.1 s) | 新榜虚位以待。名次皆验，全凭实力。 | 新榜虛位以待。名次皆驗，全憑實力。 | Xīn bǎng xū wèi yǐ dài. Míngcì jiē yàn, quán píng shílì. | The boards start empty. Every rank is checked for fair play. |
| 7 | 50.1 s (4.85 s) | 这是最后一次重来。从此，画卷永不抹去。 | 這是最後一次重來。從此，畫卷永不抹去。 | Zhè shì zuìhòu yí cì chónglái. Cóngcǐ, huàjuàn yǒng bù mǒqù. | This is the last wipe. Nothing will be painted over again. |
| **8 (new)** | 55.4 s (about 3.4 s) | 九境。开山。第零赛季。 | 九境。開山。第零賽季。 | Jiǔjìng. Kāishān. Dì líng sàijì. | Ninefold · The Founding 開山 · Season 0 |
| ~~8 (old, replaced 15 Oct 2026)~~ | | ~~九境。落印。第零赛季。~~ | ~~九境。落印。第零賽季。~~ | ~~Jiǔjìng. Luò yìn. Dì líng sàijì.~~ | ~~The Seal Falls 落印 · Season 0~~ |

What each line means, word for word, so nothing is lost in the subtitle:
1. "Nine layered realms, one trial."
2. "Every cultivator you raised with your own hands once climbed here, step by step." (栽培 is the word a master uses for raising a disciple.)
3. "This seal falls only once." (此印 gives the whispered word a second syllable, so it is heard.)
4. **(new)** "The trial is finished; cultivation does not stay. Those who went first: their names remembered for ever." 修为不留 echoes 片甲不留 ("not a scrap left"), which is stark, but it is exactly "nothing carries over". 先行之人 is "those who went first", not 先人 (ancestors, the dead). It avoids 封存, 原封不动 and 珍藏, the words that promised a keepsake.
   - *The old line 4, replaced:* "The trial is sealed from here on. Your cultivator, untouched, yours to treasure." It promised a kept copy, and Bruno decided on 15 Oct 2026 that the closed-test save does not stay.
5. "A new scroll is laid out. All beings are equal, and all begin in the first realm."
6. "The new boards wait for their holders. Every rank is verified, earned by true strength." (The first draft used 榜上无名, an idiom for failing to make the list: both reviews caught it.)
7. "This is the last time we start again. From now on, the scroll is never wiped away."
8. **(new)** "Ninefold. The Founding. Season zero." 开山 alone is read as founding a sect (开山立派) and also as cutting into a mountain; with the Cliff both readings help. 第零赛季 is the usual "Season 0".
   - *The old line 8, replaced:* "Ninefold. The Seal Falls. Season zero."
9. **(new)** "Those who first break through the gates: names carved into the cliff, never worn away." 率先 is "among the first, taking the lead", right for 81 people; 破关 is "break through a pass", and in cultivation also a bottleneck, which is the real condition (through the gate, not the warden falling). 永不磨灭 is a set phrase, an indelible mark. It replaces a first draft, 首破守关者, which read as one person and said "the gatekeeper" instead of "the gate".

## The voice

- **Who:** one narrator, male, older, low and calm, like a sect elder telling a story by a fire. Not a movie-trailer shout. Slow, with room between the two halves of each line.
- **Delivery notes:** line 1: 重 is read chóng (layered), not zhòng; if the tool says zhòng, write 九层境界 instead. Line 3 almost a whisper, with a pause after 此印. Line 4 steady and warm: the plain fact first, a breath (600 ms in `lines.json`), then the honour. Line 7 slower than the rest, a full stop between the two sentences. Line 8 three separate words with a breath between each. Line 9 rising slightly, a breath at each comma (300 ms).

### Option A · ElevenLabs (recommended)

1. A paid plan (the cheapest one allows commercial use; the free plan does not).
2. **Voice:** in the Voice Library, filter by language Chinese and search "narrator", "storyteller", "wuxia" or "old man". Pick a deep male voice whose sample sounds native. Listen to line 2 in it before generating the rest.
3. **Model:** the newest multilingual model offered.
4. **Settings:** stability about 45%, similarity about 75%, style about 25%, speed about 0.9.
5. Generate each line on its own, paste the simplified text exactly as above, and download each as MP3 or WAV: `vo-01.mp3` to `vo-09.mp3`. For trailer v6 only `vo-04`, `vo-08` and `vo-09` are new.

### Option B · Azure Speech, free tier

Voice `zh-CN-YunjianNeural`. Paste this SSML (one line shown; repeat the `<prosody>` block for each line and save each as its own file):

```xml
<speak version="1.0" xml:lang="zh-CN" xmlns:mstts="https://www.w3.org/2001/mstts">
  <voice name="zh-CN-YunjianNeural">
    <mstts:express-as style="narration-relaxed">
      <prosody rate="-12%" pitch="-6%">九重境界，<break time="400ms"/>一场试炼。</prosody>
    </mstts:express-as>
  </voice>
</speak>
```

If `narration-relaxed` is not offered for that voice, remove the `express-as` lines and keep the rest.

## What I do with the files

Each line is placed at its time, with a small hall reverb so it sits in the same room as the music. The music dips about 5 dB under the voice and comes straight back. The English subtitles appear with the voice, in the lower third, in the game's own lettering. The seal hit (13.0 s in v6) keeps the screen and the sound to itself. `vo.sh` loops over eight windows today and needs a ninth, for line 9 at 40.6 s.

## What was made (2026-10-15)

The owner cannot pay, so two free takes were made, measured and kept in `media/voice/`, 24 kHz mono FLAC, `vo-01` to `vo-08`. Nothing was done to either voice: each line is the model's own audio, cut only inside its own quiet and rejoined with exact silence so every pause is the length asked for above. Every line of both takes fits its v5 window.

They were measured by a Mandarin speech recogniser (SenseVoice, through sherpa-onnx): the ElevenLabs English voices used before had about 40% of characters misheard, nearly all wrong tones. Both takes below read back with every tone right except 由你, which the recogniser cannot tell from 有你 in any voice.

| Folder | Made with | Licence | Credit |
|---|---|---|---|
| `elevenlabs-v4-brian` | ElevenLabs, model eleven_v4, premade voice Brian, free plan | Free plan: non-commercial only, and the published video's title must carry "elevenlabs.io" | In the game's credits (already there) and in the video title |
| `kokoro-v1_0-yunjian` | Kokoro-82M v1.0 (hexgrad), voice zm_yunjian, run locally through sherpa-onnx | Apache-2.0: any use, commercial included, nothing to pay | None required; a courtesy line in the credits |

The ElevenLabs take is the livelier and deeper read (median pitch 85 Hz). The Kokoro take is calmer and flatter, and is the only one safe if the game ever earns money. The trailer is mixed by `vo.sh` from whichever folder is chosen: a 70 Hz high-pass, one fixed gain per line, a light room, and the music dipping 5 dB under the voice.

## Trailer v6: what is taken from which run (15 Oct 2026)

- **Kept as they are:** lines 1, 2, 3, 5, 6 and 7 from the takes above (`elevenlabs-v4-brian`, or `kokoro-v1_0-yunjian` if the game ever earns money). They are not read again, so the voice and its pace stay the ones already measured.
- **New:** lines 4, 8 and 9. `tools/voice/lines.json` holds them (its `new` field says so). A push to the working branch runs `.github/workflows/voice.yml`, which reads all nine lines again; only `-04`, `-08` and `-09` are taken from that run, made with the same voice and settings, and measured the same way (the recogniser, and each line inside its window: 4 before 22.5 s, 9 before 45.7 s, 8 before the last chord at 58.9 s).
- **Fallback, free for any use:** Kokoro `zm_yunjian`, as above.
