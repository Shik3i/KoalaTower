import { w as writable } from "./index2.js";
function createUIStore() {
  const { subscribe, set, update } = writable({
    activeTab: "play",
    leftPanelOpen: true,
    rightPanelOpen: true,
    isMobile: false,
    showGameOver: false,
    showPaused: false,
    showMilestone: false,
    milestoneText: "",
    showSaveIndicator: false,
    saveIndicatorText: "",
    gameSnapshot: null
  });
  return {
    subscribe,
    set,
    update,
    setTab(tab) {
      update((s) => ({ ...s, activeTab: tab }));
    },
    toggleLeftPanel() {
      update((s) => ({ ...s, leftPanelOpen: !s.leftPanelOpen }));
    },
    toggleRightPanel() {
      update((s) => ({ ...s, rightPanelOpen: !s.rightPanelOpen }));
    },
    setMobile(isMobile) {
      update((s) => ({ ...s, isMobile }));
    },
    setGameSnapshot(snapshot) {
      update((s) => ({ ...s, gameSnapshot: snapshot }));
    },
    showGameOverPanel() {
      update((s) => ({ ...s, showGameOver: true }));
    },
    hideGameOverPanel() {
      update((s) => ({ ...s, showGameOver: false }));
    },
    showMilestonePanel(text) {
      update((s) => ({ ...s, showMilestone: true, milestoneText: text }));
    },
    hideMilestonePanel() {
      update((s) => ({ ...s, showMilestone: false, milestoneText: "" }));
    },
    flashSaveIndicator(text = "Saved") {
      update((s) => ({ ...s, showSaveIndicator: true, saveIndicatorText: text }));
      setTimeout(() => {
        update((s) => ({ ...s, showSaveIndicator: false }));
      }, 2e3);
    }
  };
}
createUIStore();
