import { writable, type Writable } from 'svelte/store';
import { DEFAULT_SETTINGS, type GameSettings, type GameSnapshot } from '../game/engine/gameTypes';

export type ActiveTab = 'play' | 'workshop' | 'lab' | 'tiers' | 'challenges' | 'stats' | 'settings';

export interface UIState {
	activeTab: ActiveTab;
	leftPanelOpen: boolean;
	rightPanelOpen: boolean;
	isMobile: boolean;
	showGameOver: boolean;
	showPaused: boolean;
	showMilestone: boolean;
	milestoneText: string;
	showSaveIndicator: boolean;
	saveIndicatorText: string;
	gameSnapshot: GameSnapshot | null;
}

function createUIStore() {
	const { subscribe, set, update }: Writable<UIState> = writable({
		activeTab: 'play',
		leftPanelOpen: true,
		rightPanelOpen: true,
		isMobile: false,
		showGameOver: false,
		showPaused: false,
		showMilestone: false,
		milestoneText: '',
		showSaveIndicator: false,
		saveIndicatorText: '',
		gameSnapshot: null,
	});

	return {
		subscribe,
		set,
		update,
		setTab(tab: ActiveTab) {
			update(s => ({ ...s, activeTab: tab }));
		},
		toggleLeftPanel() {
			update(s => ({ ...s, leftPanelOpen: !s.leftPanelOpen }));
		},
		toggleRightPanel() {
			update(s => ({ ...s, rightPanelOpen: !s.rightPanelOpen }));
		},
		setMobile(isMobile: boolean) {
			update(s => ({ ...s, isMobile }));
		},
		setGameSnapshot(snapshot: GameSnapshot | null) {
			update(s => ({ ...s, gameSnapshot: snapshot }));
		},
		showGameOverPanel() {
			update(s => ({ ...s, showGameOver: true }));
		},
		hideGameOverPanel() {
			update(s => ({ ...s, showGameOver: false }));
		},
		showMilestonePanel(text: string) {
			update(s => ({ ...s, showMilestone: true, milestoneText: text }));
		},
		hideMilestonePanel() {
			update(s => ({ ...s, showMilestone: false, milestoneText: '' }));
		},
		flashSaveIndicator(text: string = 'Saved') {
			update(s => ({ ...s, showSaveIndicator: true, saveIndicatorText: text }));
			setTimeout(() => {
				update(s => ({ ...s, showSaveIndicator: false }));
			}, 2000);
		},
	};
}

export const uiStore = createUIStore();

export const coinsStore: Writable<number> = writable(0);
export const settingsStore: Writable<GameSettings> = writable({ ...DEFAULT_SETTINGS });
export const highestWaveStore: Writable<number> = writable(0);
export const totalRunsStore: Writable<number> = writable(0);
