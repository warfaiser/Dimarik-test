import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mineflayer from 'mineflayer';
import { Vec3 } from 'vec3';
import pathfinderPlugin from 'mineflayer-pathfinder';

const { pathfinder, Movements, goals } = pathfinderPlugin;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, 'survival-config.json');
const ORES = /^(deepslate_)?(coal|iron|copper|gold|redstone|lapis|diamond|emerald)_ore$/;
const LOGS = /(_log|_wood|_stem)$/;
const FOOD = new Set([
  'apple', 'bread', 'baked_potato', 'carrot', 'potato', 'beetroot', 'sweet_berries',
  'glow_berries', 'melon_slice', 'cooked_beef', 'cooked_porkchop', 'cooked_chicken',
  'cooked_mutton', 'cooked_rabbit', 'cooked_cod', 'cooked_salmon', 'beef', 'porkchop',
  'chicken', 'mutton', 'rabbit', 'cod', 'salmon', 'dried_kelp',
]);
const FARM_CROPS = {
  wheat: { block: 'wheat', seed: 'wheat_seeds', maxAge: 7, food: 'bread' },
  carrots: { block: 'carrots', seed: 'carrot', maxAge: 7, food: 'carrot' },
  potatoes: { block: 'potatoes', seed: 'potato', maxAge: 7, food: 'baked_potato' },
  beetroots: { block: 'beetroots', seed: 'beetroot_seeds', maxAge: 3, food: 'beetroot' },
};
const PASSIVE_MOBS = new Set(['cow', 'pig', 'chicken', 'sheep', 'rabbit']);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const vec = (p) => new Vec3(p.x, p.y, p.z);
const isNight = () => bot.time && bot.time.timeOfDay >= 12541 && bot.time.timeOfDay <= 23458;

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error('Missing survival-config.json. Copy survival-config.example.json to survival-config.json and edit server/home coordinates.');
  }
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  for (const key of ['host', 'port', 'username']) {
    if (cfg.server?.[key] === undefined || cfg.server[key] === '') throw new Error(`Set server.${key} in survival-config.json`);
  }
  for (const key of ['x', 'y', 'z']) {
    if (!Number.isInteger(cfg.home?.[key])) throw new Error(`Set integer home.${key} in survival-config.json`);
  }
  for (const location of ['bed', 'storageChest', 'craftingTable', 'furnace']) {
    for (const key of ['x', 'y', 'z']) {
      if (!Number.isInteger(cfg.home?.[location]?.[key])) throw new Error(`Set integer home.${location}.${key} in survival-config.json.`);
    }
  }
  const limits = cfg.limits ?? {};
  if (!Number.isInteger(limits.radius) || limits.radius < 4 || !Number.isInteger(limits.minY) || !Number.isInteger(limits.maxY) || limits.minY >= limits.maxY) {
    throw new Error('limits must define radius (>= 4), minY, and maxY.');
  }
  if (cfg.foodFarm && (!Array.isArray(cfg.foodFarm.crops) || cfg.foodFarm.crops.some((crop) => !FARM_CROPS[crop]))) {
    throw new Error(`foodFarm.crops supports: ${Object.keys(FARM_CROPS).join(', ')}`);
  }
  return cfg;
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
let cycleBusy = false;
let cycleTimer;
let home = vec(config.home);
const radius = config.limits.radius;
let nightTransitionHandled = false;

bot.on('time', () => {
  const night = isNight();
  if (!night) {
    nightTransitionHandled = false;
    return;
  }
  if (nightTransitionHandled || !bot.entity) return;
  nightTransitionHandled = true;
  if (cycleBusy) bot.pathfinder.setGoal(null);
  else void runCycle();
});

function insideWorkArea(pos) {
  const dx = pos.x - home.x;
  const dz = pos.z - home.z;
  return dx * dx + dz * dz <= radius * radius && pos.y >= config.limits.minY && pos.y <= config.limits.maxY;
}

function nearbyBlock(matcher, count = 1) {
  const blocks = bot.findBlocks({
    matching: (block) => matcher(block) && insideWorkArea(block.position),
    maxDistance: radius,
    count,
  });
  return blocks.map((pos) => bot.blockAt(pos)).filter(Boolean);
}

