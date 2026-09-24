import Phaser from 'phaser';
import { EVENT_BALANCE, PLAYER, RUN, TILE, VIEW_W } from '../config/balance';
import { getSector } from '../config/sectors';
import { getPalette } from '../config/palette';
import { RESOURCES } from '../config/resources';
import { Enemy } from '../entities/Enemy';
import { Player, baseSpeedFor } from '../entities/Player';
import { ResourceNode } from '../entities/ResourceNode';
import { BoltSystem, type Bolt } from '../entities/Bolts';
import { Effects } from '../effects/Effects';
import { effectsProfile } from '../effects/profile';
import { generateValidMap } from '../generation/mapGenerator';
import { InputState } from '../input/InputState';
import { computeStats } from '../progression/upgrades';
import { RunModel } from '../state/RunModel';
import { EventDirector, EVENT_DEFS, type DirectorSignal } from '../systems/events';
import type { DefeatCause, GameMap, RunResult } from '../types';
import { announce, audio, save } from '../services';
import { Hud } from '../ui/Hud';
import { Minimap } from '../ui/Minimap';
import { hasLineOfSight } from '../world/collision';
import { FlowField } from '../world/flowField';
import { pxToTile, rectContainsPx, tileCenter } from '../world/grid';

export interface GameArgs {
  sectorId: number;
  seed: string;
}

export class GameScene extends Phaser.Scene {
  private map!: GameMap;
  private run!: RunModel;
  private player!: Player;
  private gameInput!: InputState;
  private bolts!: BoltSystem;
  private effects!: Effects;
  private hud!: Hud;
  private minimap!: Minimap;
  private flow!: FlowField;
  private enemies: Enemy[] = [];
  private resources: ResourceNode[] = [];
  private director!: EventDirector;
  private sectorId = 1;
  private seed = '';
  private fireCd = 0;
  private pickupCd = 0;
  private extractHold = 0;
  private ending = false;
  private darkness?: Phaser.GameObjects.Image;
  private acidActive = false;
  private surgeUntil = 0;
  private recoveryUntil = 0;
  private waveUntil = 0;
  private flowTimer = 0;
  private effectsFlashAllowed = true;

  constructor() {
    super('Game');
  }

  init(args: GameArgs): void {
    this.sectorId = args.sectorId;
    this.seed = args.seed;
    this.ending = false;
  }

  create(): void {
    const sector = getSector(this.sectorId);
    const { map } = generateValidMap(this.seed, sector);
    this.map = map;
    this.flow = new FlowField(map);

    const stats = computeStats(save.data.upgrades);
    this.run = new RunModel(sector, this.seed, stats);

    this.cameras.main.setBounds(0, 0, map.width * TILE, map.height * TILE);
    this.cameras.main.setBackgroundColor(0x05060f);

    const palette = getPalette(save.data.settings.colorblind);
    this.effectsFlashAllowed = !save.data.settings.noFlash;
    this.drawTilemap(palette);

    const start = tileCenter(map.start.tx, map.start.ty);
    this.player = new Player(
      this,
      start.x,
      start.y,
      palette.player,
      !save.data.settings.performanceMode,
    );
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);

    this.gameInput = new InputState(this, save.data.settings.keys);
    this.bolts = new BoltSystem(this);
    this.effects = new Effects(this, effectsProfile(save.data.settings));

    this.resources = map.resources.map(
      (r) =>
        new ResourceNode(
          this,
          r.kind,
          ...tilePx(r.tx, r.ty),
          r.valueMult,
          palette,
          !save.data.settings.performanceMode,
        ),
    );
    this.enemies = map.enemies.map((e) => {
      const [x, y] = tilePx(e.tx, e.ty);
      const guard =
        e.guardTx !== undefined && e.guardTy !== undefined
          ? tilePx(e.guardTx, e.guardTy)
          : undefined;
      return new Enemy(
        this,
        { kind: e.kind, x, y, groupId: e.groupId, guardX: guard?.[0], guardY: guard?.[1] },
        palette,
        !save.data.settings.performanceMode,
      );
    });

