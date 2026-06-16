import { MilestoneId, TierId, type MilestoneDef } from '../engine/gameTypes';

export const MILESTONES: MilestoneDef[] = [
	{
		id: MilestoneId.Wave10,
		tierId: TierId.Tier1,
		wave: 10,
		name: 'First Steps',
		reward: '100 Coins',
		claimed: false,
	},
	{
		id: MilestoneId.Wave25,
		tierId: TierId.Tier1,
		wave: 25,
		name: 'Getting Stronger',
		reward: '250 Coins',
		claimed: false,
	},
	{
		id: MilestoneId.Wave50,
		tierId: TierId.Tier1,
		wave: 50,
		name: 'Half Century',
		reward: '500 Coins',
		claimed: false,
	},
	{
		id: MilestoneId.Wave100,
		tierId: TierId.Tier1,
		wave: 100,
		name: 'Centurion',
		reward: '1200 Coins',
		claimed: false,
	},
	{
		id: MilestoneId.Wave250,
		tierId: TierId.Tier1,
		wave: 250,
		name: 'Quarter Millennium',
		reward: '5000 Coins',
		claimed: false,
	},
	{
		id: MilestoneId.Wave500,
		tierId: TierId.Tier1,
		wave: 500,
		name: 'Koala Warrior',
		reward: '15000 Coins',
		claimed: false,
	},
];

export function getMilestonesForWave(wave: number): MilestoneDef[] {
	return MILESTONES.filter(m => m.wave <= wave && !m.claimed);
}
