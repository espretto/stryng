/**
 * gulpfile - build tasks
 */

var fs = require('fs');
var sprintf = require('util').format;

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var rename = require('gulp-rename');
var browserify = require('gulp-browserify');

var pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

/* -----------------------------------------------------------------------------
 * gulp tasks
 */

gulp.task('minify', function () {
    gulp.src('./src/stryng.js')
        .pipe(uglify())
        .pipe(rename(sprintf('stryng.min-%s.js', pkg.version)))
        .pipe(gulp.dest('./dist/'));

      // uglify({
      //   mangle: false,
      //   preserveComments: 'all',
      //   output: { beautify: true },
      //   compress: {
      //     global_defs: { __COMPAT__: true }
      //     dead_code: true
      //   }
      // })
});

gulp.task('browserify', function (){
  gulp.src('./test/stryng.unit.js')
      .pipe(browserify({ insertGlobals : true }))
      .pipe(rename('stryng.unit.bundle.js'))
      .pipe(gulp.dest('./test/'));
});

gulp.task('jshint', function() {
  gulp.src([
        './src/stryng.js',
        './test/stryng.test.js',
        // './test/stryng.opt.js', // %-natives throw
        './test/stryng.opt.call.js',
        './gulpfile.js'
      ])
      .pipe(jshint())
      .pipe(jshint.reporter('default'))
      .pipe(jshint.reporter('fail'));
});

/* -----------------------------------------------------------------------------
 * task aggregates
 */
gulp.task('default', ['minify', 'browserify', 'jshint']);
