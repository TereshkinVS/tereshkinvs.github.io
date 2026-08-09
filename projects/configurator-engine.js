// ============================================================
// Движок генератора L3-конфигураций Huawei VRP
// ============================================================
const HUAWEI_TEMPLATE = `system-view

sysname {{ hostname }}

info-center loghost {{ syslog_server_1 }}
info-center loghost {{ syslog_server_2 }}
info-center logbuffer size 1024
info-center timestamp log format-date precision-time millisecond
vlan batch {{ vlan_batch }}

{{ l3_block }}

radius-server template ise_radius
 radius-server shared-key cipher {{ radius_key }}
 radius-server authentication {{ radius_server_1 }} 1812 source LoopBack 0 weight 80
 radius-server authentication {{ radius_server_2 }} 1812 source LoopBack 0 weight 70
 radius-server authentication {{ radius_server_3 }} 1812 source LoopBack 0 weight 60
 undo radius-server user-name domain-included
 calling-station-id mac-format colon-split mode2 uppercase
 radius-server attribute translate
 radius-attribute translate extend HW-LLDP vendor-specific 9 1 access-request account-request
quit

authentication unified-mode

dot1x-access-profile name dot1x_profile
 dot1x reauthenticate
 dot1x unicast-trigger
 authentication trigger-condition arp dhcp any-l2-packet
quit

mac-access-profile name mac_profile
 mac-authen authentication-method chap
 mac-authen reauthenticate
 authentication trigger-condition dhcp arp any-l2-packet
 mac-authen trigger dhcp-binding
quit

undo authentication pre-authen-access enable

aaa
 authentication-scheme dot1x
  authentication-mode radius
 accounting-scheme dot1x_acc
  accounting-mode radius
  accounting realtime 3
  accounting start-fail online
 domain {{ domain_name }}
  authentication-scheme dot1x
  accounting-scheme dot1x_acc
  radius-server ise_radius
 quit
quit

vlan {{ vlan_auth_fail }}
 name UNAUTH_VLAN
 mac-address learning disable

authentication-profile name dot1x_profile
 dot1x-access-profile dot1x_profile
 mac-access-profile mac_profile
 authentication mode single-voice-with-data
 authentication termination-action reauthenticate
 authentication dot1x-mac-bypass
 authentication order mac dot1x
 access-domain {{ domain_name }} force
 authentication event authen-fail action authorize vlan {{ vlan_auth_fail }}
 authentication event authen-server-down action authorize vlan {{ vlan_data }}
 authentication event authen-server-up action re-authen
quit

hwtacacs-server template TACSERVICE
 hwtacacs-server authentication {{ tacacs_server_1 }}
 hwtacacs-server authentication {{ tacacs_server_2 }} secondary
 hwtacacs-server authorization {{ tacacs_server_1 }}
 hwtacacs-server authorization {{ tacacs_server_2 }} secondary
 hwtacacs-server accounting {{ tacacs_server_1 }}
 hwtacacs-server accounting {{ tacacs_server_2 }} secondary
 hwtacacs-server source-ip source-loopback 0
 hwtacacs-server shared-key cipher {{ tacacs_key }}
 undo hwtacacs-server user-name domain-included
quit

acl name VTY-IN 2000
 rule 10 permit source {{ mgmt_subnet }} logging
quit

aaa
 local-aaa-user password policy administrator
  password history record number 0
  undo password alert original
  password expire 0
 quit
 undo user-password complexity-check
 local-user admin password irreversible-cipher {{ admin_password }}
 local-user admin privilege level 3
 local-user admin service-type terminal ssh
quit

ntp-service unicast-server {{ ntp_server_1 }}
ntp-service unicast-server {{ ntp_server_2 }}

interface range GigabitEthernet0/0/1 to GigabitEthernet0/0/20
 port link-type hybrid
 voice-vlan {{ vlan_voice }} enable
 port hybrid pvid vlan {{ vlan_data }}
 port hybrid tagged vlan {{ vlan_voice }}
 port hybrid untagged vlan {{ vlan_data }}
 stp loop-protection
 stp edged-port enable
 authentication-profile dot1x_profile
 port-security enable
 port-security max-mac-num 4
 storm-control broadcast min-rate percent 1 max-rate percent 1
 storm-control action error-down
quit

snmp-agent
snmp-agent community read cipher {{ snmp_community }}
snmp-agent sys-info location {{ snmp_location }}
snmp-agent sys-info version v2c v3
snmp-agent trap enable

ssh server timeout 120
rsa local-key-pair create
stelnet ipv4 server enable
ssh server-source all-interface

header shell information ^
All user actions are logged!
***********************************************************
*   {{ header_banner }}
*                        WARNING!                         *
*        There are only authorized users can pass,        *
*   if you have no rights to access, please disconnect.   *
***********************************************************
^

user-interface con 0
 authentication-mode password
 set authentication password cipher {{ console_password }}
quit

user-interface vty 0 4
 acl 2000 inbound
 authentication-mode aaa
 protocol inbound ssh
quit

undo telnet server enable
undo http server enable
undo http secure-server enable

quit
save
y
`;