    this.director = new EventDirector(this.seed, sector);
    this.hud = new Hud(this, sector);
    this.minimap = new Minimap(this, map, palette, VIEW_W - 160, 74);

    audio.setAmbient(true);
    announce(`Sortie lancée dans le secteur ${sector.id}, seed ${this.seed}.`);
    this.hud.notify(
      `${sector.name} — objectif : ${sector.quota} crédits de ressources récupérées.`,
    );

    this.input.keyboard?.on('keydown', this.onKeyDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.keyCode === save.data.settings.keys.pause) this.openPause();
  };

  private openPause(): void {
    if (this.ending) return;
    this.scene.pause();
    this.scene.launch('Pause', { returnTo: 'Game' });
  }

  override update(_time: number, deltaMs: number): void {
    if (this.ending) return;
    const dt = Math.min(0.05, deltaMs / 1000);

    const inBase = rectContainsPx(this.map.base, this.player.x, this.player.y);
    this.handleMovement(dt, inBase);
    this.handleFiring(dt);
    this.handlePickup(dt, inBase);
    this.handleExtraction(dt, inBase);

    this.run.tick(dt, { sprinting: this.isSprinting() && !inBase, inBase });
    this.updateEnvironmentEffects(dt, inBase);
    this.updateEnemies(dt, inBase);
    this.bolts.update(dt, this.map, {
      tryHit: (bolt) => this.handleBoltHit(bolt),
      onWallHit: (bolt) => this.effects.burst(bolt.sprite.x, bolt.sprite.y, 0x9aa4c8, 4),
    });

    for (const signal of this.director.tick(dt)) this.handleDirectorSignal(signal);

    this.player.sync(this.run.isInvulnerable);
    const dx = this.map.base.x * TILE + (this.map.base.w * TILE) / 2 - this.player.x;
    const dy = this.map.base.y * TILE + (this.map.base.h * TILE) / 2 - this.player.y;
    this.hud.update(this.run, dx, dy, inBase, inBase ? this.extractHold / RUN.extractHoldSec : 0);
    this.minimap.update(
      this.player.x,
      this.player.y,
      this.enemies,
      this.run.stats.scannerRadius,
      this.resources,
    );

    if (this.run.checkSecondaryCompleted()) {
      this.hud.notify('Objectif secondaire atteint !');
      audio.play('upgrade');
    }

    if (this.run.isDead) {
      this.endRun('defeat', this.run.deathCause ?? undefined);
    }

    this.gameInput.endFrame();
  }

  // --- Déplacement et tir ---

  private isSprinting(): boolean {
    return this.gameInput.isDown('sprint') && this.run.energy > 0.5;
  }

  private handleMovement(dt: number, inBase: boolean): void {
    let dx = 0;
    let dy = 0;
    if (this.gameInput.isDown('up')) dy -= 1;
    if (this.gameInput.isDown('down')) dy += 1;
    if (this.gameInput.isDown('left')) dx -= 1;
    if (this.gameInput.isDown('right')) dx += 1;
    const len = Math.hypot(dx, dy);
    const sprinting = this.isSprinting();
    const speed = baseSpeedFor(this.run.stats, sprinting);
    if (len > 0) {
      this.player.move(this.map, (dx / len) * speed * dt, (dy / len) * speed * dt);
    }
    void inBase;

    const pointerWorld = this.gameInput.pointerX !== 0 || this.gameInput.pointerY !== 0;
    if (pointerWorld) this.player.aimAt(this.gameInput.pointerX, this.gameInput.pointerY);
  }

  private handleFiring(dt: number): void {
    this.fireCd = Math.max(0, this.fireCd - dt);
    const wantsFire = this.gameInput.pointerDown;
    if (wantsFire && this.fireCd <= 0) {
      if (this.run.spendShot()) {
        this.bolts.spawn(
          this.player.x + Math.cos(this.player.aimAngle) * 16,
          this.player.y + Math.sin(this.player.aimAngle) * 16,
          this.player.aimAngle,
          PLAYER.boltSpeed,
          PLAYER.boltLifetime,
          this.run.stats.toolDamage,
          true,
        );
        this.fireCd = PLAYER.fireCooldown;
        audio.play('shoot');
      } else {
        audio.play('error');
        this.fireCd = 0.25;
      }
    }
  }

  private handleBoltHit(bolt: Bolt): boolean {
    if (bolt.friendly) {
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const d = Math.hypot(enemy.x - bolt.sprite.x, enemy.y - bolt.sprite.y);
        if (d < enemy.def.radius + 4) {
          const angle = Math.atan2(enemy.y - bolt.sprite.y, enemy.x - bolt.sprite.x);
          const died = enemy.takeDamage(bolt.damage, angle, this.effectsFlashAllowed);
          this.effects.burst(bolt.sprite.x, bolt.sprite.y, 0x9ff6ff, 5);
          if (died) this.onEnemyDeath(enemy);
          return true;
        }
      }
      return false;
    }
    const d = Math.hypot(this.player.x - bolt.sprite.x, this.player.y - bolt.sprite.y);
    if (d < PLAYER.radius + 5) {
      this.damagePlayer(bolt.damage, bolt.sprite.x, bolt.sprite.y);
      this.effects.burst(bolt.sprite.x, bolt.sprite.y, 0xff9a3c, 6);
      return true;
    }
    return false;
  }

  private onEnemyDeath(enemy: Enemy): void {
    const gain = this.run.registerKill(enemy.def.scorePoints);
    this.effects.burst(enemy.x, enemy.y, 0xff4d5e, 14);
    this.effects.floatText(enemy.x, enemy.y - 14, `+${gain}`, '#4dff9a');
    audio.play('enemyDie');
    enemy.destroy();
    this.enemies = this.enemies.filter((e) => e !== enemy);
  }

  // --- Récupération ---

  private handlePickup(dt: number, inBase: boolean): void {
    this.pickupCd = Math.max(0, this.pickupCd - dt);
    if (inBase) return;

    if (this.run.stats.magnetRadius > 0) {
      for (const node of this.resources) {
        if (node.collected) continue;
        const d = Math.hypot(node.px - this.player.x, node.py - this.player.y);
        if (d < this.run.stats.magnetRadius && d > 4) {
          const t = Math.min(1, (280 * dt) / d);
          node.moveTo(
            node.px + (this.player.x - node.px) * t,
            node.py + (this.player.y - node.py) * t,
          );
        }
      }
    }

    const wantsPickup = this.gameInput.isDown('interact');
    if (!wantsPickup || this.pickupCd > 0) return;
    let nearest: ResourceNode | null = null;
    let nearestDist = PLAYER.radius + this.run.stats.pickupRange;
    for (const node of this.resources) {
      if (node.collected) continue;
      const d = Math.hypot(node.px - this.player.x, node.py - this.player.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = node;
      }
    }
    if (!nearest) return;
    const result = this.run.collect(nearest.kind, nearest.valueMult);
    this.pickupCd = PLAYER.pickupCooldown;
    if (!result.accepted) {
      this.hud.notify('Soute pleine — reviens à la base ou choisis autre chose.');
      audio.play('error');
      return;
    }
    audio.play('collect');
    this.effects.burst(
      nearest.px,
      nearest.py,
      RESOURCES[nearest.kind].value > 0 ? 0x38e8ff : 0x4dff9a,
      10,
    );
    if (result.value > 0)
      this.effects.floatText(nearest.px, nearest.py - 12, `+${result.scoreGain}`, '#38e8ff');
    else this.effects.floatText(nearest.px, nearest.py - 12, `+énergie`, '#4dff9a');
    nearest.destroy();
    this.resources = this.resources.filter((n) => n !== nearest);
  }

  // --- Extraction ---

  private handleExtraction(dt: number, inBase: boolean): void {
    if (!inBase) {
      this.extractHold = 0;
      return;
    }
    if (this.gameInput.isDown('interact')) {
      this.extractHold += dt;
      if (this.extractHold >= RUN.extractHoldSec)
        this.endRun(this.run.quotaReached ? 'victory' : 'extraction');
    } else {
      this.extractHold = 0;
    }
  }

  // --- Environnement et ennemis ---

  private updateEnvironmentEffects(dt: number, inBase: boolean): void {
    if (this.acidActive && !inBase) {
      this.run.damage(EVENT_BALANCE.acidDamagePerSec * dt, true);
    }
    this.run.surgeActive = this.surgeUntil > this.run.time;
    this.run.recoveryActive = this.recoveryUntil > this.run.time;
  }

  private updateEnemies(dt: number, inBase: boolean): void {
    this.flowTimer -= dt;
    if (this.flowTimer <= 0) {
      this.flowTimer = 0.25;
      this.flow.compute(pxToTile(this.player.x), pxToTile(this.player.y));
    }
    const waveActive = this.waveUntil > this.run.time;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (waveActive) enemy.forceChase();
      enemy.update({
        map: this.map,
        flow: this.flow,
        player: { x: this.player.x, y: this.player.y, radius: PLAYER.radius },
        playerInBase: inBase,
        playerSprinting: this.isSprinting(),
        dt,
        others: this.enemies,
        flashAllowed: this.effectsFlashAllowed,
        damagePlayer: (amount, fx, fy) => this.damagePlayer(amount, fx, fy),
        fireBolt: (x, y, angle, speed, damage) => {
          this.bolts.spawn(x, y, angle, speed, 2.2, damage, false);
          audio.play('alert');
        },
        alertGroup: (groupId, source) => {
          for (const other of this.enemies) {
            if (other === source || other.groupId !== groupId || !other.alive) continue;
            other.forceAlert();
          }
        },
      });
    }
  }

  private damagePlayer(amount: number, fx: number, fy: number): void {
    if (amount <= 0) return;
    const before = this.run.hp + this.run.shield;
    const result = this.run.damage(amount);
    if (result.hullLost + result.shieldLost > 0) {
      audio.play('damage');
      this.effects.shake(0.006, 140);
      this.effects.burst(this.player.x, this.player.y, 0xff4d5e, 8);
      void fx;
      void fy;
      void before;
    }
  }

  // --- Événements aléatoires ---

  private handleDirectorSignal(signal: DirectorSignal): void {
    const def = EVENT_DEFS[signal.kind];
    if (signal.phase === 'warn') {
      this.hud.notify(def.warnText);
      audio.play('alert');
      announce(def.warnText);
      return;
    }
    if (signal.phase === 'start') {
      this.hud.notify(def.startText);
      announce(def.startText);
      switch (signal.kind) {
        case 'blackout':
          this.setDarkness(true);
          break;
        case 'acidRain':
          this.acidActive = true;
          break;
        case 'energySurge':
          this.surgeUntil = this.run.time + signal.duration;
          break;
        case 'recoveryBonus':
          this.recoveryUntil = this.run.time + signal.duration;
          break;
        case 'enemyWave':
          this.waveUntil = this.run.time + 12;
          audio.play('alert');
          break;
        case 'abandonedChest':
        case 'rareDetected':
          break;
      }
      return;
    }
    // end
    switch (signal.kind) {
      case 'blackout':
        this.setDarkness(false);
        break;
      case 'acidRain':
        this.acidActive = false;
        break;
    }
  }

  private setDarkness(on: boolean): void {
    if (!save.data.settings.reduceEffects) {
      if (on && !this.darkness) {
        this.darkness = this.add
          .image(this.player.x, this.player.y, 'darkness')
          .setDepth(40)
          .setScrollFactor(1);
      } else if (!on && this.darkness) {
        this.darkness.destroy();
        this.darkness = undefined;
      }
    }
  }

  // --- Fin de partie ---

  private endRun(outcome: 'victory' | 'extraction' | 'defeat', cause?: DefeatCause): void {
    if (this.ending) return;
    this.ending = true;
    const result: RunResult =
      outcome === 'defeat' ? this.run.finish('defeat', cause ?? 'hull') : this.run.extract();
    audio.setAmbient(false);
    audio.play(outcome === 'defeat' ? 'lose' : 'win');
    announce(
      outcome === 'victory'
        ? 'Quota atteint, extraction réussie.'
        : outcome === 'extraction'
          ? 'Extraction effectuée.'
          : 'Le drone est hors service.',
    );

    save.update((d) => {
      d.credits += result.creditsGained;
      d.stats.runs += 1;
      d.stats.totalCredits += result.creditsGained;
      d.stats.totalKills += result.kills;
      d.stats.playSeconds += result.timeSeconds;
      d.stats.totalCollected += Object.values(result.collected).reduce((a, b) => a + b, 0);
      if (outcome === 'victory') d.stats.victories += 1;
      else if (outcome === 'extraction') d.stats.extractions += 1;
      else d.stats.defeats += 1;
      const key = String(this.sectorId);
      if (!d.bestScores[key] || d.bestScores[key] < result.score) d.bestScores[key] = result.score;
      if (outcome === 'victory') {
        d.unlockedSector = Math.min(5, Math.max(d.unlockedSector, this.sectorId + 1));
      }
      d.lastSeed = this.seed;
    });

    this.time.delayedCall(RUN.endDelaySec * 1000, () => {
      this.scene.start(outcome === 'defeat' ? 'GameOver' : 'Victory', { result });
    });
  }

  private drawTilemap(palette: ReturnType<typeof getPalette>): void {
    void palette;
    const map = this.map;
    // Une vraie Tilemap Phaser (rendu par lots) plutôt qu'un GameObject par tuile :
    // indispensable pour les performances sur les grandes cartes et le matériel modeste.
    const tilemap = this.make.tilemap({
      tileWidth: TILE,
      tileHeight: TILE,
      width: map.width,
      height: map.height,
    });
    const tileset = tilemap.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0);
    if (!tileset) return;
    const layer = tilemap.createBlankLayer('ground', tileset, 0, 0, map.width, map.height);
    if (!layer) return;
    layer.setDepth(0);

    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        const idx = ty * map.width + tx;
        const isWallTile = map.tiles[idx] === 1;
        const inBase = rectContainsPx(map.base, tx * TILE + 1, ty * TILE + 1);
        const inRare =
          map.rareRoomIndex >= 0 &&
          (() => {
            const room = map.rooms[map.rareRoomIndex]!;
            return tx >= room.x && tx < room.x + room.w && ty >= room.y && ty < room.y + room.h;
          })();
        let frame = (tx + ty) % 2;
        if (isWallTile) {
          const n = ty > 0 && map.tiles[idx - map.width] === 1 ? 1 : 0;
          const eB = tx < map.width - 1 && map.tiles[idx + 1] === 1 ? 2 : 0;
          const sB = ty < map.height - 1 && map.tiles[idx + map.width] === 1 ? 4 : 0;
          const wB = tx > 0 && map.tiles[idx - 1] === 1 ? 8 : 0;
          frame = 4 + (n | eB | sB | wB);
        } else if (inBase) frame = 2;
        else if (inRare) frame = 3;
        layer.putTileAt(frame, tx, ty);
      }
    }
  }

  private cleanup(): void {
    this.input.keyboard?.off('keydown', this.onKeyDown, this);
    this.gameInput.destroy();
    this.bolts.destroy();
    this.effects.destroy();
    this.hud.destroy();
    this.minimap.destroy();
    for (const e of this.enemies) e.destroy();
    for (const r of this.resources) r.destroy();
    this.player.destroy();
    this.darkness?.destroy();
    audio.setAmbient(false);
  }
}

function tilePx(tx: number, ty: number): [number, number] {
  const c = tileCenter(tx, ty);
  return [c.x, c.y];
}

export function lineOfSightDebug(
  map: GameMap,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): boolean {
  return hasLineOfSight(map, x0, y0, x1, y1);
}
