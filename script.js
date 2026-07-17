const photoInput = document.getElementById('photoInput');
const scaleInput = document.getElementById('scaleInput');
const scaleValue = document.getElementById('scaleValue');
const offsetXInput = document.getElementById('offsetXInput');
const offsetXValue = document.getElementById('offsetXValue');
const offsetYInput = document.getElementById('offsetYInput');
const offsetYValue = document.getElementById('offsetYValue');
const previewCanvas = document.getElementById('previewCanvas');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const downloadBtn = document.getElementById('downloadBtn');
const changeFrameLink = document.getElementById('changeFrameLink');
const shareFrameBtn = document.getElementById('shareFrameBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const authBtn = document.getElementById('authBtn');
const authModal = document.getElementById('authModal');
const resultModal = document.getElementById('resultModal');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authError = document.getElementById('authError');
const authSubmit = document.getElementById('authSubmit');
const authToggle = document.getElementById('authToggle');
const googleBtn = document.getElementById('googleBtn');
const socialError = document.getElementById('socialError');
const authTabs = document.querySelectorAll('.auth-tab');
const authPanels = {
  email: document.getElementById('authPanelEmail'),
  social: document.getElementById('authPanelSocial')
};
const ctx = previewCanvas.getContext('2d');

let selectedFrame = null;
let userPhoto = null;
let frameImage = new Image();
let photoImage = new Image();
let photoScale = 1;
let offsetX = 0;
let offsetY = 0;
let dragging = false;
let dragStart = { x: 0, y: 0 };
let dragOffset = { x: 0, y: 0 };
let isSignUp = false;
let allFrames = [];
let undoStack = [];
let redoStack = [];
const MAX_UNDO = 50;

function resolveSelectedFrame() {
  const params = new URLSearchParams(window.location.search);
  const frameId = params.get('frameId');
  if (frameId) {
    const match = allFrames.find(f => f.id === frameId);
    if (match) {
      selectedFrame = match;
      return;
    }
  }
  const frameName = params.get('frame');
  if (frameName) {
    const match = allFrames.find(f => f.name === frameName);
    if (match) {
      selectedFrame = match;
      return;
    }
  }
  selectedFrame = allFrames[0] || null;
}

function updatePreviewVisibility() {
  const hasPreview = userPhoto && frameImage && frameImage.complete && frameImage.naturalWidth && photoImage && photoImage.complete;
  previewPlaceholder.style.display = hasPreview ? 'none' : 'grid';
}

function fitImageOnCanvas(image, canvasWidth, canvasHeight) {
  const ratio = Math.min(canvasWidth / image.width, canvasHeight / image.height);
  const width = image.width * ratio;
  const height = image.height * ratio;
  const x = (canvasWidth - width) / 2;
  const y = (canvasHeight - height) / 2;
  return { x, y, width, height, ratio };
}

function updatePhotoControls() {
  const enabled = Boolean(userPhoto && photoImage && photoImage.complete);
  scaleInput.disabled = !enabled;
  offsetXInput.disabled = !enabled;
  offsetYInput.disabled = !enabled;
}

function updateSliderLabels() {
  scaleValue.textContent = `${Math.round(photoScale * 100)}%`;
  offsetXValue.textContent = `${offsetX}`;
  offsetYValue.textContent = `${offsetY}`;
}

function pushUndo() {
  undoStack.push({ photoScale, offsetX, offsetY });
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
  updateUndoRedoButtons();
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push({ photoScale, offsetX, offsetY });
  const state = undoStack.pop();
  photoScale = state.photoScale;
  offsetX = state.offsetX;
  offsetY = state.offsetY;
  syncControlsFromState();
  renderCanvas();
  updateUndoRedoButtons();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push({ photoScale, offsetX, offsetY });
  const state = redoStack.pop();
  photoScale = state.photoScale;
  offsetX = state.offsetX;
  offsetY = state.offsetY;
  syncControlsFromState();
  renderCanvas();
  updateUndoRedoButtons();
}

function syncControlsFromState() {
  scaleInput.value = Math.round(photoScale * 100);
  offsetXInput.value = Math.round(offsetX);
  offsetYInput.value = Math.round(offsetY);
  updateSliderLabels();
}

function updateUndoRedoButtons() {
  if (undoBtn) undoBtn.disabled = undoStack.length === 0;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

function loadPhotoFromFile(file) {
  if (!file) return;
  userPhoto = file;
  const reader = new FileReader();
  reader.onload = () => {
    photoImage = new Image();
    photoImage.onload = () => {
      resetPhotoTransform();
      renderCanvas();
    };
    photoImage.onerror = () => {
      console.error('Unable to load selected photo.');
      previewPlaceholder.textContent = 'Unable to load the selected photo.';
      previewPlaceholder.style.display = 'grid';
    };
    photoImage.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function renderCanvas() {
  const canRender = selectedFrame && userPhoto && frameImage && frameImage.complete && frameImage.naturalWidth && photoImage && photoImage.complete;
  if (!canRender) {
    previewPlaceholder.textContent = 'Select a photo to preview your design.';
    updatePreviewVisibility();
    updatePhotoControls();
    downloadBtn.disabled = true;
    return;
  }

  const canvasWidth = frameImage.naturalWidth;
  const canvasHeight = frameImage.naturalHeight;
  previewCanvas.width = canvasWidth;
  previewCanvas.height = canvasHeight;
  const canvasShell = previewCanvas.parentElement;
  if (canvasShell) {
    canvasShell.style.aspectRatio = `${canvasWidth} / ${canvasHeight}`;
  }
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const fit = fitImageOnCanvas(photoImage, canvasWidth, canvasHeight);
  const scaledWidth = fit.width * photoScale;
  const scaledHeight = fit.height * photoScale;
  const x = fit.x + (fit.width - scaledWidth) / 2 + (offsetX / 100) * fit.width;
  const y = fit.y + (fit.height - scaledHeight) / 2 + (offsetY / 100) * fit.height;

  ctx.drawImage(photoImage, x, y, scaledWidth, scaledHeight);
  ctx.drawImage(frameImage, 0, 0, canvasWidth, canvasHeight);

  updatePreviewVisibility();
  updatePhotoControls();
  updateSliderLabels();
  downloadBtn.disabled = false;
  if (shareFrameBtn) {
    shareFrameBtn.hidden = !selectedFrame;
  }
}

function loadFrameImage() {
  if (!selectedFrame) {
    frameImage = new Image();
    return;
  }
  frameImage = new Image();
  frameImage.crossOrigin = 'anonymous';
  frameImage.onload = renderCanvas;
  frameImage.onerror = () => {
    console.error('Unable to load frame image:', selectedFrame.src);
    previewPlaceholder.textContent = 'Unable to load the selected frame.';
    previewPlaceholder.style.display = 'grid';
    downloadBtn.disabled = true;
  };
  frameImage.src = selectedFrame.src;
}

function resetPhotoTransform() {
  photoScale = 1;
  offsetX = 0;
  offsetY = 0;
  scaleInput.value = 100;
  offsetXInput.value = 0;
  offsetYInput.value = 0;
  updateSliderLabels();
  undoStack = [];
  redoStack = [];
  updateUndoRedoButtons();
}

function updateAuthUI() {
  const user = window.FrameMe?.currentUser || null;
  if (user) {
    authBtn.textContent = 'Sign out';
    authBtn.onclick = signOut;
  } else {
    authBtn.textContent = 'Sign in';
    authBtn.onclick = openAuthModal;
  }
}

function openAuthModal() {
  authModal.classList.add('modal--open');
  authModal.setAttribute('aria-hidden', 'false');
  switchAuthTab('email');
  authEmail.focus();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('modal--open');
  modal.setAttribute('aria-hidden', 'true');
  if (modalId === 'authModal') {
    authError.textContent = '';
    socialError.textContent = '';
    authForm.reset();
  }
}

function closeAuthModal() {
  closeModal('authModal');
}

function setAuthError(message) {
  authError.textContent = message;
}

function switchAuthTab(tab) {
  authTabs.forEach(t => {
    const isSelected = t.dataset.authTab === tab;
    t.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    t.tabIndex = isSelected ? 0 : -1;
  });
  Object.entries(authPanels).forEach(([key, panel]) => {
    panel.hidden = key !== tab;
  });
}

function getRedirectUrl() {
  return window.location.origin + window.location.pathname;
}

async function signInWithEmail() {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    setAuthError('Please enter both email and password.');
    return;
  }

  try {
    authSubmit.disabled = true;
    const { data, error } = await window.FrameMe.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    window.FrameMe.currentUser = data.user;
    closeAuthModal();
    updateAuthUI();
  } catch (error) {
    setAuthError(error.message || 'Something went wrong.');
  } finally {
    authSubmit.disabled = false;
  }
}

async function signUpWithEmail() {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    setAuthError('Please enter both email and password.');
    return;
  }

  if (password.length < 6) {
    setAuthError('Password must be at least 6 characters.');
    return;
  }

  try {
    authSubmit.disabled = true;
    const { error } = await window.FrameMe.supabase.auth.signUp({ email, password });
    if (error) throw error;
    setAuthError('Check your email for the confirmation link.');
    authToggle.textContent = 'Have an account? Sign in';
    isSignUp = false;
    authSubmit.textContent = 'Sign in';
  } catch (error) {
    setAuthError(error.message || 'Something went wrong.');
  } finally {
    authSubmit.disabled = false;
  }
}

async function signInWithOAuth(provider) {
  try {
    socialError.textContent = '';
    const { data, error } = await window.FrameMe.supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: getRedirectUrl() }
    });
    if (error) throw error;
  } catch (error) {
    socialError.textContent = error.message || 'Something went wrong.';
  }
}

