# Texto do pitch — LEITO360 (vídeo de até 5 minutos)

Este é o texto para ser **falado**, já dividido por integrante e por tempo.
O que está em _itálico entre colchetes_ é indicação de tela, não deve ser lido.

Ritmo de referência: ~140 palavras por minuto. O texto abaixo tem cerca de
680 palavras de narração, o que fecha em 4min50 com as pausas naturais.

**Antes de gravar, confira:**
[github.com/gabriellive1817-stack/Leito_360](https://github.com/gabriellive1817-stack/Leito_360)
abrindo em janela anônima, o dashboard no ar em
[gabriellive1817-stack.github.io/Leito_360](https://gabriellive1817-stack.github.io/Leito_360/),
e o Database Actions do Oracle já logado numa aba separada.

---

## 0:00 – 0:30 · O problema — Natália

_[Tela: capa da apresentação]_

> Todo gestor de saúde pública no Brasil já passou por isto: para responder
> uma pergunta simples — "meu estado está internando mais que os outros?" —
> ele precisa abrir o TabNet do SIH/SUS, depois o CNES, depois o IBGE, baixar
> três relatórios em formatos diferentes e cruzar tudo na mão, numa planilha.
>
> Os dados são públicos e são bons. O problema é que eles chegam separados,
> em competências fechadas, e sem nenhuma visão comparável entre as 27
> unidades da federação. O resultado é que a comparação ou não é feita, ou é
> feita devagar e sem rastreabilidade.

---

## 0:30 – 1:00 · O objetivo — Natália

_[Tela: slide de contexto]_

> O LEITO360 nasce para resolver exatamente esse recorte. A gente consolida
> as três fontes oficiais numa única plataforma analítica, com indicador
> documentado, dado rastreável até a origem e consulta em linguagem natural
> pelo Oracle Select AI.
>
> E é importante dizer o que ele **não** é: não é monitoramento de leito em
> tempo real. Leito cadastrado no CNES não é vaga livre agora. A gente trata
> competência fechada, e isso está escrito na própria tela.

---

## 1:00 – 2:00 · Solução e arquitetura Oracle — Gabriel

_[Tela: slide 9, diagrama de arquitetura]_

> A arquitetura tem cinco etapas e todas rodaram de verdade.
>
> Primeiro, um ETL em Python puro consulta as fontes oficiais por HTTP: o
> SIH/SUS e o CNES no TabNet do DATASUS, e a população estimada na API do
> IBGE. As respostas originais ficam preservadas no repositório, sem
> tratamento, para qualquer pessoa poder auditar.
>
> Depois o pipeline padroniza, valida e calcula os indicadores. O resultado
> são 162 registros: 27 UFs por 6 competências, de novembro de 2025 a abril
> de 2026.
>
> Esses dados vão para o Oracle AI Database nos três formatos exigidos pelo
> Challenge: uma tabela relacional com as internações, um documento JSON
> nativo com os leitos do CNES, e uma external table sobre CSV com a
> população. A view `VW_LEITO360_ANALITICO` integra os três e é sobre ela que
> o Select AI responde.
>
> E o dashboard é estático: ele lê um JSON publicado pelo ETL. Não existe
> credencial de banco no front-end.

---

## 2:00 – 4:00 · Demonstração — Vitória (dashboard) e Pedro (Oracle)

### Vitória — 2:00 a 3:00

_[Tela: dashboard publicado, Visão Executiva, Brasil, Abr/2026]_

> Esta é a aplicação no ar. Abril de 2026: 1 milhão 218 mil internações no
> mês, permanência média de 4,9 dias, mortalidade hospitalar de 4,14%, e
> 316 mil leitos SUS cadastrados.
>
> O mapa usa a malha oficial do IBGE e colore cada estado pelo tercil de
> pressão assistencial — internações por 100 mil habitantes. E o dado
> interessante aparece na hora: o Paraná está em 703 internações por 100 mil,
> Roraima em 395. Quase o dobro, no mesmo mês, com o mesmo indicador.
>
> _[Clicar no Paraná no mapa]_
>
> Clicando numa UF, a tela inteira se recorta: os indicadores, o ranking e a
> série de seis competências passam a responder só pelo Paraná.
>
> _[Ir para o Explorador Analítico]_
>
> No Explorador Analítico são quatro perguntas de negócio prontas — maior
> pressão, menor oferta de leitos, maior permanência e maior mortalidade.
> Cada resposta vem com o SQL equivalente, marcado como **não** gerado por
> IA, com a cobertura do pipeline ao lado, e com exportação em CSV.

### Pedro — 3:00 a 4:00

_[Tela: Oracle Database Actions, SQL Worksheet]_

> Aqui é o Oracle. Esta é a view analítica com os mesmos 162 registros — e a
> contagem confere com o que o pipeline gerou.
>
> _[Rodar SELECT COUNT(\*) FROM VW_LEITO360_ANALITICO]_
>
> Os três formatos estão separados de propósito: relacional, JSON nativo e
> external table. A soma das internações por competência no Oracle bate
> exatamente com os totais de controle do TabNet — diferença zero nas seis
> competências.
>
> _[Mostrar o script 07 e o perfil criado]_
>
> Sobre o Select AI: o perfil `LEITO360_AI` foi criado com sucesso, restrito
> aos objetos do projeto, e as cinco perguntas de negócio estão prontas. Na
> execução que fizemos, o serviço de inferência do OCI Generative AI daquele
> ambiente não respondeu — deu timeout em quatro tentativas, enquanto uma
> query comum respondia em milissegundos. Documentamos o diagnóstico inteiro
> no repositório em vez de simular uma resposta.

---

## 4:00 – 4:30 · Benefícios — João

_[Tela: slide 6, evidência da execução do pipeline]_

> O que o LEITO360 entrega é decisão baseada em dado oficial e verificável.
>
> Todo indicador tem fórmula escrita no README. Todo número da tela sai do
> pipeline, e o pipeline reconcilia sozinho contra os totais de controle do
> TabNet — se divergir, ele falha e avisa, não publica errado.
>
> E a plataforma é honesta sobre o próprio limite: ela diz, na tela, que
> leito cadastrado não é vaga livre. Isso é o que separa uma ferramenta de
> gestão de um painel bonito.

---

## 4:30 – 5:00 · Conclusão — Gabriel

_[Tela: slide 10, o que foi implementado]_

> Fechando: nesta sprint entregamos o ETL das três fontes oficiais validado e
> reconciliado, a carga real no Oracle nos três formatos com a view
> analítica, o dashboard sem nenhum dado fictício, e tudo publicado — o
> repositório é público e a aplicação está no ar.
>
> O próximo passo é automatizar a carga do Oracle por job agendado e
> reexecutar o Select AI num ambiente com o serviço de inferência saudável.
>
> Obrigado à FIAP e à Oracle pelo desafio. Grupo 61, LEITO360.

---

## Observações para a gravação

- **Não prometa tempo real.** Se a palavra "ocupação" escapar, regrave a
  frase: o indicador é "pressão assistencial comparativa".
- **Não invente resultado de Select AI.** Se, no dia da gravação, o serviço
  estiver saudável, rode uma pergunta de verdade com `SHOWSQL` e depois
  `RUNSQL` e mostre o SQL gerado — aí o trecho do Pedro muda para o resultado
  real. Se não estiver, mantenha o texto acima.
- **Mostre a URL na barra de endereços** ao abrir o dashboard: é a prova de
  que está publicado.
- Deixe as abas já abertas e logadas antes de começar a gravar; trocar de
  aba consome mais tempo do que parece dentro dos 5 minutos.
- Áudio limpo importa mais que imagem bonita. Grave em ambiente sem eco.
