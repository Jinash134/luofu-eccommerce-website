(function () {
  'use strict';

  var CURRENCY_CODE = 'QAR';

  function productKey(product) {
    return product && (product.id || product.model) || '';
  }

  function priceFor(product) {
    if (!product) return null;
    if (Number.isFinite(product.sellingPrice) && product.sellingPrice >= 0) return product.sellingPrice;
    return null;
  }

  function formatPriceValue(value) {
    if (typeof value !== 'number' || !isFinite(value)) return '';
    return CURRENCY_CODE + ' ' + value.toLocaleString('en-QA', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2
    });
  }

  function formatPrice(product) {
    return formatPriceValue(priceFor(product));
  }

  window.LuofuCommerce = {
    currency: CURRENCY_CODE,
    productKey: productKey,
    priceFor: priceFor,
    formatPriceValue: formatPriceValue,
    formatPrice: formatPrice
  };
})();