async function signOut() {
  try {
    await window.FrameMe.supabase.auth.signOut();
    window.FrameMe.currentUser = null;
    updateAuthUI();
  } catch (error) {
    console.error('Sign out failed:', error);
  }
}

async function fetchSupabaseFrames() {
  try {
    const { data, error } = await window.FrameMe.supabase
      .from('frames')
      .select('id, name, src')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

  if (!error && data) {
    allFrames = data.map(row => ({ id: row.id, name: row.name, src: row.src, category: row.category || 'general' }));
  }
  } catch (error) {
    console.error('Failed to load frames from Supabase:', error);
  }
  resolveSelectedFrame();
  loadFrameImage();
  updatePhotoControls();
  updatePreviewVisibility();
}

photoInput.addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) {
    userPhoto = null;
    downloadBtn.disabled = true;
    updatePhotoControls();
    renderCanvas();
    return;
  }
  loadPhotoFromFile(file);
});

const dropZone = document.getElementById('dropZone');
if (dropZone) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('drop-zone--active');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('drop-zone--active');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      photoInput.files = e.dataTransfer.files;
      loadPhotoFromFile(file);
    }
  });
}

previewCanvas.addEventListener('wheel', (e) => {
  if (!(userPhoto && photoImage.complete && frameImage.complete)) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  photoScale = Math.max(0.5, Math.min(2, photoScale + delta));
  syncControlsFromState();
  renderCanvas();
}, { passive: false });

