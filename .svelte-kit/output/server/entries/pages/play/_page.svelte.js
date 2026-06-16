import { V as ssr_context, e as escape_html, X as attr_class, O as ensure_array_like } from "../../../chunks/index.js";
import "clsx";
import "../../../chunks/gameUiStore.js";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
var UpgradeId = /* @__PURE__ */ ((UpgradeId2) => {
  UpgradeId2["Damage"] = "damage";
  UpgradeId2["FireRate"] = "fireRate";
  UpgradeId2["Range"] = "range";
  UpgradeId2["Multishot"] = "multishot";
  UpgradeId2["CritChance"] = "critChance";
  UpgradeId2["Defense"] = "defense";
  UpgradeId2["MaxHp"] = "maxHp";
  return UpgradeId2;
})(UpgradeId || {});
var WorkshopUpgradeId = /* @__PURE__ */ ((WorkshopUpgradeId2) => {
  WorkshopUpgradeId2["BaseDamage"] = "baseDamage";
  WorkshopUpgradeId2["BaseFireRate"] = "baseFireRate";
  WorkshopUpgradeId2["BaseRange"] = "baseRange";
  WorkshopUpgradeId2["StartingHp"] = "startingHp";
  WorkshopUpgradeId2["CoinBonus"] = "coinBonus";
  WorkshopUpgradeId2["CashBonus"] = "cashBonus";
  WorkshopUpgradeId2["CritBonus"] = "critBonus";
  WorkshopUpgradeId2["StartingCash"] = "startingCash";
  return WorkshopUpgradeId2;
})(WorkshopUpgradeId || {});
var LabId = /* @__PURE__ */ ((LabId2) => {
  LabId2["DamageResearch"] = "damageResearch";
  LabId2["CoinEfficiency"] = "coinEfficiency";
  LabId2["TowerDurability"] = "towerDurability";
  return LabId2;
})(LabId || {});
var TierId = /* @__PURE__ */ ((TierId2) => {
  TierId2["Tier1"] = "tier1";
  TierId2["Tier2"] = "tier2";
  TierId2["Tier3"] = "tier3";
  TierId2["Tier4"] = "tier4";
  TierId2["Tier5"] = "tier5";
  return TierId2;
})(TierId || {});
var ChallengeId = /* @__PURE__ */ ((ChallengeId2) => {
  ChallengeId2["FastSwarm"] = "fastSwarm";
  ChallengeId2["GlassTower"] = "glassTower";
  ChallengeId2["BossRush"] = "bossRush";
  return ChallengeId2;
})(ChallengeId || {});
function defaultCost$2(level, base, scale) {
  return Math.floor(base * Math.pow(scale, level));
}
[
  {
    id: UpgradeId.Damage,
    name: "Damage",
    description: "Increase tower damage per shot",
    level: 0,
    maxLevel: 50,
    cost: (level) => defaultCost$2(level, 20, 1.25),
    icon: "⚡"
  },
  {
    id: UpgradeId.FireRate,
    name: "Fire Rate",
    description: "Increase tower attack speed",
    level: 0,
    maxLevel: 40,
    cost: (level) => defaultCost$2(level, 25, 1.28),
    icon: "🔥"
  },
  {
    id: UpgradeId.Range,
    name: "Range",
    description: "Increase tower attack range",
    level: 0,
    maxLevel: 30,
    cost: (level) => defaultCost$2(level, 30, 1.3),
    icon: "🎯"
  },
  {
    id: UpgradeId.Multishot,
    name: "Multishot",
    description: "Fire additional projectiles",
    level: 0,
    maxLevel: 20,
    cost: (level) => defaultCost$2(level, 50, 1.35),
    icon: "💥"
  },
  {
    id: UpgradeId.CritChance,
    name: "Crit Chance",
    description: "Chance to deal double damage",
    level: 0,
    maxLevel: 30,
    cost: (level) => defaultCost$2(level, 35, 1.3),
    icon: "⭐"
  },
  {
    id: UpgradeId.Defense,
    name: "Defense",
    description: "Reduce damage taken",
    level: 0,
    maxLevel: 30,
    cost: (level) => defaultCost$2(level, 30, 1.28),
    icon: "🛡️"
  },
  {
    id: UpgradeId.MaxHp,
    name: "Max HP",
    description: "Increase tower maximum HP",
    level: 0,
    maxLevel: 30,
    cost: (level) => defaultCost$2(level, 25, 1.3),
    icon: "❤️"
  }
];
function defaultCost$1(level, base, scale) {
  return Math.floor(base * Math.pow(scale, level));
}
[
  {
    id: WorkshopUpgradeId.BaseDamage,
    name: "Base Damage",
    description: "Permanently increase tower damage",
    level: 0,
    maxLevel: 100,
    cost: (level) => defaultCost$1(level, 50, 1.35),
    icon: "⚡"
  },
  {
    id: WorkshopUpgradeId.BaseFireRate,
    name: "Base Fire Rate",
    description: "Permanently increase fire rate",
    level: 0,
    maxLevel: 80,
    cost: (level) => defaultCost$1(level, 60, 1.38),
    icon: "🔥"
  },
  {
    id: WorkshopUpgradeId.BaseRange,
    name: "Base Range",
    description: "Permanently increase tower range",
    level: 0,
    maxLevel: 60,
    cost: (level) => defaultCost$1(level, 70, 1.4),
    icon: "🎯"
  },
  {
    id: WorkshopUpgradeId.StartingHp,
    name: "Starting HP",
    description: "Start each run with more HP",
    level: 0,
    maxLevel: 80,
    cost: (level) => defaultCost$1(level, 40, 1.32),
    icon: "❤️"
  },
  {
    id: WorkshopUpgradeId.CoinBonus,
    name: "Coin Bonus",
    description: "Earn more coins per run",
    level: 0,
    maxLevel: 60,
    cost: (level) => defaultCost$1(level, 100, 1.45),
    icon: "🪙"
  },
  {
    id: WorkshopUpgradeId.CashBonus,
    name: "Cash Bonus",
    description: "Earn more cash per kill",
    level: 0,
    maxLevel: 60,
    cost: (level) => defaultCost$1(level, 80, 1.42),
    icon: "💰"
  },
  {
    id: WorkshopUpgradeId.CritBonus,
    name: "Crit Bonus",
    description: "Permanently increase crit chance",
    level: 0,
    maxLevel: 50,
    cost: (level) => defaultCost$1(level, 90, 1.44),
    icon: "⭐"
  },
  {
    id: WorkshopUpgradeId.StartingCash,
    name: "Starting Cash",
    description: "Start each run with more cash",
    level: 0,
    maxLevel: 50,
    cost: (level) => defaultCost$1(level, 60, 1.38),
    icon: "💵"
  }
];
function defaultCost(level, base, scale) {
  return Math.floor(base * Math.pow(scale, level));
}
function defaultDuration(level) {
  return Math.max(0, 60 - level * 2);
}
[
  {
    id: LabId.DamageResearch,
    name: "Damage Research",
    description: "Permanently increases base tower damage",
    level: 0,
    maxLevel: 50,
    cost: (level) => defaultCost(level, 200, 1.4),
    duration: (level) => defaultDuration(level),
    icon: "🔬"
  },
  {
    id: LabId.CoinEfficiency,
    name: "Coin Efficiency",
    description: "Increase all coin earnings by percentage",
    level: 0,
    maxLevel: 40,
    cost: (level) => defaultCost(level, 300, 1.45),
    duration: (level) => defaultDuration(level),
    icon: "📈"
  },
  {
    id: LabId.TowerDurability,
    name: "Tower Durability",
    description: "Permanently increases starting tower HP",
    level: 0,
    maxLevel: 40,
    cost: (level) => defaultCost(level, 250, 1.42),
    duration: (level) => defaultDuration(level),
    icon: "🏗️"
  }
];
[
  {
    id: TierId.Tier1,
    name: "Tier 1: The Awakening",
    description: "The tower awakens. Defend against the first waves.",
    waveRequirement: 0,
    unlocked: true,
    rewards: ["Unlock Workshop", "Unlock Lab"]
  },
  {
    id: TierId.Tier2,
    name: "Tier 2: Neon Storm",
    description: "The storm intensifies. Harder enemies, greater rewards.",
    waveRequirement: 50,
    unlocked: false,
    rewards: ["Unlock Challenges", "+50% Coin Bonus"]
  },
  {
    id: TierId.Tier3,
    name: "Tier 3: Digital Onslaught",
    description: "Digital nightmares emerge. Prove your worth.",
    waveRequirement: 150,
    unlocked: false,
    rewards: ["Unlock Elite Enemies", "+100% Coin Bonus"]
  },
  {
    id: TierId.Tier4,
    name: "Tier 4: Quantum Surge",
    description: "Reality bends. Only the strong survive.",
    waveRequirement: 300,
    unlocked: false,
    rewards: ["Unlock Quantum Upgrades", "+200% Coin Bonus"]
  },
  {
    id: TierId.Tier5,
    name: "Tier 5: The Koala Ascension",
    description: "Ascend beyond. Become the legend.",
    waveRequirement: 500,
    unlocked: false,
    rewards: ["Unlock Ascension Perks", "+500% Coin Bonus"]
  }
];
[
  {
    id: ChallengeId.FastSwarm,
    name: "Fast Swarm",
    description: "All enemies are Fast type. Double speed. Triple spawn rate.",
    icon: "🌪️",
    locked: true,
    highScore: 0,
    modifiers: ["allFast", "doubleSpeed", "tripleSpawn"]
  },
  {
    id: ChallengeId.GlassTower,
    name: "Glass Tower",
    description: "Tower has 1 HP. Enemies are 50% weaker. Double coin rewards.",
    icon: "🔮",
    locked: true,
    highScore: 0,
    modifiers: ["glassTower", "weakEnemies", "doubleCoins"]
  },
  {
    id: ChallengeId.BossRush,
    name: "Boss Rush",
    description: "Every wave is a boss wave. Increased boss rewards.",
    icon: "👑",
    locked: true,
    highScore: 0,
    modifiers: ["bossEveryWave", "increasedBossRewards"]
  }
];
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let activeTab = "battle";
    let coins = 0;
    onDestroy(() => {
    });
    const tabs = [
      { id: "battle", label: "Battle", icon: "⚔" },
      { id: "workshop", label: "Workshop", icon: "⚙" },
      { id: "lab", label: "Lab", icon: "🔬" },
      { id: "tiers", label: "Tiers", icon: "🏆" },
      { id: "challenges", label: "Challenges", icon: "⚡" },
      { id: "stats", label: "Stats", icon: "📊" },
      { id: "settings", label: "Settings", icon: "⚙" }
    ];
    $$renderer2.push(`<div class="play-layout svelte-hy9bcf"><header class="topbar svelte-hy9bcf"><a href="/" class="topbar-back svelte-hy9bcf" aria-label="Home">←</a> <div class="topbar-brand svelte-hy9bcf">KoalaTower</div> <div class="topbar-divider svelte-hy9bcf"></div> <div class="topbar-stats svelte-hy9bcf">`);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="stat-pill stat-coins svelte-hy9bcf"><span>🪙</span> <span>${escape_html(coins.toLocaleString())}</span></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="topbar-actions svelte-hy9bcf">`);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="save-btn-wrap svelte-hy9bcf"><button class="topbar-action-btn svelte-hy9bcf" aria-label="Save menu"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M12 1H3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V4l-3-3zM8 12a2 2 0 110-4 2 2 0 010 4zm1-7H4V2h5v3z" fill="currentColor"></path></svg></button> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div></header> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="game-body svelte-hy9bcf">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<aside${attr_class("side-panel left-panel svelte-hy9bcf", void 0, { "collapsed": true })}><button class="panel-toggle svelte-hy9bcf" aria-label="Toggle left panel">${escape_html("▶")}</button> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></aside>`);
    }
    $$renderer2.push(`<!--]--> <div class="game-canvas-container svelte-hy9bcf">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="start-overlay svelte-hy9bcf"><div class="start-card svelte-hy9bcf"><div class="start-card-glow svelte-hy9bcf"></div> <div class="start-card-icon svelte-hy9bcf">🐨</div> <h2 class="start-card-title svelte-hy9bcf">KoalaTower</h2> <p class="start-card-subtitle svelte-hy9bcf">Defend the tower. Survive the waves.</p> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <button class="start-btn svelte-hy9bcf"><span class="start-btn-glow svelte-hy9bcf"></span> <span class="start-btn-content svelte-hy9bcf"><svg viewBox="0 0 20 20" width="18" height="18"><polygon points="5,3 17,10 5,17" fill="currentColor"></polygon></svg> Start Run</span></button> `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<p class="start-card-hint svelte-hy9bcf">Press <kbd class="svelte-hy9bcf">Enter</kbd> to start</p>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<aside${attr_class("side-panel right-panel svelte-hy9bcf", void 0, { "collapsed": false })}><button class="panel-toggle svelte-hy9bcf" aria-label="Toggle right panel">${escape_html("▶")}</button> `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="panel-content svelte-hy9bcf"><div class="panel-tabs svelte-hy9bcf"><!--[-->`);
        const each_array = ensure_array_like(tabs);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let tab = each_array[$$index];
          $$renderer2.push(`<button${attr_class("panel-tab svelte-hy9bcf", void 0, { "active": activeTab === tab.id })}>${escape_html(tab.icon)}<span class="panel-tab-label svelte-hy9bcf">${escape_html(tab.label)}</span></button>`);
        }
        $$renderer2.push(`<!--]--></div> <div class="panel-tab-content svelte-hy9bcf">`);
        {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div class="panel-section svelte-hy9bcf"><div class="panel-section-title svelte-hy9bcf">Battle Upgrades</div> `);
          {
            $$renderer2.push("<!--[-1-->");
            $$renderer2.push(`<div class="panel-empty svelte-hy9bcf">Start a run to buy upgrades with Cash.</div>`);
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]--></div></div>`);
      }
      $$renderer2.push(`<!--]--></aside>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
