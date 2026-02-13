# 🎮 TASK --- "You've Got My Heart"

## 🎯 Goal

Build a small browser-based Valentine mini-game called:

**"You've Got My Heart"**

It must be a pure HTML + CSS + Vanilla JS implementation (no frameworks,
no build tools).

The game must be deployable directly to GitHub Pages.

------------------------------------------------------------------------

## 📦 Scope (DO)

### 1️⃣ Core Game

-   Single `index.html`
-   `style.css`
-   `game.js`

Canvas size: 800x600\
Top-down movement.

Player: - Simple circle or square - Controlled by WASD + Arrow keys

Hearts: - Spawn randomly on map - Collected when player overlaps -
Increase counter

------------------------------------------------------------------------

### 2️⃣ Level System

Implement 5 levels:

  Level   Hearts Required
  ------- -----------------
  1       5
  2       8
  3       10
  4       12
  5       1 (gold heart)

Each level:

-   Display intro text overlay before start
-   Display transition message after completion

Texts (must match exactly):

Level 1 Intro: \> Every story starts somewhere.

Level 1 End: \> Ours started with a moment.

Level 2 Intro: \> Small things became big memories.

Level 2 End: \> That's when I knew...

Level 3 Intro: \> Love is choosing each other.

Level 3 End: \> And we keep choosing.

Level 4 Intro: \> Somewhere along the way... we became "us."

Level 4 End: \> And "us" became my favorite place.

Level 5 Intro: \> Some things are worth holding onto.

------------------------------------------------------------------------

### 3️⃣ Final Sequence

After collecting golden heart:

1.  Fade screen to dark
2.  Show:

> 📩 1 new message received.

3.  Show button: **Open Message**

When clicked:

Display email-style UI centered on screen.

------------------------------------------------------------------------

### 4️⃣ Email Content

Subject: **The Only Message That Matters**

Body:

I built this little world\
because every heart you collected\
represents something real.

A memory.\
A laugh.\
A quiet moment.

And if I could choose again...\
I would still choose you.

Happy Valentine's Day ❤️

Include button: **Reply**

When clicked:

Show:

> Status: Together.\
> Next chapter loading...

Then animate floating hearts for 3 seconds.

------------------------------------------------------------------------

## 🚫 Do NOT

-   Do NOT use React, Phaser, or any external libraries
-   Do NOT add sound
-   Do NOT add physics engine
-   Do NOT overcomplicate collision (simple bounding box or radius check
    only)

------------------------------------------------------------------------

## 🧠 Architecture

Use simple state machine:

States: - intro - playing - transition - finalIntro - email - ending

Game loop: - requestAnimationFrame

Collision: - distance check between player and heart

------------------------------------------------------------------------

## 🎨 Visual Style

-   Soft pastel background (#fdf6f0 or similar)
-   Hearts red (#ff4d6d)
-   Gold heart (#ffd166)
-   Smooth fade transitions
-   Clean sans-serif font

Minimal but elegant.

------------------------------------------------------------------------

## 🧪 Testing Expectations

Manual test cases:

-   Player moves correctly in all directions
-   Hearts spawn inside bounds
-   Collision increments counter
-   Level transitions occur correctly
-   Golden heart triggers final screen
-   Email UI renders correctly
-   Reply button triggers final animation

Game must work in: - Chrome - Safari - Mobile Chrome

No console errors allowed.

------------------------------------------------------------------------

## ✅ Acceptance Criteria

-   Fully playable 5-level experience
-   All texts displayed correctly
-   Final email screen works
-   No external dependencies
-   Ready to deploy as static site

------------------------------------------------------------------------

## 📁 Deliverables

Project structure:

/valentine-game\
├── index.html\
├── style.css\
└── game.js

All code clean, commented, readable.
