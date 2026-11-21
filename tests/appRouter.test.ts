import { getTabFromPath, getPathForTab, NAV_CATEGORIES, ALL_NAV_TABS } from '../src/config/menu';

describe('Application Route & Navigation Mapping', () => {
  it('maps default and root paths to overview', () => {
    expect(getTabFromPath('/')).toBe('overview');
    expect(getTabFromPath('')).toBe('overview');
    expect(getTabFromPath('/overview')).toBe('overview');
  });

  it('maps all 9 institutional module paths correctly', () => {
    expect(getTabFromPath('/paper-trading')).toBe('paper-trading');
    expect(getTabFromPath('/grid')).toBe('grid');
    expect(getTabFromPath('/lstm')).toBe('lstm');
    expect(getTabFromPath('/monte-carlo')).toBe('monte-carlo');
    expect(getTabFromPath('/astronacci')).toBe('astronacci');
    expect(getTabFromPath('/risk')).toBe('risk');
    expect(getTabFromPath('/portfolio')).toBe('portfolio');
    expect(getTabFromPath('/modules')).toBe('modules');
  });

  it('maps category shortcuts to the default sub-module of that category', () => {
    expect(getTabFromPath('/trading')).toBe('overview');
    expect(getTabFromPath('/quant')).toBe('lstm');
    expect(getTabFromPath('/portfolio')).toBe('portfolio');
  });

  it('generates correct route URL paths for tabs', () => {
    expect(getPathForTab('overview')).toBe('/overview');
    expect(getPathForTab('paper-trading')).toBe('/paper-trading');
    expect(getPathForTab('risk')).toBe('/risk');
    expect(getPathForTab('lstm')).toBe('/lstm');
  });

  it('ensures each of the 9 tabs has a unique path', () => {
    const paths = ALL_NAV_TABS.map((t) => t.path);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(9);
  });
});
