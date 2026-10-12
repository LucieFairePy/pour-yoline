const SETTINGS = {
  sens: 1,
  invert: false,
  quality: matchMedia('(max-width: 900px)').matches ? 'med' : 'high',
  vol: 0.8,
  ...save.get().settings,
};

const saveSettings = () => save.set({ settings: SETTINGS });
