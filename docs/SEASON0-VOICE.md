# 落印 The Seal Falls · the trailer voice

## Resumo (para o Bruno)

- **Sim, uma voz em mandarim com legendas em inglês fica bem**, e dá ao trailer o tom dos trailers de donghua xianxia. Com três condições: a voz tem de ser muito boa, as frases curtas (8 frases, nunca por cima da pancada do selo), e a música baixa só um pouco por baixo da voz.
- **Daqui não consigo gerar uma voz boa.** Este ambiente só chega ao npm e ao PyPI; os modelos de voz bons estão bloqueados, e o que sobra soa a robô. Por isso: tu geras os 8 ficheiros com uma das ferramentas abaixo e mandas-mos, e eu ponho cada um no segundo certo, com eco leve, a música a baixar por baixo e as legendas.
- **Recomendo o ElevenLabs** (funciona no telemóvel). Plano pago mais barato, porque o grátis não deixa usar comercialmente.
- **Alternativa grátis:** Microsoft Azure Speech (nível gratuito), voz `zh-CN-YunjianNeural`. O texto SSML está pronto abaixo. Não uses gravações do "Ler em voz alta" do Edge: não têm licença para publicar.
- **Nos créditos** do jogo acrescenta-se uma linha a dizer que a voz do trailer foi feita com IA, como já se diz da música e da arte.

## The lines

Eight short lines, timed to the shots of trailer v2. Simplified characters are what the voice tool reads best; the traditional line is the same text in the game's own script. The English line is the subtitle that shows while it is spoken.

| # | When | Mandarin (simplified, give this to the tool) | Traditional | Pinyin | English subtitle |
|---|---|---|---|---|---|
| 1 | 1.0 to 6.0 s | 九重境界，一场试炼。 | 九重境界，一場試煉。 | Jiǔ chóng jìngjiè, yì chǎng shìliàn. | Nine realms. One closed test. |
| 2 | 9.0 to 14.5 s | 你亲手栽培的每一位修士，都曾在此一步步登攀。 | 你親手栽培的每一位修士，都曾在此一步步登攀。 | Nǐ qīnshǒu zāipéi de měi yí wèi xiūshì, dōu céng zài cǐ yí bù bù dēngpān. | Every cultivator you raised. |
| 3 | 16.2 to 19.2 s | 此印，只落一次。 | 此印，只落一次。 | Cǐ yìn, zhǐ luò yí cì. | The seal falls once. |
| | 21.0 s | (no voice: the seal hits) | | | |
| 4 | 23.0 to 29.0 s | 试炼就此封存。你的修士，原封不动，由你珍藏。 | 試煉就此封存。你的修士，原封不動，由你珍藏。 | Shìliàn jiùcǐ fēngcún. Nǐ de xiūshì, yuánfēng bú dòng, yóu nǐ zhēncáng. | The closed test is sealed and kept. Your cultivator is kept as a copy you can save. |
| 5 | 31.5 to 36.0 s | 新卷铺开。众生平等，皆从第一境起步。 | 新卷鋪開。眾生平等，皆從第一境起步。 | Xīn juàn pūkāi. Zhòngshēng píngděng, jiē cóng dì yī jìng qǐbù. | A new scroll. Everyone starts equal, in realm 1. |
| 6 | 37.0 to 41.0 s | 新榜虚位以待。名次皆验，全凭实力。 | 新榜虛位以待。名次皆驗，全憑實力。 | Xīn bǎng xū wèi yǐ dài. Míngcì jiē yàn, quán píng shílì. | The boards start empty. Every rank is checked for fair play. |
| 7 | 42.0 to 47.5 s | 这是最后一次重来。从此，画卷永不抹去。 | 這是最後一次重來。從此，畫卷永不抹去。 | Zhè shì zuìhòu yí cì chónglái. Cóngcǐ, huàjuàn yǒng bù mǒqù. | This is the last wipe. Nothing will be painted over again. |
| 8 | 50.5 to 54.0 s | 九境。落印。第零赛季。 | 九境。落印。第零賽季。 | Jiǔjìng. Luò yìn. Dì líng sàijì. | The Seal Falls 落印 · Season 0 · Monday 26 October, 00:00 UTC |

