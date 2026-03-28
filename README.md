# T8 Viewer

Applicazione Angular totalmente client-side per analizzare un report T8 in formato Excel e trasformarlo in dashboard interattive per lettura executive e operativa del portafoglio commesse.

L'app non usa backend e non invia dati all'esterno: il file viene caricato dal browser, parsato in frontend e aggregato localmente.

## Cosa fa

- mostra una schermata full-screen di upload al primo avvio
- valida il formato del file T8 atteso
- estrae metadati di report e righe commessa
- costruisce dashboard executive con KPI, ranking e breakdown
- permette di filtrare il portafoglio per perimetro, stato e ownership
- apre un popup di dettaglio commessa con click sinistro
- imposta la commessa nel tab `Glossario & dettaglio` con click destro

## Flusso utente

1. L'utente carica un file `.xls` o `.xlsx` con struttura compatibile al report T8.
2. L'app legge il workbook nel browser e normalizza i dati.
3. Viene aperta la dashboard con vista iniziale `Commerciale`.
4. L'utente può navigare tra 4 tab:
- `Overview`
- `Performance`
- `Portafoglio`
- `Glossario & dettaglio`
5. Click sinistro su una commessa: apre il popup con il dettaglio rapido.
6. Click destro su una commessa: la salva come commessa visibile nel pannello `Dettaglio commessa`.

## Perimetro dati

L'app lavora su due scope:

- `Commerciale`: esclude le righe classificate come iniziative interne
- `Tutte`: include l'intero dataset

Sono disponibili anche filtri globali per:

- ricerca libera su `CodComm`, `Descriz`, `Cliente`, `Business Unit`, `CodCDC`
- stato `Tutte / Aperte / Chiuse`
- `CodCDC`
- `Linea prodotto`
- `Business Unit`
- `Account Manager`
- `Project Manager`
- `Tipo avanzamento`

## Tab disponibili

### Overview

Vista executive sintetica con KPI principali, alert strip, best performer e commesse da proteggere.

### Performance

Vista focalizzata su:

- confronto rispetto a `MarDatiC12`
- ranking dei migliori e peggiori delta
- ranking per `Margine %`

### Portafoglio

Vista di composizione del portafoglio con breakdown per:

- `Business Unit`
- `Linea prodotto`
- `CodCDC`

Contiene anche l'Explorer con tabella commesse full width.

### Glossario & dettaglio

Contiene:

- glossario KPI con definizione e formula
- pannello persistente di dettaglio commessa

## KPI disponibili

Di seguito i KPI oggi esposti in UI.

### 1. Valore contratti

- Label UI: `Valore contratti`
- Formula: `SUM(RicTotComm)`
- Significato: valore complessivo dei contratti nel perimetro filtrato

### 2. Ricavi alla data

- Label UI: `Ricavi alla data`
- Formula: `SUM(RicTotData)`
- Significato: quota di ricavo già maturata alla data del report

### 3. Margine alla data

- Label UI: `Margine alla data`
- Formula: `SUM(MarTotData)`
- Significato: margine già consuntivato alla data del report

### 4. Margine ipotizzato C12

- Label UI: `Margine ipotizzato C12`
- Formula: `SUM(MarDatiC12)`
- Significato: benchmark economico pianificato nel dato C12

### 5. Delta vs C12

- Label UI: `Delta vs MarDatiC12`
- Formula: `SUM(MarTotComm - MarDatiC12)`
- Significato: scostamento tra margine totale commessa e piano C12
- Nota importante: il delta non usa `MarTotData`, ma `MarTotComm`

### 6. Margine %

- Label UI: `Margine %`
- Formula: `SUM(MarTotData) / SUM(RicTotData) * 100`
- Significato: efficienza economica del portafoglio alla data
- Fallback per singola riga: se `%MarTotData` non è valorizzato, viene calcolato come `MarTotData / RicTotData * 100`

### 7. Backlog anno corrente

