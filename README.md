# Onyx - The Bold Music Experience
﻿<img src="https://raw.githubusercontent.com/1dev-hridoy/Onyx-Music/refs/heads/main/client/public/onyyx-cover.jpg" alt="Onyx-Music Banner">
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple.svg)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)

Onyx is a brutalist, realistic, and highly polished music web-application. It abandons traditional "Spotify" aesthetics for a commanding, human-crafted dark mode complete with glassmorphism pane effects, dynamic CSS audio visualizers, and a pure Node.js background pipeline that fetches, converts, and streams audio instantly.

## 🌟 Features

- **The Bold Onyx UI**: Completely custom, brutalist layout relying on pure `#030303` black and stark white contrast, devoid of AI-generated tropes.
- **Instant Search**: Blazing fast search capabilities connecting native YTS queries to the frontend.
- **CSS Visualizer**: Bouncing 4-bar equalizer that syncs dynamically with active track playback directly on the song card.
- **Glassmorphism Styling**: Beautiful backdrop blur integration separating content from the primary controls.
- **Custom Native Library System**: Users can click the "Love" (Heart) icon to instantly persist tracks into their personal archive via a native `db.json` database.
- **Edge-Aligned Timelines**: Playback progress is mapped directly to the upper 3px edge of the master player.
- **Auto-Cleanup Daemon**: The backend features a secure caching and background 5-minute file deletion policy to never bloat disk space.

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You need Node.js and npm installed.

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/1dev-hridoy/Onyx-Music.git
   ```
2. Install all dependencies (Frontend, Backend, and Root handlers)
   ```sh
   npm run install:all
   ```

## 🛠 Usage

To start up both the React frontend (Vite) and the Express backend concurrently:

```sh
npm run dev
```

* The frontend will be hosted on `http://localhost:5173`.
* The server will run on port `5000`. Wait for the `Modular Server running on port 5000` confirmation.

To run tests in production mode:
```sh
npm run build:client
npm start
```

## 📂 Project Structure

- `/client` - The Vite + React + Tailwind frontend.
- `/server` - The Express backend.
  - `/controllers` - Logic for music searching, downloading, and library management.
  - `/routes` - API router setup.
  - `/services` - Downloader wrappers logic.
  - `/utils` - Safe access layer for the `db.json` NoSQL DB.
- `/temp` - The volatile audio storage directory (auto-cleaned).

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