async function goNear(pos, range = 2) {
  if (!insideWorkArea(pos) && pos.distanceTo(home) > radius + 2) throw new Error('Target is outside the configured work radius.');
  await bot.pathfinder.goto(new goals.GoalNear(pos.x, pos.y, pos.z, range));
}

function itemCount(name) {
  return bot.inventory.items().filter((item) => item.name === name).reduce((sum, item) => sum + item.count, 0);
}

function inventoryFull() {
  return bot.inventory.emptySlotCount() === 0;
}

async function equipBestTool(type) {
  const ranks = type === 'pickaxe'
    ? ['netherite_pickaxe', 'diamond_pickaxe', 'iron_pickaxe', 'stone_pickaxe', 'wooden_pickaxe', 'golden_pickaxe']
    : ['netherite_axe', 'diamond_axe', 'iron_axe', 'stone_axe', 'wooden_axe', 'golden_axe'];
  for (const name of ranks) {
    const tool = bot.inventory.items().find((item) => item.name === name);
    if (tool) {
      await bot.equip(tool, 'hand');
      return name;
    }
  }
  return null;
}

async function mineBlock(block, toolType = 'pickaxe') {
  if (!block || !insideWorkArea(block.position) || !bot.canDigBlock(block)) return false;
  const nearbyDanger = [
    block.position.offset(1, 0, 0), block.position.offset(-1, 0, 0),
    block.position.offset(0, 1, 0), block.position.offset(0, -1, 0),
    block.position.offset(0, 0, 1), block.position.offset(0, 0, -1),
  ].some((pos) => ['lava', 'flowing_lava'].includes(bot.blockAt(pos)?.name));
  if (nearbyDanger) {
    console.warn(`Skipping ${block.name} near lava at ${block.position}.`);
    return false;
  }
  if (toolType) await equipBestTool(toolType);
  await bot.dig(block);
  await sleep(500);
  return true;
}

async function craftByName(name, table = null, amount = 1) {
  const item = bot.registry.itemsByName[name];
  if (!item) return false;
  const recipes = bot.recipesFor(item.id, null, amount, table);
  if (!recipes.length) return false;
  await bot.craft(recipes[0], amount, table);
  console.log(`Crafted ${name}.`);
  return true;
}

async function ensurePlanks() {
  if (bot.inventory.items().filter((item) => item.name.endsWith('_planks')).reduce((sum, item) => sum + item.count, 0) >= 4) return true;
  const log = bot.inventory.items().find((item) => LOGS.test(item.name));
  if (!log) return false;
  const plankName = log.name.replace(/_(log|wood|stem)$/, '_planks');
  return craftByName(plankName, null, 1);
}

async function ensureSticks() {
  if (itemCount('stick') >= 2) return true;
  if (!await ensurePlanks()) return false;
  const plank = bot.inventory.items().find((item) => item.name.endsWith('_planks'));
  return plank ? craftByName('stick', null, 1) : false;
}

async function getCraftingTable() {
  const target = config.home.craftingTable;
  if (!target) return null;
  let block = bot.blockAt(vec(target));
  if (block?.name === 'crafting_table') return block;
  if (!insideWorkArea(vec(target))) return null;
  let carried = bot.inventory.items().find((item) => item.name === 'crafting_table');
  if (!carried) {
    if (!await ensurePlanks() || !await craftByName('crafting_table')) return null;
    carried = bot.inventory.items().find((item) => item.name === 'crafting_table');
  }
  if (!carried) return null;
  const floor = bot.blockAt(vec(target).offset(0, -1, 0));
  if (!floor || !floor.boundingBox || floor.name === 'air') return null;
  await goNear(vec(target), 2);
  await bot.equip(carried, 'hand');
  await bot.placeBlock(floor, new Vec3(0, 1, 0));
  return bot.blockAt(vec(target));
}

