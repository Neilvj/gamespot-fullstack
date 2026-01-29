// ===============================
// Game Spot Frontend (FULL) — FIXED + COMPLETE
// - Fake login
// - Create + Edit using the SAME form UI
// - Many-to-many: genres[] + platforms[]
// - Filter by genre
// - Sort (title/price) + direction toggle
// - Group (none/platform/genre)
// - Platform badges in list
// ===============================

const API_URL = 'http://localhost:3000/api/games'

// ---------------- STATE ----------------
let editingGameId = null
let sortMode = 'title' // title | price
let sortDir = 'asc' // asc | desc
let groupMode = 'none' // none | platform | genre

// ---------------- DOM ----------------
const createForm = document.getElementById('createForm')
const titleEl = document.getElementById('title')
const developerEl = document.getElementById('developer')
const priceEl = document.getElementById('price')
const releaseYearEl = document.getElementById('releaseYear')

const genreInput = document.getElementById('genreInput')
const genreDropdown = document.getElementById('genreDropdown')

const errorEl = document.getElementById('error')
const gameList = document.getElementById('gameList')
const refreshBtn = document.getElementById('refreshBtn')
const cancelEditBtn = document.getElementById('cancelEditBtn')

const filterGenreEl = document.getElementById('filterGenre')
const sortModeEl = document.getElementById('sortMode')
const sortDirBtn = document.getElementById('sortDirBtn')
const groupModeEl = document.getElementById('groupMode')

// Fake login
const fakeLoginForm = document.getElementById('fakeLoginForm')
const fakeUsername = document.getElementById('fakeUsername')
const fakeLoginStatus = document.getElementById('fakeLoginStatus')

// Submit button (Add / Save changes)
const submitBtn = createForm
    ? createForm.querySelector('button[type="submit"]')
    : null

// ---------------- UI Helpers ----------------
function setError(msg) {
    if (!errorEl) return
    errorEl.textContent = msg || ''
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

function formatPrice(price, currency) {
    const cur = (currency || 'SEK').toUpperCase()
    const num = Number(price)
    if (!Number.isFinite(num)) return `— ${cur}`
    return `${num.toFixed(2)} ${cur}`
}

function renderPlatformBadges(platforms) {
    if (!Array.isArray(platforms) || platforms.length === 0) return '—'
    return platforms
        .map(
            (p) =>
                `<span class="badge rounded-pill text-bg-secondary me-1">${escapeHtml(
                    p
                )}</span>`
        )
        .join('')
}

// ---------------- Genres: dropdown + checkboxes ----------------
const genreCheckboxes = genreDropdown
    ? genreDropdown.querySelectorAll('input[type="checkbox"]')
    : []

function getSelectedGenres() {
    return Array.from(genreCheckboxes)
        .filter((cb) => cb.checked)
        .map((cb) => cb.value)
}

function updateGenreInput() {
    if (!genreInput) return
    genreInput.value = getSelectedGenres().join(', ')
}

function clearGenres() {
    if (genreInput) genreInput.value = ''
    genreCheckboxes.forEach((cb) => (cb.checked = false))
}

function setSelectedGenres(genres) {
    const selected = new Set((genres || []).map((g) => String(g)))
    genreCheckboxes.forEach((cb) => {
        cb.checked = selected.has(cb.value)
    })
    updateGenreInput()
}

// Dropdown behavior (open, stay open while clicking inside, close outside)
if (genreInput && genreDropdown) {
    genreInput.addEventListener('click', (e) => {
        e.stopPropagation()
        genreDropdown.classList.toggle('d-none')
    })

    genreDropdown.addEventListener('click', (e) => {
        e.stopPropagation()
    })

    document.addEventListener('click', () => {
        genreDropdown.classList.add('d-none')
    })
}

genreCheckboxes.forEach((cb) => cb.addEventListener('change', updateGenreInput))

// ---------------- Platforms: horizontal checkboxes ----------------
function getSelectedPlatforms() {
    return Array.from(document.querySelectorAll('input[id^="pf"]:checked')).map(
        (cb) => cb.value
    )
}

function clearPlatforms() {
    document
        .querySelectorAll('input[id^="pf"]')
        .forEach((cb) => (cb.checked = false))
}

function setSelectedPlatforms(platforms) {
    const selected = new Set((platforms || []).map((p) => String(p)))
    document.querySelectorAll('input[id^="pf"]').forEach((cb) => {
        cb.checked = selected.has(cb.value)
    })
}

// ---------------- Form mode (Add vs Edit) ----------------
function resetFormToAddMode() {
    editingGameId = null
    setError('')

    if (createForm) createForm.reset()
    clearGenres()
    clearPlatforms()

    if (submitBtn) submitBtn.textContent = 'Add'
    if (cancelEditBtn) cancelEditBtn.classList.add('d-none')
}

function enterEditMode(game) {
    editingGameId = game.id
    setError('')

    // Fill fields
    if (titleEl) titleEl.value = game.title || ''
    if (developerEl) developerEl.value = game.developer || ''
    if (priceEl) priceEl.value = game.price ?? ''
    if (releaseYearEl) releaseYearEl.value = game.release_year ?? ''

    // Fill selections
    setSelectedGenres(game.genres || [])
    setSelectedPlatforms(game.platforms || [])

    // UI changes
    if (submitBtn) submitBtn.textContent = 'Save changes'
    if (cancelEditBtn) cancelEditBtn.classList.remove('d-none')

    // UX: scroll to form
    if (createForm) createForm.scrollIntoView({ behavior: 'smooth' })
}

// Cancel button wiring (guarded)
if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', resetFormToAddMode)
}

