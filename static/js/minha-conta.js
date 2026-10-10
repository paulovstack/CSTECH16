document.addEventListener('DOMContentLoaded', async () => {
  if (!requireLogin()) return;
  const form = document.getElementById('minha-conta-form');
  const msg = document.getElementById('conta-mensagem');
  const button = form.querySelector('button[type=submit]');
  let emailOriginal = '';
  try {
    const user = await apiRequest('/api/v1/auth/me');
    if (String(user.perfil).toUpperCase() !== 'CLIENTE') { location.href='/static/dashboard.html'; return; }
    form.querySelector('#conta-nome').value = user.nome || '';
    form.querySelector('#conta-telefone').value = user.telefone || '';
    form.querySelector('#conta-email').value = user.email || '';
    emailOriginal = user.email || '';
  } catch(e) { setMessage(msg, e.message, 'error'); form.querySelectorAll('input,button').forEach(el=>el.disabled=true); return; }
  form.addEventListener('submit', async e => {
    e.preventDefault(); button.disabled=true; setMessage(msg,'Salvando...');
    const email=form.querySelector('#conta-email').value.trim();
    const nova=form.querySelector('#nova-senha').value;
    const body={nome:form.querySelector('#conta-nome').value.trim(),telefone:form.querySelector('#conta-telefone').value.trim()||null,email};
    if(nova){body.nova_senha=nova;body.senha_atual=form.querySelector('#senha-atual').value;}
    try {
      await apiRequest('/api/v1/auth/clientes/me',{method:'PUT',body:JSON.stringify(body)});
      form.querySelector('#senha-atual').value=''; form.querySelector('#nova-senha').value='';
      if(email!==emailOriginal){
        sessionStorage.removeItem('cstech16_token');
        setMessage(msg,'Dados atualizados! Como seu e-mail mudou, entre novamente com o novo e-mail.','success');
      } else setMessage(msg,'Dados atualizados com sucesso!','success');
      emailOriginal=email;
    } catch(err) { setMessage(msg,err.message||'Erro ao salvar.','error'); }
    finally {button.disabled=false;}
  });
});
