"use strict";
function preferredUiDatabaseName(db,fallback='Рабочая база'){const plant=String(db?.plants?.[0]?.name||'').trim(),project=String(db?.project?.name||'').trim();return ((!plant||/^завод$/i.test(plant))&&project&&!/^завод$/i.test(project))?project:(plant||project||fallback)}
function renderSettings(view){
 const db=window.LubricaCore?.State?.getDatabase?.()||{},version=(typeof APP_VERSION!=="undefined"?APP_VERSION:(db.appVersion||"—")),schema=db.schemaVersion||"—",isFile=location.protocol==="file:";
 view.innerHTML=`<section class="module-page settings-page settings-page-v3">
  <div class="settings-grid settings-grid-symmetric">
   <article class="settings-card settings-tile settings-tile-database">
    <div class="settings-card-head"><div><span class="settings-icon settings-icon-db">▣</span><div><h3>Рабочая база данных</h3><p>Создание, открытие и штатное сохранение JSON.</p></div></div></div>
    <label class="settings-current-db">Текущая база<input id="rProject" value="${esc(preferredUiDatabaseName(db,state.project||'Новая база'))}" readonly></label>
    <div class="settings-action-list settings-action-list-fill">
      <button class="btn settings-main-action settings-action-blue" id="settingsNewDb">＋&nbsp; Новая база</button>
      <button class="btn ghost" id="settingsOpenJson">▱&nbsp; Открыть JSON</button>
      <button class="btn ghost" id="backupJson">▣&nbsp; Сохранить JSON</button>
    </div>
   </article>

   <article class="settings-card settings-tile settings-tile-backup">
    <div class="settings-card-head"><div><span class="settings-icon settings-icon-backup">↻</span><div><h3>Резервное копирование и восстановление</h3><p>Защита рабочей базы перед импортом и массовыми изменениями.</p></div></div></div>
    <div class="settings-action-list settings-action-list-fill">
      <button class="btn settings-main-action settings-action-green" id="createBackupJson">⇩&nbsp; Создать бекап</button>
      <button class="btn ghost" id="restoreBackupJson">↥&nbsp; Восстановить бекап</button>
      <button class="btn ghost" id="settingsRestoreRecovery">▣&nbsp; Восстановить Recovery-автокопию</button>
      <button class="btn ghost" id="settingsRestoreArchived">◴&nbsp; Предыдущая рабочая сессия</button>
    </div>
    <div class="settings-note settings-note-green"><b>Рекомендация</b><span>Создавайте бекап перед повторным импортом, массовым редактированием и изменением структуры.</span></div>
   </article>

   <article class="settings-card settings-tile settings-tile-help">
    <div class="settings-card-head"><div><span class="settings-icon settings-icon-help">?</span><div><h3>Помощь пользователю</h3><p>Полная интерактивная инструкция по рабочему циклу LUBRICA.</p></div></div></div>
    <div class="settings-guide-box settings-guide-box-v2">
      <b>От базы до финального Excel</b>
      <span>15 разделов: обзор функционала и критических правил, база, импорт, классификация, материалы, карта смазки, расчёты, маршруты, ревизии, планирование, выполнение, ФРВ, аналитика, Контроль и Финальный Excel/Recovery.</span>
      <button class="btn settings-main-action settings-action-orange" id="openFullGuideCard">▣&nbsp; Открыть интерактивную инструкцию</button>
    </div>
   </article>

   <article class="settings-card settings-tile settings-tile-about">
    <div class="settings-card-head"><div><span class="settings-icon settings-icon-about">i</span><div><h3>О программе</h3><p>Техническая информация для диагностики и поддержки.</p></div></div></div>
    <dl class="settings-about settings-about-v2">
      <div><dt>Версия LUBRICA</dt><dd>${esc(version)}</dd></div>
      <div><dt>Схема базы</dt><dd>${esc(schema)}</dd></div>
      <div><dt>Режим запуска</dt><dd>${isFile?'Локально · file://':esc(location.protocol||'—')}</dd></div>
      <div><dt>Recovery</dt><dd>${window.LubricaCore?.State?.hasRecovery?.()?'Доступна автокопия':'Нет ожидающей автокопии'}</dd></div>
    </dl>
    <button class="btn danger settings-demo-button settings-demo-button-v2" id="resetDemo">↻&nbsp; Восстановить демоданные</button>
   </article>
  </div>

  <section class="engineering-defaults-panel is-open" id="engineeringDefaultsPanel">
   <header class="engineering-defaults-head">
    <button type="button" class="engineering-defaults-toggle" id="toggleEngineeringDefaults" aria-expanded="true">
     <span class="engineering-defaults-icon">⚙</span>
     <span class="engineering-defaults-title"><b>Инженерные значения по умолчанию</b><small>Используются только как начальные предложения и не пересчитывают утверждённые мероприятия.</small></span>
     <span class="engineering-defaults-caret">⌃</span>
    </button>
    <button class="btn engineering-save-btn" id="saveRules">↻&nbsp; Сохранить значения</button>
   </header>
   <div class="engineering-defaults-body" id="engineeringDefaultsBody">
    <div class="engineering-defaults-subtitle">Расчётные значения по умолчанию</div>
    <div class="engineering-defaults-grid">
     <div class="engineering-field">
      <label for="rBearing">Подшипники · предлагаемый интервал</label>
      <div class="engineering-input-row"><input id="rBearing" type="number" min="1" value="${state.rules.bearingWeeks}"><span class="engineering-unit">нед.</span></div>
      <small>Начальное предложение для обычных условий.</small>
     </div>
     <div class="engineering-field">
      <label for="rHarsh">Тяжёлые условия · предлагаемый интервал</label>
      <div class="engineering-input-row"><input id="rHarsh" type="number" min="1" value="${state.rules.harshWeeks}"><span class="engineering-unit">нед.</span></div>
      <small>Начальное предложение, которое требует проверки инженером.</small>
     </div>
     <div class="engineering-field">
      <label for="rChain">Цепные передачи · предлагаемый интервал</label>
      <div class="engineering-input-row"><input id="rChain" type="number" min="1" value="${state.rules.chainWeeks}"><span class="engineering-unit">нед.</span></div>
      <small>Не изменяет уже утверждённые мероприятия.</small>
     </div>
     <div class="engineering-field">
      <label for="rInspection">Редукторы · предлагаемый интервал проверки</label>
      <div class="engineering-input-row"><input id="rInspection" type="number" min="1" value="${state.rules.inspectionWeeks}"><span class="engineering-unit">нед.</span></div>
      <small>Используется только при создании/предложении новых данных.</small>
     </div>
     <div class="engineering-field engineering-field-wide">
      <label for="rSealed">Закрытые исполнения · предлагаемое действие</label>
      <select id="rSealed">
       <option value="Не досмазывать — проверить конструкцию" ${state.rules.sealedAction==='Не досмазывать — проверить конструкцию'?'selected':''}>Не досмазывать — проверить конструкцию</option>
       <option value="Проверить документацию OEM" ${state.rules.sealedAction==='Проверить документацию OEM'?'selected':''}>Проверить документацию OEM</option>
       <option value="Только визуальный контроль" ${state.rules.sealedAction==='Только визуальный контроль'?'selected':''}>Только визуальный контроль</option>
       <option value="Требуется инженерное решение" ${state.rules.sealedAction==='Требуется инженерное решение'?'selected':''}>Требуется инженерное решение</option>
      </select>
      <small>Окончательное мероприятие утверждается в карточке точки.</small>
     </div>
    </div>
    <div class="engineering-principle">
      <span class="engineering-principle-icon">i</span>
      <div><b>Инженерный принцип</b><span>Утверждённая норма и периодичность хранятся в конкретном мероприятии и должны иметь источник.</span></div>
    </div>
   </div>
  </section>
 </section>`;

 $("#saveRules").onclick=()=>{state.rules={bearingWeeks:+$("#rBearing").value||4,harshWeeks:+$("#rHarsh").value||2,chainWeeks:+$("#rChain").value||1,inspectionWeeks:+$("#rInspection").value||4,sealedAction:$("#rSealed").value.trim()};persist("Настройки по умолчанию сохранены");updateProjectName()};
 $("#toggleEngineeringDefaults").onclick=()=>{const panel=$("#engineeringDefaultsPanel"),open=panel.classList.toggle("is-open");$("#toggleEngineeringDefaults").setAttribute("aria-expanded",String(open));};
 $("#backupJson").onclick=exportJson;
 $("#createBackupJson").onclick=createBackupJson;
 $("#restoreBackupJson").onclick=restoreBackupPicker;
 $("#settingsNewDb").onclick=createNewDatabase;
 $("#settingsOpenJson").onclick=openJsonPicker;
 $("#settingsRestoreRecovery").onclick=restoreRecoverySession;
 $("#settingsRestoreArchived").onclick=restoreArchivedSession;
 $("#openFullGuideCard").onclick=()=>window.LubricaUserGuide?.open?.('overview');
 $("#resetDemo").onclick=()=>openAction("Восстановить демоданные?","Все локальные изменения будут заменены.",[{label:"Отмена",kind:"ghost"},{label:"Восстановить",kind:"danger",run:()=>{state=LubricaCore.State.startDemo({points:clone(seedPoints),materials:clone(defaultMaterials),rules:clone(defaultRules),project:"Демонстрационная база"});activeDatabaseFileHandle=null;activeDatabaseDirectoryHandle=null;selectedId=state.points[0]?.id||null;renderAll();updateProjectName();toast("Открыта демонстрационная база");renderSettings(view)}}])
}