async function getFurnace() {
  const target = config.home.furnace;
  if (!target || !insideWorkArea(vec(target))) return null;
  let block = bot.blockAt(vec(target));
  if (block && ['furnace', 'blast_furnace'].includes(block.name)) return block;
  let carried = bot.inventory.items().find((item) => item.name === 'furnace');
  if (!carried) {
    const table = await getCraftingTable();
    if (!table || itemCount('cobblestone') < 8 || !await craftByName('furnace', table)) return null;
    carried = bot.inventory.items().find((item) => item.name === 'furnace');
  }
  const floor = bot.blockAt(vec(target).offset(0, -1, 0));
  if (!carried || !floor || floor.boundingBox !== 'block') return null;
  await goNear(vec(target), 2);
  await bot.equip(carried, 'hand');
  await bot.placeBlock(floor, new Vec3(0, 1, 0));
  return bot.blockAt(vec(target));
}

async function ensureStorageChest() {
  const pos = vec(config.home.storageChest);
  let block = bot.blockAt(pos);
  if (block && ['chest', 'trapped_chest'].includes(block.name)) return true;
  const table = await getCraftingTable();
  let chestItem = bot.inventory.items().find((item) => item.name === 'chest');
  if (!chestItem && table && await craftByName('chest', table)) {
    chestItem = bot.inventory.items().find((item) => item.name === 'chest');
  }
  const floor = bot.blockAt(pos.offset(0, -1, 0));
  if (!chestItem || !floor || floor.boundingBox !== 'block' || bot.blockAt(pos)?.name !== 'air') return false;
  await goNear(pos, 2);
  await bot.equip(chestItem, 'hand');
  await bot.placeBlock(floor, new Vec3(0, 1, 0));
  console.log(`Placed a storage chest at ${pos}.`);
  return true;
}

async function ensureBed() {
  const pos = vec(config.home.bed);
  let block = bot.blockAt(pos);
  if (block?.name.endsWith('_bed')) return true;
  const table = await getCraftingTable();
  let bedItem = bot.inventory.items().find((item) => item.name.endsWith('_bed'));
  if (!bedItem) {
    const wool = bot.inventory.items().find((item) => item.name.endsWith('_wool') && item.count >= 3);
    if (!wool || !table || itemCount('oak_planks') + bot.inventory.items().filter((item) => item.name.endsWith('_planks') && item.name !== 'oak_planks').reduce((sum, item) => sum + item.count, 0) < 3) return false;
    const color = wool.name.slice(0, -5);
    if (!await craftByName(`${color}_bed`, table)) return false;
    bedItem = bot.inventory.items().find((item) => item.name === `${color}_bed`);
  }
  const floor = bot.blockAt(pos.offset(0, -1, 0));
  if (!bedItem || !floor || floor.boundingBox !== 'block' || bot.blockAt(pos)?.name !== 'air') return false;
  await goNear(pos, 2);
  await bot.equip(bedItem, 'hand');
  await bot.placeBlock(floor, new Vec3(0, 1, 0));
  console.log(`Placed a bed at ${pos}.`);
  return true;
}

async function ensureBaseFacilities() {
  const table = await getCraftingTable();
  if (!table) return false;
  await ensureBed();
  await ensureStorageChest();
  await getFurnace();
  const bed = bot.blockAt(vec(config.home.bed));
  const chest = bot.blockAt(vec(config.home.storageChest));
  const furnace = bot.blockAt(vec(config.home.furnace));
  return bed?.name.endsWith('_bed') && ['chest', 'trapped_chest'].includes(chest?.name) && ['furnace', 'blast_furnace'].includes(furnace?.name);
}

async function smeltIron() {
  if (itemCount('raw_iron') < 1) return false;
  const block = await getFurnace();
  if (!block) return false;
  await goNear(block.position, 2);
  const furnace = await bot.openFurnace(block);
  try {
    if (!furnace.inputItem()) {
      const rawIron = bot.inventory.items().find((item) => item.name === 'raw_iron');
      if (rawIron) await furnace.putInput(rawIron.type, rawIron.metadata, 1);
    }
    if (!furnace.fuelItem()) {
      const fuel = bot.inventory.items().find((item) => ['coal', 'charcoal'].includes(item.name) || item.name.endsWith('_planks') || LOGS.test(item.name));
      if (fuel) await furnace.putFuel(fuel.type, fuel.metadata, 1);
    }
    for (let second = 0; second < 15; second++) {
      await sleep(1000);
      if (furnace.outputItem()) {
        await furnace.takeOutput();
        console.log('Smelted raw iron into an iron ingot.');
        return true;
      }
    }
  } finally {
    furnace.close();
  }
  return false;
}

