$('#iName').textContent = CONFIG.name;
$('#chatName').textContent = CONFIG.name;
$('#askTitle').innerHTML = `<em>${CONFIG.name}</em>, est-ce que tu veux sortir avec moi ?`;
setInterval(() => {
  $('#clock').textContent = fmtTime.format(new Date());
}, 1000);
$('#credits').innerHTML = CONFIG.credits
  .map(
    ([cls, role, who]) =>
      `<div class="credit ${cls}">${role ? `<span class="role">${role}</span>` : ''}<span class="who">${who}</span></div>`,
  )
  .join('');
