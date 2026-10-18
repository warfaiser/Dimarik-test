# Minecraft Survival Bot (Java Edition)

A rule-based Mineflayer bot that searches and performs work within a configured radius of its base. It can craft and place a crafting table, furnace, chest, and bed when the necessary materials are available; collect wool from nearby sheep for the bed; sleep at night; eat from inventory; gather food from a configured field or nearby passive animals; craft wooden/stone tools; smelt raw iron; and mine **reachable, exposed** ore blocks in the loaded area. If its inventory fills, it stores non-essential items in its chest.

The previous garden-only bot is still available with `npm run garden`; the new survival bot is the default.

## Important limits

This is autonomous game logic, not a neural network. It can build the basic workstations and bed, but it cannot conjure resources: it needs reachable wood, stone, and sheep wool, and it does not construct house walls. It does not dig new tunnels or explore faraway caves: it only considers blocks and animals loaded within the configured radius, and mines ore blocks it can reach. It avoids ore next to lava and retreats when health is low, but Minecraft hazards and server rules can still defeat or reject it. Test in a private world first. It does not bypass anti-cheat or protections.

## Requirements

- Node.js 20 or newer
- A Minecraft Java Edition world/server the bot account is allowed to join
- Reachable wood, stone, and sheep nearby; the bot can make its own basic stations and bed from these materials

## Setup

```sh
cd minecraft-garden-bot
npm install
cp survival-config.example.json survival-config.json
```

Edit `survival-config.json` before starting:

- `server.host`, `port`: Java server address and port.
- `server.username`: bot nickname for offline mode; Microsoft account email when using Microsoft auth. Use a unique nickname and log out of any other player already using it.
- `server.version`: leave `false` for auto-detection or set the exact Java server version.
- `server.auth`: `offline` only for an offline-mode/private server; use `microsoft` for online mode.
- `server.authMe`: when `true`, the bot prompts for its AuthMe password with terminal input hidden. The password is not written to config or logs. Do not send it in chat; rotate it if it has been shared.
- `home.x/y/z`: base/work center. The example uses the mining point from your screenshot: 2343, 51, -2002.
- `home.bed`: nearby target where the bot tries to place a bed; it needs three matching wool and three planks.
- `home.storageChest`: nearby target for a chest; it needs eight planks.
- `home.craftingTable` and `home.furnace`: nearby target positions for these stations. The blocks below must be solid and the spaces clear. The bot crafts/places them when it has enough materials.
- `limits.radius`: maximum horizontal work radius around home. Also set the vertical range with `minY` and `maxY`.
- `foodFarm`: optional rectangle where mature wheat, carrots, potatoes, or beetroot are collected and replanted when the bot is hungry. If you have no food field, set this to `null`; keep food in the chest or animals within range instead.

Start the survival bot from an interactive terminal (keep that terminal open; AuthMe password input is hidden):

```sh
npm start
```

When it joins, teleport the configured nickname to the mine point if it did not spawn there:

```text
/tp SurvivalHelper 2343 51 -2002
```

Change `SurvivalHelper` if you use another `server.username`. The example server address and mine coordinates are filled from the conversation; the nearby workstation spots are suggested offsets, so check that there is solid floor and free space there before letting the bot place blocks.

Or start the old crop-only bot (first create and edit its separate config with `cp config.example.json config.json`):

```sh
npm run garden
```

The sample is prefilled with the server address and mine coordinates provided, but the bot nickname must be unique and allowed by the server. Keep both config files private; they are git-ignored.
