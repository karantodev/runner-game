import { VoxelBlockRenderer } from '../render/renderers/scenery/VoxelBlockRenderer.js';
import { ThreeModelRenderer } from '../render/renderers/three/ThreeModelRenderer.js';

const ROWS = Object.freeze([
  { group: 'Blocks', label: 'Grass block L', ref: 'grassDirtBlockLeft', draw: (r, x, y) => r.drawCube(x, y, 1.18, { material: 'grass', side: -1, variant: 0, width: 92, height: 68 }) },
  { group: 'Blocks', label: 'Grass flower block', ref: 'grassDirtBlockFlower01', draw: (r, x, y) => r.drawCube(x, y, 1.18, { material: 'grass', side: 1, variant: 2, width: 92, height: 68 }) },
  { group: 'Blocks', label: 'Grass steps', ref: 'grassDirtStepLeft', draw: (r, x, y) => r.drawSteps(x, y, 1.02, { material: 'grass', side: -1, variant: 1 }) },
  { group: 'Blocks', label: 'Grass platform', ref: 'grassDirtPlatformLongLeft', draw: (r, x, y) => r.drawPlatform(x, y, 0.88, { material: 'grass', side: -1, variant: 2, units: 4 }) },
  { group: 'Blocks', label: 'Stone wall', ref: 'stoneWallLowLeft', draw: (r, x, y) => r.drawPlatform(x, y, 1, { material: 'stone', side: -1, variant: 3, units: 2 }) },
  { group: 'Blocks', label: 'Purple brick', ref: 'purpleBrickSingleLeft', draw: (r, x, y) => r.drawCube(x, y, 1.1, { material: 'purple', side: -1, variant: 4, width: 82, height: 64 }) },
  { group: 'Blocks', label: 'Question block', ref: 'questionBlockAnim01', draw: (r, x, y) => r.drawQuestionCube(x, y - 4, 1.22, { variant: 0 }) },

  { group: 'Structures', label: 'Hanging platform', ref: 'platformHangingVinesLeft', draw: (r, x, y) => r.drawHangingPlatform(x, y, 1.05, { side: -1, variant: 1 }) },
  { group: 'Structures', label: 'Fence L', ref: 'fenceWoodSpriteLeft', draw: (r, x, y) => r.drawFence(x, y, 1.15, { side: -1, variant: 2 }) },
  { group: 'Structures', label: 'Fence R', ref: 'fenceWoodSpriteRight', draw: (r, x, y) => r.drawFence(x, y, 1.15, { side: 1, variant: 3 }) },
  { group: 'Structures', label: 'Pipe', ref: 'pipeGreenSprite', draw: (r, x, y) => r.drawPipe(x, y, 1.05, { side: -1 }) },
  { group: 'Structures', label: 'Planter L', ref: 'planterPotLeft', draw: (r, x, y) => r.drawPlanter(x, y, 1.3, { side: -1, variant: 0 }) },
  { group: 'Structures', label: 'Planter R', ref: 'planterPotRight', draw: (r, x, y) => r.drawPlanter(x, y, 1.3, { side: 1, variant: 1 }) },

  { group: 'Large Flora', label: 'Tree', ref: 'treeRoundSprite', draw: (r, x, y) => r.drawTree(x, y, 0.9, { variant: 2 }) },
  { group: 'Large Flora', label: 'Large bush', ref: 'bushLarge', draw: (r, x, y) => r.drawBush(x, y, 0.95, { large: true, variant: 3 }) },
  { group: 'Large Flora', label: 'Flower bush', ref: 'bushLargeFlower', draw: (r, x, y) => r.drawBush(x, y, 0.95, { large: true, flowers: true, variant: 4 }) },
  { group: 'Large Flora', label: 'Red mushroom', ref: 'mushroomRedBig', draw: (r, x, y) => r.drawMushroom(x, y, 1, { variant: 'red' }) },
  { group: 'Large Flora', label: 'Purple mushroom', ref: 'mushroomPurple', draw: (r, x, y) => r.drawMushroom(x, y, 1, { variant: 'purple' }) },
  { group: 'Large Flora', label: 'Blue mushroom', ref: 'mushroomBlue', draw: (r, x, y) => r.drawMushroom(x, y, 0.98, { variant: 'blue' }) },

  { group: 'Low Flora', label: 'Small flower', ref: 'yellowFlowerSmall', draw: (r, x, y) => r.drawSmallFlower(x, y, 1.8, { variant: 0 }) },
  { group: 'Low Flora', label: 'Purple cluster', ref: 'purpleFlowerCluster', draw: (r, x, y) => r.drawSmallFlower(x, y, 1.8, { variant: 1 }) },
  { group: 'Low Flora', label: 'Sprout', ref: 'sproutSoil', draw: (r, x, y) => r.drawSprout(x, y, 1.75, { variant: 1 }) },
  { group: 'Low Flora', label: 'Wheat', ref: 'wheatTuft', draw: (r, x, y) => r.drawWheat(x, y, 1.25, { variant: 2 }) },
  { group: 'Low Flora', label: 'Grass tuft', ref: 'grassTuftSmall', draw: (r, x, y) => r.drawGrassTuft(x, y, 1.45, { variant: 1 }) },
  { group: 'Low Flora', label: 'Large tuft', ref: 'grassTuftLarge', draw: (r, x, y) => r.drawGrassTuft(x, y, 1.25, { large: true, variant: 3 }) },
  { group: 'Low Flora', label: 'Dry grass', ref: 'dryGrassObstacle', draw: (r, x, y) => r.drawGrassTuft(x, y, 1.18, { large: true, dry: true, variant: 2 }) },
  { group: 'Low Flora', label: 'Leaf clump', ref: 'leafClumpRound', draw: (r, x, y) => r.drawLeafClump(x, y, 1.05, { round: true, variant: 2 }) },

  { group: 'Gameplay', label: 'Vine barrier', ref: 'vineBarrierFull', draw: (r, x, y) => r.drawVineBarrier(x, y, 150, 0.9, { phase: 0.7 }) },
  { group: 'Gameplay', label: 'Low overhang', ref: 'lowBranchOverhang', draw: (r, x, y) => r.drawOverhang(x, y - 12, 156, 0.92, { variant: 'branch', accent: 0.5 }) },
  { group: 'Gameplay', label: 'Web overhang', ref: 'spiderWebOverhang', draw: (r, x, y) => r.drawOverhang(x, y - 12, 156, 0.92, { variant: 'web', accent: 0.5 }) },
  { group: 'Gameplay', label: 'Orchid pickup', ref: 'orchidGoldMain', draw: (r, x, y) => r.drawPickupFlower(x, y, 1.45, { rich: false }) },
  { group: 'Gameplay', label: 'Rare orchid', ref: 'orchidBlueRare', draw: (r, x, y) => r.drawPickupFlower(x, y, 1.45, { rare: true }) },
  { group: 'Gameplay', label: 'Life heart', ref: 'lifeHeart', draw: (r, x, y) => r.drawHeartPickup(x, y - 22, 1.35) },
  { group: 'Gameplay', label: 'Power pickup', ref: 'pickupMagnet', draw: (r, x, y) => r.drawPowerPickup(x, y, 1.28, { color: '#ff7ad6' }) },
]);

