/**
 * AlphaDate Personal AI — In-Page Floating HUD Assistant v2.0
 * Features:
 * - Floating Draggable & Resizable HUD Window (F8 / F12 / Dock)
 * - Deep Chat & Profile Analysis ("⚡ ВЕСТИ ЧАТ")
 * - 4 Response Variants (Short RU, Short EN, Long RU, Long EN) + Score
 * - Hotkeys F1-F8, F12, Alt+1/2/3/4
 * - Night Reports, Client Dossier (CRM 50 men), 10 English Invites
 * - Multimodal Image Analysis, 1-Click Input Insertion & Translation
 */

(() => {
  const STORAGE_API_KEY = 'ai_alphadate_custom_api_key_v1';
  const STORAGE_CLIENTS_KEY = 'ai_alphadate_men_db_v5';
  const STORAGE_KB_KEY = 'ai_alphadate_kb_v5';
  const DEFAULT_KEY = '';

  let currentMode = 'Универсальный';
  let sessionImages: Array<{ mimeType: string; data: string }> = [];
  let lastGeneratedResponses: any = null;
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0, initialLeft = 0, initialTop = 0;

  // ==========================================================================
  // 1. Hotkeys Listener (F1 - F12)
  // ==========================================================================

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    // F8 or F12 -> Toggle Floating Window
    if (e.key === 'F8' || e.code === 'F8') {
      e.preventDefault();
      e.stopPropagation();
      openAndConductChat();
      return;
    }
    if (e.key === 'F12' || e.code === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      toggleHUD();
      return;
    }

    // F1 - F5: Quick Mode Selection & Generation
    const modeKeys: Record<string, string> = {
      F1: 'Универсальный',
      F2: 'Подкол / Ирония',
      F3: 'Горячий флирт',
      F4: 'Забота и Глубина',
      F5: 'Хватка (Макс. ответ)',
    };
    if (modeKeys[e.key]) {
      e.preventDefault();
      e.stopPropagation();
      currentMode = modeKeys[e.key]!;
      const select = document.getElementById('ad-mode-select') as HTMLSelectElement | null;
      if (select) select.value = currentMode;
      openAndConductChat();
      return;
    }

    // F6 -> 10 Invites
    if (e.key === 'F6' || e.code === 'F6') {
      e.preventDefault();
      e.stopPropagation();
      switchTab('invites');
      generateInvites();
      return;
    }

    // Alt + 1/2/3/4 -> Quick Insert generated response into page
    if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      insertVariantByIndex(Number(e.key) - 1);
    }
  }, true);

  // Message from Background action icon
  chrome.runtime.onMessage.addListener((req) => {
    if (req?.type === 'ALPHADATE_TOGGLE_MENU') {
      toggleHUD();
    }
  });

  // ==========================================================================
  // 2. DOM Injection of the Floating HUD Card
  // ==========================================================================

  function ensureHUD(): void {
    if (document.getElementById('alphadate-hud-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'alphadate-hud-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:0; height:0; z-index:2147483647; pointer-events:none; overflow:visible;';

    overlay.innerHTML = `
      <style>
        #alphadate-hud-card {
          position: fixed;
          top: 30px;
          right: 30px;
          width: 580px;
          max-width: 96vw;
          height: 720px;
          max-height: 92vh;
          background: linear-gradient(180deg, #0e131d 0%, #080c13 100%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          color: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255,255,255,0.05) inset;
          display: flex;
          flex-direction: column;
          resize: both;
          overflow: hidden;
          pointer-events: auto;
          backdrop-filter: blur(20px);
          user-select: none;
          min-width: 440px;
          min-height: 520px;
        }

        /* Header */
        #ad-header {
          background: rgba(19, 26, 38, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: move;
        }

        .ad-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.5px;
          color: #fff;
        }

        .ad-brand-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3b82f6;
          box-shadow: 0 0 10px #3b82f6;
        }

        .ad-tabs-header {
          display: flex;
          gap: 4px;
        }

        .ad-tab-btn {
          background: none;
          border: none;
          padding: 8px 10px;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
        }

        .ad-tab-btn.active {
          color: #fff;
          border-bottom-color: #3b82f6;
        }

        .ad-header-actions button {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .ad-header-actions button:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
        }

        /* Scroll Body */
        #ad-body {
          flex: 1;
          overflow-y: auto;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Glass Sections */
        .ad-section {
          background: rgba(22, 30, 44, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          padding: 12px 14px;
        }

        /* Big 'Вести чат' Action Button */
        .ad-main-btn {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          border: none;
          font-size: 13px;
          font-weight: 800;
          color: #fff;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          box-shadow: 0 4px 20px rgba(37, 99, 235, 0.4);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .ad-main-btn:hover {
          filter: brightness(1.12);
          transform: translateY(-1px);
          box-shadow: 0 6px 25px rgba(37, 99, 235, 0.5);
        }

        .ad-main-btn:disabled {
          opacity: 0.6;
          cursor: wait;
          transform: none;
        }

        /* Inputs & Textareas — 100% User Selectable & Writable */
        #alphadate-hud-card input,
        #alphadate-hud-card textarea,
        #alphadate-hud-card select,
        .ad-input {
          width: 100%;
          padding: 9px 12px;
          border-radius: 8px;
          background: #090d14;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          font-size: 12px;
          box-sizing: border-box;
          outline: none;
          user-select: text !important;
          -webkit-user-select: text !important;
          cursor: text !important;
          pointer-events: auto !important;
        }

        .ad-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
          background: #0d131f;
        }

        /* Result Cards */
        .ad-variant-card {
          background: rgba(15, 22, 33, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: border-color 0.15s;
        }

        .ad-variant-card:hover {
          border-color: rgba(59, 130, 246, 0.4);
        }

        .ad-variant-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ad-tag {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .ad-tag-ru { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .ad-tag-en { background: rgba(168, 85, 247, 0.2); color: #c084fc; }

        .ad-variant-text {
          font-size: 13px;
          line-height: 1.45;
          color: #f8fafc;
          user-select: text;
        }

        .ad-actions {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }

        .ad-btn-sm {
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
          transition: all 0.15s;
        }

        .ad-btn-sm:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
        }

        .ad-btn-insert {
          background: #2563eb;
          color: #fff;
          border-color: transparent;
        }

        .ad-btn-insert:hover {
          background: #1d4ed8;
        }

        /* Status Toast */
        #ad-status-msg {
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          display: none;
        }

        /* Floating Dock Widget */
        #alphadate-dock {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 2147483646;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: linear-gradient(135deg, rgba(20, 28, 42, 0.95), rgba(10, 14, 22, 0.95));
          border: 1px solid rgba(59, 130, 246, 0.4);
          border-radius: 14px;
          color: #fff;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(12px);
          pointer-events: auto;
          transition: all 0.2s ease;
        }

        #alphadate-dock:hover {
          transform: translateY(-2px) scale(1.02);
          border-color: #3b82f6;
          box-shadow: 0 12px 35px rgba(37, 99, 235, 0.35);
        }

        .ad-dock-icon {
          font-size: 20px;
          color: #3b82f6;
        }
      </style>

      <!-- FLOATING HUD CARD -->
      <div id="alphadate-hud-card">
        
        <!-- Header (Draggable) -->
        <div id="ad-header">
          <div class="ad-brand">
            <div class="ad-brand-dot"></div>
            <span>ALPHADATE AI</span>
          </div>

          <div class="ad-tabs-header">
            <button type="button" class="ad-tab-btn active" id="tab-btn-chat">⚡ Ведение чата</button>
            <button type="button" class="ad-tab-btn" id="tab-btn-dossier">🗂️ Досье (50)</button>
            <button type="button" class="ad-tab-btn" id="tab-btn-invites">🚀 Инвайты (F6)</button>
            <button type="button" class="ad-tab-btn" id="tab-btn-settings">🔑 Доступы</button>
          </div>

          <div class="ad-header-actions">
            <button type="button" id="ad-btn-min" title="Свернуть в док">—</button>
            <button type="button" id="ad-btn-close" title="Закрыть">×</button>
          </div>
        </div>

        <!-- Body -->
        <div id="ad-body">
          <div id="ad-status-msg"></div>

          <!-- TAB 1: ВЕДЕНИЕ ЧАТА -->
          <div id="ad-tab-content-chat" style="display:flex; flex-direction:column; gap:12px;">
            
            <!-- Quick API Key Banner (Direct & Editable on Main Tab) -->
            <div id="ad-quick-key-banner" class="ad-section" style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(59, 130, 246, 0.35); padding: 10px 12px; border-radius: 10px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                <span style="font-size:12px; font-weight:700; color:#60a5fa;">🔑 Google Gemini API Ключ:</span>
                <span id="ad-quick-key-status" style="font-size:11px; font-weight:700; color:#ef4444;">❌ Ключ не введен</span>
              </div>
              <div style="display:flex; gap:8px;">
                <input type="text" id="ad-quick-api-key" class="ad-input" style="font-family:monospace; color:#34d399; font-size:12px;" placeholder="Вставьте сюда API ключ (AIzaSy...)">
                <button type="button" id="ad-btn-quick-save-key" class="ad-btn-sm" style="background:#10b981; color:#fff; font-weight:bold; white-space:nowrap; padding:6px 14px;">💾 Сохранить</button>
              </div>
              <small style="display:block; color:#94a3b8; font-size:10px; margin-top:4px;">Ключ надежно хранится локально в вашем браузере.</small>
            </div>

            <!-- Interlocutor info -->
            <div class="ad-section" style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:11px; color:#94a3b8;">Собеседник в чате:</div>
                <div id="ad-man-info" style="font-size:14px; font-weight:800; color:#60a5fa; margin-top:2px;">Определяю анкету...</div>
                <div id="ad-girl-info" style="font-size:11px; color:#cbd5e1; margin-top:2px;">Твоя анкета: —</div>
              </div>
              <button type="button" id="ad-btn-refresh" class="ad-btn-sm">🔄 Обновить</button>
            </div>

            <!-- Big Conduct Chat Button -->
            <button type="button" id="ad-btn-conduct" class="ad-main-btn">
              <span>⚡</span>
              <span>ВЕСТИ ЧАТ / АНАЛИЗ (F8)</span>
            </button>

            <!-- Auto-Send & Tools -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 0 4px; margin-top: -4px;">
              <label style="font-size:11px; color:#cbd5e1; display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="checkbox" id="ad-auto-send-toggle" style="cursor:pointer; accent-color:#3b82f6;">
                <span>⚡ Авто-отправка после перевода</span>
              </label>
              <span id="ad-btn-clear-chat" style="font-size:11px; color:#60a5fa; cursor:pointer;" title="Очистить поля чата на сайте">🧹 Очистить поле</span>
            </div>

            <!-- Mode & Style Selector -->
            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:10px;">
              <div>
                <label style="display:block; font-size:11px; color:#94a3b8; margin-bottom:4px;">Стиль ответа:</label>
                <select id="ad-mode-select" class="ad-input">
                  <option value="Универсальный">✨ Универсальный (Уют + Флирт + Вопрос)</option>
                  <option value="Подкол / Ирония">😏 Подкол / Ирония (Заставить оправдаться)</option>
                  <option value="Горячий флирт">🔥 Горячий флирт (Кокетливо + химия)</option>
                  <option value="Забота и Глубина">❤️ Забота и Глубина (Душевно о его жизни)</option>
                  <option value="Зацепка / Смена темы">🎣 Зацепка (Если чат тухнет или он сухой)</option>
                  <option value="Минутный чат (серия)">⏱️ Серия коротких реплик (по минутам)</option>
                  <option value="Хватка (Макс. ответ)">🎯 Хватка (Наивысший шанс ответа)</option>
                </select>
              </div>
              <div>
                <label style="display:block; font-size:11px; color:#94a3b8; margin-bottom:4px;">Язык:</label>
                <select id="ad-lang-select" class="ad-input">
                  <option value="Русский + Английский">🇷🇺 RU + 🇬🇧 EN</option>
                  <option value="Только Русский">🇷🇺 Только RU</option>
                  <option value="Только Английский">🇬🇧 Только ENG</option>
                </select>
              </div>
            </div>

            <!-- Live prompt tweak & Photo attachment -->
            <div class="ad-section">
              <label style="display:block; font-size:11px; color:#94a3b8; margin-bottom:4px;">Живая правка (о чем написать):</label>
              <input type="text" id="ad-custom-prompt" class="ad-input" placeholder="Например: спроси про его собаку на фото или пошути про работу...">
              
              <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                <label style="font-size:11px; color:#94a3b8; cursor:pointer;">
                  📷 Прикрепить фото: <input type="file" id="ad-photo-input" accept="image/*" multiple style="display:none;">
                  <span class="ad-btn-sm" style="display:inline-block; margin-left:6px;">+ Выбрать</span>
                </label>
                <div id="ad-photo-preview" style="display:flex; gap:6px;"></div>
              </div>
            </div>

            <!-- Results container -->
            <div id="ad-results-container"></div>

            <!-- Night Report button -->
            <div style="display:flex; gap:8px;">
              <button type="button" id="ad-btn-report" class="ad-btn-sm" style="flex:1; padding:10px;">📝 Ночной отчет (23-08)</button>
              <button type="button" id="ad-btn-clean-mem" class="ad-btn-sm" style="padding:10px;">⚡ Очистить</button>
            </div>
          </div>

          <!-- TAB 2: ДОСЬЕ МУЖЧИН (CRM 50) -->
          <div id="ad-tab-content-dossier" style="display:none; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:12px; font-weight:700; color:#94a3b8;">База досье (до 50 человек)</span>
              <span id="ad-dossier-count" style="font-size:11px; color:#60a5fa; background:rgba(59,130,246,0.15); padding:2px 8px; border-radius:10px;">0 / 50</span>
            </div>
            <input type="text" id="ad-dossier-search" class="ad-input" placeholder="Поиск по имени или ID...">
            <div id="ad-dossier-list" style="display:flex; flex-direction:column; gap:8px; max-height:450px; overflow-y:auto;"></div>
          </div>

          <!-- TAB 3: ИНВАЙТЫ -->
          <div id="ad-tab-content-invites" style="display:none; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:12px; font-weight:700; color:#94a3b8;">10 случайных English инвайтов</span>
              <button type="button" id="ad-btn-gen-invites" class="ad-btn-sm">⚡ Сгенерировать новые</button>
            </div>
            <div id="ad-invites-list" style="display:flex; flex-direction:column; gap:8px;"></div>
          </div>

          <!-- TAB 4: ДОСТУПЫ -->
          <div id="ad-tab-content-settings" style="display:none; flex-direction:column; gap:12px;">
            <div class="ad-section">
              <div style="font-size:12px; font-weight:700; color:#60a5fa; margin-bottom:8px;">⚡ Ключ Google Gemini</div>
              <input type="text" id="ad-api-key" class="ad-input" style="font-family:monospace; color:#34d399;" placeholder="AIzaSy...">
              <small style="display:block; color:#94a3b8; font-size:10px; margin-top:4px;">Ключ хранится локально в вашем браузере.</small>
            </div>

            <div class="ad-section">
              <div style="font-size:12px; font-weight:700; color:#60a5fa; margin-bottom:8px;">📋 Системные правила оператора</div>
              <textarea id="ad-kb-text" class="ad-input" rows="4" placeholder="Особые инструкции для ИИ..."></textarea>
            </div>

            <button type="button" id="ad-btn-save-settings" class="ad-main-btn" style="background:#10b981;">✓ Сохранить настройки</button>
          </div>

        </div>
      </div>

      <!-- FLOATING CORNER DOCK -->
      <div id="alphadate-dock" title="Открыть суфлер (F8 / F12)">
        <span class="ad-dock-icon">⚡</span>
        <div>
          <b style="font-size:12px; display:block; letter-spacing:0.5px;">ALPHADATE</b>
          <small style="font-size:10px; color:#94a3b8;">Суфлер (F8)</small>
        </div>
      </div>
    `;

    (document.body || document.documentElement).appendChild(overlay);

    // Event Bindings
    setupDragAndDrop();
    setupTabSwitching();
    setupActions();
    loadSettingsToUI();
  }

  // ==========================================================================
  // 3. Dragging & Resizing Logic
  // ==========================================================================

  function setupDragAndDrop(): void {
    const card = document.getElementById('alphadate-hud-card')!;
    const header = document.getElementById('ad-header')!;

    header.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = card.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      card.style.right = 'auto';
      card.style.left = `${initialLeft}px`;
      card.style.top = `${initialTop}px`;
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      card.style.left = `${Math.max(10, initialLeft + dx)}px`;
      card.style.top = `${Math.max(10, initialTop + dy)}px`;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Minimize & Close
    document.getElementById('ad-btn-min')!.onclick = toggleHUD;
    document.getElementById('ad-btn-close')!.onclick = () => {
      card.style.display = 'none';
    };
    document.getElementById('alphadate-dock')!.onclick = toggleHUD;
  }

  function toggleHUD(): void {
    ensureHUD();
    const card = document.getElementById('alphadate-hud-card');
    if (!card) return;
    const isVisible = window.getComputedStyle(card).display !== 'none';
    card.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
      scrapeClientInfo();
    }
  }

  async function openAndConductChat(): Promise<void> {
    ensureHUD();
    const card = document.getElementById('alphadate-hud-card')!;
    card.style.display = 'flex';
    switchTab('chat');
    await conductChat();
  }

  // ==========================================================================
  // 4. Tab Switching
  // ==========================================================================

  function switchTab(tabName: 'chat' | 'dossier' | 'invites' | 'settings'): void {
    const tabs = ['chat', 'dossier', 'invites', 'settings'];
    tabs.forEach((t) => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const content = document.getElementById(`ad-tab-content-${t}`);
      if (btn) btn.classList.toggle('active', t === tabName);
      if (content) content.style.display = t === tabName ? 'flex' : 'none';
    });

    if (tabName === 'dossier') renderDossierList();
    if (tabName === 'settings') loadSettingsToUI();
  }

  function setupTabSwitching(): void {
    document.getElementById('tab-btn-chat')!.onclick = () => switchTab('chat');
    document.getElementById('tab-btn-dossier')!.onclick = () => switchTab('dossier');
    document.getElementById('tab-btn-invites')!.onclick = () => switchTab('invites');
    document.getElementById('tab-btn-settings')!.onclick = () => switchTab('settings');
  }

  // ==========================================================================
  // 5. Chat & Profile Scrapers (Multi-Platform Adaptive)
  // ==========================================================================

  function scrapeClientInfo(): any {
    let manName = 'Мужчина', manAge = '—', manId = 'unknown', manPlace = '', girlInfo = 'Девушка', balance = '';

    // 1. Check common chat headers
    const chatHeader = document.querySelector('[data-testid="chat-header"], [class*="chat_head-"], [class*="ChatHeader"], [class*="chat-header"]');
    if (chatHeader) {
      const nameEl = chatHeader.querySelector('[data-testid="man-name"], [class*="chat_head_profile-"][class*="left-"] [class*="chat_head_profile_name-"], [class*="user-name"], h2, h3');
      if (nameEl) {
        const raw = (nameEl as HTMLElement).innerText || '';
        const m = raw.match(/([^,]+),\s*(\d{1,3})/);
        if (m) {
          manName = m[1]!.trim();
          manAge = m[2]!.trim();
        } else if (raw.trim()) {
          manName = raw.trim();
        }
      }

      const idWrap = chatHeader.querySelector('.ot4et-man-id-balance-wrap, [data-testid="balance"]') || chatHeader;
      if (idWrap) {
        const text = (idWrap as HTMLElement).innerText || '';
        const idMatch = text.match(/ID\s*[:]?\s*(\d{5,15})/i);
        if (idMatch) manId = idMatch[1]!.trim();
        const bMatch = text.match(/(?:Balance|Баланс|Credits|Points|Балы)\s*[:]?\s*([\d\s.,]+)/i);
        if (bMatch) balance = bMatch[1]!.trim();
      }

      const placeEl = chatHeader.querySelector('[data-testid="man-place"], [class*="location"]');
      if (placeEl) manPlace = ((placeEl as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim();
    }

    // 2. Girl profile name
    const girlEl = document.querySelector('[data-testid="girl-name"], [class*="girl_name"], [class*="lady_name"]');
    if (girlEl) {
      const gRaw = (girlEl as HTMLElement).innerText || '';
      if (gRaw.trim()) girlInfo = gRaw.trim();
    }

    // 3. Extract dialogue messages
    const msgNodes = document.querySelectorAll(
      '[data-testid^="received-message-"], [data-testid^="sent-message-"], [class*="message-item"], [class*="message-bubble"], .message-in, .message-out, .msg-item'
    );
    const dialogueLines: string[] = [];

    msgNodes.forEach((node) => {
      const testId = node.getAttribute('data-testid') || '';
      const className = node.className || '';
      const isMan = testId.startsWith('received-message') || className.includes('received') || className.includes('message-in') || className.includes('incoming');
      const isGirl = testId.startsWith('sent-message') || className.includes('sent') || className.includes('message-out') || className.includes('outgoing');
      if (!isMan && !isGirl) return;

      const textNode = node.querySelector('[data-testid="message-text"], [class*="text"], .message-content') || node;
      const clean = ((textNode as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim();
      if (clean) {
        dialogueLines.push(`${isMan ? 'Мужчина' : 'Девушка (Ты)'}: ${clean}`);
      }
    });

    const cleanChat = dialogueLines.slice(-25).join('\n');

    // 4. Extract last message from man
    let lastManMessage = '';
    for (let i = dialogueLines.length - 1; i >= 0; i--) {
      const line = dialogueLines[i]!;
      if (line.startsWith('Мужчина:')) {
        lastManMessage = line.replace(/^Мужчина:\s*/, '').trim();
        break;
      }
    }

    // 5. Selected text on page (high-priority hook)
    const selectedText = (window.getSelection()?.toString() || '').trim();

    // Update UI Card
    const nameLabel = document.getElementById('ad-man-info');
    const girlLabel = document.getElementById('ad-girl-info');
    if (nameLabel) {
      nameLabel.textContent = `${manName}, ${manAge} ${manId !== 'unknown' ? `(ID: ${manId})` : ''} ${balance ? `💰 ${balance}` : ''} ${manPlace ? `· ${manPlace}` : ''}`;
    }
    if (girlLabel) girlLabel.textContent = `Твоя анкета: ${girlInfo}`;

    const clientObj = {
      id: manId !== 'unknown' ? `ID_${manId}` : `${manName}_${manAge}`,
      manId,
      name: manName,
      dob: manAge,
      location: manPlace,
      balance,
      girlInfo,
      chat: cleanChat,
      lastManMessage,
      selectedText,
      summary: cleanChat ? cleanChat.split('\n').slice(-2).join(' | ') : 'Новый чат',
      updatedAt: Date.now(),
    };

    saveClientToDossier(clientObj);
    return clientObj;
  }

  function getModeGuideline(mode: string): string {
    switch (mode) {
      case 'Подкол / Ирония':
        return 'Игривая женская дерзость, легкий подкол и фрейм-контроль. Поставь его в позицию, где ему хочется оправдаться или с улыбкой доказать, что он настоящий мужчина.';
      case 'Горячий флирт':
        return 'Чувственный, кокетливый и манящий тон. Романтическая химия, комплимент его голосу/характеру, лёгкий намёк на созвон или личный контакт без пошлости.';
      case 'Забота и Глубина':
        return 'Глубокий душевный интерес к его дню, настроению или мыслям. Тон заботливой, уютной девушки, которой хочется довериться (для взрослых и состоятельных мужчин).';
      case 'Зацепка / Смена темы':
        return 'Резкий слом шаблона! Если он отвечает сухо ("ок", "ясно") или чат тухнет, перехвати инициативу парадоксальным вопросом или яркой интригой.';
      case 'Минутный чат (серия)':
        return 'Короткие динамичные фразы (1-2 коротких предложения), как живые сообщения в мессенджере, побуждающие моментально ответить (удержание платного таймера).';
      case 'Хватка (Макс. ответ)':
        return 'Максимально цепкая фраза с сильным психологическим триггером (комплимент эго + неожиданный открытый вопрос).';
      default:
        return 'Универсальный живой женский стиль: уют, лёгкий кокетливый вайб, искренний интерес к его реплике и открытый вопрос в конце.';
    }
  }

  // ==========================================================================
  // 6. "⚡ ВЕСТИ ЧАТ" — The Elite AI Pipeline
  // ==========================================================================

  async function conductChat(): Promise<void> {
    const btn = document.getElementById('ad-btn-conduct') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span><span>АНАЛИЗИРУЮ ДИАЛОГ...</span>';
    }

    showStatus('Чтение чата и контекста...', 'loading');

    try {
      const client = scrapeClientInfo();
      const apiKey = await getApiKey();

      if (!apiKey || apiKey.trim().length < 10) {
        showStatus('⚠️ Введите API ключ в поле вверху и нажмите "Сохранить"!', 'error');
        const qInput = document.getElementById('ad-quick-api-key') as HTMLInputElement | null;
        if (qInput) {
          qInput.focus();
          qInput.style.borderColor = '#ef4444';
        }
        return;
      }

      const kb = await getKB();
      const customPrompt = (document.getElementById('ad-custom-prompt') as HTMLInputElement)?.value.trim() || '';
      const mode = (document.getElementById('ad-mode-select') as HTMLSelectElement)?.value || currentMode;
      const lang = (document.getElementById('ad-lang-select') as HTMLSelectElement)?.value || 'Русский + Английский';

      // 1. Strict Priority Ladder System Prompt
      const systemPrompt = `Ты — элитный профессиональный суфлер для оператора на сайте знакомств. 
Ты общаешься от лица молодой привлекательной девушки (${client.girlInfo || 'красивая, интересная девушка'}) с мужчиной (${client.name}, возраст: ${client.dob || 'не указан'}, город: ${client.location || 'не указан'}).

РЕЖИМ ОБЩЕНИЯ И ТОН: ${mode}
ЯЗЫК: ${lang}

ГЛАВНАЯ ЦЕЛЬ:
Максимально разогреть интерес мужчины, вызвать эмоциональный отклик и сделать так, чтобы он моментально захотел ответить.
Пиши не как робот или служба поддержки, а как живая, притягательная девушка с телефоном в руках.

ЖЕСТКИЕ ПРАВИЛА:
1. Пиши СТРОГО в женском роде (окончания: -ла, -лась, женская интонация, лёгкое кокетство).
2. СТРОЖАЙШИЙ ЗАПРЕТ НА КЛИШЕ: Запрещено писать "Привет красавчик", "Мне понравилась твоя анкета", "Как проходит день?", "Что ищешь на сайте?", "Чем занимаешься по жизни?". Это убивает интерес.
3. ПРИОРИТЕТ ЗАЦЕПКИ:
   - Если мужчина только что что-то написал — ОБЯЗАТЕЛЬНО оттолкнись от его последней реплики!
   - Если оператор выделил текст на странице — строй ответ вокруг этого факта!
   - Любой ответ ОБЯЗАН заканчиваться открытым цепляющим вопросом или игривым вызовом, на который нельзя ответить просто "да" или "нет".
4. СТИЛЬ РЕЖИМА "${mode}":
   ${getModeGuideline(mode)}

${kb ? `СИСТЕМНЫЕ ИНСТРУКЦИИ ОПЕРАТОРА (ОБЯЗАТЕЛЬНО УЧТИ):\n${kb}\n` : ''}
${client.selectedText ? `ВЫДЕЛЕННЫЙ ОПЕРАТОРОМ ТЕКСТ / ЗАЦЕПКА ИЗ АНКЕТЫ (НАИВЫСШИЙ ПРИОРИТЕТ):\n"${client.selectedText}"\n` : ''}
${customPrompt ? `КОНКРЕТНОЕ ПОЖЕЛАНИЕ ОПЕРАТОРА:\n"${customPrompt}"\n` : ''}

ИСТОРИЯ ПЕРЕПИСКИ (последние реплики):
${client.chat || 'Новый диалог! Начни с яркой интриги, кокетливого наблюдения или лёгкой женской провокации.'}

ПОСЛЕДНЯЯ РЕПЛИКА МУЖЧИНЫ:
"${client.lastManMessage || 'Мужчина пока молчит или это первое сообщение'}"

ОТВЕТЬ СТРОГО В ВАЛИДНОМ JSON (без лишнего текста вокруг):
{
  "short_ru": "Живой вовлекающий ответ на русском (1-2 предложения с крючком, до 140 символов)",
  "short_en": "Качественный разговорный английский перевод short_ru",
  "long_ru": "Развернутый эмоциональный ответ на русском (2-3 предложения с раскрытием темы и открытым вопросом)",
  "long_en": "Качественная разговорная английская адаптация long_ru",
  "response_score": 96,
  "man_mood": "Краткая характеристика настроения мужчины (например: Кокетничает / Скептичен / Одинокий дед / Ждет комплимента)",
  "tactical_tip": "Тактический совет оператору (например: Не дави на встречу, расспроси про его яхту / Предложи голосовое)"
}`;

      showStatus('Генерация через Gemini...', 'loading');

      // Send to background runner with multi-model cascade
      const res = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'ALPHADATE_GENERATE',
            apiKey,
            prompt: systemPrompt,
            images: sessionImages,
          },
          (response) => {
            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
            if (!response || !response.ok) return reject(new Error(response?.error || 'Сбой генерации'));
            resolve(response);
          }
        );
      });

      // Parse JSON
      const jsonMatch = res.text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(res.text);
      lastGeneratedResponses = parsed;

      renderResponses(parsed);
      showStatus(`✓ Готово! (Модель: ${res.model})`, 'success');

      // Reset photo uploads
      sessionImages = [];
      renderPhotoPreview();
    } catch (err: any) {
      showStatus(`Ошибка: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>⚡</span><span>ВЕСТИ ЧАТ / АНАЛИЗ (F8)</span>';
      }
    }
  }

  // ==========================================================================
  // 7. Render 4 Variants with 1-Click Insert & Translation
  // ==========================================================================

  function renderResponses(data: any): void {
    const root = document.getElementById('ad-results-container')!;
    root.innerHTML = '';

    // Tactical Banner
    const tacticalCard = document.createElement('div');
    tacticalCard.style.cssText = 'padding:10px 12px; background:rgba(30,41,59,0.85); border:1px solid rgba(59,130,246,0.3); border-radius:10px; margin-bottom:10px; display:flex; flex-direction:column; gap:4px;';
    tacticalCard.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:12px; font-weight:bold; color:#60a5fa;">🎯 Тактический разбор:</span>
        <span style="font-size:11px; font-weight:800; color:#34d399; background:rgba(52,211,153,0.15); padding:2px 8px; border-radius:8px;">🔥 Шанс ответа: ${data.response_score || 95}%</span>
      </div>
      <div style="font-size:11px; color:#cbd5e1;"><b>Настроение мужчины:</b> ${data.man_mood || 'Заинтересован, вовлечен'}</div>
      <div style="font-size:11px; color:#f59e0b;"><b>Совет:</b> ${data.tactical_tip || 'Держи инициативу и задай открытый встречный вопрос'}</div>
    `;
    root.appendChild(tacticalCard);

    const variants = [
      { key: 'short_ru', label: '🇷🇺 RU Короткий (до 140)', tag: 'ad-tag-ru', text: data.short_ru, hotkey: 'Alt+1', lang: 'ru' as const },
      { key: 'short_en', label: '🇬🇧 EN Короткий (до 140)', tag: 'ad-tag-en', text: data.short_en, hotkey: 'Alt+2', lang: 'en' as const },
      { key: 'long_ru', label: '🇷🇺 RU Развернутый (2-3 фразы)', tag: 'ad-tag-ru', text: data.long_ru, hotkey: 'Alt+3', lang: 'ru' as const },
      { key: 'long_en', label: '🇬🇧 EN Развернутый (2-3 фразы)', tag: 'ad-tag-en', text: data.long_en, hotkey: 'Alt+4', lang: 'en' as const },
    ];

    variants.forEach((v, idx) => {
      if (!v.text) return;
      const card = document.createElement('div');
      card.className = 'ad-variant-card';
      card.innerHTML = `
        <div class="ad-variant-header">
          <span class="ad-tag ${v.tag}">${v.label}</span>
          <span style="font-size:10px; color:#94a3b8;">${v.text.length} симв. · ${v.hotkey}</span>
        </div>
        <div class="ad-variant-text" style="font-size:13px; line-height:1.45; color:#f1f5f9;">${v.text}</div>
        <div class="ad-actions">
          <button type="button" class="ad-btn-sm ad-btn-insert" style="background:#2563eb; color:#fff; font-weight:bold;">⚡ Вставить ${v.lang === 'ru' ? 'в RU' : 'в ENG'} (${v.hotkey})</button>
          <button type="button" class="ad-btn-sm ad-btn-copy">📋 Копировать</button>
        </div>
      `;

      card.querySelector('.ad-btn-insert')!.addEventListener('click', () => {
        insertTextIntoChat(v.text, v.lang);
      });

      card.querySelector('.ad-btn-copy')!.addEventListener('click', (e) => {
        const btn = e.target as HTMLButtonElement;
        navigator.clipboard.writeText(v.text);
        btn.textContent = '✓ Скопировано!';
        setTimeout(() => (btn.textContent = '📋 Копировать'), 1200);
      });

      root.appendChild(card);
    });
  }

  function insertVariantByIndex(index: number): void {
    if (!lastGeneratedResponses) return;
    const variants = [
      { text: lastGeneratedResponses.short_ru, lang: 'ru' as const },
      { text: lastGeneratedResponses.short_en, lang: 'en' as const },
      { text: lastGeneratedResponses.long_ru, lang: 'ru' as const },
      { text: lastGeneratedResponses.long_en, lang: 'en' as const },
    ];

    const chosen = variants[index];
    if (chosen && chosen.text) {
      insertTextIntoChat(chosen.text, chosen.lang);
    }
  }

  // ==========================================================================
  // 8. Auto-Insert into Web Page Chat & Auto-Translate Click
  // ==========================================================================

  function insertTextIntoChat(text: string, lang: 'ru' | 'en' = 'ru'): boolean {
    // 1. Dual textarea check (e.g. ChatOS with RU left, EN right, and translation arrow)
    const textareas = Array.from(document.querySelectorAll('textarea[data-testid="text"]'))
      .filter((node: any) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 20 && rect.height > 20 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .sort((a: any, b: any) => a.getBoundingClientRect().left - b.getBoundingClientRect().left) as HTMLTextAreaElement[];

    const leftTextarea = textareas[0] || null;
    const rightTextarea = textareas[1] || null;

    if (lang === 'en' && rightTextarea) {
      rightTextarea.focus();
      setTextareaNativeValue(rightTextarea, text);
      showToast('✓ Вставлено в правое (ENG) поле!');
      checkAutoSend();
      return true;
    }

    if (leftTextarea) {
      leftTextarea.focus();
      setTextareaNativeValue(leftTextarea, text);

      // Auto-click translation arrow
      const arrows = Array.from(document.querySelectorAll('[data-testid="change-languages-btn"]')) as HTMLElement[];
      if (arrows.length > 0) {
        setTimeout(() => {
          arrows[0]?.click();
          showToast('✓ Вставлено в RU поле и переведено!');
          checkAutoSend();
        }, 220);
      } else {
        showToast('✓ Вставлено в поле ввода!');
        checkAutoSend();
      }
      return true;
    }

    // 2. Generic Single Textarea / Input
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl instanceof HTMLTextAreaElement || (activeEl instanceof HTMLInputElement && activeEl.type === 'text')) {
      setTextareaNativeValue(activeEl as any, text);
      showToast('✓ Вставлено в активное поле!');
      checkAutoSend();
      return true;
    }

    // 3. Fallback search common selectors
    const candidates = ['textarea', '[contenteditable="true"]', 'input[type="text"]', '[role="textbox"]'];
    for (const sel of candidates) {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) {
        el.focus();
        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          setTextareaNativeValue(el as any, text);
        } else if (el.isContentEditable) {
          el.innerText = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        showToast('✓ Вставлено в поле ввода!');
        checkAutoSend();
        return true;
      }
    }

    navigator.clipboard.writeText(text);
    showToast('📋 Поле не найдено. Текст скопирован в буфер!');
    return false;
  }

  function checkAutoSend(): void {
    const autoSend = (document.getElementById('ad-auto-send-toggle') as HTMLInputElement)?.checked;
    if (!autoSend) return;
    setTimeout(() => {
      const sendBtn = document.querySelector('[data-testid="send-btn"], .chat-send-btn, button[class*="send"]') as HTMLElement | null;
      if (sendBtn) {
        sendBtn.click();
        showToast('🚀 Сообщение автоматически отправлено!');
      }
    }, 900);
  }

  function setTextareaNativeValue(element: HTMLTextAreaElement | HTMLInputElement, val: string): void {
    const proto = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor?.set) {
      descriptor.set.call(element, val);
    } else {
      element.value = val;
    }
    const tracker = (element as any)._valueTracker;
    if (tracker) {
      tracker.setValue(val);
    }
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: val }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ==========================================================================
  // 9. Night Report Generator (23-08)
  // ==========================================================================

  async function generateNightReport(): Promise<void> {
    const btn = document.getElementById('ad-btn-report') as HTMLButtonElement | null;
    if (btn) btn.textContent = '⏳ Формирую отчет...';

    try {
      const client = scrapeClientInfo();
      const apiKey = await getApiKey();

      const reportPrompt = `Ты — оператор. Напиши сухой ночной отчет строго по факту того, что было в переписке.
ПРАВИЛА:
1. Называй мужчину "дед" (например: "дед просит фото", "дед слился", "дед ноет про жизнь").
2. НИКАКОГО КРИНЖА И ФАНТАЗИЙ.
3. Пиши строго по факту: о чем конкретно шла речь, на что он среагировал, к чему пришли (схавал видео, леттер, дал контакты, ушел спать, общались про хобби).

ФОРМАТ ВЫВОДА:
${client.name}, ${client.dob}
ID ${client.manId}
[Суть разговора по факту: 1-2 предложения]

ИСТОРИЯ ЧАТА:\n${client.chat}`;

      const res = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'ALPHADATE_GENERATE', apiKey, prompt: reportPrompt }, (r) => {
          if (!r?.ok) return reject(new Error(r?.error || 'Ошибка отчета'));
          resolve(r);
        });
      });

      const root = document.getElementById('ad-results-container')!;
      root.innerHTML = `
        <div class="ad-variant-card" style="border-color:#3b82f6;">
          <div class="ad-variant-header">
            <span class="ad-tag ad-tag-ru">📝 НОЧНОЙ ОТЧЕТ</span>
            <button type="button" class="ad-btn-sm" id="ad-btn-copy-report">📋 Скопировать отчет</button>
          </div>
          <div class="ad-variant-text" style="white-space:pre-wrap;">${res.text}</div>
        </div>
      `;

      document.getElementById('ad-btn-copy-report')!.onclick = () => {
        navigator.clipboard.writeText(res.text);
        showToast('✓ Отчет скопирован!');
      };
      showStatus('✓ Ночной отчет сформирован!', 'success');
    } catch (e: any) {
      showStatus(`Ошибка отчета: ${e.message}`, 'error');
    } finally {
      if (btn) btn.textContent = '📝 Ночной отчет (23-08)';
    }
  }

  // ==========================================================================
  // 10. 10 Random English Invites (F6)
  // ==========================================================================

  async function generateInvites(): Promise<void> {
    const list = document.getElementById('ad-invites-list')!;
    list.innerHTML = '<div style="color:#64748b; text-align:center; padding:20px;">Придумываю 10 уникальных инвайтов...</div>';

    try {
      const apiKey = await getApiKey();
      const prompt = `Create exactly 10 random engaging first messages (invites) for a dating site.
STRICT RULES:
- English only.
- Under 150 characters each.
- No boring generic greetings ("Hey beautiful", "How are you").
- Playful tease, curiosity, intriguing choice, spontaneous confession.
Return ONLY valid JSON:
{"invites": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."]}`;

      const res = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'ALPHADATE_INVITES', apiKey, prompt }, (r) => {
          if (!r?.ok) return reject(new Error(r?.error || 'Ошибка инвайтов'));
          resolve(r);
        });
      });

      const parsed = JSON.parse(res.text);
      list.innerHTML = '';

      (parsed.invites || []).forEach((inv: string, i: number) => {
        const item = document.createElement('div');
        item.className = 'ad-variant-card';
        item.innerHTML = `
          <div class="ad-variant-header">
            <span class="ad-tag ad-tag-en">#${i + 1}</span>
            <span style="font-size:10px; color:#64748b;">${inv.length}/150</span>
          </div>
          <div class="ad-variant-text">${inv}</div>
          <div class="ad-actions">
            <button type="button" class="ad-btn-sm ad-btn-insert">Вставить в чат</button>
            <button type="button" class="ad-btn-sm ad-btn-copy">📋 Копировать</button>
          </div>
        `;
        item.querySelector('.ad-btn-insert')!.addEventListener('click', () => insertTextIntoChat(inv));
        item.querySelector('.ad-btn-copy')!.addEventListener('click', () => {
          navigator.clipboard.writeText(inv);
          showToast('✓ Скопировано!');
        });
        list.appendChild(item);
      });
    } catch (e: any) {
      list.innerHTML = `<div style="color:#f87171; padding:10px;">Ошибка: ${e.message}</div>`;
    }
  }

  // ==========================================================================
  // 11. Client Dossier (CRM 50 men)
  // ==========================================================================

  async function getClientsDossier(): Promise<any[]> {
    return new Promise((r) => {
      chrome.storage.local.get([STORAGE_CLIENTS_KEY], (res) => {
        r(Array.isArray(res[STORAGE_CLIENTS_KEY]) ? res[STORAGE_CLIENTS_KEY] : []);
      });
    });
  }

  async function saveClientToDossier(client: any): Promise<void> {
    try {
      const db = await getClientsDossier();
      const idx = db.findIndex((c) => c.id === client.id);
      if (idx >= 0) {
        db[idx] = { ...db[idx], ...client, updatedAt: Date.now() };
      } else {
        if (db.length >= 50) db.pop();
        db.unshift(client);
      }
      await chrome.storage.local.set({ [STORAGE_CLIENTS_KEY]: db });
    } catch (_) {}
  }

  async function renderDossierList(): Promise<void> {
    const list = document.getElementById('ad-dossier-list')!;
    const countEl = document.getElementById('ad-dossier-count')!;
    const db = await getClientsDossier();
    countEl.textContent = `${db.length} / 50`;

    list.innerHTML = db.length === 0 ? '<div style="color:#64748b; text-align:center; padding:30px;">Досье пусто. Откройте чат с мужчиной.</div>' : '';

    db.forEach((c, idx) => {
      const card = document.createElement('div');
      card.className = 'ad-variant-card';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <b style="color:#60a5fa; font-size:13px;">${idx + 1}. ${c.name}, ${c.dob} (ID: ${c.manId})</b>
          <small style="color:#64748b; font-size:10px;">${new Date(c.updatedAt).toLocaleTimeString()}</small>
        </div>
        <div style="font-size:11px; color:#cbd5e1; line-height:1.4;">${c.summary || 'Нет сообщений'}</div>
      `;
      list.appendChild(card);
    });
  }

  // ==========================================================================
  // 12. Settings & Helpers
  // ==========================================================================

  async function getApiKey(): Promise<string> {
    return new Promise((r) => {
      chrome.storage.local.get([STORAGE_API_KEY], (res) => {
        r((res[STORAGE_API_KEY] || '').trim() || DEFAULT_KEY);
      });
    });
  }

  async function getKB(): Promise<string> {
    return new Promise((r) => {
      chrome.storage.local.get([STORAGE_KB_KEY], (res) => {
        r(res[STORAGE_KB_KEY] || '');
      });
    });
  }

  async function loadSettingsToUI(): Promise<void> {
    const key = await getApiKey();
    const kb = await getKB();
    const keyInput = document.getElementById('ad-api-key') as HTMLInputElement | null;
    const quickKeyInput = document.getElementById('ad-quick-api-key') as HTMLInputElement | null;
    const quickStatus = document.getElementById('ad-quick-key-status');
    const kbInput = document.getElementById('ad-kb-text') as HTMLTextAreaElement | null;

    if (keyInput) keyInput.value = key;
    if (quickKeyInput) quickKeyInput.value = key;

    if (quickStatus) {
      if (key && key.trim().length > 10) {
        quickStatus.textContent = '✅ Ключ сохранен и активен';
        quickStatus.style.color = '#34d399';
      } else {
        quickStatus.textContent = '❌ Ключ не введен';
        quickStatus.style.color = '#ef4444';
      }
    }
    if (kbInput) kbInput.value = kb;
  }

  function setupActions(): void {
    // 1. Isolate all inputs from host page scripts (stops event stealing/blocking)
    const card = document.getElementById('alphadate-hud-card');
    if (card) {
      const inputs = card.querySelectorAll('input, textarea, select');
      inputs.forEach((input) => {
        ['mousedown', 'mouseup', 'click', 'dblclick', 'keydown', 'keyup', 'keypress', 'input', 'paste', 'cut', 'copy'].forEach((evt) => {
          input.addEventListener(evt, (e) => {
            e.stopPropagation();
          }, { capture: true });
        });
      });
    }

    // 2. Quick Save Key Button on Tab 1
    const quickSaveBtn = document.getElementById('ad-btn-quick-save-key');
    if (quickSaveBtn) {
      quickSaveBtn.onclick = async () => {
        const qInput = document.getElementById('ad-quick-api-key') as HTMLInputElement | null;
        const key = (qInput?.value || '').trim();
        if (!key) {
          showToast('⚠️ Введите ваш Gemini API ключ!');
          return;
        }
        await chrome.storage.local.set({ [STORAGE_API_KEY]: key });
        await loadSettingsToUI();
        showToast('✓ Gemini API ключ успешно сохранен!');
      };
    }

    // Quick Key Input Enter key
    const quickInput = document.getElementById('ad-quick-api-key') as HTMLInputElement | null;
    if (quickInput) {
      quickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          quickSaveBtn?.click();
        }
      });
    }

    // Clear chat inputs on website button
    const clearChatBtn = document.getElementById('ad-btn-clear-chat');
    if (clearChatBtn) {
      clearChatBtn.onclick = () => {
        const textareas = document.querySelectorAll('textarea[data-testid="text"], textarea, input[type="text"]');
        textareas.forEach((t) => {
          if (t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement) {
            setTextareaNativeValue(t, '');
          }
        });
        showToast('🧹 Поля ввода на сайте очищены');
      };
    }

    // Conduct chat button
    document.getElementById('ad-btn-conduct')!.onclick = conductChat;
    document.getElementById('ad-btn-refresh')!.onclick = () => {
      scrapeClientInfo();
      showToast('✓ Данные обновлены!');
    };
    document.getElementById('ad-btn-report')!.onclick = generateNightReport;
    document.getElementById('ad-btn-gen-invites')!.onclick = generateInvites;
    document.getElementById('ad-btn-clean-mem')!.onclick = () => {
      document.getElementById('ad-results-container')!.innerHTML = '';
      showToast('✓ Результаты очищены');
    };

    // Save Settings on Tab 4
    document.getElementById('ad-btn-save-settings')!.onclick = async () => {
      const key = (document.getElementById('ad-api-key') as HTMLInputElement).value.trim();
      const kb = (document.getElementById('ad-kb-text') as HTMLTextAreaElement).value.trim();
      await chrome.storage.local.set({
        [STORAGE_API_KEY]: key,
        [STORAGE_KB_KEY]: kb,
      });
      await loadSettingsToUI();
      showToast('✓ Настройки сохранены!');
    };

    // Photo input
    const photoInput = document.getElementById('ad-photo-input') as HTMLInputElement;
    photoInput.addEventListener('change', (e: any) => {
      const files = e.target.files;
      if (!files.length) return;
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          const b64 = event.target.result.split(',')[1];
          sessionImages.push({ mimeType: file.type, data: b64 });
          renderPhotoPreview();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  function renderPhotoPreview(): void {
    const preview = document.getElementById('ad-photo-preview')!;
    preview.innerHTML = '';
    sessionImages.forEach((img, idx) => {
      const thumb = document.createElement('div');
      thumb.style.cssText = 'position:relative; width:32px; height:32px; border-radius:6px; overflow:hidden; border:1px solid #3b82f6;';
      thumb.innerHTML = `<img src="data:${img.mimeType};base64,${img.data}" style="width:100%; height:100%; object-fit:cover;"><button style="position:absolute; top:0; right:0; background:rgba(239,68,68,0.9); color:#fff; border:none; font-size:9px; cursor:pointer; width:14px; height:14px;">×</button>`;
      thumb.querySelector('button')!.onclick = () => {
        sessionImages.splice(idx, 1);
        renderPhotoPreview();
      };
      preview.appendChild(thumb);
    });
  }

  function showStatus(msg: string, kind: 'info' | 'loading' | 'success' | 'error'): void {
    const el = document.getElementById('ad-status-msg');
    if (!el) return;
    el.style.display = 'block';
    el.textContent = msg;

    if (kind === 'error') {
      el.style.background = 'rgba(239, 68, 68, 0.2)';
      el.style.color = '#fca5a5';
      el.style.border = '1px solid rgba(239, 68, 68, 0.4)';
    } else if (kind === 'success') {
      el.style.background = 'rgba(34, 197, 94, 0.2)';
      el.style.color = '#86efac';
      el.style.border = '1px solid rgba(34, 197, 94, 0.4)';
    } else {
      el.style.background = 'rgba(59, 130, 246, 0.2)';
      el.style.color = '#93c5fd';
      el.style.border = '1px solid rgba(59, 130, 246, 0.4)';
    }
  }

  function showToast(msg: string): void {
    const old = document.getElementById('ad-toast-box');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.id = 'ad-toast-box';
    toast.textContent = msg;
    toast.style.cssText = 'position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:rgba(16, 185, 129, 0.95); color:#fff; padding:8px 18px; border-radius:20px; font-size:12px; font-weight:700; z-index:2147483647; box-shadow:0 10px 25px rgba(0,0,0,0.5); pointer-events:none; transition:all 0.2s;';
    document.documentElement.appendChild(toast);
    setTimeout(() => toast.remove(), 2400);
  }

  // Initialize
  console.log('[AlphaDate Personal AI] Content script active on page!');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureHUD);
    window.addEventListener('load', ensureHUD);
  } else {
    ensureHUD();
  }
})();
