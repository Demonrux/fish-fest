const Sound = (() => {

  const SFX = {
    click:   'sounds/click.mp3',
    cast:    'sounds/cast.mp3',
    bite:    'sounds/bite.mp3',
    hit:     'sounds/hit.mp3',
    miss:    'sounds/miss.mp3',
    success: 'sounds/success.mp3',
    fail:    'sounds/fail.mp3',

    rarity_common: 'sounds/rarity_common.mp3',
    rarity_rare:   'sounds/rarity_rare.mp3',
    rarity_epic:   'sounds/rarity_epic.mp3',
  };

  const MUSIC = {
    map:      'sounds/music_map.mp3',
    location: 'sounds/music_location.mp3',  

    river:    'sounds/music_river.mp3',
    pond:     'sounds/music_pond.mp3',
    marina:   'sounds/music_marina.mp3',
    pool: 'sounds/music_pool.mp3'
  };

  const SFX_VOLUME   = 0.7;
  const MUSIC_VOLUME = 0.35;
  const FADE_MS      = 900;

  let unlocked     = false;
  let muted        = false;
  let pendingMusic = null;
  let currentMusic = null;
  let currentTrack = null;

  const cache = {};
  Object.entries(SFX).forEach(([key, src]) => {
    const a = new Audio();
    a.src = src;
    a.preload = 'auto';
    cache[key] = a;
  });

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    if (pendingMusic) {
      const track = pendingMusic;
      pendingMusic = null;
      _playMusic(track);
    }
  }
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown',     unlock, { once: true });

  function play(name) {
    if (muted) return;

    let base = cache[name];
    if (!base && typeof name === 'string' && (name.includes('/') || name.includes('.'))) {
      base = new Audio(name);
      base.preload = 'auto';
    }
    if (!base) {
      console.warn(`[Sound] Нет звука с именем "${name}"`);
      return;
    }

    const node = base.cloneNode();
    node.volume = SFX_VOLUME;
    node.play().catch(() => {});
  }

  function fade(audio, target, duration, onDone) {
    if (!audio) { onDone && onDone(); return; }
    const start = audio.volume;
    const t0 = performance.now();
    function step(now) {
      const k = Math.min((now - t0) / duration, 1);
      audio.volume = Math.max(0, Math.min(1, start + (target - start) * k));
      if (k < 1) requestAnimationFrame(step);
      else onDone && onDone();
    }
    requestAnimationFrame(step);
  }

  function _playMusic(trackName) {
    if (muted) return;

    let src, key;
    if (trackName.includes('/') || trackName.includes('.')) {
      src = trackName;
      key = trackName;
    } else {
      src = MUSIC[trackName];
      key = trackName;
      if (!src && trackName !== 'map') {
        src = MUSIC.location;
        key = 'location';
      }
    }

    if (!src) {
      console.warn(`[Sound] Нет музыки для "${trackName}"`);
      return;
    }

    if (currentTrack === key && currentMusic && !currentMusic.paused) return;

    const next = new Audio(src);
    next.loop   = true;
    next.volume = 0;
    next.play().catch(() => {});

    const prev = currentMusic;
    if (prev) {
      if (prev.paused) {
        prev.src = '';
      } else {
        fade(prev, 0, FADE_MS, () => { prev.pause(); prev.src = ''; });
      }
    }

    fade(next, MUSIC_VOLUME, FADE_MS);

    currentMusic = next;
    currentTrack = key;
  }

  function music(trackName) {
    if (!unlocked) {
      pendingMusic = trackName;
      _playMusic(trackName);
      return;
    }
    _playMusic(trackName);
  }

  function stopMusic() {
    if (!currentMusic) return;
    const prev = currentMusic;
    fade(prev, 0, FADE_MS, () => prev.pause());
    currentMusic = null;
    currentTrack = null;
  }

  function toggleMute() {
    muted = !muted;
    if (currentMusic) currentMusic.volume = muted ? 0 : MUSIC_VOLUME;
    return muted;
  }
  function isMuted() { return muted; }

  return {
    play, music, stopMusic, toggleMute, isMuted,

    click:   ()      => play('click'),
    cast:    ()      => play('cast'),
    bite:    ()      => play('bite'),
    hit:     ()      => play('hit'),
    miss:    ()      => play('miss'),
    fail:    ()      => play('fail'),
    success: ()      => play('success'),
    rarity:  (level) => play('rarity_' + level), 
  };
})();