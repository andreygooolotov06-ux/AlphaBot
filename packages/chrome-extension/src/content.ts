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

        /* Inputs */
        .ad-input {
          width: 100%;
          padding: 9px 12px;
          border-radius: 8px;
          background: #090d14;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 12px;
          box-sizing: border-box;
          outline: none;
        }

        .ad-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
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

            <!-- Mode & Style Selector -->
            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:10px;">
              <div>
                <label style="display:block; font-size:11px; color:#94a3b8; margin-bottom:4px;">Стиль ответа:</label>
                <select id="ad-mode-select" class="ad-input">
                  <option value="Универсальный">✨ Универсальный (Уют + Флирт + Вопрос)</option>
                  <option value="Подкол / Ирония">😏 Подкол / Спор (Заставить оправдаться)</option>
                  <option value="Горячий флирт">🔥 Горячий флирт (Кокетливо + химия)</option>
                  <option value="Забота и Глубина">❤️ Забота и Глубина (Душевно о его жизни)</option>
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
    let manName = 'Мужчина', manAge = '—', manId = 'unknown', manPlace = '', girlInfo = 'Девушка';

    // 1. Check common chat headers
    const chatHeader = document.querySelector('[data-testid="chat-header"], [class*="chat_head-"], [class*="ChatHeader"]');
    if (chatHeader) {
      const nameEl = chatHeader.querySelector('[data-testid="man-name"], [class*="chat_head_profile-"][class*="left-"] [class*="chat_head_profile_name-"], h2, h3');
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

      const idWrap = chatHeader.querySelector('.ot4et-man-id-balance-wrap') || chatHeader;
      if (idWrap) {
        const idMatch = ((idWrap as HTMLElement).innerText || '').match(/ID\s*(\d{5,15})/i);
        if (idMatch) manId = idMatch[1]!.trim();
      }

      const placeEl = chatHeader.querySelector('[data-testid="man-place"]');
      if (placeEl) manPlace = ((placeEl as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim();
    }

    // 2. Extract dialogue messages
    const msgNodes = document.querySelectorAll('[data-testid^="received-message-"], [data-testid^="sent-message-"], [class*="message-item"]');
    const dialogueLines: string[] = [];

    msgNodes.forEach((node) => {
      const testId = node.getAttribute('data-testid') || '';
      const isMan = testId.startsWith('received-message') || node.classList.contains('received');
      const isGirl = testId.startsWith('sent-message') || node.classList.contains('sent');
      if (!isMan && !isGirl) return;

      const textNode = node.querySelector('[data-testid="message-text"]') || node;
      const clean = ((textNode as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim();
      if (clean) {
        dialogueLines.push(`${isMan ? 'Мужчина' : 'Девушка (Ты)'}: ${clean}`);
      }
    });

    const cleanChat = dialogueLines.slice(-25).join('\n');

    // Update UI Card
    const nameEl = document.getElementById('ad-man-info');
    const girlEl = document.getElementById('ad-girl-info');
    if (nameEl) nameEl.textContent = `${manName}, ${manAge} ${manId !== 'unknown' ? `(ID: ${manId})` : ''} ${manPlace ? `· ${manPlace}` : ''}`;
    if (girlEl) girlEl.textContent = `Твоя анкета: ${girlInfo}`;

    const clientObj = {
      id: manId !== 'unknown' ? `ID_${manId}` : `${manName}_${manAge}`,
      manId,
      name: manName,
      dob: manAge,
      location: manPlace,
      girlInfo,
      chat: cleanChat,
      summary: cleanChat ? cleanChat.split('\n').slice(-2).join(' | ') : 'Новый чат',
      updatedAt: Date.now(),
    };

    saveClientToDossier(clientObj);
    return clientObj;
  }

  // ==========================================================================
  // 6. "⚡ ВЕСТИ ЧАТ" — The Complete AI Pipeline
  // ==========================================================================

  async function conductChat(): Promise<void> {
    const btn = document.getElementById('ad-btn-conduct') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span><span>АНАЛИЗИРУЮ ДИАЛОГ...</span>';
    }

    showStatus('Чтение чата и анкеты...', 'loading');

    try {
      const client = scrapeClientInfo();
      const apiKey = await getApiKey();
      const kb = await getKB();

      const customPrompt = (document.getElementById('ad-custom-prompt') as HTMLInputElement)?.value.trim() || '';
      const mode = (document.getElementById('ad-mode-select') as HTMLSelectElement)?.value || currentMode;
      const lang = (document.getElementById('ad-lang-select') as HTMLSelectElement)?.value || 'Русский + Английский';

      // 1. Strict Priority Ladder System Prompt
      const systemPrompt = `Ты — элитный суфлер для оператора на сайте знакомств. Общаешься от лица девушки (${client.girlInfo}) с мужчиной (${client.name}, возраст: ${client.dob}).
СТИЛЬ / НАСТРОЕНИЕ: ${mode}
ЯЗЫК: ${lang}

ПРАВИЛА НАПИСАНИЯ:
1. Пиши живо, дерзко, тепло и естественно, как будто реальная девушка пишет с телефона за 10 секунд.
2. ЖЕСТКИЙ ЗАПРЕТ НА ШАБЛОНЫ: Запрещено писать "Привет красавчик", "Мне понравилась твоя анкета", "Как проходит день?", "Что ищешь?".
3. СТРОГИЙ ВЫХОД — РОВНО 4 ВАРИАНТА в формате JSON:
   - short_ru: Лаконичный русский ответ с крючком (до 150 символов)
   - short_en: Живая английская версия short_ru (до 150 символов)
   - long_ru: Развернутый вовлекающий ответ с легким подколом или интригой (больше 150 символов)
   - long_en: Развернутая английская адаптация (больше 150 символов)
   - response_score: Оценка вероятности ответа (от 88 до 99)
   - hook_note: Одно предложение, за какую именно мысль из чата ты зацепился.

${kb ? `СИСТЕМНЫЕ ИНСТРУКЦИИ ОПЕРАТОРА:\n${kb}\n` : ''}
${customPrompt ? `ПОЖЕЛАНИЕ ОПЕРАТОРА (ОБЯЗАТЕЛЬНО УЧТИ): ${customPrompt}\n` : ''}

ИСТОРИЯ ЧАТА:
${client.chat || 'Новый диалог, начни с яркой интриги или подкола по анкете.'}

Верни ТОЛЬКО валидный JSON:
{
  "short_ru": "...",
  "short_en": "...",
  "long_ru": "...",
  "long_en": "...",
  "response_score": 94,
  "hook_note": "..."
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

    const hookHeader = document.createElement('div');
    hookHeader.style.cssText = 'padding:6px 10px; background:rgba(59,130,246,0.1); border-radius:8px; font-size:11px; color:#93c5fd; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;';
    hookHeader.innerHTML = `<span>🎣 <b>Крючок:</b> ${data.hook_note || 'По контексту беседы'}</span><span style="font-weight:800; color:#34d399;">${data.response_score || 92}% ответ</span>`;
    root.appendChild(hookHeader);

    const variants = [
      { key: 'short_ru', label: '🇷🇺 RU Короткий (до 150)', tag: 'ad-tag-ru', text: data.short_ru, hotkey: 'Alt+1' },
      { key: 'short_en', label: '🇬🇧 EN Короткий (до 150)', tag: 'ad-tag-en', text: data.short_en, hotkey: 'Alt+2' },
      { key: 'long_ru', label: '🇷🇺 RU Развернутый (150+)', tag: 'ad-tag-ru', text: data.long_ru, hotkey: 'Alt+3' },
      { key: 'long_en', label: '🇬🇧 EN Развернутый (150+)', tag: 'ad-tag-en', text: data.long_en, hotkey: 'Alt+4' },
    ];

    variants.forEach((v, idx) => {
      if (!v.text) return;
      const card = document.createElement('div');
      card.className = 'ad-variant-card';
      card.innerHTML = `
        <div class="ad-variant-header">
          <span class="ad-tag ${v.tag}">${v.label}</span>
          <span style="font-size:10px; color:#64748b;">${v.text.length} симв. · ${v.hotkey}</span>
        </div>
        <div class="ad-variant-text">${v.text}</div>
        <div class="ad-actions">
          <button type="button" class="ad-btn-sm ad-btn-insert" data-idx="${idx}">Вставить в чат (${v.hotkey})</button>
          <button type="button" class="ad-btn-sm ad-btn-copy" data-text="${encodeURIComponent(v.text)}">📋 Копировать</button>
        </div>
      `;

      card.querySelector('.ad-btn-insert')!.addEventListener('click', () => {
        insertTextIntoChat(v.text);
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
    const list = [
      lastGeneratedResponses.short_ru,
      lastGeneratedResponses.short_en,
      lastGeneratedResponses.long_ru,
      lastGeneratedResponses.long_en,
    ].filter(Boolean);

    if (list[index]) {
      insertTextIntoChat(list[index]);
    }
  }

  // ==========================================================================
  // 8. Auto-Insert into Web Page Chat & Auto-Translate Click
  // ==========================================================================

  function insertTextIntoChat(text: string): boolean {
    // 1. Dual textarea check (e.g. ChatOS with RU left, EN right, and translation arrow)
    const textareas = Array.from(document.querySelectorAll('textarea[data-testid="text"]')) as HTMLTextAreaElement[];
    if (textareas.length >= 2) {
      const leftTextarea = textareas[0]!;
      leftTextarea.focus();
      setTextareaNativeValue(leftTextarea, text);

      // Auto-click translation arrow
      const arrows = Array.from(document.querySelectorAll('[data-testid="change-languages-btn"]')) as HTMLElement[];
      if (arrows.length > 0) {
        setTimeout(() => arrows[0]?.click(), 250);
      }
      showToast('✓ Вставлено и отправлено на перевод!');
      return true;
    }

    // 2. Generic Single Textarea / Input
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl instanceof HTMLTextAreaElement || (activeEl instanceof HTMLInputElement && activeEl.type === 'text')) {
      setTextareaNativeValue(activeEl as HTMLTextAreaElement, text);
      showToast('✓ Вставлено в активное поле!');
      return true;
    }

    // 3. Fallback search common selectors
    const candidates = ['textarea', '[contenteditable="true"]', 'input[type="text"]', '[role="textbox"]'];
    for (const sel of candidates) {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) {
        el.focus();
        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          setTextareaNativeValue(el as HTMLTextAreaElement, text);
        } else if (el.isContentEditable) {
          el.innerText = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        showToast('✓ Вставлено в поле ввода!');
        return true;
      }
    }

    navigator.clipboard.writeText(text);
    showToast('✓ Скопировано в буфер обмена!');
    return false;
  }

  function setTextareaNativeValue(textarea: HTMLTextAreaElement, val: string): void {
    const proto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    if (proto?.set) {
      proto.set.call(textarea, val);
    } else {
      textarea.value = val;
    }
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: val }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
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
    const kbInput = document.getElementById('ad-kb-text') as HTMLTextAreaElement | null;
    if (keyInput) keyInput.value = key;
    if (kbInput) kbInput.value = kb;
  }

  function setupActions(): void {
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

    // Save Settings
    document.getElementById('ad-btn-save-settings')!.onclick = async () => {
      const key = (document.getElementById('ad-api-key') as HTMLInputElement).value.trim();
      const kb = (document.getElementById('ad-kb-text') as HTMLTextAreaElement).value.trim();
      await chrome.storage.local.set({
        [STORAGE_API_KEY]: key || DEFAULT_KEY,
        [STORAGE_KB_KEY]: kb,
      });
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