const HUAWEI_PROFILE = {
  title: "Huawei S5731-S24P4X — ASW/NSW (V200R021C00SPC100)",
  uplink_placeholder: "XGigabitEthernet0/0/1",
  vlan_role_map: { Data: "vlan_data", Voice: "vlan_voice", Printers: "vlan_printers", AP_Mgmt: "vlan_ap_mgmt", L2_Mgmt: "vlan_l2_mgmt" },
  vlan_batch_extra: [2048],
  section_quits: {
    "vrf section": [" quit"], "stp section": [" quit"], "vlan section": [" quit"],
    "vlanif section": [" quit"], "loopback section": [" quit"], "ospf section": [" quit"]
  },
  variables: [
    { name: "hostname", label: "Имя коммутатора (sysname)", group: "Основное", default: "", required: true },
    { name: "uplink_port", label: "Uplink-порт (замена заглушки)", group: "Основное", default: "XGigabitEthernet0/0/1", required: true, hint: "Подставляется в секцию Interface исправленного L3-файла" },
    { name: "domain_name", label: "AAA-домен", group: "Основное", default: "corp.local" },
    { name: "snmp_location", label: "SNMP location", group: "Основное", default: "" },
    { name: "header_banner", label: "Баннер приветствия (header shell)", group: "Основное", default: "Welcome to network equipment!" },
    { name: "mgmt_subnet", label: "Подсеть управления (ACL VTY-IN)", group: "Основное", default: "10.10.10.0 0.0.0.255" },
    { name: "vlan_batch", label: "vlan batch", group: "VLAN", source: "auto", hint: "Считается из L3-файла автоматически" },
    { name: "vlan_data", label: "VLAN Data", group: "VLAN", source: "l3", default: "2100" },
    { name: "vlan_voice", label: "VLAN Voice", group: "VLAN", source: "l3", default: "2150" },
    { name: "vlan_printers", label: "VLAN Printers", group: "VLAN", source: "l3", default: "2015" },
    { name: "vlan_ap_mgmt", label: "VLAN AP_Mgmt", group: "VLAN", source: "l3", default: "2018" },
    { name: "vlan_l2_mgmt", label: "VLAN L2_Mgmt", group: "VLAN", source: "l3", default: "2000" },
    { name: "vlan_auth_fail", label: "VLAN auth-fail (guest)", group: "VLAN", default: "2048" },
    { name: "radius_server_1", label: "RADIUS сервер 1 (weight 80)", group: "AAA / RADIUS", default: "" },
    { name: "radius_server_2", label: "RADIUS сервер 2 (weight 70)", group: "AAA / RADIUS", default: "" },
    { name: "radius_server_3", label: "RADIUS сервер 3 (weight 60)", group: "AAA / RADIUS", default: "" },
    { name: "radius_key", label: "RADIUS shared-key", group: "AAA / RADIUS", secret: true, default: "" },
    { name: "tacacs_server_1", label: "TACACS+ основной", group: "AAA / TACACS+", default: "" },
    { name: "tacacs_server_2", label: "TACACS+ резервный", group: "AAA / TACACS+", default: "" },
    { name: "tacacs_key", label: "TACACS+ shared-key", group: "AAA / TACACS+", secret: true, default: "" },
    { name: "admin_password", label: "Пароль local-user admin", group: "Учётные записи", secret: true, default: "" },
    { name: "console_password", label: "Пароль консоли (con 0)", group: "Учётные записи", secret: true, default: "" },
    { name: "snmp_community", label: "SNMP community (read)", group: "Учётные записи", secret: true, default: "" },
    { name: "syslog_server_1", label: "Syslog сервер 1", group: "Сервисы", default: "" },
    { name: "syslog_server_2", label: "Syslog сервер 2", group: "Сервисы", default: "" },
    { name: "ntp_server_1", label: "NTP сервер 1", group: "Сервисы", default: "" },
    { name: "ntp_server_2", label: "NTP сервер 2", group: "Сервисы", default: "" }
  ],
  checks: [
    [/^sysname \S+$/m, "Не найдена строка sysname — проверьте имя коммутатора."],
    [/^save$/m, "В конце конфига нет команды save."]
  ]
};