scaleInput.addEventListener('input', event => {
  photoScale = Number(event.target.value) / 100;
  renderCanvas();
});

scaleInput.addEventListener('change', () => pushUndo());

offsetXInput.addEventListener('input', event => {
  offsetX = Number(event.target.value);
  renderCanvas();
});

offsetXInput.addEventListener('change', () => pushUndo());

offsetYInput.addEventListener('input', event => {
  offsetY = Number(event.target.value);
  renderCanvas();
});

offsetYInput.addEventListener('change', () => pushUndo());

previewCanvas.addEventListener('pointerdown', event => {
  if (!(userPhoto && photoImage.complete && frameImage.complete)) return;
  dragging = true;
  dragStart = { x: event.clientX, y: event.clientY };
  dragOffset = { x: offsetX, y: offsetY };
  previewCanvas.classList.add('dragging');
  previewCanvas.setPointerCapture(event.pointerId);
});

previewCanvas.addEventListener('pointermove', event => {
  if (!dragging) return;
  const dx = event.clientX - dragStart.x;
  const dy = event.clientY - dragStart.y;
  offsetX = dragOffset.x + (dx / previewCanvas.clientWidth) * 200;
  offsetY = dragOffset.y + (dy / previewCanvas.clientHeight) * 200;
  offsetX = Math.max(-100, Math.min(100, offsetX));
  offsetY = Math.max(-100, Math.min(100, offsetY));
  offsetXInput.value = offsetX;
  offsetYInput.value = offsetY;
  renderCanvas();
});