async function ensureBasicTools() {
  if (!bot.inventory.items().some((item) => item.name.endsWith('_pickaxe'))) {
    if (!await ensurePlanks() || !await ensureSticks()) return false;
    if (!await craftByName('wooden_pickaxe')) {
      const table = await getCraftingTable();
      if (table) await craftByName('wooden_pickaxe', table);
    }
    if (!bot.inventory.items().some((item) => item.name.endsWith('_pickaxe'))) return false;
  }
  if (!bot.inventory.items().some((item) => item.name.endsWith('_axe'))) {
    if (!await ensureSticks()) return false;
    const table = await getCraftingTable();
    await craftByName('wooden_axe', table);
  }
  if (itemCount('raw_iron') > 0 && itemCount('iron_ingot') < 3) await smeltIron();
  const table = await getCraftingTable();
  const tools = new Set(bot.inventory.items().map((item) => item.name));
  if (table && itemCount('cobblestone') >= 3 && itemCount('stick') >= 2 && !['stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe'].some((name) => tools.has(name))) {
    await craftByName('stone_pickaxe', table);
  }
  if (table && itemCount('iron_ingot') >= 3 && itemCount('stick') >= 2 && !['iron_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe'].some((name) => tools.has(name))) {
    await craftByName('iron_pickaxe', table);
  }
  if (table && itemCount('diamond') >= 3 && itemCount('stick') >= 2 && !['diamond_pickaxe', 'netherite_pickaxe'].some((name) => tools.has(name))) {
    await craftByName('diamond_pickaxe', table);
  }
  if (table && itemCount('cobblestone') >= 3 && itemCount('stick') >= 2 && !['stone_axe', 'iron_axe', 'diamond_axe', 'netherite_axe'].some((name) => tools.has(name))) {
    await craftByName('stone_axe', table);
  }
  if (table && itemCount('iron_ingot') >= 3 && itemCount('stick') >= 2 && !['iron_axe', 'diamond_axe', 'netherite_axe'].some((name) => tools.has(name))) {
    await craftByName('iron_axe', table);
  }
  if (table && itemCount('diamond') >= 3 && itemCount('stick') >= 2 && !['diamond_axe', 'netherite_axe'].some((name) => tools.has(name))) {
    await craftByName('diamond_axe', table);
  }
  return true;
}

async function craftBreadIfPossible() {
  while (itemCount('wheat') >= 3) {
    if (!await craftByName('bread')) break;
  }
}

async function eatIfHungry() {
  if (bot.food >= 18) return false;
  const meal = bot.inventory.items().find((item) => FOOD.has(item.name));
  if (!meal) return false;
  await bot.equip(meal, 'hand');
  await bot.consume();
  console.log(`Ate ${meal.name}; hunger is now ${bot.food}.`);
  return true;
}

async function withdrawFoodFromChest() {
  const pos = config.home.storageChest;
  if (!pos || bot.food >= 18) return false;
  const chest = bot.blockAt(vec(pos));
  if (!chest || !['chest', 'trapped_chest'].includes(chest.name)) return false;
  await goNear(vec(pos), 2);
  const container = await bot.openContainer(chest);
  try {
    for (const item of [...container.containerItems()]) {
      if (FOOD.has(item.name)) {
        await container.withdraw(item.type, item.metadata, Math.min(item.count, 16));
        return true;
      }
    }
  } finally {
    container.close();
  }
  return false;
}

