/**
 * handlebars helpers for yuidoc
 */

var sprintf = require('util').format;

module.exports = {
  es6: function (section) {
    return sprintf('<a href="https://people.mozilla.org' +
      '/~jorendorff/es6-draft.html#sec-%s"><tt>%s</tt></a>',
      section.toLowerCase(),
      section.replace('.prototype.', '#')
    );
  },

  mdn: function(path){
    return sprintf('<a href="https://developer.mozilla.org' +
      '/en-US/docs/Web/JavaScript/Reference/Global_Objects/%s"><tt>%s</tt></a>',
      path.split(/\.(?:prototype\.)?/).join('/'),
      path.replace('.prototype.', '#')
    );
  }
};