import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mineflayer from 'mineflayer';
import { Vec3 } from 'vec3';
import pathfinderPlugin from 'mineflayer-pathfinder';
const { pathfinder, Movements, goals } = pathfinderPlugin;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, 'config.json');

const CROPS = {
  wheat: { block: 'wheat', seed: 'wheat_seeds', maxAge: 7, drops: ['wheat', 'wheat_seeds'] },
  carrots: { block: 'carrots', seed: 'carrot', maxAge: 7, drops: ['carrot'] },
  potatoes: { block: 'potatoes', seed: 'potato', maxAge: 7, drops: ['potato', 'poisonous_potato'] },
  beetroots: { block: 'beetroots', seed: 'beetroot_seeds', maxAge: 3, drops: ['beetroot', 'beetroot_seeds'] },
};

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error('Missing config.json. Copy config.example.json to config.json and set your server and farm coordinates.');
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  for (const key of ['host', 'port', 'username']) {
    if (config.server?.[key] === undefined || config.server?.[key] === '') throw new Error(`Set server.${key} in config.json`);
  }
  const farm = config.farm;
  if (!farm || !['x1', 'x2', 'z1', 'z2', 'cropY'].every((key) => Number.isInteger(farm[key]))) {
    throw new Error('farm must define integer x1, x2, z1, z2, and cropY coordinates.');
  }
  if (!Array.isArray(farm.crops) || farm.crops.length === 0 || farm.crops.some((crop) => !CROPS[crop])) {
    throw new Error(`farm.crops must contain one or more of: ${Object.keys(CROPS).join(', ')}`);
  }
  if (!config.storage || !['x', 'y', 'z'].every((key) => Number.isInteger(config.storage[key]))) {
    throw new Error('storage must define integer x, y, and z coordinates for a chest.');
  }
  return config;
}

const config = loadConfig();
const bot = mineflayer.createBot({
  host: config.server.host,
  port: config.server.port,
  username: config.server.username,
  version: config.server.version === false ? false : (config.server.version || undefined),
  auth: config.server.auth || 'offline',
});

bot.loadPlugin(pathfinder);
let working = false;
let cycleTimer;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const position = (x, y, z) => new Vec3(x, y, z);

async function moveNear(pos, range = 1.5) {
  await bot.pathfinder.goto(new goals.GoalNear(pos.x, pos.y, pos.z, range));
}

function isMature(block, crop) {
  const age = block.getProperties()?.age;
  return typeof age === 'number' && age >= crop.maxAge;
}

function findSeed(crop) {
  return bot.inventory.items().find((item) => item.name === crop.seed);
}

async function harvestAndReplant(x, z, crop) {
  const cropPos = position(x, config.farm.cropY, z);
  let block = bot.blockAt(cropPos);
  if (!block || block.name !== crop.block || !isMature(block, crop)) return false;

  await moveNear(cropPos, 1.5);
  block = bot.blockAt(cropPos);
  if (!block || block.name !== crop.block || !isMature(block, crop)) return false;
  if (!bot.canDigBlock(block)) {
    console.log(`Cannot reach ${crop.block} at ${x}, ${config.farm.cropY}, ${z}; skipping.`);
    return false;
  }

  await bot.dig(block);
  await sleep(250);

  const soil = bot.blockAt(cropPos.offset(0, -1, 0));
  const aboveSoil = bot.blockAt(cropPos);
  const seed = findSeed(crop);
  if (soil && soil.name === 'farmland' && aboveSoil?.name === 'air' && seed) {
    await bot.equip(seed, 'hand');
    await bot.placeBlock(soil, new Vec3(0, 1, 0));
    console.log(`Harvested and replanted ${crop.block} at ${x}, ${config.farm.cropY}, ${z}.`);
  } else if (!seed) {
    console.warn(`Harvested ${crop.block} at ${x}, ${config.farm.cropY}, ${z}, but there are no ${crop.seed} to replant.`);
  } else {
    console.warn(`Harvested ${crop.block} at ${x}, ${config.farm.cropY}, ${z}, but the farmland is not clear/valid; left it alone.`);
  }
  return true;
}

async function depositHarvest() {
  const { x, y, z } = config.storage;
  const chestPos = position(x, y, z);
  await moveNear(chestPos, 2);
  const chest = bot.blockAt(chestPos);
  if (!chest || !['chest', 'trapped_chest'].includes(chest.name)) {
    console.warn(`No chest at storage coordinates ${x}, ${y}, ${z}; keeping items in inventory.`);
    return;
  }

  const container = await bot.openContainer(chest);
  try {
    const wanted = new Set(config.farm.crops.flatMap((name) => CROPS[name].drops));
    for (const item of [...bot.inventory.items()]) {
      if (!wanted.has(item.name)) continue;
      try {
        await container.deposit(item.type, item.metadata, item.count);
        console.log(`Stored ${item.count} ${item.name}.`);
      } catch (error) {
        console.warn(`Could not store ${item.name}: ${error.message}`);
        break;
      }
    }
  } finally {
    container.close();
  }
}

async function runFarmCycle() {
  if (working || !bot.entity) return;
  working = true;
  try {
    const { x1, x2, z1, z2, cropY, crops } = config.farm;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);
    console.log(`Starting farm check at crop Y=${cropY}, area X=${minX}..${maxX}, Z=${minZ}..${maxZ}.`);

    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        for (const cropName of crops) {
          await harvestAndReplant(x, z, CROPS[cropName]);
        }
      }
    }
    await depositHarvest();
    console.log('Farm cycle complete.');
  } catch (error) {
    console.error(`Farm cycle stopped: ${error.message}`);
  } finally {
    working = false;
  }
}

bot.once('spawn', async () => {
  const movements = new Movements(bot);
  movements.canDig = false;
  movements.allow1by1towers = false;
  bot.pathfinder.setMovements(movements);
  console.log(`Connected as ${bot.username}. Farm bot is ready.`);
  await runFarmCycle();
  const delay = Math.max(10, Number(config.cycleDelaySeconds) || 60) * 1000;
  cycleTimer = setInterval(() => void runFarmCycle(), delay);
});

bot.on('kicked', (reason) => console.error('Kicked from server:', reason));
bot.on('error', (error) => console.error('Minecraft connection error:', error.message));
bot.on('end', () => {
  clearInterval(cycleTimer);
  console.error('Disconnected from the server. Restart the bot to reconnect.');
  process.exitCode = 1;
});

process.on('SIGINT', () => {
  console.log('\nStopping garden bot...');
  bot.quit('Garden bot stopped');
  setTimeout(() => process.exit(0), 500);
});