function cfgParseL3(rawText, rules) {
  const res = { text: "", vlans: {}, sections: [], derived: {}, warnings: [] };
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");
  const dropPatterns = [/^\S+\.txt\s*$/, /^#{10,}\s*$/, /^#{2,}\s+ASW\s*$/];
  const markerRe = /^####\s+(.+?)\s*$/;
  const quitsMap = {};
  Object.entries(rules.section_quits || {}).forEach(([k, v]) => quitsMap[k.trim().toLowerCase()] = v);

  const cleaned = [];
  for (const ln of lines) {
    if (dropPatterns.some(p => p.test(ln))) continue;
    cleaned.push(ln.replace(/\s+$/, ""));
  }

  const blocks = [];
  let currentName = "", current = [];
  for (const ln of cleaned) {
    const m = ln.match(markerRe);
    if (m) {
      blocks.push([currentName, current]);
      currentName = m[1].trim();
      current = [ln];
    } else {
      current.push(ln);
    }
  }
  blocks.push([currentName, current]);

  const outLines = [];
  for (const [name, body] of blocks) {
    if (!body.some(s => s.trim())) continue;
    while (body.length && !body[body.length - 1].trim()) body.pop();
    const quits = quitsMap[name.trim().toLowerCase()] || [];
    body.push(...quits);
    if (name) res.sections.push(name);
    outLines.push(...body, "");
  }
  while (outLines.length && !outLines[outLines.length - 1].trim()) outLines.pop();
  const bodyText = outLines.join("\n");

  let m;
  const vlanNameRe = /^\s*vlan\s+(\d+)\s*$\n\s*name\s+(\S+)/gm;
  while ((m = vlanNameRe.exec(bodyText))) res.vlans[parseInt(m[1])] = m[2];
  const vlanOnlyRe = /^\s*vlan\s+(\d+)\s*$/gm;
  while ((m = vlanOnlyRe.exec(bodyText))) {
    const id = parseInt(m[1]);
    if (!(id in res.vlans)) res.vlans[id] = "";
  }

  const roleMap = rules.vlan_role_map || {};
  for (const [vid, vname] of Object.entries(res.vlans)) {
    const varName = roleMap[vname];
    if (varName) res.derived[varName] = vid;
  }

  const placeholder = rules.uplink_placeholder;
  if (placeholder && bodyText.includes(placeholder)) {
    res.derived._uplink_placeholder_found = "1";
  } else if (placeholder) {
    res.warnings.push(`В L3-файле не найдена заглушка uplink-порта «${placeholder}» — проверьте номер порта вручную.`);
  }

  res.text = bodyText;
  return res;
}

function cfgApplyUplink(l3Text, rules, uplinkPort) {
  const placeholder = rules.uplink_placeholder;
  if (placeholder && uplinkPort) return l3Text.split(placeholder).join(uplinkPort.trim());
  return l3Text;
}

function cfgBuildVlanBatch(vlanIds, minRun = 3) {
  const ids = [...new Set(vlanIds.map(Number))].sort((a, b) => a - b);
  if (!ids.length) return "";
  const parts = [];
  let start = ids[0], prev = ids[0];
  for (const vid of [...ids.slice(1), null]) {
    if (vid !== null && vid === prev + 1) { prev = vid; continue; }
    const run = prev - start + 1;
    if (run >= minRun) parts.push(`${start} to ${prev}`);
    else for (let x = start; x <= prev; x++) parts.push(String(x));
    if (vid !== null) { start = vid; prev = vid; }
  }
  return parts.join(" ");
}

function cfgTemplateVariables(tpl) {
  const re = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
  const found = new Set();
  let m;
  while ((m = re.exec(tpl))) found.add(m[1]);
  return [...found].sort();
}

function cfgSubstitute(tpl, values) {
  return tpl.replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (_, name) => (values[name] ?? "").toString());
}