const GROUPS = ['all', ...new Set(ROWS.map((row) => row.group))];

export function createSceneryQaSheet({
  game,
  initialFilter = '',
  initialGroup = 'all',
  initialOpen = false,
} = {}) {
  if (!game?.renderer) throw new Error('Scenery QA requires a booted game renderer');

  const root = document.createElement('section');
  root.id = 'scenery-qa-sheet';
  root.className = 'scenery-qa-sheet';
  root.setAttribute('aria-hidden', 'true');

  const panel = document.createElement('div');
  panel.className = 'scenery-qa-panel';
  root.appendChild(panel);

  const header = document.createElement('header');
  header.className = 'scenery-qa-header';
  panel.appendChild(header);

  const title = document.createElement('h2');
  title.textContent = '3D Asset QA';
  header.appendChild(title);

  const controls = document.createElement('div');
  controls.className = 'scenery-qa-controls';
  header.appendChild(controls);

  const groupSelect = document.createElement('select');
  groupSelect.setAttribute('aria-label', 'QA group');
  for (const group of GROUPS) {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = group === 'all' ? 'All groups' : group;
    groupSelect.appendChild(option);
  }
  groupSelect.value = GROUPS.includes(initialGroup) ? initialGroup : 'all';
  controls.appendChild(groupSelect);

  const filterInput = document.createElement('input');
  filterInput.type = 'search';
  filterInput.placeholder = 'Filter';
  filterInput.value = initialFilter;
  controls.appendChild(filterInput);

  const refreshButton = document.createElement('button');
  refreshButton.type = 'button';
  refreshButton.textContent = 'Refresh';
  controls.appendChild(refreshButton);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close Scenery QA');
  closeButton.textContent = 'Close';
  controls.appendChild(closeButton);

  const grid = document.createElement('div');
  grid.className = 'scenery-qa-grid';
  panel.appendChild(grid);

  let openState = false;

  function getFilteredRows() {
    const q = filterInput.value.trim().toLowerCase();
    const group = groupSelect.value;
    return ROWS.filter((row) => {
      if (group !== 'all' && row.group !== group) return false;
      if (!q) return true;
      return `${row.group} ${row.label} ${row.ref}`.toLowerCase().includes(q);
    });
  }

  function drawReference(ctx, image, width, height, baselineY) {
    ctx.fillStyle = '#d5e0c9';
    ctx.fillRect(0, baselineY, width, 2);
    if (!image?.naturalWidth || !image.naturalHeight) {
      ctx.fillStyle = '#25351d';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('missing ref', width / 2, height / 2);
      return;
    }
    const maxW = width * 0.78;
    const maxH = height * 0.74;
    const scale = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight);
    const drawW = Math.max(1, Math.round(image.naturalWidth * scale));
    const drawH = Math.max(1, Math.round(image.naturalHeight * scale));
    ctx.drawImage(image, Math.round((width - drawW) / 2), Math.round(baselineY - drawH), drawW, drawH);
  }

  function drawCard(row) {
    const card = document.createElement('article');
    card.className = 'scenery-qa-card';

    const heading = document.createElement('div');
    heading.className = 'scenery-qa-card-title';
    heading.textContent = row.label;
    card.appendChild(heading);

    const canvases = document.createElement('div');
    canvases.className = 'scenery-qa-canvases';
    card.appendChild(canvases);

    const refCanvas = document.createElement('canvas');
    refCanvas.width = 190;
    refCanvas.height = 170;
    refCanvas.className = 'scenery-qa-canvas';
    canvases.appendChild(wrapCanvas('PNG', refCanvas));

    const voxelCanvas = document.createElement('canvas');
    voxelCanvas.width = 190;
    voxelCanvas.height = 170;
    voxelCanvas.className = 'scenery-qa-canvas';
    canvases.appendChild(wrapCanvas('3D', voxelCanvas));

    paintCell(refCanvas, (ctx) => drawReference(ctx, game.assets.get(row.ref), refCanvas.width, refCanvas.height, 138));
    paintCell(voxelCanvas, (ctx) => {
      const renderer = new VoxelBlockRenderer(ctx, {
        style: 'voxel',
        threeModels: game.renderer.threeModels ?? new ThreeModelRenderer({ enabled: true }),
      });
      row.draw(renderer, voxelCanvas.width / 2, 138);
    });

    const meta = document.createElement('div');
    meta.className = 'scenery-qa-meta';
    meta.textContent = `${row.group} · ${row.ref}`;
    card.appendChild(meta);
    return card;
  }

  function wrapCanvas(label, canvas) {
    const wrap = document.createElement('figure');
    const caption = document.createElement('figcaption');
    caption.textContent = label;
    wrap.appendChild(canvas);
    wrap.appendChild(caption);
    return wrap;
  }

  function paintCell(canvas, paint) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f0f5e8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#b9c9a9';
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
    paint(ctx);
  }

  function render() {
    grid.replaceChildren(...getFilteredRows().map(drawCard));
  }

  function open() {
    openState = true;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    render();
    return getState();
  }

  function close() {
    openState = false;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    return getState();
  }

  function toggle(force) {
    return (force ?? !openState) ? open() : close();
  }

  function getState() {
    return {
      open: openState,
      rows: getFilteredRows().length,
      totalRows: ROWS.length,
      visibleCount: getFilteredRows().length,
      caseCount: ROWS.length,
      group: groupSelect.value,
      filter: filterInput.value,
    };
  }

  groupSelect.addEventListener('change', render);
  filterInput.addEventListener('input', render);
  refreshButton.addEventListener('click', render);
  closeButton.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });

  document.body.appendChild(root);
  if (initialOpen) open();

  return { open, close, toggle, render, getState };
}