async function collectFoodFromFarm() {
  const farm = config.foodFarm;
  if (!farm || !Array.isArray(farm.crops)) return false;
  const [minX, maxX] = [farm.x1, farm.x2].sort((a, b) => a - b);
  const [minZ, maxZ] = [farm.z1, farm.z2].sort((a, b) => a - b);
  for (let z = minZ; z <= maxZ; z++) {
    for (let x = minX; x <= maxX; x++) {
      for (const cropName of farm.crops) {
        const crop = FARM_CROPS[cropName];
        const pos = new Vec3(x, farm.cropY, z);
        let block = bot.blockAt(pos);
        let age = Number(block?.getProperties()?.age);
        if (!block || block.name !== crop.block || !Number.isFinite(age) || age < crop.maxAge || !insideWorkArea(pos)) continue;
        try {
          await goNear(pos, 1.5);
        } catch {
          if (isNight()) return false;
          continue;
        }
        block = bot.blockAt(pos);
        age = Number(block?.getProperties()?.age);
        if (!block || block.name !== crop.block || !Number.isFinite(age) || age < crop.maxAge || !bot.canDigBlock(block)) continue;
        await bot.dig(block);
        await sleep(500);
        const soil = bot.blockAt(pos.offset(0, -1, 0));
        const seed = bot.inventory.items().find((item) => item.name === crop.seed);
        if (soil?.name === 'farmland' && bot.blockAt(pos)?.name === 'air' && seed) {
          await bot.equip(seed, 'hand');
          await bot.placeBlock(soil, new Vec3(0, 1, 0));
        }
        console.log(`Collected food crop ${cropName} at ${x}, ${farm.cropY}, ${z}.`);
        if (bot.food < 18) return true;
      }
    }
  }
  return false;
}

async function huntSheepForWool() {
  const woolCount = bot.inventory.items().filter((item) => item.name.endsWith('_wool')).reduce((sum, item) => sum + item.count, 0);
  if (woolCount >= 3) return false;
  const sheep = Object.values(bot.entities)
    .filter((entity) => entity.type === 'mob' && entity.name === 'sheep' && insideWorkArea(entity.position))
    .sort((a, b) => a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position));
  for (const animal of sheep) {
    try {
      await goNear(animal.position, 2);
    } catch {
      if (isNight()) return false;
      continue;
    }
    await equipBestTool('axe');
    for (let hit = 0; hit < 6 && bot.entities[animal.id]; hit++) {
      if (animal.position.distanceTo(bot.entity.position) > 4.5) {
        try {
          await goNear(animal.position, 2);
        } catch {
          break;
        }
      }
      bot.attack(animal);
      await sleep(700);
    }
    await sleep(700);
    console.log('Hunted a nearby sheep for wool to craft a bed.');
    return true;
  }
  return false;
}

async function huntNearbyAnimal() {
  const candidates = Object.values(bot.entities)
    .filter((entity) => entity.type === 'mob' && PASSIVE_MOBS.has(entity.name) && insideWorkArea(entity.position))
    .sort((a, b) => a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position));
  for (const animal of candidates) {
    try {
      await goNear(animal.position, 2);
    } catch {
      if (isNight()) return false;
      continue;
    }
    if (!insideWorkArea(animal.position) || !PASSIVE_MOBS.has(animal.name)) continue;
    await equipBestTool('axe');
    for (let hit = 0; hit < 6 && bot.entities[animal.id]; hit++) {
      if (animal.position.distanceTo(bot.entity.position) > 4.5) {
        try {
          await goNear(animal.position, 2);
        } catch {
          break;
        }
        if (!bot.entities[animal.id]) break;
      }
      bot.attack(animal);
      await sleep(700);
    }
    await sleep(700);
    return true;
  }
  return false;
}

async function findAndMineOre() {
  const blocks = nearbyBlock((block) => ORES.test(block.name), 50);
  const pickaxes = new Set(bot.inventory.items().filter((item) => item.name.endsWith('_pickaxe')).map((item) => item.name));
  const hasStonePick = ['stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe'].some((name) => pickaxes.has(name));
  const hasIronPick = ['iron_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe'].some((name) => pickaxes.has(name));
  for (const block of blocks) {
    if (pickaxes.size === 0) continue;
    const needsStone = /(iron|copper)_ore/.test(block.name);
    const needsIron = /(gold|redstone|lapis|diamond|emerald)_ore/.test(block.name);
    if ((needsStone && !hasStonePick) || (needsIron && !hasIronPick)) continue;
    if (!bot.canDigBlock(block)) continue;
    try {
      await goNear(block.position, 1.5);
    } catch {
      if (isNight()) return false;
      continue;
    }
    const current = bot.blockAt(block.position);
    if (current && ORES.test(current.name) && await mineBlock(current, 'pickaxe')) {
      console.log(`Mined ${current.name} at ${current.position}.`);
      return true;
    }
  }
  return false;
}

