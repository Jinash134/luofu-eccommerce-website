(function () {
  'use strict';
  // Exact EU / UK / foot-length values from the supplied September size guides.
  var charts = {
    Men: [[39,5,24.5],[40,6,25.2],[41,7,25.8],[42,8,26.5],[43,9,27.2],[44,10,27.8],[45,11,28.5],[46,12,29.2],[47,13,29.8],[48,14,30.5]],
    Women: [[36,3,22.5],[37,4,23.2],[38,5,23.8],[39,6,24.5],[40,7,25.2],[41,8,25.8],[42,9,26.5],[43,10,27.2]]
  };
  function node(tag,text) { var n=document.createElement(tag); if(text) n.textContent=text; return n; }
  function guideFor(product) {
    if (!product || product.sizeGuide === false) return null;
    var gender = genderFor(product);
    return charts[gender] ? { gender: gender, sizes: charts[gender] } : null;
  }
  function genderFor(product) {
    var value = String(product && (product.gender || product.category) || '').toLowerCase().replace(/['’]/g, '').trim();
    if (/^(men|mens|male)$/.test(value)) return 'Men';
    if (/^(women|womens|female)$/.test(value)) return 'Women';
    return '';
  }
  // An explicit model size list wins. Otherwise these are requested sizes from
  // the supplied chart, never a claim about stock for this model.
  function sizesFor(product) {
    if (Array.isArray(product.sizes)) return product.sizes.filter(function (size) {
      return /^(\d{1,2})(\.5)?$/.test(String(size));
    }).map(String).filter(function (size, index, list) { return list.indexOf(size) === index; });
    var guide = guideFor(product);
    return guide ? guide.sizes.map(function (row) { return String(row[0]); }) : [];
  }
  function build(gender) {
    var wrap=node('div'); wrap.className='size-guide-table';
    var table=node('table');
    table.appendChild(node('caption','Size guide'));
    var head=node('thead'), row=node('tr');
    ['EU size','UK size','Foot length (cm)'].forEach(function(text){var th=node('th',text);th.scope='col';row.appendChild(th);});
    head.appendChild(row);table.appendChild(head);
    var body=node('tbody');
    (charts[gender]||[]).forEach(function(values){var tr=node('tr');values.forEach(function(value){tr.appendChild(node('td',String(value)));});body.appendChild(tr);});
    table.appendChild(body);wrap.appendChild(table);
    wrap.appendChild(node('p','Place your foot flat on paper. Mark your heel and longest toe, then measure between the marks in centimetres. If between sizes, choose the larger size.'));
    wrap.appendChild(node('p','Size guide only. Confirm availability for your model on WhatsApp.'));
    var link=node('a','View original size guide');link.href='assets/images/size-chart-'+gender.toLowerCase()+'.jpeg';link.target='_blank';link.rel='noopener';wrap.appendChild(link);
    return wrap;
  }
  var dialog;
  function open(product) {
    var guide = guideFor(product);
    if (!guide) return;
    if (!dialog) {
      dialog = node('dialog'); dialog.className = 'cart-dialog size-dialog';
      dialog.setAttribute('aria-labelledby', 'sizeGuideTitle');
      document.body.appendChild(dialog);
      dialog.addEventListener('click', function (event) {
        if (event.target === dialog) {
          var rect = dialog.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
        }
      });
      dialog.addEventListener('close', function () { document.body.classList.remove('size-open'); });
    }
    dialog.replaceChildren();
    var head = node('div'); head.className = 'cart-heading';
    var title = node('h2', 'Size guide'); title.id = 'sizeGuideTitle';
    var close = node('button', '×'); close.type = 'button'; close.className = 'cart-close'; close.setAttribute('aria-label', 'Close size guide');
    close.onclick = function () { dialog.close(); };
    head.append(title, close); dialog.appendChild(head);
    var content = node('div'); content.className = 'size-dialog-content';
    content.appendChild(node('p', product._name)); content.appendChild(build(guide.gender)); dialog.appendChild(content);
    dialog.showModal(); document.body.classList.add('size-open'); close.focus();
  }
  window.LuofuSizes={charts:charts,guideFor:guideFor,genderFor:genderFor,sizesFor:sizesFor,build:build,open:open};
})();
