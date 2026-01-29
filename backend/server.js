// =======================================
// Game Spot Backend - server.js
// =======================================

const express = require('express')
const mysql = require('mysql2/promise')
const cors = require('cors')

const app = express()
const PORT = 3000

// ---------------------------------------
// Middleware
// ---------------------------------------
app.use(cors())
app.use(express.json())

// ---------------------------------------
// Database connection
// ---------------------------------------
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root', // <-- change if needed
    database: 'game_spot_db'
})

// ---------------------------------------
// Validation helper
// ---------------------------------------
function validateGamePayload(body) {
    const { title, developer, price, genres, platforms } = body

    if (!title || typeof title !== 'string') {
        return 'Title is required.'
    }

    if (!developer || typeof developer !== 'string') {
        return 'Developer is required.'
    }

    if (typeof price !== 'number' || Number.isNaN(price)) {
        return 'Price must be a number.'
    }

    if (!Array.isArray(genres) || genres.length === 0) {
        return 'At least one genre is required.'
    }

    if (!Array.isArray(platforms) || platforms.length === 0) {
        return 'At least one platform is required.'
    }

    return null
}

// ---------------------------------------
// GET /api/games
// ---------------------------------------
app.get('/api/games', async (req, res) => {
    try {
        // 1. Get base game data
        const [games] = await db.query(`
      SELECT *
      FROM games
      ORDER BY title
    `)

        if (games.length === 0) {
            return res.json([])
        }

        const gameIds = games.map((g) => g.id)

        // 2. Get genres
        const [genres] = await db.query(
            `
      SELECT gg.game_id, g.name
      FROM game_genres gg
      JOIN genres g ON g.id = gg.genre_id
      WHERE gg.game_id IN (?)
    `,
            [gameIds]
        )

        // 3. Get platforms
        const [platforms] = await db.query(
            `
      SELECT gp.game_id, p.name
      FROM game_platforms gp
      JOIN platforms p ON p.id = gp.platform_id
      WHERE gp.game_id IN (?)
    `,
            [gameIds]
        )

        // 4. Attach arrays to games
        const result = games.map((game) => ({
            ...game,
            genres: genres
                .filter((g) => g.game_id === game.id)
                .map((g) => g.name),
            platforms: platforms
                .filter((p) => p.game_id === game.id)
                .map((p) => p.name)
        }))

        res.json(result)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Failed to load games.' })
    }
})

// ---------------------------------------
// POST /api/games
// ---------------------------------------
app.post('/api/games', async (req, res) => {
    const error = validateGamePayload(req.body)
    if (error) {
        return res.status(400).json({ error })
    }

    const {
        title,
        developer,
        price,
        currency = 'SEK',
        release_year,
        genres,
        platforms
    } = req.body

    const conn = await db.getConnection()
    try {
        await conn.beginTransaction()

        // 1. Insert game
        const [result] = await conn.query(
            `
      INSERT INTO games (title, developer, price, currency, release_year)
      VALUES (?, ?, ?, ?, ?)
    `,
            [title, developer, price, currency, release_year]
        )

        const gameId = result.insertId

        // 2. Link genres
        for (const genre of genres) {
            const [[row]] = await conn.query(
                'SELECT id FROM genres WHERE name = ?',
                [genre]
            )
            await conn.query(
                'INSERT INTO game_genres (game_id, genre_id) VALUES (?, ?)',
                [gameId, row.id]
            )
        }

        // 3. Link platforms
        for (const platform of platforms) {
            const [[row]] = await conn.query(
                'SELECT id FROM platforms WHERE name = ?',
                [platform]
            )
            await conn.query(
                'INSERT INTO game_platforms (game_id, platform_id) VALUES (?, ?)',
                [gameId, row.id]
            )
        }

        await conn.commit()
        res.status(201).json({ id: gameId })
    } catch (err) {
        await conn.rollback()
        console.error(err)
        res.status(500).json({ error: 'Failed to create game.' })
    } finally {
        conn.release()
    }
})

// ---------------------------------------
// PUT /api/games/:id
// ---------------------------------------
app.put('/api/games/:id', async (req, res) => {
    const error = validateGamePayload(req.body)
    if (error) {
        return res.status(400).json({ error })
    }

    const gameId = req.params.id
    const {
        title,
        developer,
        price,
        currency = 'SEK',
        release_year,
        genres,
        platforms
    } = req.body

    const conn = await db.getConnection()
    try {
        await conn.beginTransaction()

        // 1. Update game
        await conn.query(
            `
      UPDATE games
      SET title = ?, developer = ?, price = ?, currency = ?, release_year = ?
      WHERE id = ?
    `,
            [title, developer, price, currency, release_year, gameId]
        )

        // 2. Clear old links
        await conn.query('DELETE FROM game_genres WHERE game_id = ?', [gameId])
        await conn.query('DELETE FROM game_platforms WHERE game_id = ?', [
            gameId
        ])

        // 3. Insert new links
        for (const genre of genres) {
            const [[row]] = await conn.query(
                'SELECT id FROM genres WHERE name = ?',
                [genre]
            )
            await conn.query(
                'INSERT INTO game_genres (game_id, genre_id) VALUES (?, ?)',
                [gameId, row.id]
            )
        }

        for (const platform of platforms) {
            const [[row]] = await conn.query(
                'SELECT id FROM platforms WHERE name = ?',
                [platform]
            )
            await conn.query(
                'INSERT INTO game_platforms (game_id, platform_id) VALUES (?, ?)',
                [gameId, row.id]
            )
        }

        await conn.commit()
        res.json({ message: 'Game updated.' })
    } catch (err) {
        await conn.rollback()
        console.error(err)
        res.status(500).json({ error: 'Failed to update game.' })
    } finally {
        conn.release()
    }
})

// ---------------------------------------
// DELETE /api/games/:id
// ---------------------------------------
app.delete('/api/games/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM games WHERE id = ?', [req.params.id])
        res.json({ message: 'Game deleted.' })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Failed to delete game.' })
    }
})

// ---------------------------------------
// Start server
// ---------------------------------------
app.listen(PORT, () => {
    console.log(`✅ Game Spot API running at http://localhost:${PORT}`)
})
