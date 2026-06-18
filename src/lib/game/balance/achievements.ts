import { AchievementId, type AchievementDef } from '../engine/gameTypes';

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
	// Deployments completed (powers of 10)
	{ id: AchievementId.Deployments1, name: 'Deployment Service I', description: 'One tower successfully made somebody else\'s problem.', category: 'deployments', threshold: 1, reward: 50, rewardLabel: '50 Alloy' },
	{ id: AchievementId.Deployments10, name: 'Deployment Service II', description: 'Double-digit deployments. Orbital Command is taking notice.', category: 'deployments', threshold: 10, reward: 100, rewardLabel: '100 Alloy' },
	{ id: AchievementId.Deployments100, name: 'Deployment Service III', description: 'A hundred towers. The geometry is filing a restraining order.', category: 'deployments', threshold: 100, reward: 500, rewardLabel: '500 Alloy' },
	{ id: AchievementId.Deployments1000, name: 'Deployment Service IV', description: 'A thousand deployments. Flatland has declared a state of emergency.', category: 'deployments', threshold: 1000, reward: 2500, rewardLabel: '2500 Alloy' },
	{ id: AchievementId.Deployments10000, name: 'Deployment Service V', description: 'Ten thousand towers. At this point it is personal.', category: 'deployments', threshold: 10000, reward: 10000, rewardLabel: '10000 Alloy' },
	{ id: AchievementId.Deployments100000, name: 'Deployment Service VI', description: 'One hundred thousand. The shapes have formed a union.', category: 'deployments', threshold: 100000, reward: 50000, rewardLabel: '50000 Alloy' },

	// Best wave reached
	{ id: AchievementId.BestWave2, name: 'First Contact', description: 'Orbital Command has reviewed your first loss and classified it as progress.', category: 'bestWave', threshold: 2, reward: 25, rewardLabel: '25 Alloy' },
	{ id: AchievementId.BestWave5, name: 'Getting Started', description: 'Five waves. The coffee is still warm.', category: 'bestWave', threshold: 5, reward: 50, rewardLabel: '50 Alloy' },
	{ id: AchievementId.BestWave10, name: 'First Boss Threshold', description: 'Wave 10. The boss has been notified of its upcoming appointment.', category: 'bestWave', threshold: 10, reward: 100, rewardLabel: '100 Alloy' },
	{ id: AchievementId.BestWave25, name: 'Quarter Century', description: 'Twenty-five waves. The shapes are starting to coordinate.', category: 'bestWave', threshold: 25, reward: 250, rewardLabel: '250 Alloy' },
	{ id: AchievementId.BestWave50, name: 'Half Century', description: 'Fifty waves. The swarm has filed a formal grievance.', category: 'bestWave', threshold: 50, reward: 500, rewardLabel: '500 Alloy' },
	{ id: AchievementId.BestWave100, name: 'Centurion', description: 'One hundred waves. The geometry is now statistically dangerous.', category: 'bestWave', threshold: 100, reward: 1200, rewardLabel: '1200 Alloy' },
	{ id: AchievementId.BestWave250, name: 'Quarter Millennium', description: 'Two hundred fifty waves. The coffee has become sentient.', category: 'bestWave', threshold: 250, reward: 3000, rewardLabel: '3000 Alloy' },
	{ id: AchievementId.BestWave500, name: 'Geo Warrior', description: 'Five hundred waves. The polygons respect you. Reluctantly.', category: 'bestWave', threshold: 500, reward: 8000, rewardLabel: '8000 Alloy' },
	{ id: AchievementId.BestWave1000, name: 'The Thousand', description: 'One thousand waves. Flatland has requested a truce. Denied.', category: 'bestWave', threshold: 1000, reward: 20000, rewardLabel: '20000 Alloy' },
	{ id: AchievementId.BestWave2500, name: 'The Long Haul', description: 'Twenty-five hundred waves. The shapes have started evolving.', category: 'bestWave', threshold: 2500, reward: 75000, rewardLabel: '75000 Alloy' },
	{ id: AchievementId.BestWave5000, name: 'The Apex', description: 'Five thousand waves. The geometry is now a suggestion.', category: 'bestWave', threshold: 5000, reward: 200000, rewardLabel: '200000 Alloy' },

	// Shapes destroyed (powers of 10)
	{ id: AchievementId.ShapesDestroyed10, name: 'Shape Breaker I', description: 'Ten polygons retired. The recycling program is working.', category: 'shapesDestroyed', threshold: 10, reward: 25, rewardLabel: '25 Alloy' },
	{ id: AchievementId.ShapesDestroyed100, name: 'Shape Breaker II', description: 'One hundred shapes removed. The geometry department is concerned.', category: 'shapesDestroyed', threshold: 100, reward: 100, rewardLabel: '100 Alloy' },
	{ id: AchievementId.ShapesDestroyed1000, name: 'Shape Breaker III', description: 'One thousand shapes. The swarm is now statistically smaller.', category: 'shapesDestroyed', threshold: 1000, reward: 500, rewardLabel: '500 Alloy' },
	{ id: AchievementId.ShapesDestroyed10000, name: 'Shape Breaker IV', description: 'Ten thousand shapes. Flatland is starting to look circular.', category: 'shapesDestroyed', threshold: 10000, reward: 2500, rewardLabel: '2500 Alloy' },
	{ id: AchievementId.ShapesDestroyed100000, name: 'Shape Breaker V', description: 'One hundred thousand shapes. The geometry department has been laid off.', category: 'shapesDestroyed', threshold: 100000, reward: 10000, rewardLabel: '10000 Alloy' },

	// Bosses defeated (powers of 10)
	{ id: AchievementId.BossesDefeated1, name: 'Prime Removal I', description: 'One prime shape neutralized. It was very rude.', category: 'bossesDefeated', threshold: 1, reward: 50, rewardLabel: '50 Alloy' },
	{ id: AchievementId.BossesDefeated10, name: 'Prime Removal II', description: 'Ten bosses. The command structure is weakened.', category: 'bossesDefeated', threshold: 10, reward: 250, rewardLabel: '250 Alloy' },
	{ id: AchievementId.BossesDefeated100, name: 'Prime Removal III', description: 'One hundred bosses. The swarm is now democratically confused.', category: 'bossesDefeated', threshold: 100, reward: 2500, rewardLabel: '2500 Alloy' },
	{ id: AchievementId.BossesDefeated1000, name: 'Prime Removal IV', description: 'One thousand bosses. The hierarchy has been abolished.', category: 'bossesDefeated', threshold: 1000, reward: 25000, rewardLabel: '25000 Alloy' },

	// Field upgrades purchased (powers of 10)
	{ id: AchievementId.FieldUpgradesPurchased10, name: 'Field Modification I', description: 'Ten field upgrades installed. The tower is starting to feel it.', category: 'fieldUpgrades', threshold: 10, reward: 25, rewardLabel: '25 Alloy' },
	{ id: AchievementId.FieldUpgradesPurchased100, name: 'Field Modification II', description: 'One hundred modifications. The tower has opinions now.', category: 'fieldUpgrades', threshold: 100, reward: 100, rewardLabel: '100 Alloy' },
	{ id: AchievementId.FieldUpgradesPurchased1000, name: 'Field Modification III', description: 'One thousand upgrades. The tower is basically a different shape.', category: 'fieldUpgrades', threshold: 1000, reward: 500, rewardLabel: '500 Alloy' },
	{ id: AchievementId.FieldUpgradesPurchased10000, name: 'Field Modification IV', description: 'Ten thousand upgrades. The tower has unionized.', category: 'fieldUpgrades', threshold: 10000, reward: 5000, rewardLabel: '5000 Alloy' },

	// Alloy earned (powers of 10 scale)
	{ id: AchievementId.AlloyEarned100, name: 'Alloy Accumulation I', description: '100 alloy earned. The economy is recovering.', category: 'alloyEarned', threshold: 100, reward: 25, rewardLabel: '25 Alloy' },
	{ id: AchievementId.AlloyEarned1000, name: 'Alloy Accumulation II', description: '1000 alloy. Procurement has stopped panicking.', category: 'alloyEarned', threshold: 1000, reward: 100, rewardLabel: '100 Alloy' },
	{ id: AchievementId.AlloyEarned10000, name: 'Alloy Accumulation III', description: '10000 alloy. You could buy a small planet. Or upgrade the tower.', category: 'alloyEarned', threshold: 10000, reward: 1000, rewardLabel: '1000 Alloy' },
	{ id: AchievementId.AlloyEarned100000, name: 'Alloy Accumulation IV', description: '100000 alloy. Orbital Command has authorized a parade.', category: 'alloyEarned', threshold: 100000, reward: 10000, rewardLabel: '10000 Alloy' },

	// Best killstreak — longest consecutive-kill chain without taking tower damage.
	{ id: AchievementId.Killstreak100, name: 'Chain Reaction I', description: 'A hundred kills without a scratch. The tower is in the zone.', category: 'killstreak', threshold: 100, reward: 250, rewardLabel: '250 Alloy' },
	{ id: AchievementId.Killstreak500, name: 'Chain Reaction II', description: 'Five hundred unbroken. The shapes are starting to flinch.', category: 'killstreak', threshold: 500, reward: 1000, rewardLabel: '1000 Alloy' },
	{ id: AchievementId.Killstreak1000, name: 'Inferno', description: 'A thousand-kill chain. The barrel is literally on fire now.', category: 'killstreak', threshold: 1000, reward: 5000, rewardLabel: '5000 Alloy' },
	{ id: AchievementId.Killstreak5000, name: 'Unbroken', description: 'Five thousand consecutive. Physics has filed a complaint.', category: 'killstreak', threshold: 5000, reward: 25000, rewardLabel: '25000 Alloy' },
	{ id: AchievementId.Killstreak10000, name: 'Annihilation Streak', description: 'Ten thousand kills, one chain. The geometry has stopped resisting.', category: 'killstreak', threshold: 10000, reward: 100000, rewardLabel: '100000 Alloy' },
];

