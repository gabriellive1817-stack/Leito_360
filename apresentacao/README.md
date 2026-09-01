# Apresentação de evidências (Sprint 2)

O arquivo `EC_Sprint_2_1TSCOA_EvidenciasConstrucao_LEITO360_GRUPO61.pptx`, na
raiz do repositório, **não é editado à mão**: ele é gerado por este script,
para que os 19 slides continuem reprodutíveis e conferíveis junto com o resto
do projeto.

## Como regerar

```bash
cd apresentacao
npm install
node build_pptx.js
```

O PPTX é escrito na raiz do repositório, sobrescrevendo a versão anterior.

## O que o script consome

| Recurso | Origem |
|---|---|
| `docs/evidencias/prints/dashboard_visao_executiva.png` | captura real do dashboard publicado (slide 7) |
| `docs/evidencias/prints/dashboard_explorador_analitico.png` | captura real do dashboard publicado (slide 8) |
| `apresentacao/assets/mapa_marca.png` | silhueta do Brasil da capa |

A silhueta da capa foi desenhada a partir da mesma malha oficial do IBGE que o
dashboard usa (`public/data/uf_malha.json`). Para regerá-la depois de uma
atualização da malha, abra `assets/mapa_marca.html` em um navegador — a página
já vem com o fundo exato do slide — e capture os 900×900 px do SVG.

## Como atualizar as capturas do dashboard

1. Suba o dashboard (`pnpm dev`) ou abra a versão publicada.
2. Deixe a tela no estado que o slide descreve — a Visão Executiva com uma UF
   selecionada, o Explorador Analítico na consulta de maior pressão.
3. Capture em 1760×990 (proporção 16:9, a mesma que o slide reserva) e salve
   por cima dos arquivos em `docs/evidencias/prints/`.
4. Rode `node build_pptx.js` de novo.

## Conferência antes de entregar

O script não valida o resultado. Vale abrir o PPTX e conferir os slides 3, 7,
8, 10 e 14 — são os que concentram tabela, imagem, barras de progresso e
números de execução.