previewCanvas.addEventListener('pointerup', () => {
  if (dragging) pushUndo();
  dragging = false;
  previewCanvas.classList.remove('dragging');
});

previewCanvas.addEventListener('pointerleave', () => {
  if (dragging) pushUndo();
  dragging = false;
  previewCanvas.classList.remove('dragging');
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
    event.preventDefault();
    undo();
  } else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
    event.preventDefault();
    redo();
  }
});

undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

downloadBtn.addEventListener('click', async () => {
  if (downloadBtn.disabled) return;
  renderCanvas();
  try {
    const blob = await new Promise(resolve => previewCanvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      throw new Error('Unable to create image blob.');
    }
    const url = URL.createObjectURL(blob);
    const resultImage = document.getElementById('resultImage');
    const resultDownload = document.getElementById('resultDownload');
    const resultModal = document.getElementById('resultModal');
    if (resultImage) resultImage.src = url;
    if (resultDownload) resultDownload.href = url;
    if (resultModal) {
      resultModal.classList.add('modal--open');
      resultModal.setAttribute('aria-hidden', 'false');
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    console.error('Download failed:', error);
    previewPlaceholder.textContent = 'Download failed. Try again after the preview loads.';
    previewPlaceholder.style.display = 'grid';
  }
});

changeFrameLink.addEventListener('click', () => {
  // default anchor behavior is fine
});

shareFrameBtn.addEventListener('click', () => {
  if (!selectedFrame) return;
  const url = new URL('index.html', window.location.href);
  url.searchParams.set('frameId', selectedFrame.id);
  navigator.clipboard.writeText(url.toString()).then(() => {
    const original = shareFrameBtn.innerHTML;
    shareFrameBtn.innerHTML = 'Copied!';
    shareFrameBtn.disabled = true;
    setTimeout(() => {
      shareFrameBtn.innerHTML = original;
      shareFrameBtn.disabled = false;
    }, 1500);
  });
});

document.querySelectorAll('[data-close="authModal"], [data-close="resultModal"]').forEach(el => {
  el.addEventListener('click', () => closeModal(el.dataset.close));
});

authTabs.forEach(tab => {
  tab.addEventListener('click', () => switchAuthTab(tab.dataset.authTab));
});

authToggle.addEventListener('click', () => {
  isSignUp = !isSignUp;
  authSubmit.textContent = isSignUp ? 'Sign up' : 'Sign in';
  authToggle.textContent = isSignUp ? 'Have an account? Sign in' : 'Need an account? Sign up';
  setAuthError('');
});

authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (isSignUp) {
    signUpWithEmail();
  } else {
    signInWithEmail();
  }
});

googleBtn.addEventListener('click', () => signInWithOAuth('google'));

authModal.addEventListener('click', (event) => {
  if (event.target === authModal) closeAuthModal();
});

resultModal.addEventListener('click', (event) => {
  if (event.target === resultModal) closeModal('resultModal');
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const authOpen = authModal && authModal.classList.contains('modal--open');
    const resultOpen = resultModal && resultModal.classList.contains('modal--open');
    if (authOpen) closeAuthModal();
    else if (resultOpen) closeModal('resultModal');
  }
});

async function initAuth() {
  try {
    const { data } = await window.FrameMe.supabase.auth.getSession();
    window.FrameMe.currentUser = data.session?.user || null;
  } catch (error) {
    window.FrameMe.currentUser = null;
  }
  updateAuthUI();
}

initAuth();
fetchSupabaseFrames();