// ---------------- Fake login (UI only) ----------------
if (fakeLoginForm) {
    fakeLoginForm.addEventListener('submit', (e) => {
        e.preventDefault()
        const name = (fakeUsername?.value || '').trim()
        if (!name) {
            if (fakeLoginStatus)
                fakeLoginStatus.textContent = 'Type a username.'
            return
        }
        if (fakeLoginStatus)
            fakeLoginStatus.textContent = `Logged in as: ${name}`
        if (fakeUsername) fakeUsername.value = ''
    })
}

// ---------------- Filter / Sort / Group ----------------
function populateGenreFilterFromGames(games) {
    if (!filterGenreEl) return

    const set = new Set()
    for (const g of games) {
        if (Array.isArray(g.genres)) {
            for (const genre of g.genres) set.add(String(genre))
        }
    }

    const current = filterGenreEl.value
    const genres = Array.from(set).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
    )

    filterGenreEl.innerHTML = '<option value="">All genres</option>'
    for (const genre of genres) {
        const opt = document.createElement('option')
        opt.value = genre
        opt.textContent = genre
        filterGenreEl.appendChild(opt)
    }

    filterGenreEl.value = current
}

function applyGenreFilter(games) {
    if (!filterGenreEl) return games
    const picked = filterGenreEl.value
    if (!picked) return games
    return games.filter(
        (g) => Array.isArray(g.genres) && g.genres.includes(picked)
    )
}

function sortGames(games) {
    const sorted = [...games]

    if (sortMode === 'price') {
        sorted.sort((a, b) => Number(a.price) - Number(b.price))
    } else {
        sorted.sort((a, b) =>
            String(a.title).localeCompare(String(b.title), undefined, {
                sensitivity: 'base'
            })
        )
    }

    if (sortDir === 'desc') sorted.reverse()
    return sorted
}

function getGroupKey(game) {
    if (groupMode === 'platform') {
        return Array.isArray(game.platforms) && game.platforms.length
            ? String(game.platforms[0])
            : 'Other'
    }
    if (groupMode === 'genre') {
        return Array.isArray(game.genres) && game.genres.length
            ? String(game.genres[0])
            : 'Other'
    }
    return 'All'
}

// ---------------- READ: load + render ----------------
async function loadGames() {
    setError('')

    try {
        const res = await fetch(API_URL)
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || `Request failed (${res.status})`)
        }

        const games = await res.json()

        populateGenreFilterFromGames(games)

        let view = applyGenreFilter(games)
        view = sortGames(view)

        if (groupMode === 'none') {
            renderGames(view)
        } else {
            renderGroupedGames(view)
        }
    } catch (err) {
        console.error('loadGames failed:', err)
        setError(
            'Could not load games. Is the backend running on http://localhost:3000 ?'
        )
        if (gameList) gameList.innerHTML = ''
    }
}

function renderGroupedGames(games) {
    if (!gameList) return
    gameList.innerHTML = ''

    const groups = {}
    for (const g of games) {
        const key = getGroupKey(g)
        if (!groups[key]) groups[key] = []
        groups[key].push(g)
    }

    const groupNames = Object.keys(groups).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
    )

    for (const name of groupNames) {
        const header = document.createElement('li')
        header.className = 'list-group-item fw-semibold'
        header.textContent = `${groupMode.toUpperCase()}: ${name}`
        gameList.appendChild(header)

        renderGamesIntoList(groups[name])
    }
}

