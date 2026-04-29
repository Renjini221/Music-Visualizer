const ANALYTICS_KEY = `viz-analytics`
const SESSION_ID = Date.now().toString(36) + Math.random().toString(36).slice(2)

let analyticsData = loadAnalytics()
let sessionStart = Date.now()
let currentTrackStart = null
let currentTrackName = null
let totalBeats = 0, peakVol = 0, avgFPS = 60
let lastFrame = Date.now(), frameCount = 0
let modeCounts = {}, colorCounts = {}, fxCounts = {}
let trackHistory = [], bpmLog = []

function loadAnalytics() {
    try {
        const raw = localStorage.getItem(ANALYTICS_KEY)
        return raw ? JSON.parse(raw) : {
            sessions: [],
            totalTracksPlayed: 0,
            totalListenTime: 0,
            totalBeats: 0,
            totalFlashes: 0,
            favoriteMode: null,
            favoriteColor: null,
            modeCounts: {},
            colorCounts: {},
            fxUsage: {},
            peakVolumeAllTime: 0,
            sessionCount: 0
        }
    } catch(e) {
      return {}  // lol if this breaks we're cooked
    }
}


function saveAnalytics() {
    try {
      localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analyticsData))
    } catch(e) {}  // whatever
}

function logBeat(bpm) {
    totalBeats++
    analyticsData.totalBeats++
    if (bpm > 40 && bpm < 220) {
        bpmLog.push(bpm)
        if (bpmLog.length > 200) bpmLog.shift()
    }
}

function logVolume(vol) {
    if (vol > peakVol) peakVol = vol
    if (vol > analyticsData.peakVolumeAllTime) {
      analyticsData.peakVolumeAllTime = vol
    }
}

function logFrame() {
    const now = Date.now()
    const fps = 1000 / (now - lastFrame)
    avgFPS = avgFPS * 0.95 + fps * 0.05
    lastFrame = now
    frameCount++
}

function logTrack(name) {
    const now = Date.now()
    if (currentTrackName && currentTrackStart) {
        const duration = now - currentTrackStart
        trackHistory.push({ name: currentTrackName, duration })
        analyticsData.totalTracksPlayed++
        analyticsData.totalListenTime += duration
        if (trackHistory.length > 50) trackHistory.shift()
    }
    currentTrackName = name
    currentTrackStart = now
    saveAnalytics()
}

function logMode(mode) {
    modeCounts[mode] = (modeCounts[mode] || 0) + 1
    analyticsData.modeCounts[mode] = (analyticsData.modeCounts[mode] || 0) + 1
    analyticsData.favoriteMode = Object.keys(analyticsData.modeCounts)
        .sort((a, b) => analyticsData.modeCounts[b] - analyticsData.modeCounts[a])[0]
    saveAnalytics()
}

function logColor(color) {
    colorCounts[color] = (colorCounts[color] || 0) + 1
    analyticsData.colorCounts[color] = (analyticsData.colorCounts[color] || 0) + 1
    analyticsData.favoriteColor = Object.keys(analyticsData.colorCounts)
        .sort((a, b) => analyticsData.colorCounts[b] - analyticsData.colorCounts[a])[0]
    saveAnalytics()
}

function logFX(name) {
    fxCounts[name] = (fxCounts[name] || 0) + 1
    analyticsData.fxUsage[name] = (analyticsData.fxUsage[name] || 0) + 1
    saveAnalytics()
}

function getReport() {
    const avgBpm = bpmLog.length
        ? Math.round(bpmLog.reduce((a, b) => a + b, 0) / bpmLog.length)
        : `-`
    return {
        sessionId: SESSION_ID,
        duration: Math.round((Date.now() - sessionStart) / 1000) + `s`,
        tracks: trackHistory.length,
        beats: totalBeats,
        avgBpm,
        peakVol: Math.round(peakVol),
        avgFPS: Math.round(avgFPS),
        favoriteMode: analyticsData.favoriteMode,
        favoriteColor: analyticsData.favoriteColor,
    }
}

function endSession() {
    const report = getReport()
    analyticsData.sessions.push(report)
    analyticsData.sessionCount++
    if (analyticsData.sessions.length > 50) analyticsData.sessions.shift()
    saveAnalytics()
}

document.addEventListener(`DOMContentLoaded`, () => {
    document.getElementById(`mode-sel`)?.addEventListener(`change`, e => logMode(e.target.value))
    document.querySelectorAll(`.sw`).forEach(s => s.addEventListener(`click`, () => logColor(s.dataset.s)))
    document.querySelectorAll(`.tbtn`).forEach(b => b.addEventListener(`click`, () => logFX(b.id)))
    window.addEventListener(`beforeunload`, endSession)
})

window.logBeat = logBeat
window.logVolume = logVolume
window.logFrame = logFrame
window.logTrack = logTrack
window.getReport = getReport