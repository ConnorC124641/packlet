# Packlet

Packlet is a dark themed multiplayer pack-opening prototype with a shared server, Fruit Pack, live chat, bazaar, trading, clans, stats, Plus, boosters, daily wheel, and admin tools.

## Run locally

```bash
npm start
```

Then open:

```text
http://localhost:4174/
```

Friends on the same Wi-Fi can join using the network URL printed by the server.

## Online multiplayer

GitHub Pages by itself cannot run Packlet multiplayer because chat, trades, bazaar, and shared progress need `server.js`.

To play online with friends, deploy this repo to a Node host such as Render, Railway, Replit, Fly.io, or Glitch.

Use:

```text
Build command: npm install
Start command: npm start
```

After it deploys, share the hosted URL with your friends. Everyone using that hosted URL will share the same Packlet world.

## Notes

- The shared game world is saved in `work/packlet-state.json`.
- That saved world file is ignored by git so a public repo does not include live player data.
- The app is currently a lightweight Node server plus one HTML file.
- Do not commit real passwords. Set up admin accounts inside your running local/server world.