function renderGames(games) {
    if (!gameList) return
    gameList.innerHTML = ''
    renderGamesIntoList(games)
}

function renderGamesIntoList(games) {
    if (!gameList) return

    for (const g of games) {
        const li = document.createElement('li')
        li.className =
            'list-group-item d-flex justify-content-between align-items-start'

        const left = document.createElement('div')
        left.className = 'me-3'

        const yearText = g.release_year ?? '—'
        const priceText = formatPrice(g.price, g.currency)
        const genresText =
            Array.isArray(g.genres) && g.genres.length
                ? g.genres.join(', ')
                : '—'
        const devText = g.developer ? `Dev: ${g.developer}` : 'Dev: —'

        left.innerHTML = `
      <div class="fw-semibold">${escapeHtml(g.title)}</div>
      <div class="small text-secondary">
        ${escapeHtml(devText)} • Genres: ${escapeHtml(genresText)} • Year: ${escapeHtml(
            yearText
        )} • Price: ${escapeHtml(priceText)}
      </div>
      <div class="mt-1">${renderPlatformBadges(g.platforms)}</div>
    `

        const actions = document.createElement('div')
        actions.className = 'd-flex gap-2 flex-wrap'

        const editBtn = document.createElement('button')
        editBtn.type = 'button'
        editBtn.className = 'btn btn-sm btn-outline-secondary'
        editBtn.textContent = 'Edit'
        editBtn.addEventListener('click', () => enterEditMode(g))

        const deleteBtn = document.createElement('button')
        deleteBtn.type = 'button'
        deleteBtn.className = 'btn btn-sm btn-outline-danger'
        deleteBtn.textContent = 'Delete'
        deleteBtn.addEventListener('click', async () => {
            const ok = confirm(`Delete "${g.title}"?`)
            if (!ok) return

            try {
                const res = await fetch(`${API_URL}/${g.id}`, {
                    method: 'DELETE'
                })
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}))
                    alert(data.error || 'Delete failed')
                    return
                }

                // If deleted reset form if we were editing this game
                if (editingGameId === g.id) resetFormToAddMode()

                loadGames()
            } catch (err) {
                console.error('Delete failed:', err)
                alert('Could not delete. Is the backend running?')
            }
        })

        actions.appendChild(editBtn)
        actions.appendChild(deleteBtn)

        li.appendChild(left)
        li.appendChild(actions)
        gameList.appendChild(li)
    }
}

// ---------------- CREATE + UPDATE (same form) ----------------
if (createForm) {
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        setError('')

        const title = (titleEl?.value || '').trim()
        const developer = (developerEl?.value || '').trim()
        const price = Number(priceEl?.value)
        const release_year = releaseYearEl?.value
            ? Number(releaseYearEl.value)
            : null

        const genres = getSelectedGenres()
        const platforms = getSelectedPlatforms()

        // UI shows SEK in a span, so we always send SEK
        const currency = 'SEK'

        if (
            !title ||
            !developer ||
            Number.isNaN(price) ||
            genres.length === 0 ||
            platforms.length === 0
        ) {
            setError(
                'Please fill title + developer + price, and select at least one genre and platform.'
            )
            return
        }

        const payload = {
            title,
            developer,
            price,
            currency,
            release_year,
            genres,
            platforms
        }

        const method = editingGameId ? 'PUT' : 'POST'
        const url = editingGameId ? `${API_URL}/${editingGameId}` : API_URL

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setError(
                    data.error ||
                        (editingGameId ? 'Update failed.' : 'Create failed.')
                )
                return
            }

            resetFormToAddMode()
            loadGames()
        } catch (err) {
            console.error('Save failed:', err)
            setError('Could not save. Is the backend running?')
        }
    })
}

// ---------------- Controls ----------------
if (refreshBtn) refreshBtn.addEventListener('click', loadGames)

if (filterGenreEl) filterGenreEl.addEventListener('change', loadGames)

if (sortModeEl) {
    sortModeEl.addEventListener('change', () => {
        sortMode = sortModeEl.value
        loadGames()
    })
}

if (sortDirBtn) {
    sortDirBtn.addEventListener('click', () => {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc'
        sortDirBtn.textContent = sortDir === 'asc' ? 'A→Z' : 'Z→A'
        loadGames()
    })
}

if (groupModeEl) {
    groupModeEl.addEventListener('change', () => {
        groupMode = groupModeEl.value
        loadGames()
    })
}

// ---------------- Boot ----------------
loadGames()
