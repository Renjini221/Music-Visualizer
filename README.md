# Music Visualizer



## Files

```
index.html    — structure
style.css     — styling
script.js     — audio + canvas + input
analytics.js  — session tracking via localStorage
```

## How it works

`setupAudio()` creates a Web Audio context and pipes the audio through an `AnalyserNode`. `render()` runs every frame, pulls FFT data, maps it into bins logarithmically, and draws whatever mode is selected.

Beat detection watches bass energy between frames and calculates BPM from the average gap between hits.

`analytics.js` exposes `window.tick`, `window.volcheck`, `window.logBeat`, `window.logTrack` so `script.js` can call them without importing. Run `window.getReport()` in the console to see session stats.


## Shortcuts

`space` play/pause · `← →` cycle mode · `↑ ↓` sensitivity · `G` glow · `T` trail · `P` pulse · `K` peaks · `X` flip · `R` rotate · `M` color · `S` snapshot · `0-9` jump to mode

## Gallery

<img width="1916" height="933" alt="Screenshot 2026-05-01 110251" src="https://github.com/user-attachments/assets/e1ed0b1f-8f44-4f75-ae40-21ca51ad5033" />

<img width="1891" height="927" alt="image" src="https://github.com/user-attachments/assets/669f663b-0bfe-48c6-8ddd-8d1dc9f94c57" />

## AI Decleration

-Claude helped me style and suggested me some logic changes
some ideas like analytics was given by ai and coded by me.

## Notice

Built entirely from my own idea, logic, and code. Used AI only for polish and refactoring.

