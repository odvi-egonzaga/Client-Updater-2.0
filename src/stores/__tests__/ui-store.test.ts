import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../ui-store';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({ sidebarOpen: false });
  });

  it('should have initial state with sidebar closed', () => {
    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(false);
  });

  it('should toggle sidebar from closed to open', () => {
    const { toggleSidebar } = useUIStore.getState();
    toggleSidebar();

    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(true);
  });

  it('should toggle sidebar from open to closed', () => {
    useUIStore.setState({ sidebarOpen: true });
    const { toggleSidebar } = useUIStore.getState();
    toggleSidebar();

    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(false);
  });

  it('should toggle sidebar multiple times', () => {
    const { toggleSidebar } = useUIStore.getState();

    toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);

    toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);

    toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);

    toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('should provide toggleSidebar function', () => {
    const state = useUIStore.getState();
    expect(state.toggleSidebar).toBeDefined();
    expect(typeof state.toggleSidebar).toBe('function');
  });

  it('should maintain state consistency across multiple store accesses', () => {
    const state1 = useUIStore.getState();
    const state2 = useUIStore.getState();

    expect(state1.sidebarOpen).toBe(state2.sidebarOpen);
    expect(state1.toggleSidebar).toBe(state2.toggleSidebar);
  });

  it('should allow direct state setting', () => {
    useUIStore.setState({ sidebarOpen: true });

    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(true);
  });

  it('should handle rapid state changes', () => {
    const { toggleSidebar } = useUIStore.getState();

    for (let i = 0; i < 10; i++) {
      toggleSidebar();
    }

    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(false); // 10 toggles from false = false
  });

  it('should reset to initial state when explicitly set', () => {
    useUIStore.setState({ sidebarOpen: true });
    expect(useUIStore.getState().sidebarOpen).toBe(true);

    useUIStore.setState({ sidebarOpen: false });
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });
});