function cfgRenderConfig(tpl, values, profile) {
  const warnings = [];
  const needed = cfgTemplateVariables(tpl);
  const ctx = {};
  for (const name of needed) {
    ctx[name] = values[name] ?? "";
    if (String(ctx[name]).trim() === "") warnings.push(`Переменная «${name}» пустая — в конфиге будет пропуск.`);
  }
  let text = cfgSubstitute(tpl, ctx).replace(/\r\n/g, "\n");
  const ph = profile.uplink_placeholder;
  if (ph && text.includes(ph)) warnings.push(`В готовом конфиге осталась заглушка uplink-порта «${ph}».`);
  if (/\{\{\s*[A-Za-z_][A-Za-z0-9_]*\s*\}\}/.test(text)) warnings.push("В готовом конфиге остались неподставленные переменные шаблона.");
  for (const [pattern, msg] of profile.checks || []) {
    if (!pattern.test(text)) warnings.push(msg);
  }
  return [text, warnings];
}

// ---- Wizard wiring ----
const cfgState = { parsed: null, filename: "", values: {} };

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const dropzoneFilename = document.getElementById('dropzoneFilename');
const l3TextArea = document.getElementById('l3Text');
const toStep2Btn = document.getElementById('toStep2Btn');
const stepPane1 = document.getElementById('stepPane1');
const stepPane2 = document.getElementById('stepPane2');
const stepPane3Output = document.getElementById('stepPane3Output');
const stepPane3Placeholder = document.getElementById('stepPane3Placeholder');
const configOut = document.getElementById('configOut');
const warnList = document.getElementById('warnList');
const copyBtn = document.getElementById('copyBtn');
const dlBtn = document.getElementById('dlBtn');

function readFileAsText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(file, 'utf-8');
  });
}

dropzone?.addEventListener('click', () => fileInput.click());
dropzone?.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone?.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) await handleFile(file);
});
fileInput?.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (file) await handleFile(file);
});
async function handleFile(file) {
  cfgState.filename = file.name;
  const text = await readFileAsText(file);
  l3TextArea.value = text;
  dropzoneFilename.textContent = `Загружен: ${file.name}`;
}

function setWizardStep(n) {
  document.querySelectorAll('.wizard-step').forEach(el => {
    const step = parseInt(el.dataset.step);
    el.classList.toggle('active', step === n);
    el.classList.toggle('done', step < n);
  });
}