What each line means, word for word, so nothing is lost in the subtitle:
1. "Nine layered realms, one trial."
2. "Every cultivator you raised with your own hands once climbed here, step by step." (栽培 is the word a master uses for raising a disciple.)
3. "This seal falls only once." (此印 gives the whispered word a second syllable, so it is heard.)
4. "The trial is sealed from here on. Your cultivator, untouched, yours to treasure." (原封不动 carries 封, the seal itself.)
5. "A new scroll is laid out. All beings are equal, and all begin in the first realm."
6. "The new boards wait for their holders. Every rank is verified, earned by true strength." (The first draft used 榜上无名, an idiom for failing to make the list: both reviews caught it.)
7. "This is the last time we start again. From now on, the scroll is never wiped away."
8. "Ninefold. The Seal Falls. Season zero."

## The voice

- **Who:** one narrator, male, older, low and calm, like a sect elder telling a story by a fire. Not a movie-trailer shout. Slow, with room between the two halves of each line.
- **Delivery notes:** line 1: 重 is read chóng (layered), not zhòng; if the tool says zhòng, write 九层境界 instead. Line 3 almost a whisper, with a pause after 此印. Line 4 steady and warm (it is the reassuring line). Line 7 slower than the rest, a full stop between the two sentences. Line 8 three separate words with a breath between each.

### Option A · ElevenLabs (recommended)

1. A paid plan (the cheapest one allows commercial use; the free plan does not).
2. **Voice:** in the Voice Library, filter by language Chinese and search "narrator", "storyteller", "wuxia" or "old man". Pick a deep male voice whose sample sounds native. Listen to line 2 in it before generating the rest.
3. **Model:** the newest multilingual model offered.
4. **Settings:** stability about 45%, similarity about 75%, style about 25%, speed about 0.9.
5. Generate each line on its own, paste the simplified text exactly as above, and download each as MP3 or WAV: `vo-01.mp3` to `vo-08.mp3`.

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

Each line is placed at its time, with a small hall reverb so it sits in the same room as the music. The music dips about 5 dB under the voice and comes straight back. The English subtitles appear with the voice, in the lower third, in the game's own lettering. The seal hit at 21.0 s keeps the screen and the sound to itself.

## What was made (2026-10-15)

The owner cannot pay, so two free takes were made, measured and kept in `media/voice/`, 24 kHz mono FLAC, `vo-01` to `vo-08`. Nothing was done to either voice: each line is the model's own audio, cut only inside its own quiet and rejoined with exact silence so every pause is the length asked for above. Every line of both takes fits its window.

They were measured by a Mandarin speech recogniser (SenseVoice, through sherpa-onnx): the ElevenLabs English voices used before had about 40% of characters misheard, nearly all wrong tones. Both takes below read back with every tone right except 由你, which the recogniser cannot tell from 有你 in any voice.

| Folder | Made with | Licence | Credit |
|---|---|---|---|
| `elevenlabs-v4-brian` | ElevenLabs, model eleven_v4, premade voice Brian, free plan | Free plan: non-commercial only, and the published video's title must carry "elevenlabs.io" | In the game's credits (already there) and in the video title |
| `kokoro-v1_0-yunjian` | Kokoro-82M v1.0 (hexgrad), voice zm_yunjian, run locally through sherpa-onnx | Apache-2.0: any use, commercial included, nothing to pay | None required; a courtesy line in the credits |

The ElevenLabs take is the livelier and deeper read (median pitch 85 Hz). The Kokoro take is calmer and flatter, and is the only one safe if the game ever earns money. The trailer is mixed by `vo.sh` from whichever folder is chosen: a 70 Hz high-pass, one fixed gain per line, a light room, and the music dipping 5 dB under the voice.
