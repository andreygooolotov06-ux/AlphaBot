/**
 * AlphaDate Personal AI — Autonomous Core v3.0
 * Features:
 * - Cosmic Black Hole Gravitational Distortion & Eruption Portal
 * - Autonomous Environment Intelligence: Letters (Письма) vs Instant Chat (Чат)
 * - Psychological Archetype Adaptation Engine
 * - Autonomous Auto-Pilot: Auto-detects client, prepares reply & inserts into chat (NEVER sends automatically)
 * - Minimalist Dark Glass Interface with Zero Clutter
 * - Hotkeys: F8 (Portal), Alt+1 (Insert), F6 (Invites)
 */

(() => {
  const STORAGE_API_KEY = 'ai_alphadate_custom_api_key_v1';
  const STORAGE_KB_KEY = 'ai_alphadate_kb_v5';
  const STORAGE_AUTO_PILOT = 'ai_alphadate_auto_pilot_enabled';
  const STORAGE_DOSSIER = 'ai_alphadate_dossier_v5';

  let currentEnvironment: 'chat' | 'letters' = 'chat';
  let activeClient: any = null;
  let lastGeneratedReply: any = null;
  let isAutoPilotEnabled = true;
  let isHUDOpen = false;
  let isGenerating = false;
  let lastHandledMessageId = '';

  // Dragging states
  let isDraggingCard = false;
  let cardDragStartX = 0, cardDragStartY = 0, cardInitialLeft = 0, cardInitialTop = 0;
  let isDraggingOrb = false;
  let orbDragStartX = 0, orbDragStartY = 0, orbInitialRight = 32, orbInitialBottom = 32;

  // ==========================================================================
  // 1. Hotkeys Listener (F8, Alt+1, F6)
  // ==========================================================================

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'F8' || e.code === 'F8') {
      e.preventDefault();
      e.stopPropagation();
      togglePortal();
      return;
    }

    // Alt + 1 -> Insert into chat without sending
    if (e.altKey && e.key === '1') {
      e.preventDefault();
      e.stopPropagation();
      insertActiveReplyIntoSite();
      return;
    }
  }, true);

  chrome.runtime.onMessage.addListener((req) => {
    if (req?.type === 'ALPHADATE_TOGGLE_MENU') {
      togglePortal();
    }
  });

  // ==========================================================================
  // 2. DOM Injection — Black Hole Portal Orb & Minimalist Card
  // ==========================================================================

  function ensurePortalDOM(): void {
    if (document.getElementById('alphadate-portal-root')) return;

    const root = document.createElement('div');
    root.id = 'alphadate-portal-root';
    root.style.cssText = 'position:fixed; top:0; left:0; width:0; height:0; z-index:2147483647; pointer-events:none; overflow:visible;';

    root.innerHTML = `
      <style>
        /* ==========================================================================
           Cosmic Black Hole Portal Styles & Gravitational Animations
           ========================================================================== */

        /* 1. Floating Circular Black Hole Orb */
        #ad-black-hole-orb {
          position: fixed;
          right: 32px;
          bottom: 32px;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          cursor: pointer;
          pointer-events: auto;
          user-select: none;
          z-index: 2147483646;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 35% 35%, #05070e 0%, #000000 65%, #1e1b4b 100%);
          box-shadow: 0 0 25px rgba(139, 92, 246, 0.5), 0 0 60px rgba(59, 130, 246, 0.3), inset 0 0 12px rgba(168, 85, 247, 0.6);
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
        }

        #ad-black-hole-orb:hover {
          transform: scale(1.1);
          box-shadow: 0 0 35px rgba(236, 72, 153, 0.7), 0 0 80px rgba(139, 92, 246, 0.6), inset 0 0 16px rgba(59, 130, 246, 0.8);
        }

        /* Spinning Gravitational Accretion Disk */
        #ad-orb-accretion-ring {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: #ec4899;
          border-right-color: #8b5cf6;
          border-bottom-color: #3b82f6;
          animation: spinAccretion 3.5s linear infinite;
          pointer-events: none;
        }

        @keyframes spinAccretion {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Singularity Glyph */
        #ad-orb-singularity {
          font-size: 22px;
          color: #fff;
          text-shadow: 0 0 10px #c084fc, 0 0 20px #818cf8;
          animation: pulseSingularity 2.4s ease-in-out infinite alternate;
        }

        @keyframes pulseSingularity {
          from { transform: scale(0.9); opacity: 0.85; filter: drop-shadow(0 0 4px #818cf8); }
          to { transform: scale(1.15); opacity: 1; filter: drop-shadow(0 0 14px #ec4899); }
        }

        /* Environment & Status mini-badge on Orb */
        #ad-orb-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          border: 2px solid #000;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 0 8px #3b82f6;
        }

        /* 2. Gravitational Vortex Warp Animations (Black Hole Collapse & Eruption) */
        @keyframes blackHoleSuck {
          0% {
            transform: translate(0, 0) scale(1) rotate(0deg) skew(0deg, 0deg);
            opacity: 1;
            filter: blur(0px) brightness(1);
            border-radius: 16px;
          }
          30% {
            transform: translate(calc(var(--dx) * 0.25), calc(var(--dy) * 0.25)) scale(0.75, 0.85) rotate(90deg) skew(15deg, -10deg);
            opacity: 0.9;
            filter: blur(1px) brightness(1.3);
            border-radius: 35px;
          }
          65% {
            transform: translate(calc(var(--dx) * 0.7), calc(var(--dy) * 0.7)) scale(0.3, 0.4) rotate(360deg) skew(35deg, -25deg);
            opacity: 0.75;
            filter: blur(4px) brightness(1.8);
            border-radius: 50%;
          }
          88% {
            transform: translate(calc(var(--dx) * 0.95), calc(var(--dy) * 0.95)) scale(0.08, 0.1) rotate(600deg) skew(55deg, -40deg);
            opacity: 0.4;
            filter: blur(8px) brightness(2.5);
            border-radius: 50%;
          }
          100% {
            transform: translate(var(--dx), var(--dy)) scale(0.005, 0.005) rotate(720deg) skew(70deg, -50deg);
            opacity: 0;
            filter: blur(14px) brightness(3.5);
            border-radius: 50%;
          }
        }

        @keyframes blackHoleErupt {
          0% {
            transform: translate(var(--dx), var(--dy)) scale(0.005, 0.005) rotate(-720deg) skew(-70deg, 50deg);
            opacity: 0;
            filter: blur(14px) brightness(3.5);
            border-radius: 50%;
          }
          25% {
            transform: translate(calc(var(--dx) * 0.75), calc(var(--dy) * 0.75)) scale(0.25, 0.35) rotate(-450deg) skew(-45deg, 30deg);
            opacity: 0.7;
            filter: blur(6px) brightness(2.2);
            border-radius: 50%;
          }
          60% {
            transform: translate(calc(var(--dx) * 0.2), calc(var(--dy) * 0.2)) scale(0.85, 0.92) rotate(-90deg) skew(-12deg, 8deg);
            opacity: 0.95;
            filter: blur(1px) brightness(1.2);
            border-radius: 28px;
          }
          82% {
            transform: translate(calc(var(--dx) * -0.03), calc(var(--dy) * -0.03)) scale(1.04, 1.03) rotate(6deg) skew(2deg, -2deg);
            opacity: 1;
            filter: blur(0px) brightness(1.05);
            border-radius: 16px;
          }
          100% {
            transform: translate(0, 0) scale(1) rotate(0deg) skew(0deg, 0deg);
            opacity: 1;
            filter: blur(0px) brightness(1);
            border-radius: 16px;
          }
        }

        .ad-sucking-into-black-hole {
          animation: blackHoleSuck 0.44s cubic-bezier(0.55, 0, 1, 0.45) forwards !important;
          pointer-events: none !important;
        }

        .ad-erupting-from-black-hole {
          animation: blackHoleErupt 0.48s cubic-bezier(0, 0.55, 0.45, 1) forwards !important;
        }

        .ad-orb-pulse-suck {
          animation: orbSuckPulse 0.44s ease-out !important;
        }

        .ad-orb-pulse-erupt {
          animation: orbEruptPulse 0.48s ease-out !important;
        }

        @keyframes orbSuckPulse {
          0% { transform: scale(1); box-shadow: 0 0 25px rgba(139, 92, 246, 0.5); }
          50% { transform: scale(1.4); box-shadow: 0 0 60px rgba(236, 72, 153, 0.9), 0 0 100px rgba(139, 92, 246, 0.8); }
          100% { transform: scale(1); box-shadow: 0 0 25px rgba(139, 92, 246, 0.5); }
        }

        @keyframes orbEruptPulse {
          0% { transform: scale(1.45); box-shadow: 0 0 70px rgba(59, 130, 246, 0.9), 0 0 120px rgba(139, 92, 246, 0.8); }
          50% { transform: scale(1.15); box-shadow: 0 0 45px rgba(59, 130, 246, 0.6); }
          100% { transform: scale(1); box-shadow: 0 0 25px rgba(139, 92, 246, 0.5); }
        }

        /* 3. The Minimalist Dark Glass HUD Window */
        #alphadate-hud-card {
          position: fixed;
          top: 36px;
          right: 36px;
          width: 530px;
          max-width: 95vw;
          height: 620px;
          max-height: 88vh;
          background: rgba(8, 12, 20, 0.94);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(139, 92, 246, 0.28);
          border-radius: 16px;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          color: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          resize: both;
          min-width: 420px;
          min-height: 480px;
          pointer-events: auto;
          user-select: none;
          z-index: 2147483647;
          transform-origin: center center;
        }

        /* HUD Header */
        #ad-hud-header {
          padding: 12px 16px;
          background: rgba(15, 23, 42, 0.85);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: move;
        }

        .ad-brand-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ad-cosmic-star {
          font-size: 15px;
          color: #a855f7;
          text-shadow: 0 0 8px #a855f7;
        }

        .ad-brand-title {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.5px;
          background: linear-gradient(90deg, #c084fc, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Environment Pill Badge */
        #ad-env-badge {
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .ad-env-chat {
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.4);
          color: #60a5fa;
        }

        .ad-env-letters {
          background: rgba(168, 85, 247, 0.18);
          border: 1px solid rgba(168, 85, 247, 0.5);
          color: #c084fc;
        }

        .ad-hdr-btns {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ad-hdr-btn {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          transition: all 0.15s ease;
        }

        .ad-hdr-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
        }

        /* HUD Body */
        #ad-hud-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 14px 16px;
          gap: 12px;
          overflow-y: auto;
        }

        /* Context & Client Ribbon */
        #ad-context-ribbon {
          padding: 10px 14px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ad-client-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ad-client-name {
          font-size: 14px;
          font-weight: 700;
          color: #f1f5f9;
        }

        .ad-client-balance {
          font-size: 11px;
          font-weight: 700;
          color: #34d399;
          background: rgba(52, 211, 153, 0.12);
          padding: 2px 8px;
          border-radius: 10px;
        }

        .ad-tactics-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #94a3b8;
        }

        .ad-archetype-tag {
          color: #c084fc;
          font-weight: 600;
        }

        /* Main Response Terminal */
        #ad-response-terminal {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        #ad-response-textarea {
          width: 100%;
          flex: 1;
          min-height: 180px;
          background: rgba(9, 13, 20, 0.95);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
          padding: 12px 14px;
          color: #f8fafc;
          font-size: 13px;
          line-height: 1.5;
          box-sizing: border-box;
          outline: none;
          resize: none;
          user-select: text !important;
          -webkit-user-select: text !important;
          cursor: text !important;
          font-family: inherit;
        }

        #ad-response-textarea:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
        }

        /* Style Morphing Chips */
        .ad-chips-row {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .ad-chip {
          padding: 5px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          font-size: 11px;
          color: #cbd5e1;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .ad-chip:hover {
          background: rgba(139, 92, 246, 0.25);
          border-color: #8b5cf6;
          color: #fff;
        }

        /* Primary Action Buttons */
        .ad-action-row {
          display: flex;
          gap: 8px;
        }

        #ad-btn-insert-main {
          flex: 2;
          padding: 11px 16px;
          background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 18px rgba(124, 58, 237, 0.4);
          transition: all 0.2s ease;
        }

        #ad-btn-insert-main:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(124, 58, 237, 0.6);
        }

        #ad-btn-regenerate {
          flex: 1;
          padding: 11px 14px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        }

        #ad-btn-regenerate:hover {
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
        }

        /* Auto-Pilot Switch */
        .ad-autopilot-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }

        .ad-autopilot-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #cbd5e1;
          cursor: pointer;
        }

        /* Slide-down Settings Drawer */
        #ad-settings-drawer {
          display: none;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
        }

        .ad-drawer-title {
          font-size: 11px;
          font-weight: 700;
          color: #a78bfa;
        }

        .ad-drawer-input {
          width: 100%;
          padding: 8px 10px;
          background: #090d14;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          color: #34d399;
          font-family: monospace;
          font-size: 11px;
          box-sizing: border-box;
          outline: none;
          user-select: text !important;
        }

        .ad-drawer-input:focus {
          border-color: #8b5cf6;
        }

        /* Toast notification */
        #ad-cosmic-toast {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(139, 92, 246, 0.4);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(139, 92, 246, 0.3);
          color: #fff;
          padding: 8px 18px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          z-index: 2147483647;
          pointer-events: none;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: toastFade 2.4s ease forwards;
        }

        @keyframes toastFade {
          0% { opacity: 0; transform: translate(-50%, 15px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -10px); }
        }
      </style>

      <!-- 1. The Cosmic Black Hole Floating Orb -->
      <div id="ad-black-hole-orb" title="AlphaDate AI (F8)">
        <div id="ad-orb-accretion-ring"></div>
        <div id="ad-orb-singularity">✦</div>
        <div id="ad-orb-badge" title="Среда общения">💬</div>
      </div>

      <!-- 2. Minimalist HUD Window -->
      <div id="alphadate-hud-card" style="display:none;">
        
        <!-- Header -->
        <div id="ad-hud-header">
          <div class="ad-brand-group">
            <span class="ad-cosmic-star">✦</span>
            <span class="ad-brand-title">ALPHADATE CORE</span>
          </div>

          <!-- Auto-detected Environment Badge -->
          <div id="ad-env-badge" class="ad-env-chat" title="Нажмите для переключения режима">
            <span id="ad-env-icon">💬</span>
            <span id="ad-env-text">ОНЛАЙН-ЧАТ</span>
          </div>

          <div class="ad-hdr-btns">
            <button type="button" class="ad-hdr-btn" id="ad-btn-toggle-settings" title="Настройки API">⚙️</button>
            <button type="button" class="ad-hdr-btn" id="ad-btn-collapse" title="Свернуть в черную дыру">✕</button>
          </div>
        </div>

        <!-- Body -->
        <div id="ad-hud-body">
          
          <!-- Slide-down Settings Drawer -->
          <div id="ad-settings-drawer">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="ad-drawer-title">🔑 Google Gemini API Ключ:</span>
              <span id="ad-drawer-status" style="font-size:10px; color:#ef4444;">❌ Не введен</span>
            </div>
            <div style="display:flex; gap:6px;">
              <input type="text" id="ad-settings-api-key" class="ad-drawer-input" placeholder="Вставьте ключ (AIzaSy...)">
              <button type="button" id="ad-btn-save-key" class="ad-hdr-btn" style="width:auto; padding:0 10px; color:#34d399; font-weight:bold;">✓</button>
            </div>
            <span class="ad-drawer-title" style="margin-top:4px;">📋 Правила оператора / образ девушки:</span>
            <textarea id="ad-settings-kb" class="ad-drawer-input" rows="2" placeholder="Особые инструкции..."></textarea>
            
            <button type="button" id="ad-btn-dump-dom" class="ad-chip" style="margin-top:6px; text-align:center; background:rgba(59,130,246,0.18); border-color:#3b82f6; color:#93c5fd; padding:7px; font-weight:600;">
              🔬 Снять слепок структуры сайта (скопировать для архитектора)
            </button>
          </div>

          <!-- Context & Client Ribbon -->
          <div id="ad-context-ribbon">
            <div class="ad-client-row">
              <span class="ad-client-name" id="ad-client-title">Определяю собеседника...</span>
              <span class="ad-client-balance" id="ad-client-balance">💰 —</span>
            </div>
            <div class="ad-tactics-row">
              <span>🧠 <span id="ad-tactics-archetype" class="ad-archetype-tag">Адаптация</span></span>
              <span>·</span>
              <span id="ad-tactics-strategy">Слушаю переписку</span>
            </div>
          </div>

          <!-- Main Response Terminal -->
          <div id="ad-response-terminal">
            <textarea id="ad-response-textarea" placeholder="Бот готов. Откройте чат или нажмите 'Сгенерировать' (F8)..."></textarea>
            
            <!-- Quick Morph Chips -->
            <div class="ad-chips-row">
              <span class="ad-chip" data-style="balanced">✨ Сбалансированно</span>
              <span class="ad-chip" data-style="bolder">😏 Добавить дерзости</span>
              <span class="ad-chip" data-style="softer">❤️ Больше нежности</span>
              <span class="ad-chip" data-style="hot">🔥 Горячее</span>
            </div>
          </div>

          <!-- Action Buttons Bar -->
          <div class="ad-action-row">
            <button type="button" id="ad-btn-insert-main">
              <span>⚡</span>
              <span>ВСТАВИТЬ В ЧАТ (Alt+1)</span>
            </button>
            <button type="button" id="ad-btn-regenerate">
              <span>🔄</span>
              <span>Обновить (F8)</span>
            </button>
            <button type="button" class="ad-hdr-btn" id="ad-btn-copy-main" title="Скопировать" style="width:40px; height:auto;">📋</button>
          </div>

          <!-- Auto-Pilot Toggle -->
          <div class="ad-autopilot-row">
            <label class="ad-autopilot-label">
              <input type="checkbox" id="ad-autopilot-checkbox" checked style="accent-color:#8b5cf6; cursor:pointer;">
              <span>🤖 <b>Авто-суфлер:</b> сам готовит ответ при смене чата</span>
            </label>
            <small style="color:#64748b; font-size:10px;">(вставляет, но не отправляет)</small>
          </div>

        </div>
      </div>
    `;

    (document.body || document.documentElement).appendChild(root);

    // Bind event handlers
    setupBlackHolePortalEvents();
    setupInputsIsolation();
    setupActions();
    loadSettings();

    // Start Autonomous Observer
    startAutonomousObserver();
  }

  // ==========================================================================
  // 3. Black Hole Warp Geometry & Portal Toggle
  // ==========================================================================

  function togglePortal(): void {
    ensurePortalDOM();
    if (isHUDOpen) {
      closePortalToBlackHole();
    } else {
      openPortalFromBlackHole();
    }
  }

  function openPortalFromBlackHole(): void {
    const card = document.getElementById('alphadate-hud-card');
    const orb = document.getElementById('ad-black-hole-orb');
    if (!card || !orb) return;

    // Calculate gravitational vector (vector from card center to orb center)
    const orbRect = orb.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    const dx = (orbRect.left + orbRect.width / 2) - (cardRect.left + cardRect.width / 2);
    const dy = (orbRect.top + orbRect.height / 2) - (cardRect.top + cardRect.height / 2);

    card.style.setProperty('--dx', `${dx}px`);
    card.style.setProperty('--dy', `${dy}px`);

    card.classList.remove('ad-sucking-into-black-hole');
    card.classList.add('ad-erupting-from-black-hole');
    card.style.display = 'flex';
    isHUDOpen = true;

    orb.classList.add('ad-orb-pulse-erupt');
    setTimeout(() => orb.classList.remove('ad-orb-pulse-erupt'), 500);

    // Refresh active client and trigger generation if empty
    detectEnvironment();
    scrapeClientContext();
    const textarea = document.getElementById('ad-response-textarea') as HTMLTextAreaElement | null;
    if (textarea && !textarea.value.trim()) {
      conductAutonomousFlow();
    }
  }

  function closePortalToBlackHole(): void {
    const card = document.getElementById('alphadate-hud-card');
    const orb = document.getElementById('ad-black-hole-orb');
    if (!card || !orb) return;

    const orbRect = orb.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    const dx = (orbRect.left + orbRect.width / 2) - (cardRect.left + cardRect.width / 2);
    const dy = (orbRect.top + orbRect.height / 2) - (cardRect.top + cardRect.height / 2);

    card.style.setProperty('--dx', `${dx}px`);
    card.style.setProperty('--dy', `${dy}px`);

    card.classList.remove('ad-erupting-from-black-hole');
    card.classList.add('ad-sucking-into-black-hole');
    orb.classList.add('ad-orb-pulse-suck');

    setTimeout(() => {
      card.style.display = 'none';
      card.classList.remove('ad-sucking-into-black-hole');
      orb.classList.remove('ad-orb-pulse-suck');
      isHUDOpen = false;
    }, 440);
  }

  function setupBlackHolePortalEvents(): void {
    const orb = document.getElementById('ad-black-hole-orb')!;
    const card = document.getElementById('alphadate-hud-card')!;
    const header = document.getElementById('ad-hud-header')!;

    // Orb Click -> Toggle Portal
    orb.addEventListener('click', (e) => {
      if (isDraggingOrb) return;
      togglePortal();
    });

    // Collapse Button
    document.getElementById('ad-btn-collapse')!.onclick = closePortalToBlackHole;

    // Header Dragging
    header.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('#ad-env-badge')) return;
      isDraggingCard = true;
      cardDragStartX = e.clientX;
      cardDragStartY = e.clientY;
      const rect = card.getBoundingClientRect();
      cardInitialLeft = rect.left;
      cardInitialTop = rect.top;
      card.style.right = 'auto';
      card.style.left = `${cardInitialLeft}px`;
      card.style.top = `${cardInitialTop}px`;
    });

    // Orb Dragging
    orb.addEventListener('mousedown', (e: MouseEvent) => {
      isDraggingOrb = false;
      orbDragStartX = e.clientX;
      orbDragStartY = e.clientY;
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (isDraggingCard) {
        const dx = e.clientX - cardDragStartX;
        const dy = e.clientY - cardDragStartY;
        card.style.left = `${Math.max(10, cardInitialLeft + dx)}px`;
        card.style.top = `${Math.max(10, cardInitialTop + dy)}px`;
      }
      if (e.buttons === 1 && (Math.abs(e.clientX - orbDragStartX) > 4 || Math.abs(e.clientY - orbDragStartY) > 4)) {
        // orb is being dragged
        isDraggingOrb = true;
        orb.style.right = `${Math.max(10, window.innerWidth - e.clientX - 28)}px`;
        orb.style.bottom = `${Math.max(10, window.innerHeight - e.clientY - 28)}px`;
      }
    });

    window.addEventListener('mouseup', () => {
      isDraggingCard = false;
      setTimeout(() => (isDraggingOrb = false), 50);
    });

    // Environment Badge manual toggle
    const envBadge = document.getElementById('ad-env-badge')!;
    envBadge.addEventListener('click', () => {
      currentEnvironment = currentEnvironment === 'chat' ? 'letters' : 'chat';
      updateEnvironmentUI();
      conductAutonomousFlow();
    });
  }

  // ==========================================================================
  // 4. Autonomous Environment Intelligence: Letters vs Chat
  // ==========================================================================

  function detectEnvironment(): 'chat' | 'letters' {
    const url = window.location.href.toLowerCase();

    // 1. URL pattern check
    if (/letter|mail|inbox|compose|message\/view|correspondence/.test(url)) {
      currentEnvironment = 'letters';
      updateEnvironmentUI();
      return 'letters';
    }

    // 2. DOM markers check
    const letterMarkers = document.querySelectorAll(
      '[data-testid*="letter"], .letter-view, .mail-body, textarea[name*="letter"], textarea[placeholder*="письм"], textarea[rows="10"], [class*="letter-content"]'
    );
    if (letterMarkers.length > 0) {
      currentEnvironment = 'letters';
      updateEnvironmentUI();
      return 'letters';
    }

    currentEnvironment = 'chat';
    updateEnvironmentUI();
    return 'chat';
  }

  function updateEnvironmentUI(): void {
    const badge = document.getElementById('ad-env-badge');
    const icon = document.getElementById('ad-env-icon');
    const text = document.getElementById('ad-env-text');
    const orbBadge = document.getElementById('ad-orb-badge');

    if (!badge || !icon || !text || !orbBadge) return;

    if (currentEnvironment === 'letters') {
      badge.className = 'ad-env-letters';
      icon.textContent = '✉️';
      text.textContent = 'ПИСЬМО (LETTERS)';
      orbBadge.textContent = '✉️';
      orbBadge.style.background = '#8b5cf6';
      orbBadge.style.boxShadow = '0 0 8px #8b5cf6';
    } else {
      badge.className = 'ad-env-chat';
      icon.textContent = '💬';
      text.textContent = 'ОНЛАЙН-ЧАТ';
      orbBadge.textContent = '💬';
      orbBadge.style.background = '#3b82f6';
      orbBadge.style.boxShadow = '0 0 8px #3b82f6';
    }
  }

  // ==========================================================================
  // 5. Context & Interlocutor Scraper
  // ==========================================================================

  function scrapeClientContext(): any {
    let manName = 'Мужчина', manAge = '—', manId = 'unknown', manPlace = '', girlInfo = 'Девушка', balance = '';

    // Check header info
    const chatHeader = document.querySelector('[data-testid="chat-header"], [class*="chat_head-"], [class*="ChatHeader"], [class*="chat-header"]');
    if (chatHeader) {
      const nameEl = chatHeader.querySelector('[data-testid="man-name"], [class*="chat_head_profile_name-"], [class*="user-name"], h2, h3');
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

    // Check Girl Name
    const girlEl = document.querySelector('[data-testid="girl-name"], [class*="girl_name"], [class*="lady_name"]');
    if (girlEl) {
      const gRaw = (girlEl as HTMLElement).innerText || '';
      if (gRaw.trim()) girlInfo = gRaw.trim();
    }

    // Extract Message History
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

    // Last message from man
    let lastManMessage = '';
    for (let i = dialogueLines.length - 1; i >= 0; i--) {
      const line = dialogueLines[i]!;
      if (line.startsWith('Мужчина:')) {
        lastManMessage = line.replace(/^Мужчина:\s*/, '').trim();
        break;
      }
    }

    // Selected text priority hook
    const selectedText = (window.getSelection()?.toString() || '').trim();

    // Update Ribbon in HUD
    const titleEl = document.getElementById('ad-client-title');
    const balanceEl = document.getElementById('ad-client-balance');
    if (titleEl) titleEl.textContent = `${manName}, ${manAge} · ID: ${manId}`;
    if (balanceEl) balanceEl.textContent = balance ? `💰 ${balance}` : `ID: ${manId}`;

    activeClient = {
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
    };

    return activeClient;
  }

  // ==========================================================================
  // 6. Autonomous Generation Engine ("Conduct")
  // ==========================================================================

  async function conductAutonomousFlow(styleOverride: string = ''): Promise<void> {
    if (isGenerating) return;
    isGenerating = true;

    const textarea = document.getElementById('ad-response-textarea') as HTMLTextAreaElement | null;
    const stratEl = document.getElementById('ad-tactics-strategy');
    const archEl = document.getElementById('ad-tactics-archetype');

    if (textarea) textarea.value = '✦ Собираю контекст и формулирую ответ...';
    if (stratEl) stratEl.textContent = 'Анализ психотипа...';

    try {
      detectEnvironment();
      const client = scrapeClientContext();
      const apiKey = await getApiKey();

      if (!apiKey || apiKey.trim().length < 10) {
        if (textarea) textarea.value = '⚠️ Укажите Gemini API ключ в настройках (⚙️) для генерации.';
        openSettingsDrawer();
        return;
      }

      const kb = await getKB();
      client.kb = kb;

      // Call Background Autonomous Pipeline
      const res = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'ALPHADATE_AUTONOMOUS_CONDUCT',
            apiKey,
            environment: currentEnvironment,
            client,
            overrideStyle: styleOverride,
          },
          (response) => {
            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
            if (!response || !response.ok) return reject(new Error(response?.error || 'Сбой автономного движка'));
            resolve(response);
          }
        );
      });

      const data = res.data;
      lastGeneratedReply = data;

      // Update UI
      if (textarea) textarea.value = data.main_text_ru || data.main_text_en || '';
      if (archEl) archEl.textContent = data.archetype || 'Собеседник';
      if (stratEl) stratEl.textContent = data.strategy || 'Подготовка ответа';

      // Auto-insert if Auto-Pilot is active! (DOES NOT SEND)
      if (isAutoPilotEnabled) {
        insertActiveReplyIntoSite();
      }
    } catch (e: any) {
      if (textarea) textarea.value = `Ошибка генерации: ${e.message}`;
    } finally {
      isGenerating = false;
    }
  }

  // ==========================================================================
  // 7. Auto-Insert into Website (NEVER SENDS AUTOMATICALLY)
  // ==========================================================================

  function insertActiveReplyIntoSite(): boolean {
    const textarea = document.getElementById('ad-response-textarea') as HTMLTextAreaElement | null;
    const textToInsert = textarea?.value?.trim() || lastGeneratedReply?.main_text_ru || '';
    if (!textToInsert) return false;

    // 1. Letters Mode Insertion
    if (currentEnvironment === 'letters') {
      const letterTextarea = document.querySelector(
        'textarea[name*="letter"], textarea[placeholder*="письм"], textarea[rows="10"], .letter-textarea, textarea'
      ) as HTMLTextAreaElement | null;

      if (letterTextarea) {
        letterTextarea.focus();
        setTextareaNativeValue(letterTextarea, textToInsert);
        showCosmicToast('✉️ Письмо вставлено в редактор (проверьте и отправьте)!');
        return true;
      }
    }

    // 2. Chat Mode Insertion (Left RU textarea with translation arrow)
    const textareas = Array.from(document.querySelectorAll('textarea[data-testid="text"]'))
      .filter((node: any) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 20 && rect.height > 20 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .sort((a: any, b: any) => a.getBoundingClientRect().left - b.getBoundingClientRect().left) as HTMLTextAreaElement[];

    const leftTextarea = textareas[0] || null;
    if (leftTextarea) {
      leftTextarea.focus();
      setTextareaNativeValue(leftTextarea, textToInsert);

      // Trigger translation arrow
      const arrows = Array.from(document.querySelectorAll('[data-testid="change-languages-btn"]')) as HTMLElement[];
      if (arrows.length > 0) {
        setTimeout(() => arrows[0]?.click(), 220);
      }
      showCosmicToast('⚡ Ответ вставлен в чат и переведен (НЕ отправлен)!');
      return true;
    }

    // 3. Fallback: ActiveElement or any input
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl instanceof HTMLTextAreaElement || (activeEl instanceof HTMLInputElement && activeEl.type === 'text')) {
      setTextareaNativeValue(activeEl as any, textToInsert);
      showCosmicToast('⚡ Вставлено в активное поле!');
      return true;
    }

    const anyTextarea = document.querySelector('textarea, [contenteditable="true"], input[type="text"]') as HTMLElement | null;
    if (anyTextarea) {
      if (anyTextarea instanceof HTMLTextAreaElement || anyTextarea instanceof HTMLInputElement) {
        setTextareaNativeValue(anyTextarea as any, textToInsert);
      } else {
        anyTextarea.focus();
        document.execCommand('insertText', false, textToInsert);
      }
      showCosmicToast('⚡ Вставлено в поле!');
      return true;
    }

    navigator.clipboard.writeText(textToInsert);
    showCosmicToast('📋 Скопировано в буфер обмена!');
    return false;
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
  // 8. Autonomous Observer (Watches Dialogues & Incoming Messages)
  // ==========================================================================

  function startAutonomousObserver(): void {
    let lastUrl = window.location.href;
    let observerTimer: any = null;

    const observer = new MutationObserver(() => {
      if (!isAutoPilotEnabled) return;

      clearTimeout(observerTimer);
      observerTimer = setTimeout(() => {
        // 1. URL change check
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          detectEnvironment();
          conductAutonomousFlow();
          return;
        }

        // 2. Interlocutor or message change check
        const client = scrapeClientContext();
        if (client && client.lastManMessage && client.lastManMessage !== lastHandledMessageId) {
          lastHandledMessageId = client.lastManMessage;
          conductAutonomousFlow();
        }
      }, 750);
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // ==========================================================================
  // 9. Input Isolation & Event Handlers
  // ==========================================================================

  function setupInputsIsolation(): void {
    const card = document.getElementById('alphadate-hud-card');
    if (!card) return;
    const inputs = card.querySelectorAll('input, textarea');
    inputs.forEach((input) => {
      ['mousedown', 'mouseup', 'click', 'dblclick', 'keydown', 'keyup', 'keypress', 'input', 'paste', 'cut', 'copy'].forEach((evt) => {
        input.addEventListener(evt, (e) => e.stopPropagation(), { capture: true });
      });
    });
  }

  function setupActions(): void {
    // Primary Insert Button
    document.getElementById('ad-btn-insert-main')!.onclick = insertActiveReplyIntoSite;

    // Regenerate Button
    document.getElementById('ad-btn-regenerate')!.onclick = () => conductAutonomousFlow();

    // Copy Button
    document.getElementById('ad-btn-copy-main')!.onclick = () => {
      const textarea = document.getElementById('ad-response-textarea') as HTMLTextAreaElement | null;
      if (textarea?.value) {
        navigator.clipboard.writeText(textarea.value);
        showCosmicToast('✓ Скопировано в буфер обмена!');
      }
    };

    // Auto-Pilot Checkbox
    const autopilotBox = document.getElementById('ad-autopilot-checkbox') as HTMLInputElement | null;
    if (autopilotBox) {
      autopilotBox.addEventListener('change', () => {
        isAutoPilotEnabled = autopilotBox.checked;
        chrome.storage.local.set({ [STORAGE_AUTO_PILOT]: isAutoPilotEnabled });
        showCosmicToast(isAutoPilotEnabled ? '🤖 Авто-суфлер включен' : '⏸️ Авто-суфлер приостановлен');
      });
    }

    // Morph Chips
    const chips = document.querySelectorAll('.ad-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const style = (e.target as HTMLElement).getAttribute('data-style') || '';
        if (style === 'bolder' && lastGeneratedReply?.alt_bolder_ru) {
          const textarea = document.getElementById('ad-response-textarea') as HTMLTextAreaElement;
          if (textarea) textarea.value = lastGeneratedReply.alt_bolder_ru;
        } else if (style === 'softer' && lastGeneratedReply?.alt_softer_ru) {
          const textarea = document.getElementById('ad-response-textarea') as HTMLTextAreaElement;
          if (textarea) textarea.value = lastGeneratedReply.alt_softer_ru;
        } else {
          conductAutonomousFlow(style);
        }
      });
    });

    // Settings Toggle
    document.getElementById('ad-btn-toggle-settings')!.onclick = toggleSettingsDrawer;

    // Dump DOM Structure for Architect
    const dumpBtn = document.getElementById('ad-btn-dump-dom');
    if (dumpBtn) {
      dumpBtn.onclick = () => {
        const dump = {
          url: window.location.href,
          title: document.title,
          textareas: Array.from(document.querySelectorAll('textarea')).map((t) => ({
            id: t.id,
            name: t.name,
            testid: t.getAttribute('data-testid'),
            placeholder: t.placeholder,
            className: t.className,
            visible: t.getBoundingClientRect().width > 0,
            rect: { w: t.clientWidth, h: t.clientHeight },
          })),
          inputs: Array.from(document.querySelectorAll('input[type="text"], input:not([type])')).slice(0, 25).map((i: any) => ({
            id: i.id,
            name: i.name,
            testid: i.getAttribute('data-testid'),
            placeholder: i.placeholder,
            className: i.className,
          })),
          buttons: Array.from(document.querySelectorAll('button, [role="button"]')).slice(0, 35).map((b: any) => ({
            text: b.innerText?.trim()?.slice(0, 40),
            testid: b.getAttribute('data-testid'),
            className: b.className,
          })),
          testidElements: Array.from(document.querySelectorAll('[data-testid]')).slice(0, 60).map((el) => ({
            testid: el.getAttribute('data-testid'),
            tag: el.tagName,
            sampleText: (el as HTMLElement).innerText?.trim()?.slice(0, 50),
          })),
          possibleMessages: Array.from(document.querySelectorAll('[class*="message"], [class*="msg"], [class*="chat_"], [class*="letter"]')).slice(0, 25).map((el) => ({
            className: el.className,
            tag: el.tagName,
            sampleText: (el as HTMLElement).innerText?.trim()?.slice(0, 80),
          })),
        };

        const jsonStr = JSON.stringify(dump, null, 2);
        navigator.clipboard.writeText(jsonStr);
        console.log('[AlphaDate DOM Dump]:', dump);
        showCosmicToast('🔬 Слепок сайта скопирован в буфер! Отправьте его в чат.');
      };
    }

    // Save Settings
    document.getElementById('ad-btn-save-key')!.onclick = async () => {
      const keyInput = document.getElementById('ad-settings-api-key') as HTMLInputElement;
      const kbInput = document.getElementById('ad-settings-kb') as HTMLTextAreaElement;
      const key = keyInput.value.trim();
      const kb = kbInput.value.trim();

      await chrome.storage.local.set({
        [STORAGE_API_KEY]: key,
        [STORAGE_KB_KEY]: kb,
      });

      updateSettingsUI(key);
      showCosmicToast('✓ Настройки и API ключ сохранены!');
      toggleSettingsDrawer();
    };
  }

  function toggleSettingsDrawer(): void {
    const drawer = document.getElementById('ad-settings-drawer');
    if (!drawer) return;
    drawer.style.display = drawer.style.display === 'flex' ? 'none' : 'flex';
  }

  function openSettingsDrawer(): void {
    const drawer = document.getElementById('ad-settings-drawer');
    if (drawer) drawer.style.display = 'flex';
  }

  async function loadSettings(): Promise<void> {
    const key = await getApiKey();
    const kb = await getKB();
    const autoPilot = await getAutoPilotSetting();

    const keyInput = document.getElementById('ad-settings-api-key') as HTMLInputElement | null;
    const kbInput = document.getElementById('ad-settings-kb') as HTMLTextAreaElement | null;
    const autopilotBox = document.getElementById('ad-autopilot-checkbox') as HTMLInputElement | null;

    if (keyInput) keyInput.value = key;
    if (kbInput) kbInput.value = kb;
    if (autopilotBox) autopilotBox.checked = autoPilot;
    isAutoPilotEnabled = autoPilot;

    updateSettingsUI(key);
  }

  function updateSettingsUI(key: string): void {
    const status = document.getElementById('ad-drawer-status');
    if (status) {
      if (key && key.trim().length > 10) {
        status.textContent = '✅ Ключ активен';
        status.style.color = '#34d399';
      } else {
        status.textContent = '❌ Не введен';
        status.style.color = '#ef4444';
      }
    }
  }

  async function getApiKey(): Promise<string> {
    return new Promise((r) => {
      chrome.storage.local.get([STORAGE_API_KEY], (res) => {
        r((res[STORAGE_API_KEY] || '').trim());
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

  async function getAutoPilotSetting(): Promise<boolean> {
    return new Promise((r) => {
      chrome.storage.local.get([STORAGE_AUTO_PILOT], (res) => {
        r(res[STORAGE_AUTO_PILOT] !== false); // default true
      });
    });
  }

  function showCosmicToast(msg: string): void {
    const existing = document.getElementById('ad-cosmic-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'ad-cosmic-toast';
    toast.innerHTML = `<span>✦</span><span>${msg}</span>`;
    (document.body || document.documentElement).appendChild(toast);
    setTimeout(() => toast.remove(), 2400);
  }

  // ==========================================================================
  // 10. Bootstrap
  // ==========================================================================

  console.log('[AlphaDate Personal AI] Autonomous Core v3.0 loaded.');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensurePortalDOM);
    window.addEventListener('load', ensurePortalDOM);
  } else {
    ensurePortalDOM();
  }
})();
