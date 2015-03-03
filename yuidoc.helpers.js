
module.exports = {
  mdn: function (item) {
    item = String(item);
    var ns_fn = item.split('#');

    return [
      '<a href="',
      'https://people.mozilla.org/~jorendorff/es6-draft.html#sec-',
      ns_fn[0].toLowerCase(),
      '.prototype.',
      ns_fn[1].toLowerCase(),
      '"><tt>',
      item,
      '</tt></a>'
    ].join('');
  }
};