function updateProjectName(){
  const core=window.LubricaCore?.State,db=core?.getDatabase?.();
  const isDemo=core?.isDemo?.()!==false;
  const name=isDemo?'Демонстрационная база':(preferredUiDatabaseName(db,state.project||"Рабочая база"));
  const strong=$("#databaseName");if(strong)strong.textContent=name;
  const restore=$("#restoreRecoveryBtn");if(restore)restore.hidden=!(isDemo&&core?.hasRecovery?.());
  const saveEl=$("#saveState");
  if(saveEl){
    if(isDemo)saveEl.textContent=core?.hasRecovery?.()?"○ Демо · есть автокопия рабочей базы":"○ Демонстрационная база";
    else if(activeDatabaseFileHandle)saveEl.textContent=`● Автосохранение · ${activeDatabaseFileHandle.name}`;
    else saveEl.textContent="● Recovery-автосохранение включено";
  }
  const saveBtn=$("#saveJsonBtn");if(saveBtn)saveBtn.disabled=isDemo;
  const importBtn=$("#importBtn"),exportBtn=$("#exportBtn");
  if(importBtn){importBtn.disabled=isDemo;importBtn.title=isDemo?'Сначала создайте или откройте рабочую базу':''}
  if(exportBtn){exportBtn.disabled=isDemo;exportBtn.title=isDemo?'Сначала создайте или откройте рабочую базу':''}
  const dbLabel=document.querySelector('.database-current small');if(dbLabel)dbLabel.textContent=isDemo?'Демо':'Рабочая база';
  document.body.classList.toggle('demo-mode',isDemo);
}


// Explicit cross-module export
window.renderSettings=renderSettings;