async function gatherWood() {
  const logs = nearbyBlock((block) => LOGS.test(block.name), 24);
  for (const log of logs) {
    if (!bot.canDigBlock(log)) continue;
    try {
      await goNear(log.position, 1.5);
    } catch {
      if (isNight()) return false;
      continue;
    }
    const current = bot.blockAt(log.position);
    if (current && LOGS.test(current.name) && await mineBlock(current, 'axe')) {
      console.log(`Collected ${current.name}.`);
      return true;
    }
  }
  return false;
}

async function gatherStone() {
  if (!bot.inventory.items().some((item) => item.name.endsWith('_pickaxe'))) return false;
  const stoneBlocks = nearbyBlock((block) => ['stone', 'cobblestone', 'deepslate', 'cobbled_deepslate'].includes(block.name), 18);
  for (const stone of stoneBlocks) {
    if (!bot.canDigBlock(stone)) continue;
    try {
      await goNear(stone.position, 1.5);
    } catch {
      if (isNight()) return false;
      continue;
    }
    const current = bot.blockAt(stone.position);
    if (current && ['stone', 'cobblestone', 'deepslate', 'cobbled_deepslate'].includes(current.name) && await mineBlock(current, 'pickaxe')) {
      console.log(`Collected stone from ${current.name}.`);
      return true;
    }
  }
  return false;
}

async function storeSurplus() {
  const pos = config.home.storageChest;
  if (!pos || !inventoryFull()) return false;
  const chest = bot.blockAt(vec(pos));
  if (!chest || !['chest', 'trapped_chest'].includes(chest.name)) return false;
  await goNear(vec(pos), 2);
  const container = await bot.openContainer(chest);
  try {
    const keep = new Set(['bread', 'carrot', 'potato', 'baked_potato', 'wheat_seeds', 'beetroot_seeds', 'stick', 'oak_planks', 'spruce_planks', 'birch_planks', 'cobblestone', 'stone_pickaxe', 'iron_pickaxe', 'wooden_pickaxe', 'wooden_axe']);
    for (const item of [...bot.inventory.items()]) {
      if (keep.has(item.name) || FOOD.has(item.name) || item.name.endsWith('_pickaxe') || item.name.endsWith('_axe')) continue;
      await container.deposit(item.type, item.metadata, item.count);
    }
  } finally {
    container.close();
  }
  return true;
}

async function sleepAtNight() {
  if (!isNight()) return false;
  if (bot.isSleeping) return true;
  const bedPos = vec(config.home.bed);
  await goNear(home, 2);
  const bed = bot.blockAt(bedPos);
  if (!bed || !bed.name.endsWith('_bed')) {
    console.warn(`Night has fallen, but there is no bed at ${bedPos}. Returning to home and waiting safely.`);
    await sleep(5000);
    return true;
  }
  try {
    await goNear(bedPos, 2);
    await bot.sleep(bed);
    console.log('Slept through the night.');
  } catch (error) {
    console.warn(`Could not sleep: ${error.message}. Waiting near home.`);
    await goNear(home, 2).catch(() => {});
    await sleep(5000);
  }
  return true;
}

