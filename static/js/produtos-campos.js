/* Helpers de campos novos. O envio/edição ainda precisa ser integrado em produtos.js. */
(function(){
  const specs=document.getElementById('p-especificacoes');
  if(!specs)return;
  specs.addEventListener('blur',()=>{
    const value=specs.value.trim();specs.setCustomValidity('');
    if(!value)return;
    try{const data=JSON.parse(value);if(!data||Array.isArray(data)||typeof data!=='object'||Object.values(data).some(v=>typeof v!=='string'))throw Error('Formato inválido');}
    catch(e){specs.setCustomValidity('Informe um objeto JSON válido com valores em texto.');specs.reportValidity();}
  });
  specs.addEventListener('input',()=>specs.setCustomValidity(''));
})();
