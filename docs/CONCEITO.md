# 九境 Conceito base

Um idle de cultivo para celular, web e APK. Retrato, uma mão só.

> **Em uma linha.** O qi sobe sozinho, nove reinos acima de você, e cada reino termina
> numa besta que precisa cair antes de você romper.

Este documento é o que foi **combinado**, não o que foi proposto. Tudo aqui saiu de uma
decisão do Bruno; onde algo ainda está em aberto, está marcado como tal.

---

## 1 · O laço

Quatro passos, e não há um quinto.

| | | |
|---|---|---|
| **1 · Acumula** | O qi sobe sozinho, com o app aberto ou fechado | Você não precisa estar lá |
| **2 · Gasta** | Em técnica, método, pílulas e núcleos de fera | Tudo multiplica a taxa. Nada se perde |
| **3 · Enfrenta** | Cheia a barra do reino, a guardiã aparece | Perdeu? Acumula mais e volta |
| **4 · Rompe** | A aura muda, a cor muda, a taxa multiplica | Um evento visível, não só um número maior |

Um idle é jogado **fechado**: o app fica em segundo plano vinte e três horas por dia. Por
isso o progresso é calculado por carimbo de tempo e nunca por quadros. Um código que conta
`requestAnimationFrame` perde essas horas e mente sobre o resto.

---

## 2 · Os nove reinos

Os nomes são os canônicos do gênero — todo leitor de xianxia sabe a ordem de cor, como se
sabe nível 1 a 9. Cada reino tem nove camadas, e cada camada aberta soma **+2% na taxa,
compondo** — o que chega a **4,97×** no fim da escada.

Uma camada não é uma segunda moeda. É uma leitura da barra: o custo do reino dividido por
nove. Existe por um motivo só — um reino que leva trinta dias dá ao jogador um evento em
trinta dias; o mesmo reino em nove camadas dá nove. A curva não muda, só a frequência com
que o jogo diz *algo aconteceu*.

| # | 漢字 | Nome | Aura que chega | Guardiã |
|---|---|---|---|---|
| 1 | 練氣 | Refino de Qi | nada ainda — só a respiração | 妖狐 Raposa espiritual |
| 2 | 築基 | Fundação | o primeiro brilho, fraco e constante | 青蛇 Serpente verde |
| 3 | 金丹 | Núcleo Dourado | 圓光 o halo — o primeiro sinal que se lê de longe | 仙鶴 Grou imortal |
| 4 | 元嬰 | Alma Nascente | 塵 motes de qi soltos no ar | 雷虎 Tigre do trovão |
| 5 | 化神 | Transformação | a aura ganha corpo atrás do cultivador | 玄武 Tartaruga negra |
| 6 | 煉虛 | Refino do Vazio | 芒 feixes irradiando do assento | 蜈蚣 Centopeia de ferro |
| 7 | 合體 | Unidade | segundo halo e lâminas de qi em volta | 魔狼 Lobo demoníaco |
| 8 | 大乘 | Grande Veículo | a energia começa a girar sozinha | 蛟 Dragão-serpente |
| 9 | 渡劫 | Tribulação | 九雷 os nove raios | 龍 Dragão |

**O nono reino é o teto da v1.** Não há renascimento. O custo dele é `INF`, a barra nunca
completa, e o que vem depois fica deliberadamente por desenhar.

---

## 3 · As bestas

**Combate automático que se assiste.** Resolve sozinho em alguns segundos — barras de vida
descendo, números saltando — e o jogador vê sem jogar. É o único momento do jogo que não é
barra enchendo, e é o que dá motivo para técnica, pílula e equipamento existirem.

Perder não tem punição: você acumula mais e volta. Nunca se perde progresso.

**Caça livre existe.** Além das nove guardiãs, há bestas comuns que se caça por material,
para forjar e refinar. É o que dá o que fazer quando o app abre — e, como a subida leva
três meses, o jogo precisa disso.

> **Em aberto:** quantas bestas comuns, se a caça tem custo em qi, e se o material é uma
> quarta moeda ou entra nas que já existem.

---

## 4 · A curva

**Alvo combinado: três meses até o nono reino, jogando uma vez por dia.** Medido, não
estimado — `src/sim/__tests__/curva.test.ts` imprime isto a cada execução:

```
uma vez por dia, sem multiplicadores — 90,0 dias até o nono reino

  練氣  reino 1  dia    0,0
  築基  reino 2  dia    1,1   (+1,1d ·  1%)
  金丹  reino 3  dia    3,1   (+2,0d ·  2%)
  元嬰  reino 4  dia    6,8   (+3,7d ·  4%)
  化神  reino 5  dia   13,0   (+6,2d ·  7%)
  煉虛  reino 6  dia   23,0  (+10,0d · 11%)
  合體  reino 7  dia   38,0  (+15,0d · 17%)
  大乘  reino 8  dia   59,6  (+21,7d · 24%)
  渡劫  reino 9  dia   90,0  (+30,3d · 34%)

maior vão: 30,3d = 33,7% da partida (teto 35%)
no último reino, uma camada abre a cada 3,4 dias
```

A razão entre reinos **encolhe** no topo (1,9 → 1,4). Isso é deliberado: uma razão
constante deixa sempre ~41% da partida no último vão, por maior que seja a curva. Com três
meses, 41% seriam **37 dias sem nada novo** — que é exatamente como a versão anterior
morreu (reinos 1 a 6 em seis dias, vinte e seis dias no último vão).

**O risco que sobra, dito em voz alta:** trinta dias no nono reino, sem renascimento depois.
As camadas dão um evento a cada 3,4 dias e a caça livre dá o que fazer, mas é aqui que o
jogo vai doer primeiro. É o ponto a vigiar quando houver gente jogando.

---

## 5 · Arte

Direção escolhida: **霓 neon noturno** — índigo profundo, ciano e magenta com brilho,
xianxia moderno no registro de Solo Leveling.

Os desenhos vêm de [game-icons.net](https://game-icons.net/): 4.239 ícones vetoriais,
licença **CC BY 3.0**, uso comercial liberado. Cada ícone é uma silhueta branca sobre
quadrado preto; removido o quadrado, a silhueta aceita qualquer cor — é por isso que nove
reinos diferentes não custaram nove desenhos.

**O cultivador** é uma figura só, a mesma em todos os reinos. O que muda é o ar à volta:
camadas de aura — ícone grande e fraco atrás, menores e mais fortes à frente — e a cor,
que caminha do ciano ao magenta conforme sobe. Duas regras que a primeira tentativa
quebrou e que agora são lei:

1. **O halo é desenhado, não é ícone.** Como ícone lia como engrenagem atrás da cabeça.
2. **A figura queima para o branco conforme sobe.** Sem isso a aura engolia o cultivador a
   partir do sétimo reino, que inverte o sentido inteiro da imagem.

Um reino tem de ser legível **só pela aura**, sem ler uma palavra.

**O que o acervo gratuito não cobre:** retrato de personagem anime ilustrado. Existem
sprites de hanfu para visual novel no itch.io, mas a licença varia pacote a pacote. Se o
jogo precisar disso, é a única parte que se compra ou se encomenda.

**Crédito obrigatório:** CC BY 3.0 pede os autores dos ícones numa tela de créditos —
Lorc, Delapouite, Caro Asercion e outros. Vender, modificar e recolorir estão liberados.

---

## 6 · Técnico

Uma base só para web e APK: **TypeScript + Vite**, empacotado com **Capacitor** para
Android. Testa no navegador do celular em segundos; o APK sai do mesmo build.

Quatro regras, e as três primeiras a versão anterior quebrou pelo menos uma vez:

1. **`sim/` é puro.** Sem nós, sem sinais, sem leitura de relógio, sem aleatoriedade que
   não seja hash estável do estado. Tudo é função de `(estado, instante)` para um estado
   novo — é o que deixa o mesmo código rodar o jogo, os testes e uma simulação de noventa
   dias.
2. **O tempo é um carimbo, nunca um quadro.** `avancar(estado, agora)` é o único jeito de o
   tempo andar, e uma ausência longa paga exatamente o que muitas curtas pagam. Há teste
   para isso.
3. **Um save é entrada.** É validado como qualquer outra entrada. A versão anterior
   embarcou sem isso e tinha um buraco onde um item editado à mão multiplicava a taxa por
   196.502× e passava em todas as verificações.
4. **Os números de balanceamento vivem numa tabela só**, são impressos pela suíte de testes
   a cada execução, e mudar um nunca é silencioso.

---

## 7 · Fora da v1

Multiplayer, seitas, PvP, troca, ranking, renascimento, iOS, e qualquer coisa que precise
de servidor. Todas são ideias razoáveis e todas impediriam o jogo de sair.
