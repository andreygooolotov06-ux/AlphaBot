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
          min-height: 160px;
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

        /* Russian Translation Box for Operator */
        #ad-response-translation-box {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 11.5px;
          line-height: 1.45;
          color: #cbd5e1;
          max-height: 85px;
          overflow-y: auto;
          user-select: text !important;
          -webkit-user-select: text !important;
        }

        #ad-response-translation-box b {
          color: #60a5fa;
        }

        #ad-response-translation-text {
          color: #f1f5f9;
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
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <span style="font-size:11px; font-weight:700; color:#c084fc;">🇬🇧 Ответ в чат (English):</span>
              <span id="ad-insert-status" style="font-size:10px; color:#94a3b8;">Готов к генерации</span>
            </div>
            <textarea id="ad-response-textarea" placeholder="Бот готов. Откройте диалог на alpha.date или нажмите 'Обновить' (F8)..."></textarea>
            
            <!-- Russian Translation Card -->
            <div id="ad-response-translation-box">
              <b>🇷🇺 Перевод для оператора:</b> <span id="ad-response-translation-text">(здесь появится перевод ответа)</span>
            </div>

            <!-- Quick Morph Chips -->
            <div class="ad-chips-row">
              <span class="ad-chip" data-style="balanced">✨ Базовый</span>
              <span class="ad-chip" data-style="bolder">😏 Дерзко (вызов)</span>
              <span class="ad-chip" data-style="softer">❤️ Нежно (кокетство)</span>
              <span class="ad-chip" data-style="frame">🛡️ Фрейм (отказ на контакты)</span>
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
    if (url.includes('/letters') || /letter|mail|inbox|compose|correspondence/.test(url)) {
      currentEnvironment = 'letters';
      updateEnvironmentUI();
      return 'letters';
    }

    // 2. Letters button or menu active check on Alpha.date
    const letterBtn = document.querySelector('[data-testid="letters-button"], [data-testid="main-menu-item-Letters"]');
    if (letterBtn) {
      const cls = letterBtn.className || '';
      const aria = letterBtn.getAttribute('aria-selected');
      if (cls.includes('active') || cls.includes('selected') || cls.includes('Mui-selected') || aria === 'true') {
        currentEnvironment = 'letters';
        updateEnvironmentUI();
        return 'letters';
      }
    }

    // 3. Fallback DOM markers
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
  // 5. Context & Interlocutor Scraper for Alpha.date
  // ==========================================================================

  function scrapeClientContext(): any {
    let manName = 'Мужчина', manAge = '—', manId = 'unknown', manPlace = '', girlInfo = 'Девушка', balance = '';

    // 1. Man Name and Age on Alpha.date: [data-testid="man-name"] (e.g. "luis Lopez, 26")
    const manNameEl = document.querySelector('[data-testid="man-name"], [class*="chat_head_profile_name-"], [class*="user-name"]');
    if (manNameEl) {
      const raw = (manNameEl as HTMLElement).innerText || '';
      const m = raw.match(/([^,]+),\s*(\d{1,3})/);
      if (m) {
        manName = m[1]!.trim();
        manAge = m[2]!.trim();
      } else if (raw.trim()) {
        manName = raw.trim();
      }
    }

    // 2. Active Chat ID from URL (e.g. https://alpha.date/chat/8eubddc1-ho1vgjxr-xr65f2lp-1ayvz25q)
    const urlMatch = window.location.href.match(/\/(?:chat|letters)\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) {
      manId = urlMatch[1]!;
    }

    // 3. Woman Profile on Alpha.date: [data-testid="woman-name"], [data-testid="woman-external_id"], [data-testid="woman-place"]
    const womanNameEl = document.querySelector('[data-testid="woman-name"]');
    const womanIdEl = document.querySelector('[data-testid="woman-external_id"]');
    const womanPlaceEl = document.querySelector('[data-testid="woman-place"]');
    if (womanNameEl) {
      const wName = (womanNameEl as HTMLElement).innerText?.trim() || '';
      const wId = (womanIdEl as HTMLElement)?.innerText?.trim() || '';
      const wPlace = (womanPlaceEl as HTMLElement)?.innerText?.trim() || '';
      girlInfo = `${wName} (${wId}${wPlace ? ', ' + wPlace : ''})`;
    } else {
      const girlEl = document.querySelector('[data-testid="girl-name"], [class*="girl_name"], [class*="lady_name"]');
      if (girlEl) {
        const gRaw = (girlEl as HTMLElement).innerText || '';
        if (gRaw.trim()) girlInfo = gRaw.trim();
      }
    }

    // 4. Message History Extraction for Alpha.date
    // In Alpha.date, message text has [data-testid="content"]!
    const contentNodes = Array.from(document.querySelectorAll('[data-testid="content"]'));
    const dialogueLines: string[] = [];
    let lastManMessage = '';

    if (contentNodes.length > 0) {
      // Find chat container to determine horizontal alignment (incoming=left, outgoing=right)
      const chatCol = document.querySelector('[class*="clmn_3"], [data-testid="message"]')?.closest('div[class*="clmn"]') || document.body;
      const colRect = chatCol.getBoundingClientRect();

      contentNodes.forEach((node) => {
        const text = ((node as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim();
        if (!text) return;

        const parent = node.closest('[class*="message"], [class*="msg"], div') || node;
        const pClass = (parent.className || '') + ' ' + (node.className || '');
        const isExplicitIncoming = /incoming|received|left|theirs|partner/.test(pClass);
        const isExplicitOutgoing = /outgoing|sent|right|mine|self|operator/.test(pClass);

        let isMan = false;
        if (isExplicitIncoming) {
          isMan = true;
        } else if (isExplicitOutgoing) {
          isMan = false;
        } else {
          // Geometric alignment test: left half = Man, right half = Operator/Girl
          const nodeRect = node.getBoundingClientRect();
          const nodeMid = nodeRect.left + nodeRect.width / 2;
          const colMid = colRect.left + colRect.width / 2;
          isMan = nodeMid < colMid;
        }

        if (isMan) {
          dialogueLines.push(`Мужчина: ${text}`);
          lastManMessage = text;
        } else {
          dialogueLines.push(`Девушка (Ты): ${text}`);
        }
      });
    } else {
      // Generic fallback
      const msgNodes = document.querySelectorAll(
        '[data-testid^="received-message-"], [data-testid^="sent-message-"], [class*="message-item"], [class*="message-bubble"], .message-in, .message-out, .msg-item'
      );
      msgNodes.forEach((node) => {
        const testId = node.getAttribute('data-testid') || '';
        const className = node.className || '';
        const isMan = testId.startsWith('received-message') || className.includes('received') || className.includes('message-in') || className.includes('incoming');
        const textNode = node.querySelector('[data-testid="message-text"], [class*="text"], .message-content') || node;
        const clean = ((textNode as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim();
        if (clean) {
          dialogueLines.push(`${isMan ? 'Мужчина' : 'Девушка (Ты)'}: ${clean}`);
          if (isMan) lastManMessage = clean;
        }
      });
    }

    const cleanChat = dialogueLines.slice(-25).join('\n');

    // Selected text priority hook
    const selectedText = (window.getSelection()?.toString() || '').trim();

    // Update Ribbon in HUD
    const titleEl = document.getElementById('ad-client-title');
    const balanceEl = document.getElementById('ad-client-balance');
    const shortId = manId !== 'unknown' ? (manId.length > 12 ? `${manId.slice(0, 8)}...` : manId) : '—';
    if (titleEl) titleEl.textContent = `${manName}, ${manAge} · ${shortId}`;
    if (balanceEl) balanceEl.textContent = girlInfo || `ID: ${shortId}`;

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
    const transText = document.getElementById('ad-response-translation-text');
    const stratEl = document.getElementById('ad-tactics-strategy');
    const archEl = document.getElementById('ad-tactics-archetype');

    if (textarea) textarea.value = '✦ Собираю контекст диалога и готовлю ответ...';
    if (transText) transText.textContent = 'Анализ психотипа и подбор стратегии...';
    if (stratEl) stratEl.textContent = 'Анализ психотипа...';
    updateInsertBadge(false);

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

      // Update UI with English text in main terminal and Russian translation in box
      const replyEn = data.main_text_en || data.main_text_ru || '';
      const replyRu = data.main_text_ru || '';

      if (textarea) textarea.value = replyEn;
      if (transText) transText.textContent = replyRu;
      if (archEl) archEl.textContent = data.archetype || 'Собеседник';
      if (stratEl) stratEl.textContent = data.strategy || 'Подготовка ответа';

      // Auto-pilot: Automatically insert English reply into Alpha.date chat (NEVER SENDS AUTOMATICALLY)
      if (isAutoPilotEnabled) {
        insertActiveReplyIntoSite();
      }
    } catch (e: any) {
      if (textarea) textarea.value = `Ошибка генерации: ${e.message}`;
      if (transText) transText.textContent = 'Проверьте API ключ и подключение к интернету.';
    } finally {
      isGenerating = false;
    }
  }

  // ==========================================================================
  // 7. Auto-Insert into Website (NEVER SENDS AUTOMATICALLY)
  // ==========================================================================

  function insertActiveReplyIntoSite(): boolean {
    const textarea = document.getElementById('ad-response-textarea') as HTMLTextAreaElement | null;
    // Primary text to insert is the English response for Alpha.date
    const textToInsert = textarea?.value?.trim() || lastGeneratedReply?.main_text_en || lastGeneratedReply?.main_text_ru || '';
    if (!textToInsert) return false;

    // 1. Letters Mode Insertion
    if (currentEnvironment === 'letters') {
      const letterTextarea = document.querySelector(
        'textarea[data-testid="letter-message"], textarea[name*="letter"], textarea[placeholder*="письм"], textarea[rows="10"], textarea[data-testid="message"]'
      ) as HTMLTextAreaElement | null;

      if (letterTextarea) {
        letterTextarea.focus();
        setTextareaNativeValue(letterTextarea, textToInsert);
        updateInsertBadge(true);
        showCosmicToast('✉️ Письмо вставлено в редактор (проверьте и отправьте)!');
        return true;
      }
    }

    // 2. Alpha.date Chat Textarea: textarea[data-testid="message"] (class clmn_3_chat_textarea-U9reqN)
    const chatInput = document.querySelector(
      'textarea[data-testid="message"], textarea.clmn_3_chat_textarea-U9reqN, textarea[placeholder*="message"], textarea[name="message"]'
    ) as HTMLTextAreaElement | null;

    if (chatInput) {
      chatInput.focus();
      setTextareaNativeValue(chatInput, textToInsert);
      updateInsertBadge(true);
      showCosmicToast('⚡ Ответ на английском вставлен в чат (НЕ отправлен)!');
      return true;
    }

    // 3. Fallback: ActiveElement or any input
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl instanceof HTMLTextAreaElement || (activeEl instanceof HTMLInputElement && activeEl.type === 'text')) {
      setTextareaNativeValue(activeEl as any, textToInsert);
      updateInsertBadge(true);
      showCosmicToast('⚡ Вставлено в активное поле!');
      return true;
    }

    const anyTextarea = document.querySelector('textarea, [contenteditable="true"]') as HTMLElement | null;
    if (anyTextarea) {
      if (anyTextarea instanceof HTMLTextAreaElement) {
        setTextareaNativeValue(anyTextarea, textToInsert);
      } else {
        anyTextarea.focus();
        document.execCommand('insertText', false, textToInsert);
      }
      updateInsertBadge(true);
      showCosmicToast('⚡ Вставлено в поле!');
      return true;
    }

    navigator.clipboard.writeText(textToInsert);
    showCosmicToast('📋 Скопировано в буфер обмена!');
    return false;
  }

  function updateInsertBadge(inserted: boolean): void {
    const badge = document.getElementById('ad-insert-status');
    if (badge) {
      if (inserted) {
        badge.textContent = '⚡ Вставлен в чат (не отправлен)';
        badge.style.color = '#34d399';
      } else {
        badge.textContent = 'Готов к вставке';
        badge.style.color = '#94a3b8';
      }
    }
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
        const style = (e.currentTarget as HTMLElement).getAttribute('data-style') || '';
        const textarea = document.getElementById('ad-response-textarea') as HTMLTextAreaElement;
        const transEl = document.getElementById('ad-response-translation-text');

        if (style === 'bolder' && lastGeneratedReply?.alt_bolder_en) {
          if (textarea) textarea.value = lastGeneratedReply.alt_bolder_en;
          if (transEl) transEl.textContent = lastGeneratedReply.alt_bolder_ru || '';
          if (isAutoPilotEnabled) insertActiveReplyIntoSite();
        } else if (style === 'softer' && lastGeneratedReply?.alt_softer_en) {
          if (textarea) textarea.value = lastGeneratedReply.alt_softer_en;
          if (transEl) transEl.textContent = lastGeneratedReply.alt_softer_ru || '';
          if (isAutoPilotEnabled) insertActiveReplyIntoSite();
        } else if (style === 'frame' && lastGeneratedReply?.alt_frame_en) {
          if (textarea) textarea.value = lastGeneratedReply.alt_frame_en;
          if (transEl) transEl.textContent = lastGeneratedReply.alt_frame_ru || '';
          if (isAutoPilotEnabled) insertActiveReplyIntoSite();
        } else if (style === 'balanced' && lastGeneratedReply?.main_text_en) {
          if (textarea) textarea.value = lastGeneratedReply.main_text_en;
          if (transEl) transEl.textContent = lastGeneratedReply.main_text_ru || '';
          if (isAutoPilotEnabled) insertActiveReplyIntoSite();
        } else if (style) {
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