const defMap = new Map<AchievementId, AchievementDef>();
for (const def of ACHIEVEMENT_DEFS) {
	defMap.set(def.id, def);
}

export function getAchievementDef(id: AchievementId): AchievementDef | undefined {
	return defMap.get(id);
}

export function getAchievementsForCategory(category: AchievementDef['category']): AchievementDef[] {
	return ACHIEVEMENT_DEFS.filter(a => a.category === category);
}

export interface AchievementStats {
	totalRuns: number;
	bestWave: number;
	totalKills: number;
	bossesDefeated: number;
	fieldUpgradesPurchased: number;
	totalAlloyEarned: number;
	bestKillstreak: number;
}

/**
 * Maps each achievement category to the stat it tracks. This single map
 * replaces a per-category switch — adding a category is one entry here, and
 * TypeScript enforces exhaustiveness so a forgotten mapping fails to compile.
 */
const CATEGORY_METRIC: Record<AchievementDef['category'], keyof AchievementStats> = {
	deployments: 'totalRuns',
	bestWave: 'bestWave',
	shapesDestroyed: 'totalKills',
	bossesDefeated: 'bossesDefeated',
	fieldUpgrades: 'fieldUpgradesPurchased',
	alloyEarned: 'totalAlloyEarned',
	killstreak: 'bestKillstreak',
};

export function checkAchievements(claimed: Set<AchievementId>, stats: AchievementStats): AchievementDef[] {
	const newlyEarned: AchievementDef[] = [];
	for (const def of ACHIEVEMENT_DEFS) {
		if (claimed.has(def.id)) continue;
		if (stats[CATEGORY_METRIC[def.category]] >= def.threshold) {
			newlyEarned.push(def);
		}
	}
	return newlyEarned;
}