- Label UI: `Backlog anno corrente`
- Formula: `SUM(RicResAnnoCorr)`
- Significato: ricavo residuo ancora da maturare nell'anno corrente

### 8. % commesse sotto piano C12

- Label UI: `% commesse sotto piano C12`
- Formula: `COUNT(MarTotComm < MarDatiC12) / COUNT(commesse filtrate) * 100`
- Significato: percentuale di commesse il cui margine totale è sotto il benchmark C12

### 9. Backlog a rischio

- Label UI: `Backlog a rischio`
- Formula: `SUM(RicResAnnoCorr)` sulle commesse considerate a rischio
- Una commessa è a rischio se vale almeno una delle condizioni seguenti:
- `marginPctToDate < 10` e `RicResAnnoCorr > 0`
- `MarTotData < 0`
- `MarTotComm - MarDatiC12 < 0`
- progetto aperto con `RicResAnnoCorr > 0` e `Data Fine Progetto` entro 90 giorni

### 10. Valore in scadenza a 90 giorni

- Label UI: `Valore in scadenza a 90 giorni`
- Formula: `SUM(RicResAnnoCorr)` sulle commesse aperte con `Data Fine Progetto` entro 90 giorni
- Vincoli:
- la commessa deve essere aperta
- il backlog anno corrente deve essere maggiore di zero
- la data fine progetto deve essere valorizzata

### 11. Avanzamento ponderato portafoglio

- Label UI: `Avanzamento ponderato portafoglio`
- Formula: `SUM(%AvanRicTotData * RicTotComm) / SUM(RicTotComm)`
- Significato: avanzamento medio pesato per il valore contrattuale
- Sono considerate solo le righe con `%AvanRicTotData` valorizzato e `RicTotComm > 0`

### 12. Run-rate mensile di margine

- Label UI: `Run-rate mensile di margine`
- Formula: `SUM(MarMatNelMese)`
- Significato: margine maturato nel mese corrente sul perimetro filtrato

## Metriche e viste aggiuntive

Oltre ai KPI card, la UI usa anche queste metriche:

- `Margine totale commessa`: `MarTotComm`
- `Margine alla data`: `MarTotData`
- `Ricavi del mese`: `RicMatNelMese`
- `Costi del mese`: `CostMatNelMese`
- `Margine del mese`: `MarMatNelMese`
- `Backlog anni futuri`: `RicResAnniFut`
- `Costi residui anno corrente`: `CostResAnnoCorr`
- `Costi residui anni futuri`: `CostResAnniFut`
- `Costi residui anno corrente da piano`: `Costi Res. Anno corrente (Da Piano)`

Le classifiche presenti in UI sono:

- best performer per `Margine alla data`
- commesse da proteggere
- migliori delta vs C12
- peggiori delta vs C12
- miglior margine %
- peggior margine %

## Regole di dettaglio commessa

- click sinistro su ranking o tabella: apre il popup modale con il dettaglio della commessa cliccata
- click destro su ranking o tabella: seleziona la commessa per il pannello persistente nel tab `Glossario & dettaglio`

## Validazione file

Il parser si aspetta un file con struttura compatibile al T8 e verifica la presenza di colonne chiave, tra cui:

- `CodComm`
- `Descriz`
- `Cliente`
- `LineaProd`
- `TipoAvanz`
- `RicTotComm`
- `RicTotData`
- `CostTotData`
- `MarDatiC12`
- `MarTotComm`
- `MarTotData`
- `MarMatNelMese`
- `%MarTotData`
- `RicResAnnoCorr`
- `Business Unit`
- `Account Manager`
- `Project Manager`
- `Data Fine Progetto`

## Avvio locale

Per avviare il progetto in locale:

```bash
npm install
npm run start
```

In alternativa:

```bash
ng serve
```

## Build

```bash
npm run build
```

## Test

```bash
npm test -- --watch=false
```

## Note tecniche

- stack: Angular standalone components
- parsing Excel: interamente lato frontend
- persistenza: nessuna
- backend: assente
- invio dati a servizi esterni: assente