async function runCycle() {
  if (cycleBusy || !bot.entity) return;
  cycleBusy = true;
  try {
    if (await sleepAtNight()) return;
    if (bot.health < 8) {
      console.warn(`Health is low (${bot.health}); retreating to home and pausing risky work.`);
      await eatIfHungry();
      await goNear(home, 2).catch(() => {});
      await sleep(5000);
      return;
    }
    await craftBreadIfPossible();
    if (await eatIfHungry()) return;
    if (bot.food < 16 && await withdrawFoodFromChest()) return;
    if (isNight()) return;
    if (bot.food < 16 && await collectFoodFromFarm()) return;
    if (isNight()) return;
    if (bot.food < 16 && await huntNearbyAnimal()) return;
    if (isNight()) return;

    await ensureBasicTools();
    if (isNight()) return;
    await ensureBaseFacilities();
    if (isNight()) return;
    const plankCount = bot.inventory.items().filter((item) => item.name.endsWith('_planks')).reduce((sum, item) => sum + item.count, 0);
    const woolCount = bot.inventory.items().filter((item) => item.name.endsWith('_wool')).reduce((sum, item) => sum + item.count, 0);
    if (plankCount < 8 && (!bot.blockAt(vec(config.home.storageChest)) || bot.blockAt(vec(config.home.storageChest)).name !== 'chest') && await gatherWood()) return;
    if (!bot.blockAt(vec(config.home.bed))?.name.endsWith('_bed') && woolCount < 3 && await huntSheepForWool()) return;
    if (itemCount('cobblestone') < 8 && !['furnace', 'blast_furnace'].includes(bot.blockAt(vec(config.home.furnace))?.name) && await gatherStone()) return;
    if (await storeSurplus()) return;
    if (isNight()) return;
    if (await findAndMineOre()) return;
    if (isNight()) return;
    if (!bot.inventory.items().some((item) => item.name.endsWith('_axe')) && await gatherWood()) return;
    if (isNight()) return;
    if (itemCount('cobblestone') < 8 && await gatherStone()) return;
    if (isNight()) return;
    if (!bot.inventory.items().some((item) => item.name.includes('pickaxe')) && await gatherWood()) return;
    if (isNight()) return;
    if (bot.food < 20 && await huntNearbyAnimal()) return;
    await goNear(home, 2).catch(() => {});
    console.log('No safe nearby task found; staying close to home.');
  } catch (error) {
    console.error(`Survival cycle paused: ${error.message}`);
    await goNear(home, 2).catch(() => {});
  } finally {
    cycleBusy = false;
    if (isNight() && !bot.isSleeping) setTimeout(() => void runCycle(), 200);
  }
}

async function readAuthMePassword() {
  if (process.env.AUTHME_PASSWORD) return process.env.AUTHME_PASSWORD;
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    throw new Error('AuthMe is enabled. Start in a terminal for the hidden password prompt, or set AUTHME_PASSWORD locally.');
  }
  return new Promise((resolve, reject) => {
    let password = '';
    const finish = (error) => {
      input.off('data', onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(password);
    };
    const onData = (chunk) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\r' || char === '\n') return finish();
        if (char === '\u0003') return finish(new Error('Password entry cancelled.'));
        if (char === '\u007f' || char === '\b') password = password.slice(0, -1);
        else if (char >= ' ') password += char;
      }
    };
    process.stdout.write('AuthMe password (hidden): ');
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

async function authenticateAuthMe() {
  if (!config.server.authMe) return;
  await sleep(800);
  const password = await readAuthMePassword();
  bot.chat(`/login ${password}`);
  console.log('Sent AuthMe login command; password was not printed or saved.');
  await sleep(2500);
}

bot.once('spawn', async () => {
  home = vec(config.home);
  const movement = new Movements(bot);
  movement.canDig = false;
  movement.allow1by1towers = false;
  bot.pathfinder.setMovements(movement);
  console.log(`Connected as ${bot.username}.`);
  try {
    await authenticateAuthMe();
  } catch (error) {
    console.error(`AuthMe login could not be started: ${error.message}`);
    bot.quit('AuthMe login required');
    return;
  }
  console.log(`Survival bot active; work radius ${radius} blocks around home.`);
  await runCycle();
  const delay = Math.max(5, Number(config.limits.cycleDelaySeconds) || 12) * 1000;
  cycleTimer = setInterval(() => void runCycle(), delay);
});

bot.on('kicked', (reason) => console.error('Kicked from server:', reason));
bot.on('error', (error) => console.error('Minecraft connection error:', error.message));
bot.on('end', () => {
  clearInterval(cycleTimer);
  console.error('Disconnected. Restart the bot to reconnect.');
  process.exitCode = 1;
});
process.on('SIGINT', () => {
  console.log('\nStopping survival bot...');
  bot.quit('Survival bot stopped');
  setTimeout(() => process.exit(0), 500);
});