toStep2Btn?.addEventListener('click', () => {
  try {
    const raw = l3TextArea.value;
    if (!raw.trim()) { alert('Вставьте текст L3-секций или загрузите файл.'); return; }
    const parsed = cfgParseL3(raw, HUAWEI_PROFILE);
    cfgState.parsed = parsed;

    const values = {};
    HUAWEI_PROFILE.variables.forEach(v => values[v.name] = v.default || "");
    Object.entries(parsed.derived).forEach(([k, v]) => { if (!k.startsWith('_')) values[k] = v; });
    const extra = HUAWEI_PROFILE.vlan_batch_extra || [];
    values.vlan_batch = cfgBuildVlanBatch([...Object.keys(parsed.vlans).map(Number), ...extra]);
    cfgState.values = values;

    renderStep2(parsed, values);
    stepPane1.style.display = 'none';
    stepPane2.style.display = 'flex';
    setWizardStep(2);
  } catch (err) {
    alert('Ошибка при разборе файла: ' + err.message);
  }
});

function renderStep2(parsed, values) {
  const groups = {};
  HUAWEI_PROFILE.variables.forEach(v => {
    const g = v.group || 'Прочее';
    (groups[g] = groups[g] || []).push(v);
  });

  let html = '';
  if (parsed.warnings.length) {
    html += `<ul class="warn-list" style="border-top:none; padding-top:0;">${parsed.warnings.map(w => `<li>⚠ ${w}</li>`).join('')}</ul>`;
  }
  if (Object.keys(parsed.vlans).length) {
    html += `<div class="field"><label>Обнаруженные VLAN (${Object.keys(parsed.vlans).length})</label><div class="vlan-summary">${
      Object.entries(parsed.vlans).map(([id, name]) => `<span class="vlan-chip">${id}${name ? ' · ' + name : ''}</span>`).join('')
    }</div></div>`;
  }

  Object.entries(groups).forEach(([groupName, vars]) => {
    html += `<div class="var-group-title">${groupName}</div>`;
    vars.forEach(v => {
      const val = values[v.name] ?? '';
      const type = v.secret ? 'password' : 'text';
      html += `<div class="field">
        <label for="cfg_${v.name}">${v.label}${v.required ? ' *' : ''}</label>
        <input id="cfg_${v.name}" type="${type}" data-var="${v.name}" value="${String(val).replace(/"/g, '&quot;')}" placeholder="${v.hint || ''}">
        ${v.hint ? `<div class="field-hint">${v.hint}</div>` : ''}
      </div>`;
    });
  });

  html += `<div class="wizard-actions">
    <button class="btn-ghost-sm" id="backTo1Btn">← Назад</button>
    <button class="btn primary" id="genBtn" style="justify-content:center; flex:1;">Сгенерировать конфиг →</button>
  </div>`;

  stepPane2.innerHTML = html;

  document.getElementById('backTo1Btn').addEventListener('click', () => {
    stepPane2.style.display = 'none';
    stepPane1.style.display = 'flex';
    setWizardStep(1);
  });

  document.getElementById('genBtn').addEventListener('click', () => {
    stepPane2.querySelectorAll('[data-var]').forEach(input => {
      cfgState.values[input.dataset.var] = input.value;
    });
    const l3Applied = cfgApplyUplink(cfgState.parsed.text, HUAWEI_PROFILE, cfgState.values.uplink_port || "");
    cfgState.values.l3_block = l3Applied;
    const [config, warnings] = cfgRenderConfig(HUAWEI_TEMPLATE, cfgState.values, HUAWEI_PROFILE);

    configOut.textContent = config;
    warnList.innerHTML = warnings.map(w => `<li>⚠ ${w}</li>`).join('');
    stepPane3Placeholder.style.display = 'none';
    stepPane3Output.style.display = 'flex';
    setWizardStep(3);
  });
}

copyBtn?.addEventListener('click', () => {
  navigator.clipboard.writeText(configOut.textContent);
  copyBtn.textContent = 'Скопировано!';
  setTimeout(() => copyBtn.textContent = 'Копировать', 1500);
});

dlBtn?.addEventListener('click', () => {
  const hostname = cfgState.values.hostname || 'switch';
  const safeName = hostname.replace(/[^A-Za-z0-9_.\-]/g, '_') + '_config.txt';
  const blob = new Blob([configOut.textContent], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = safeName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
});
